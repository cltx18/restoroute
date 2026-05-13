/**
 * server.js
 * Main Express server.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const vendorAdminRoutes = require('./routes/vendors');
const vendorPortalRoutes = require('./routes/vendor');
const leadRoutes = require('./routes/leads');
const twilioRoutes = require('./routes/twilio');
const recordingRoutes = require('./routes/recordings');

const app = express();
app.set('trust proxy', 1);
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
app.use('/api/vendors', vendorAdminRoutes);     // admin-managed vendor CRUD
app.use('/api/vendor', vendorPortalRoutes);     // vendor-self-service portal
app.use('/api/leads', leadRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/recordings', recordingRoutes);

// SEO: sitemap.xml
const SERVICE_SLUGS = [
  'water-damage-restoration',
  'mold-removal',
  'fire-smoke-damage-restoration',
  'storm-damage-restoration',
  'biohazard-cleanup',
  'asbestos-removal',
  'foundation-repair',
  'sewage-cleanup',
];

const CITY_SLUGS = [
  'denver-co', 'aurora-co', 'lakewood-co', 'thornton-co', 'arvada-co',
  'westminster-co', 'centennial-co', 'boulder-co', 'highlands-ranch-co',
  'englewood-co', 'wheat-ridge-co', 'littleton-co', 'parker-co',
  'castle-rock-co', 'commerce-city-co',
];

app.get('/sitemap.xml', (req, res) => {
  const base = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    ...SERVICE_SLUGS.map((slug) => ({
      loc: `/services/${slug}`,
      priority: '0.9',
      changefreq: 'monthly',
    })),
    ...SERVICE_SLUGS.flatMap((slug) =>
      CITY_SLUGS.map((city) => ({
        loc: `/services/${slug}/${city}`,
        priority: '0.8',
        changefreq: 'monthly',
      }))
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${base}${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>`;
  res.set('Content-Type', 'application/xml').send(xml);
});

app.get('/robots.txt', (req, res) => {
  const base = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /vendor\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`
    );
});

// Serve built frontend
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`  CORS origins: ${corsOrigins.join(', ')}`);
});
