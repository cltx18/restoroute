/**
 * routes/leads.js
 * Public lead capture from the website form + admin lead/call viewing.
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

// PUBLIC - lead capture from the website form
router.post('/', leadLimiter, (req, res) => {
  const { service, zip_code, name, phone, email, notes } = req.body || {};

  if (!service || !zip_code) {
    return res.status(400).json({ error: 'service and zip_code are required.' });
  }
  if (!/^\d{5}(-\d{4})?$/.test(String(zip_code).trim())) {
    return res.status(400).json({ error: 'Please enter a valid 5-digit ZIP code.' });
  }

  const peek = peekNextVendor();

  const result = db
    .prepare(
      `INSERT INTO leads (service, zip_code, name, phone, email, notes, routed_to_vendor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(service).trim(),
      String(zip_code).trim(),
      (name || '').trim() || null,
      (phone || '').trim() || null,
      (email || '').trim().toLowerCase() || null,
      (notes || '').trim() || null,
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

// PROTECTED - admin views call log
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

module.exports = router;
