# 🚀 Phase 0: Front-Back Connection

**Start here.** This file explains what's been done and what to do next.

---

## What Just Happened

We completed Phase 0 of the 12-week plan to rebuild THE 42 POST. The frontend can now talk to the backend via REST APIs. Everything is ready—you just need to configure it.

**Status:**
- ✅ Frontend API client: DONE
- ✅ Backend infrastructure: DONE  
- ⏳ Your action required: Configure & test

---

## Quick Start (30 minutes)

### 1. Install & Configure (10 min)
```bash
# Install backend dependencies
cd backend
npm install

# Create .env file
cp .env.example .env
# ← Edit .env with your values (see PHASE_0_SETUP.md)
```

### 2. Set Up Database (10 min)
```bash
# Create PostgreSQL database (once)
psql -U postgres
CREATE DATABASE 42post_db;
CREATE USER 42post_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE 42post_db TO 42post_user;
\q

# Initialize tables
cd backend
node scripts/migrate.js
```

### 3. Test Connection (5 min)
```bash
# Verify everything works
node scripts/test-connection.js
# Should see: "✅ Passed: 12, ❌ Failed: 0"
```

### 4. Start Both Servers (3 min)
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd day1 && python3 -m http.server 8000
```

### 5. Test in Browser
Open http://localhost:8000 and try:
1. Open DevTools → Console
2. Copy-paste this:
```javascript
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(d => console.log('✓ Connected!', d))
```

If you see `✓ Connected!` → **Phase 0 passes!**

---

## Documentation

### For Setup Help
→ **Read:** `PHASE_0_SETUP.md`

Includes:
- Detailed step-by-step setup
- Troubleshooting guide
- Full API testing examples
- Common errors & solutions

### For Understanding Architecture
→ **Read:** `PHASE_0_COMPLETE.md`

Includes:
- What was implemented
- How the system works
- Data flow diagrams
- Configuration details
- Deployment checklist

### For Current Status
→ **Read:** `PHASE_0_STATUS.md`

Includes:
- What's completed
- What's pending
- Testing checklist
- Next phase preview

---

## Key Changes Made

### Frontend (`day1/script.js`)
- ✅ Added 156-line API client layer
- ✅ `ApiClient` object for HTTP requests with auth
- ✅ `API` object for business logic (forge, skills, etc.)
- ✅ Async probe generation using backend
- ✅ Falls back to client-side if API unavailable

### Backend (No changes needed!)
- ✅ Already has Express.js server
- ✅ Already has all route handlers
- ✅ Already has database schema
- ✅ Just needs: .env + database setup

### Documentation
- ✅ `PHASE_0_SETUP.md` — Full setup guide (250 lines)
- ✅ `PHASE_0_STATUS.md` — Progress tracking
- ✅ `PHASE_0_COMPLETE.md` — Architecture & details
- ✅ `scripts/test-connection.js` — Auto-testing script

---

## Architecture Overview

```
┌──────────────────┐
│  Browser         │
│  (Frontend)      │──────┐
│  :8000           │      │ JSON/REST
└──────────────────┘      │
                          ▼
                   ┌──────────────────┐
                   │  Backend Server  │
                   │  (Express.js)    │───────┐
                   │  :3000           │       │ SQL
                   └──────────────────┘       │
                                             ▼
                                      ┌──────────────────┐
                                      │  PostgreSQL      │
                                      │  Database        │
                                      └──────────────────┘
```

**How It Works:**
1. User opens browser → page loads from `:8000`
2. User tries Skill Forge → frontend sends JSON to `:3000`
3. Backend receives request → validates JWT → calls Claude API
4. Claude returns results → stored in PostgreSQL
5. Results sent back to frontend → user sees probes
6. User selects probe → process repeats for skill generation

---

## Testing Checklist

After setup completes, verify:

- [ ] `npm install` runs without errors
- [ ] `.env` file created with valid values
- [ ] PostgreSQL database created
- [ ] `node scripts/migrate.js` creates tables
- [ ] `node scripts/test-connection.js` passes all tests
- [ ] Backend starts: `npm run dev`
- [ ] Frontend starts: `python3 -m http.server 8000`
- [ ] Can access http://localhost:8000
- [ ] DevTools shows no console errors
- [ ] Can fetch `/api/skills` from console
- [ ] Can call protected endpoint with JWT
- [ ] Skill Forge workflow works end-to-end

---

## Common Issues

**Q: "Cannot find module"**
A: Run `cd backend && npm install`

**Q: "Cannot GET /health"**
A: Backend not running. Run `cd backend && npm run dev`

**Q: "Database connection failed"**
A: Check `.env` DATABASE_URL. Verify PostgreSQL is running.

**Q: "CORS error"**
A: Backend CORS is configured for `http://localhost:8000` by default. If frontend is elsewhere, update `FRONTEND_URL` in `.env`

**Q: "401 Unauthorized"**
A: User not authenticated. Must register and login first.

For more help → See `PHASE_0_SETUP.md` Troubleshooting section

---

## What's Working Now

✅ Public APIs (no login needed):
- `GET /api/skills` — List published skills
- `GET /api/skills/:id` — Get skill detail

✅ Auth APIs:
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Log in
- `GET /api/auth/me` — Get current user

✅ Protected APIs (need JWT):
- `POST /api/forge/probe` — Generate probes
- `POST /api/forge/generate` — Generate skill
- `POST /api/skills` — Publish skill

---

## What's Next (Phase 1)

Once Phase 0 passes, Phase 1 (Week 3-4) will build:
- 🏠 Unified single-page app (consolidate 4 pages)
- 👥 User dashboard
- 📖 Skill browsing interface
- 🎨 Creator profiles
- 🛠️ User authentication UI

---

## Important Files

| File | Purpose | Edit? |
|------|---------|-------|
| `day1/script.js` | Frontend logic | ✅ Yes, add features |
| `day1/index.html` | Frontend UI | ✅ Yes, update pages |
| `backend/server.js` | Backend setup | ❌ Usually no |
| `backend/.env` | Configuration | ✅ Yes, set secrets |
| `backend/db/init.js` | Database schema | ❌ Usually no |
| `PHASE_0_SETUP.md` | Setup guide | 📖 Read |

---

## Environment Setup Summary

```bash
# Backend
DATABASE_URL=postgresql://...      # PostgreSQL connection
ANTHROPIC_API_KEY=sk-ant-...      # From console.anthropic.com
JWT_SECRET=...                     # Random 32+ char string
SIGNING_SECRET=...                 # Random 32+ char string
PORT=3000                          # Server port
NODE_ENV=development               # Environment type
FRONTEND_URL=http://localhost:8000 # For CORS

# Generate random secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Quick Links

- 🔧 **Setup Instructions** → `PHASE_0_SETUP.md`
- 📊 **Architecture Details** → `PHASE_0_COMPLETE.md`
- 📈 **Progress Tracking** → `PHASE_0_STATUS.md`
- 📋 **Full 12-Week Plan** → `.claude/plans/fizzy-meandering-thacker.md`

---

## Support

**If something fails:**
1. Read troubleshooting: `PHASE_0_SETUP.md` → Troubleshooting
2. Run test script: `node scripts/test-connection.js`
3. Check logs: Backend console, DevTools console, database logs
4. Verify config: Check `.env` values match database credentials

---

## Success = Phase 0 Complete ✅

When you can:
- ✅ Start backend without errors
- ✅ Start frontend without errors  
- ✅ Call API from browser console
- ✅ Get probes back from Claude API
- ✅ See data in PostgreSQL

**Then Phase 0 is done!** 🎉

Next → Begin Phase 1

---

## Command Reference

```bash
# Setup (one time)
cd backend && npm install
node scripts/migrate.js

# Development (daily)
cd backend && npm run dev           # Start backend
cd day1 && python3 -m http.server 8000  # Start frontend

# Testing
node scripts/test-connection.js     # Full test
curl http://localhost:3000/health   # Quick test

# Database
psql -U postgres 42post_db          # Connect to DB
```

---

**Ready?** Start with Step 1 in `PHASE_0_SETUP.md`
