# RestoreLink — Restoration Lead-Gen + Vendor Round-Robin

Full-stack restoration lead-gen platform with admin-managed vendor round-robin call forwarding via Twilio, vendor self-service portal, call recording + transcripts, and 8 SEO-rich service content pages.

## Features

### Public site (SEO-rich)
- Landing page with multi-step lead form (service → ZIP → contact)
- 8 dedicated service pages at `/services/{slug}` with original long-form content, FAQs, schema.org markup, and embedded lead form
  - Water Damage Restoration
  - Mold Removal & Remediation
  - Fire & Smoke Damage Restoration
  - Storm Damage Restoration
  - Biohazard Cleanup
  - Asbestos Removal
  - Foundation Repair
  - Sewage Cleanup
- Auto-generated `sitemap.xml` and `robots.txt`
- Per-page meta tags, OG tags, FAQPage + Service + BreadcrumbList JSON-LD

### Admin portal (`/admin`)
- Vendor CRUD with auto-generated login credentials
- Round-robin reorder with ▲▼ buttons
- Pause/resume vendors without removing them
- Lead status tracking + per-call notes
- Full call log with playable recordings and transcripts

### Vendor portal (`/vendor`)
- Vendors log in with the credentials shown when they were added
- Forced password change on first login
- Their own KPIs: calls routed, completed, leads, won
- Their own call history with recordings + transcripts (downloadable as MP3 / TXT)
- Their own leads with status pipeline (new → contacted → quoted → won/lost)
- Pause/resume themselves in the rotation
- Update phone number and service area
- Per-call and per-lead notes

### Twilio voice
- Inbound call to your toll-free number → "this call may be recorded" announcement → forwarded to next vendor in rotation
- Auto fall-through to the next vendor on no-answer / busy / failed (25s timeout)
- Dual-channel call recording (caller + vendor on separate tracks)
- Twilio transcription kicked off automatically when recording completes
- Recordings streamed through your backend so Twilio creds stay server-side; admins and the matched vendor can play/download

---

## Project Layout

```
restoration-app/
├── package.json              (root - tells Railway how to build)
├── backend/
│   ├── routes/               (auth, vendors, vendor portal, leads, twilio, recordings)
│   ├── services/             (roundRobin.js)
│   ├── middleware/           (auth.js)
│   ├── server.js
│   ├── init-db.js            (idempotent schema + admin seed)
│   ├── db.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/            (LandingPage, ServicePage, AdminLogin, AdminDashboard,
    │   │                      VendorLogin, VendorChangePassword, VendorDashboard)
    │   ├── components/       (LeadForm, SEO, SiteHeader, SiteFooter)
    │   ├── data/services.js  (all 8 service-page content)
    │   ├── api.js
    │   ├── styles.css
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Deploying on Railway

If you already have it deploying, just push your changes — Railway will auto-redeploy. New stuff to know:

### Required env vars
```
JWT_SECRET=<long random string>
ADMIN_USERNAME=logan
ADMIN_PASSWORD=<your password>
NODE_ENV=production
FRONTEND_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
PUBLIC_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

Do **not** set `PORT` — Railway sets it automatically.

### Database persistence
Mount a Railway volume at `/app/backend` so your SQLite DB survives redeploys. The DB lives at `backend/data.db` by default. Optional: set `DATABASE_PATH=/data/data.db` and mount the volume at `/data` for a cleaner setup.

### Twilio env vars (add when ready)
```
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1888xxxxxxx
```

---

## Wiring Twilio

This is what makes inbound calls forward, get recorded, and get transcribed.

### 1. Buy a toll-free number
Twilio Console → Phone Numbers → Buy a number → filter for Toll-Free, capability Voice. Pick an 888.

### 2. Submit toll-free verification
Right after purchase, Twilio prompts you for verification info. Without it, calls to your number get filtered or blocked by major carriers. Takes a few business days.

### 3. Configure the number's webhooks
In the Twilio Console, click your number → Voice Configuration:
- **A call comes in** → Webhook → `https://YOUR-DOMAIN.up.railway.app/api/twilio/voice` → POST
- Save

### 4. Set the transcription callback (one-time, account-wide)
Twilio's transcription completion fires to a callback URL you set on the Recording itself, but the simpler path is to set it as the default in your Twilio account settings. The recordings automatically trigger transcription via the REST call our backend makes; the result is polled back when transcription completes. Your transcripts will populate in the dashboards once Twilio finishes processing each one (usually a few minutes after the call ends).

### 5. Test
1. Add a vendor via admin dashboard (use your own cell as the phone)
2. Call your toll-free number
3. You'll hear the consent announcement, then your phone rings
4. Pick up and have a quick conversation
5. Hang up
6. Check the admin → Call Log: you should see status `completed`, with a playable recording within a couple minutes, and a transcript within ~5 minutes
7. Log into vendor portal as that vendor — same call/recording/transcript visible there

---

## Cost notes

- **Twilio toll-free verification**: free
- **Toll-free number**: ~$2/month
- **Inbound minutes**: ~$0.022/min
- **Outbound forwarded minutes**: ~$0.014/min
- **Recording**: ~$0.0025/min
- **Recording storage**: ~$0.0005/min/month
- **Transcription**: ~$0.05/min (this is the expensive one)

For a vendor receiving 50 calls/month at avg 4 min each: roughly $7-10/month per vendor in Twilio costs. Mostly transcription.

When you're ready, swapping Twilio transcription for OpenAI Whisper drops transcription cost to about $0.006/min — same backend code path, different API call in `routes/twilio.js`.

---

## Legal note on call recording

The TwiML announcement at the start of each call satisfies the consent requirement in all US states (including two-party consent states like California, Florida, and Pennsylvania). Don't disable that announcement without checking your state's requirements.

---

## Local Setup

```bash
# Backend
cd backend
cp .env.example .env  # edit JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm install
npm run init-db
npm start

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

---

## API quick reference

```
# Public
POST   /api/leads                           submit a lead
POST   /api/twilio/voice                    Twilio inbound webhook
POST   /api/twilio/voice/status             Twilio dial result
POST   /api/twilio/recording-status         Twilio recording ready
POST   /api/twilio/transcription            Twilio transcription ready
GET    /sitemap.xml
GET    /robots.txt

# Admin
POST   /api/auth/login
GET    /api/auth/me
GET    /api/vendors
POST   /api/vendors                          create + auto-generate vendor login
PATCH  /api/vendors/:id
DELETE /api/vendors/:id
POST   /api/vendors/reorder
POST   /api/vendors/:id/regenerate-password
GET    /api/leads
PATCH  /api/leads/:id
GET    /api/leads/calls
PATCH  /api/leads/calls/:id

# Vendor portal
POST   /api/vendor/login
GET    /api/vendor/me
PATCH  /api/vendor/me
POST   /api/vendor/me/pause
POST   /api/vendor/me/change-password
GET    /api/vendor/stats
GET    /api/vendor/calls
PATCH  /api/vendor/calls/:id
GET    /api/vendor/leads
PATCH  /api/vendor/leads/:id

# Recordings (admin or matched vendor)
GET    /api/recordings/:callId.mp3?token=<jwt>[&download=1]
GET    /api/recordings/:callId.wav?token=<jwt>[&download=1]
GET    /api/recordings/:callId/transcript.txt?token=<jwt>[&download=1]
```
