/**
 * server.js
 * Main Express server.
 *
 * Routes:
 *   POST /api/auth/login            - admin login
 *   GET  /api/auth/me               - current admin
 *   GET/POST/PATCH/DELETE /api/vendors - admin vendor CRUD
 *   POST /api/leads                 - public lead capture
 *   GET  /api/leads                 - admin lead list
 *   GET  /api/leads/calls           - admin call log
 *   POST /api/twilio/voice          - Twilio inbound webhook
 *   POST /api/twilio/voice/status   - Twilio dial result webhook
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');
const leadRoutes = require('./routes/leads');
const twilioRoutes = require('./routes/twilio');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/twilio', twilioRoutes);

// Optional: serve the built frontend if present (single-server deploy)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`  CORS origins: ${corsOrigins.join(', ')}`);
});
