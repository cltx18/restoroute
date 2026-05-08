/**
 * routes/vendor.js
 * Vendor-facing API: login, profile, own calls, own leads.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

/** Vendor-only auth middleware. */
function vendorAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'vendor') return res.status(403).json({ error: 'Vendor access only.' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
}

/** Strip sensitive fields before sending vendor data to the client. */
function safeVendor(v) {
  if (!v) return null;
  const { password_hash, temp_password, ...rest } = v;
  return rest;
}

// POST /api/vendor/login
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const vendor = db
    .prepare('SELECT * FROM vendors WHERE email = ?')
    .get(String(email).toLowerCase().trim());

  if (!vendor) return res.status(401).json({ error: 'Invalid credentials.' });

  const ok = bcrypt.compareSync(password, vendor.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { vendor_id: vendor.id, email: vendor.email, role: 'vendor' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    vendor: safeVendor(vendor),
    must_change_password: !!vendor.must_change_password,
  });
});

// GET /api/vendor/me
router.get('/me', vendorAuth, (req, res) => {
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.user.vendor_id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });
  res.json({ vendor: safeVendor(vendor) });
});

// PATCH /api/vendor/me - update profile (limited fields)
router.patch('/me', vendorAuth, (req, res) => {
  const allowedFields = ['contact_name', 'phone_number', 'service_area'];
  const updates = [];
  const values = [];

  for (const f of allowedFields) {
    if (req.body[f] !== undefined) {
      let v = req.body[f];
      if (f === 'phone_number') {
        const digits = String(v).replace(/\D/g, '');
        if (digits.length === 10) v = '+1' + digits;
        else if (digits.length === 11 && digits.startsWith('1')) v = '+' + digits;
        else return res.status(400).json({ error: 'Invalid phone number.' });
      }
      updates.push(`${f} = ?`);
      values.push(v);
    }
  }

  if (updates.length === 0) {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.user.vendor_id);
    return res.json({ vendor: safeVendor(vendor) });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.user.vendor_id);

  db.prepare(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.user.vendor_id);
  res.json({ vendor: safeVendor(updated) });
});

// POST /api/vendor/me/pause
router.post('/me/pause', vendorAuth, (req, res) => {
  const { is_active } = req.body || {};
  db.prepare(
    'UPDATE vendors SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(is_active ? 1 : 0, req.user.vendor_id);
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.user.vendor_id);
  res.json({ vendor: safeVendor(vendor) });
});

// POST /api/vendor/me/change-password
router.post('/me/change-password', vendorAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.user.vendor_id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

  if (!current_password || !bcrypt.compareSync(current_password, vendor.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.prepare(
    `UPDATE vendors
     SET password_hash = ?, temp_password = NULL, must_change_password = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(newHash, req.user.vendor_id);

  res.json({ success: true });
});

// GET /api/vendor/calls - calls routed to me
router.get('/calls', vendorAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, caller_number, status, duration, recording_sid, recording_duration,
              transcription_text, transcription_status, notes, created_at
       FROM calls
       WHERE routed_to_vendor_id = ?
       ORDER BY created_at DESC
       LIMIT 200`
    )
    .all(req.user.vendor_id);

  res.json({ calls: rows });
});

// PATCH /api/vendor/calls/:id - update notes on a call
router.patch('/calls/:id', vendorAuth, (req, res) => {
  const call = db
    .prepare('SELECT * FROM calls WHERE id = ? AND routed_to_vendor_id = ?')
    .get(req.params.id, req.user.vendor_id);
  if (!call) return res.status(404).json({ error: 'Call not found.' });

  if (req.body.notes !== undefined) {
    db.prepare('UPDATE calls SET notes = ? WHERE id = ?').run(req.body.notes, req.params.id);
  }
  const updated = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
  res.json({ call: updated });
});

// GET /api/vendor/leads - leads routed to me
router.get('/leads', vendorAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM leads
       WHERE routed_to_vendor_id = ?
       ORDER BY created_at DESC
       LIMIT 200`
    )
    .all(req.user.vendor_id);
  res.json({ leads: rows });
});

// PATCH /api/vendor/leads/:id - update lead status / notes
router.patch('/leads/:id', vendorAuth, (req, res) => {
  const lead = db
    .prepare('SELECT * FROM leads WHERE id = ? AND routed_to_vendor_id = ?')
    .get(req.params.id, req.user.vendor_id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const validStatuses = ['new', 'contacted', 'quoted', 'won', 'lost'];
  const updates = [];
  const values = [];

  if (req.body.status !== undefined) {
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    updates.push('status = ?');
    values.push(req.body.status);
  }
  if (req.body.vendor_notes !== undefined) {
    updates.push('vendor_notes = ?');
    values.push(req.body.vendor_notes);
  }

  if (updates.length === 0) return res.json({ lead });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json({ lead: updated });
});

// GET /api/vendor/stats - quick aggregate
router.get('/stats', vendorAuth, (req, res) => {
  const vid = req.user.vendor_id;
  const totalCalls = db
    .prepare('SELECT COUNT(*) AS c FROM calls WHERE routed_to_vendor_id = ?')
    .get(vid).c;
  const completedCalls = db
    .prepare(
      "SELECT COUNT(*) AS c FROM calls WHERE routed_to_vendor_id = ? AND status = 'completed'"
    )
    .get(vid).c;
  const totalLeads = db
    .prepare('SELECT COUNT(*) AS c FROM leads WHERE routed_to_vendor_id = ?')
    .get(vid).c;
  const wonLeads = db
    .prepare("SELECT COUNT(*) AS c FROM leads WHERE routed_to_vendor_id = ? AND status = 'won'")
    .get(vid).c;
  const newLeads = db
    .prepare("SELECT COUNT(*) AS c FROM leads WHERE routed_to_vendor_id = ? AND status = 'new'")
    .get(vid).c;

  res.json({
    total_calls: totalCalls,
    completed_calls: completedCalls,
    total_leads: totalLeads,
    new_leads: newLeads,
    won_leads: wonLeads,
  });
});

module.exports = router;
