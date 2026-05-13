/**
 * routes/leads.js
 * Public lead capture from the website + admin lead/call viewing.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { peekNextVendor } = require('../services/roundRobin');

const router = express.Router();

const leadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again shortly.' },
});

// PUBLIC - lead capture
router.post('/', leadLimiter, (req, res) => {
  const { service, zip_code, name, phone, email, notes, address } = req.body || {};

  if (!service || !zip_code) {
    return res.status(400).json({ error: 'service and zip_code are required.' });
  }
  if (!/^\d{5}(-\d{4})?$/.test(String(zip_code).trim())) {
    return res.status(400).json({ error: 'Please enter a valid 5-digit ZIP code.' });
  }

  const peek = peekNextVendor();

  const result = db
    .prepare(
      `INSERT INTO leads (service, zip_code, name, phone, email, notes, address, routed_to_vendor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(service).trim(),
      String(zip_code).trim(),
      (name || '').trim() || null,
      (phone || '').trim() || null,
      (email || '').trim().toLowerCase() || null,
      (notes || '').trim() || null,
      (address || '').trim() || null,
      peek ? peek.id : null
    );

  res.status(201).json({
    success: true,
    lead_id: result.lastInsertRowid,
    message: 'Got it. A restoration specialist will reach out shortly.',
  });
});

// PROTECTED - admin views all leads
router.get('/', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, v.business_name AS routed_business_name
       FROM leads l
       LEFT JOIN vendors v ON v.id = l.routed_to_vendor_id
       ORDER BY l.created_at DESC
       LIMIT 500`
    )
    .all();
  res.json({ leads: rows });
});

// PROTECTED - admin updates a lead
router.patch('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const updates = [];
  const values = [];

  if (req.body.status !== undefined) {
    const valid = ['new', 'contacted', 'quoted', 'won', 'lost'];
    if (!valid.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    updates.push('status = ?');
    values.push(req.body.status);
  }
  if (req.body.notes !== undefined) {
    updates.push('notes = ?');
    values.push(req.body.notes);
  }

  if (updates.length === 0) return res.json({ lead });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.json({ lead: updated });
});

// PROTECTED - admin views call log (with recording info)
router.get('/calls', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, v.business_name AS routed_business_name
       FROM calls c
       LEFT JOIN vendors v ON v.id = c.routed_to_vendor_id
       ORDER BY c.created_at DESC
       LIMIT 500`
    )
    .all();
  res.json({ calls: rows });
});

// PROTECTED - admin updates call notes
router.patch('/calls/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(id);
  if (!call) return res.status(404).json({ error: 'Call not found.' });

  if (req.body.notes !== undefined) {
    db.prepare('UPDATE calls SET notes = ? WHERE id = ?').run(req.body.notes, id);
  }
  const updated = db.prepare('SELECT * FROM calls WHERE id = ?').get(id);
  res.json({ call: updated });
});

module.exports = router;
