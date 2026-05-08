/**
 * routes/vendors.js
 * Admin CRUD for vendors. Each created vendor gets a generated login.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { peekNextVendor, getActiveVendors, resetPointer } = require('../services/roundRobin');

const router = express.Router();

// All vendor management routes require admin auth
router.use(authenticate);

/** Generates a temporary password for new vendor accounts. */
function generateTempPassword() {
  // 12 chars, URL-safe, easy to read aloud / paste
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12);
}

/** Normalizes a phone number to E.164-ish (+1XXXXXXXXXX). */
function normalizePhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (String(input).startsWith('+')) return '+' + digits;
  return digits ? '+' + digits : null;
}

// GET /api/vendors - list all vendors
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, business_name, contact_name, email, phone_number, service_area,
              services, is_active, rotation_order, last_assigned_at, total_calls,
              created_at, temp_password
       FROM vendors
       ORDER BY rotation_order ASC, id ASC`
    )
    .all();

  const next = peekNextVendor();
  res.json({
    vendors: rows,
    next_in_rotation: next ? next.id : null,
    active_count: getActiveVendors().length,
  });
});

// GET /api/vendors/:id
router.get('/:id', (req, res) => {
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });
  delete vendor.password_hash;
  res.json({ vendor });
});

// POST /api/vendors - create a new vendor + auto-create their account
router.post('/', (req, res) => {
  const {
    business_name,
    contact_name,
    email,
    phone_number,
    service_area,
    services,
    password, // optional override
  } = req.body || {};

  if (!business_name || !email || !phone_number) {
    return res.status(400).json({ error: 'business_name, email, and phone_number are required.' });
  }

  const normalizedPhone = normalizePhone(phone_number);
  if (!normalizedPhone || normalizedPhone.length < 11) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }

  const emailLower = String(email).toLowerCase().trim();

  const existing = db.prepare('SELECT id FROM vendors WHERE email = ?').get(emailLower);
  if (existing) {
    return res.status(409).json({ error: 'A vendor with that email already exists.' });
  }

  const tempPassword = password || generateTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  // New vendor goes to the end of rotation (highest rotation_order + 1)
  const maxOrder = db.prepare('SELECT MAX(rotation_order) AS m FROM vendors').get().m || 0;

  const result = db
    .prepare(
      `INSERT INTO vendors
        (business_name, contact_name, email, phone_number, service_area, services,
         password_hash, temp_password, rotation_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      business_name.trim(),
      (contact_name || '').trim() || null,
      emailLower,
      normalizedPhone,
      (service_area || '').trim() || null,
      Array.isArray(services) ? services.join(',') : services || null,
      passwordHash,
      tempPassword, // shown once in the admin UI; admin can clear later
      maxOrder + 1
    );

  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(result.lastInsertRowid);
  delete vendor.password_hash;

  res.status(201).json({
    vendor,
    credentials: {
      email: emailLower,
      password: tempPassword,
      note: 'Share these with the vendor. They can change the password after first login.',
    },
  });
});

// PATCH /api/vendors/:id - update vendor info
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

  const fields = [
    'business_name',
    'contact_name',
    'email',
    'service_area',
    'services',
    'is_active',
  ];
  const updates = [];
  const values = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      let v = req.body[f];
      if (f === 'email') v = String(v).toLowerCase().trim();
      if (f === 'is_active') v = v ? 1 : 0;
      if (f === 'services' && Array.isArray(v)) v = v.join(',');
      updates.push(`${f} = ?`);
      values.push(v);
    }
  }

  if (req.body.phone_number !== undefined) {
    const np = normalizePhone(req.body.phone_number);
    if (!np) return res.status(400).json({ error: 'Invalid phone number.' });
    updates.push('phone_number = ?');
    values.push(np);
  }

  if (updates.length === 0) return res.json({ vendor });

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  delete updated.password_hash;
  res.json({ vendor: updated });
});

// DELETE /api/vendors/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM vendors WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Vendor not found.' });
  // Reset pointer to keep rotation sane after deletion
  resetPointer();
  res.json({ success: true });
});

// POST /api/vendors/reorder - bulk reorder
router.post('/reorder', (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of vendor IDs.' });
  }
  const update = db.prepare('UPDATE vendors SET rotation_order = ? WHERE id = ?');
  const txn = db.transaction((ids) => {
    ids.forEach((vid, i) => update.run(i + 1, vid));
  });
  txn(order);
  resetPointer();
  res.json({ success: true });
});

// POST /api/vendors/:id/regenerate-password
router.post('/:id/regenerate-password', (req, res) => {
  const { id } = req.params;
  const vendor = db.prepare('SELECT id, email FROM vendors WHERE id = ?').get(id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

  const newPassword = generateTempPassword();
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    'UPDATE vendors SET password_hash = ?, temp_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(hash, newPassword, id);

  res.json({
    credentials: {
      email: vendor.email,
      password: newPassword,
    },
  });
});

module.exports = router;
