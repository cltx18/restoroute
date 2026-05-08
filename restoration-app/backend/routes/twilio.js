/**
 * routes/twilio.js
 * Public webhook endpoints Twilio hits when a call comes in to the toll-free number.
 *
 * Flow:
 *   1. Twilio POSTs to /api/twilio/voice when a call lands.
 *   2. We pick the next vendor, play a "this call may be recorded" announcement,
 *      and <Dial> their phone with record=record-from-answer.
 *   3. /api/twilio/voice/status logs the dial result and falls through to the
 *      next vendor on no-answer/busy/failed.
 *   4. /api/twilio/recording-status fires when the recording is ready.
 *   5. /api/twilio/transcription fires when transcription is ready.
 */
const express = require('express');
const twilio = require('twilio');
const db = require('../db');
const { pickNextVendor } = require('../services/roundRobin');

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const VALIDATE_SIGNATURE = process.env.NODE_ENV === 'production';

router.use(express.urlencoded({ extended: false }));

function validateTwilio(req, res, next) {
  if (!VALIDATE_SIGNATURE) return next();
  if (!TWILIO_AUTH_TOKEN || !PUBLIC_URL) {
    console.warn('[Twilio] Skipping signature validation: missing TWILIO_AUTH_TOKEN or PUBLIC_URL.');
    return next();
  }
  const signature = req.headers['x-twilio-signature'];
  const url = PUBLIC_URL + req.originalUrl;
  const valid = twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, req.body);
  if (!valid) {
    console.warn('[Twilio] Invalid signature on', url);
    return res.status(403).send('Forbidden');
  }
  next();
}

/**
 * POST /api/twilio/voice
 * Inbound call -> announce + route to next vendor with recording enabled.
 */
router.post('/voice', validateTwilio, (req, res) => {
  const twiml = new VoiceResponse();
  const callerNumber = req.body.From || 'unknown';
  const callSid = req.body.CallSid || null;

  const vendor = pickNextVendor();

  if (!vendor) {
    twiml.say(
      { voice: 'Polly.Joanna' },
      'Thank you for calling. We are currently updating our network of restoration professionals. Please try again shortly.'
    );
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO calls
        (twilio_call_sid, caller_number, routed_to_vendor_id, routed_to_phone, status)
       VALUES (?, ?, ?, ?, 'ringing')`
    )
    .run(callSid, callerNumber, vendor.id, vendor.phone_number);

  const callRowId = result.lastInsertRowid;

  // Required consent announcement before connecting.
  twiml.say(
    { voice: 'Polly.Joanna' },
    'Thank you for calling. This call may be recorded for quality and training. Please hold while we connect you with a local restoration specialist.'
  );

  const dial = twiml.dial({
    action: `/api/twilio/voice/status?call_row_id=${callRowId}`,
    method: 'POST',
    timeout: 25,
    callerId: req.body.To,
    answerOnBridge: true,
    record: 'record-from-answer-dual',
    recordingStatusCallback: `/api/twilio/recording-status?call_row_id=${callRowId}`,
    recordingStatusCallbackMethod: 'POST',
    recordingStatusCallbackEvent: 'completed',
    recordingTrack: 'both',
  });
  dial.number(vendor.phone_number);

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /api/twilio/voice/status
 * Twilio fires this after <Dial> ends. Log status; chain to next vendor on miss.
 */
router.post('/voice/status', validateTwilio, (req, res) => {
  const callRowId = req.query.call_row_id;
  const dialStatus = req.body.DialCallStatus;
  const duration = parseInt(req.body.DialCallDuration || '0', 10);

  if (callRowId) {
    db.prepare('UPDATE calls SET status = ?, duration = ? WHERE id = ?').run(
      dialStatus || 'unknown',
      duration,
      callRowId
    );
  }

  const twiml = new VoiceResponse();

  if (['no-answer', 'busy', 'failed'].includes(dialStatus)) {
    const next = pickNextVendor();
    if (next) {
      const result = db
        .prepare(
          `INSERT INTO calls
            (twilio_call_sid, caller_number, routed_to_vendor_id, routed_to_phone, status)
           VALUES (?, ?, ?, ?, 'ringing')`
        )
        .run(req.body.CallSid || null, req.body.From || 'unknown', next.id, next.phone_number);
      const newRowId = result.lastInsertRowid;

      const dial = twiml.dial({
        action: `/api/twilio/voice/status?call_row_id=${newRowId}`,
        method: 'POST',
        timeout: 25,
        callerId: req.body.To,
        answerOnBridge: true,
        record: 'record-from-answer-dual',
        recordingStatusCallback: `/api/twilio/recording-status?call_row_id=${newRowId}`,
        recordingStatusCallbackMethod: 'POST',
        recordingStatusCallbackEvent: 'completed',
        recordingTrack: 'both',
      });
      dial.number(next.phone_number);
      res.type('text/xml').send(twiml.toString());
      return;
    }
  }

  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /api/twilio/recording-status
 * Fires when the recording is ready. We save the URL + kick off transcription.
 */
router.post('/recording-status', validateTwilio, async (req, res) => {
  const callRowId = req.query.call_row_id;
  const recordingSid = req.body.RecordingSid;
  const recordingUrl = req.body.RecordingUrl; // .mp3 / .wav by appending extension
  const recordingDuration = parseInt(req.body.RecordingDuration || '0', 10);

  if (callRowId && recordingSid) {
    db.prepare(
      `UPDATE calls
       SET recording_sid = ?, recording_url = ?, recording_duration = ?
       WHERE id = ?`
    ).run(recordingSid, recordingUrl, recordingDuration, callRowId);

    // Kick off transcription via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const transcription = await client.transcriptions.create({
          recordingSid: recordingSid,
        });
        db.prepare(
          'UPDATE calls SET transcription_sid = ?, transcription_status = ? WHERE id = ?'
        ).run(transcription.sid, 'in-progress', callRowId);
      } catch (err) {
        console.error('[Twilio] Failed to start transcription:', err.message);
        db.prepare('UPDATE calls SET transcription_status = ? WHERE id = ?').run('failed', callRowId);
      }
    }
  }

  res.sendStatus(200);
});

/**
 * POST /api/twilio/transcription
 * Twilio fires this when transcription completes (set on the Recording's
 * transcribeCallback in console, or via REST when we created the transcription).
 */
router.post('/transcription', validateTwilio, (req, res) => {
  const transcriptionSid = req.body.TranscriptionSid;
  const transcriptionText = req.body.TranscriptionText || '';
  const transcriptionStatus = req.body.TranscriptionStatus;

  if (transcriptionSid) {
    db.prepare(
      `UPDATE calls
       SET transcription_text = ?, transcription_status = ?
       WHERE transcription_sid = ?`
    ).run(transcriptionText, transcriptionStatus || 'completed', transcriptionSid);
  }

  res.sendStatus(200);
});

module.exports = router;
