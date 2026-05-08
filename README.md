# RestoreLink — Restoration Lead-Gen + Vendor Round-Robin

A full-stack restoration lead-gen site with admin-managed vendor round-robin call forwarding via Twilio.

## What's Built

**Frontend** (`/frontend`) — Vite + React
- Public landing page with hero, multi-step service+ZIP+contact lead form, services grid, "How It Works", "Why Us", footer
- Admin login (`/admin/login`)
- Admin dashboard (`/admin`) — vendor CRUD, drag-to-reorder rotation, leads table, call log

**Backend** (`/backend`) — Node + Express + SQLite (better-sqlite3)
- `POST /api/leads` — public lead capture (rate-limited)
- `POST /api/auth/login` — admin login (JWT)
- `GET/POST/PATCH/DELETE /api/vendors` — protected vendor management
- `POST /api/twilio/voice` — public Twilio webhook; picks the next vendor and returns TwiML to forward the call
- `POST /api/twilio/voice/status` — logs dial result, falls through to the next vendor on no-answer/busy/failed

## Project Layout

```
restoration-app/
├── backend/
│   ├── routes/         (auth, vendors, leads, twilio)
│   ├── services/       (roundRobin.js)
│   ├── middleware/     (auth.js)
│   ├── server.js       (entrypoint)
│   ├── init-db.js      (schema + admin seed)
│   ├── db.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/      (LandingPage, AdminLogin, AdminDashboard)
    │   ├── components/ (LeadForm)
    │   ├── api.js
    │   ├── styles.css
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Local Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm install
npm run init-db    # creates data.db and seeds the admin user
npm start
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend, so no CORS surgery needed in dev.

### 3. Sign in

- Visit `http://localhost:5173/admin/login`
- Use the credentials from your `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- Add vendors. Each vendor gets a generated password shown once — copy it.

---

## Wiring Twilio (the 888 number → round-robin)

This is what actually makes inbound calls forward to vendors.

### Step 1 — Buy a toll-free number in Twilio
1. Sign in to https://console.twilio.com
2. Phone Numbers → Buy a number → filter for toll-free (888, 877, 866, etc.)
3. Toll-free numbers in the US require **toll-free verification** before they can place outbound calls and (eventually) before they'll consistently terminate to mobile carriers. Submit verification right after purchase. Until verified, calls may work but expect carrier filtering. See: https://www.twilio.com/docs/phone-numbers/regulatory/toll-free-verification

### Step 2 — Expose your backend publicly
Twilio needs to POST to your `/api/twilio/voice` endpoint over HTTPS.

**For dev:** use ngrok
```bash
ngrok http 3001
# copy the https URL, e.g. https://abc123.ngrok-free.app
```

**For prod:** deploy the backend somewhere with HTTPS (Railway, Fly, Render, etc.)

Set `PUBLIC_URL` in your backend `.env` to that HTTPS URL.

### Step 3 — Point the Twilio number at your webhook
1. Twilio Console → Phone Numbers → Manage → Active numbers → click your 888 number
2. Under **Voice Configuration**:
   - **A call comes in** → Webhook → `https://YOUR_PUBLIC_URL/api/twilio/voice` → HTTP POST
   - **Primary handler fails** → leave as default or set a TwiML Bin fallback
3. Save

### Step 4 — Add your Twilio creds to backend `.env`
```
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+18885551234
PUBLIC_URL=https://abc123.ngrok-free.app
```

(`TWILIO_AUTH_TOKEN` + `PUBLIC_URL` enable signature validation in production — see `routes/twilio.js`.)

### Step 5 — Test
1. Add at least one vendor with a real, dialable phone number
2. Call your 888 number from any phone
3. You should hear: *"Thank you for calling. Please hold while we connect you with a local restoration specialist."*
4. The vendor's phone rings. The dashboard's **Call Log** tab will show the routed call.
5. Call again — the next vendor in rotation should receive it.

### How the round-robin works
- Active vendors are sorted by `rotation_order, id`
- A persistent `next_vendor_index` pointer in `round_robin_state` tracks who's next
- Each inbound call atomically picks the current vendor, advances the pointer, and increments that vendor's `total_calls`
- If a vendor doesn't answer (no-answer / busy / failed within 25s), the system rolls to the next vendor automatically
- Vendors can be paused (`is_active = 0`) — they're skipped without losing their slot
- The admin can reorder vendors at any time using the ▲▼ buttons

---

## Production Deployment

### Single-server (cheapest, fastest)
```bash
# Build frontend
cd frontend && npm run build

# The backend's server.js already serves /frontend/dist as static files,
# so just deploy the whole repo and run:
cd ../backend
npm install --production
npm run init-db
npm start
```

### Recommended hosts
- **Railway** — drop the repo in, set env vars, get HTTPS automatically. Backend + DB + frontend all on one box.
- **Fly.io** — similar story, slightly more config.
- **Render** — also fine.

### Environment variables checklist
- [ ] `JWT_SECRET` — long random string
- [ ] `ADMIN_USERNAME` / `ADMIN_PASSWORD` — change from defaults
- [ ] `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER`
- [ ] `PUBLIC_URL` — your deployed HTTPS URL (no trailing slash)
- [ ] `FRONTEND_URL` — set to same as PUBLIC_URL if single-server, or your separate frontend URL
- [ ] `NODE_ENV=production` — turns on Twilio signature validation

### Backups
SQLite lives at `backend/data.db`. Back it up. On Railway/Fly, mount a volume for the backend folder so the DB persists across deploys.

---

## What's NOT done yet (you said "we'll work on account details later")

- **Vendor login portal** — vendor `password_hash` is stored and ready, but there's no `/vendor/login` route yet. Add when you're ready to build the vendor side.
- **SMS notifications** — no text-to-vendor when a lead comes in. Easy add via Twilio Messaging.
- **Geographic routing** — currently every vendor gets every call regardless of ZIP. Add ZIP-to-vendor matching when you have multiple service areas.
- **TrustedForm / Jornaya** — the reference site uses TrustedForm for lead validation. Add a script tag in `index.html` if you want certified leads.
- **Analytics** — drop GTM/GA into `index.html` when ready.

---

## Common gotchas

- **Twilio webhook returns 502/timeout** — your `PUBLIC_URL` is wrong or your tunnel is down. Test it: `curl -X POST https://YOUR_URL/api/twilio/voice` should return TwiML, not an error.
- **Calls connect but vendor hears silence** — `answerOnBridge: true` is set in `routes/twilio.js`; if you're testing two phones on the same machine, that's why. Use two real phones.
- **"No vendors configured" message on every call** — make sure at least one vendor has `is_active = 1` and a valid E.164 phone (`+1XXXXXXXXXX`).
- **CORS errors in admin** — set `FRONTEND_URL` in backend `.env` to match where the frontend is served from.
- **Toll-free calls fail to certain carriers** — submit toll-free verification with Twilio. This is a regulatory thing, not a bug in the code.

---

## API quick reference

```
POST   /api/auth/login          { username, password } → { token }
GET    /api/auth/me             (Bearer)               → { user }

GET    /api/vendors             (Bearer)               → { vendors, next_in_rotation, active_count }
POST   /api/vendors             (Bearer)               → { vendor, credentials }
PATCH  /api/vendors/:id         (Bearer)               → { vendor }
DELETE /api/vendors/:id         (Bearer)               → { success }
POST   /api/vendors/reorder     (Bearer) { order: [ids] }
POST   /api/vendors/:id/regenerate-password (Bearer)   → { credentials }

POST   /api/leads               (public, rate-limited) → { success, lead_id }
GET    /api/leads               (Bearer)               → { leads }
GET    /api/leads/calls         (Bearer)               → { calls }

POST   /api/twilio/voice        (public, Twilio)       → TwiML
POST   /api/twilio/voice/status (public, Twilio)       → TwiML
```
