/**
 * routes/twilio.js
 * Public webhook endpoints Twilio hits when a call comes in to the 888 number.
 *
 * Flow:
 *   1. Twilio POSTs to /api/twilio/voice when a call lands on the 888 number.
 *   2. We pick the next vendor and return TwiML that <Dial>s their phone.
 *   3. <Dial action="/api/twilio/voice/status"> -> we log the result.
 *
 * Security note:
 *   In production, validate the Twilio signature header to ensure the
 *   request is actually from Twilio. See validateTwilioRequest() below.
 */
const express = require('express');
const twilio = require('twilio');
const db = require('../db');
const { pickNextVendor } = require('../services/roundRobin');

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const VALIDATE_SIGNATURE = process.env.NODE_ENV === 'production';

// Twilio sends form-encoded webhooks
router.use(express.urlencoded({ extended: false }));

/** Optional middleware: verify the request was signed by Twilio. */
function validateTwilio(req, res, next) {
  if (!VALIDATE_SIGNATURE) return next();
  if (!TWILIO_AUTH_TOKEN || !PUBLIC_URL) {
    console.warn('[Twilio] Skipping signature validation: missing TWILIO_AUTH_TOKEN or PUBLIC_URL.');
    return next();
  }
  const signature = req.headers['x-twilio-signature'];
  const url = PUBLIC_URL.replace(/\/$/, '') + req.originalUrl;
  const valid = twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, req.body);
  if (!valid) {
    console.warn('[Twilio] Invalid signature on', url);
    return res.status(403).send('Forbidden');
  }
  next();
}

/**
 * POST /api/twilio/voice
 * Inbound call -> route to next vendor in round-robin via <Dial>.
 */
router.post('/voice', validateTwilio, (req, res) => {
  const twiml = new VoiceResponse();
  const callerNumber = req.body.From || 'unknown';
  const callSid = req.body.CallSid || null;

  const vendor = pickNextVendor();

  if (!vendor) {
    // No vendors configured - apologize and hang up
    twiml.say(
      { voice: 'Polly.Joanna' },
      'Thank you for calling. We are currently updating our network of restoration professionals. Please try again shortly.'
    );
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Log the incoming call BEFORE dialing
  const result = db
    .prepare(
      `INSERT INTO calls
        (twilio_call_sid, caller_number, routed_to_vendor_id, routed_to_phone, status)
       VALUES (?, ?, ?, ?, 'ringing')`
    )
    .run(callSid, callerNumber, vendor.id, vendor.phone_number);

  const callRowId = result.lastInsertRowid;

  // Brief greeting then dial the vendor. action= sends Twilio's dial result back.
  twiml.say(
    { voice: 'Polly.Joanna' },
    'Thank you for calling. Please hold while we connect you with a local restoration specialist.'
  );

  const dial = twiml.dial({
    action: `/api/twilio/voice/status?call_row_id=${callRowId}`,
    method: 'POST',
    timeout: 25,
    callerId: req.body.To, // present caller as the 888 number
    answerOnBridge: true,
    record: 'do-not-record',
  });
  dial.number(vendor.phone_number);

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /api/twilio/voice/status
 * Called by Twilio after the <Dial> ends. We log status & duration.
 * If the dial failed (busy/no-answer), we could chain to the next vendor.
 */
router.post('/voice/status', validateTwilio, (req, res) => {
  const callRowId = req.query.call_row_id;
  const dialStatus = req.body.DialCallStatus; // completed, busy, no-answer, failed, canceled
  const duration = parseInt(req.body.DialCallDuration || '0', 10);

  if (callRowId) {
    db.prepare('UPDATE calls SET status = ?, duration = ? WHERE id = ?').run(
      dialStatus || 'unknown',
      duration,
      callRowId
    );
  }

  const twiml = new VoiceResponse();

  // If the first vendor didn't pick up, try the next one in rotation.
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
      });
      dial.number(next.phone_number);
      res.type('text/xml').send(twiml.toString());
      return;
    }
  }

  // Otherwise, just hang up cleanly.
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

module.exports = router;
