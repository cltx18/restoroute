/**
 * routes/recordings.js
 * Streams Twilio recordings through our backend so they can be played/
 * downloaded without exposing the Twilio account auth.
 *
 * Auth: requires either an admin token OR a vendor token whose vendor_id
 * matches the call's routed_to_vendor_id.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

/** Custom auth middleware that allows admin OR matching vendor. */
function authAdminOrVendor(req, res, next) {
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Allow ?token= for <audio src> tags that can't easily set headers
  if (!token && req.query.token) token = String(req.query.token);

  if (!token) return res.status(401).json({ error: 'Missing token.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * GET /api/recordings/:callId.:ext
 * Streams the recording media as mp3 or wav.
 */
router.get('/:callId.:ext', authAdminOrVendor, async (req, res) => {
  const { callId, ext } = req.params;
  if (!['mp3', 'wav'].includes(ext)) {
    return res.status(400).json({ error: 'Format must be mp3 or wav.' });
  }

  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId);
  if (!call) return res.status(404).json({ error: 'Call not found.' });
  if (!call.recording_url) return res.status(404).json({ error: 'No recording available yet.' });

  // Vendors can only access their own recordings
  if (req.user.role === 'vendor' && req.user.vendor_id !== call.routed_to_vendor_id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const mediaUrl = call.recording_url + '.' + ext;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured on server.' });
  }

  try {
    const upstream = await fetch(mediaUrl, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Failed to fetch recording from Twilio.' });
    }

    res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : 'audio/wav');
    if (req.query.download) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="call-${callId}.${ext}"`
      );
    }

    // Stream it through
    const reader = upstream.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } catch (err) {
        console.error('[recordings] Stream error:', err);
        res.end();
      }
    };
    pump();
  } catch (err) {
    console.error('[recordings] Proxy error:', err);
    res.status(500).json({ error: 'Failed to stream recording.' });
  }
});

/**
 * GET /api/recordings/:callId/transcript.txt
 * Downloads the transcript as plain text.
 */
router.get('/:callId/transcript.txt', authAdminOrVendor, (req, res) => {
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.callId);
  if (!call) return res.status(404).json({ error: 'Call not found.' });
  if (req.user.role === 'vendor' && req.user.vendor_id !== call.routed_to_vendor_id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const text = call.transcription_text || '(Transcript not available yet.)';
  const header = `Call ID: ${call.id}\nDate: ${call.created_at}\nFrom: ${call.caller_number || 'unknown'}\nDuration: ${call.recording_duration || 0}s\n\n---\n\n`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (req.query.download) {
    res.setHeader('Content-Disposition', `attachment; filename="call-${call.id}-transcript.txt"`);
  }
  res.send(header + text);
});

module.exports = router;
