/**
 * routes/auth.js
 * Admin login. Single-user system per the spec.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// Throttle login attempts to slow down credential-stuffing
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const ok = bcrypt.compareSync(password, admin.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({ token, user: { id: admin.id, username: admin.username } });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

module.exports = router;
