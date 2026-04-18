# THE 42 POST — PHASE 0 Setup Guide

## Overview
Phase 0 (Week 1-2) focuses on completing the front-back connection so that the frontend can communicate with the backend API.

**Current Status:**
- ✅ Frontend API client layer added to `day1/script.js` (ApiClient + API object)
- ✅ Backend server fully configured and ready
- ⏳ Need: Database setup, environment configuration, and testing

---

## Step 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd "backend"
npm install
```

### 1.2 Create `.env` File

Copy `.env.example` and fill in required values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```ini
# Database — CRITICAL: Must create database first
DATABASE_URL=postgresql://postgres:password@localhost:5432/42post_db

# Authentication
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_recommended
JWT_EXPIRY=24h

# Claude API
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Signing & Security  
SIGNING_SECRET=your_hmac_signing_secret_minimum_32_characters

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8000

# Email (optional for now)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@42post.com
SMTP_PASSWORD=your_app_password
```

**Required Keys:**
- `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com/
- `JWT_SECRET`: Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `SIGNING_SECRET`: Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 1.3 Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE 42post_db;
CREATE USER 42post_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE 42post_db TO 42post_user;

# Exit
\q
```

**Or use existing connection:**
If PostgreSQL is already running, just ensure the database name matches your `DATABASE_URL`.

### 1.4 Initialize Database Tables

```bash
cd backend
node scripts/seed.js
```

This creates all required tables:
- `users` — User accounts and authentication
- `skills` — Published skills
- `skill_versions` — Version history
- `skill_manifests` — Skill signatures and covenant
- `probe_logs` — Probe generation history
- `skill_usage_logs` — Usage analytics
- `skill_comments` — User feedback

---

## Step 2: Start Backend Server

```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
# Or: npm start  # Single run
```

Expected output:
```
✓ Database connected: 2025-04-11T...
Server running on http://localhost:3000
```

**Verify health check:**
```bash
curl http://localhost:3000/health
# Should return: { "status": "OK", ... }
```

---

## Step 3: Configure Frontend

### 3.1 Set API URL (if not localhost:3000)

The frontend defaults to `http://localhost:3000/api`. To change:

Open DevTools Console and run:
```javascript
localStorage.setItem('42post_api_url', 'http://your-backend-url:3000/api');
```

Or add to `day1/index.html` before `script.js` loads:
```html
<script>
  if (!localStorage.getItem('42post_api_url')) {
    localStorage.setItem('42post_api_url', 'http://localhost:3000/api');
  }
</script>
```

### 3.2 Test Frontend Locally

Open `day1/index.html` in browser:
```bash
cd day1
python3 -m http.server 8000
# Then open http://localhost:8000
```

---

## Step 4: Test Front-Back Connection

### 4.1 Test Without Authentication (Public API)

Open browser DevTools Console:

```javascript
// Test health check
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(d => console.log('✓ Backend healthy:', d))
  .catch(e => console.error('✗ Backend unavailable:', e));

// Test get public skills
fetch('http://localhost:3000/api/skills?limit=5')
  .then(r => r.json())
  .then(d => console.log('✓ Got skills:', d))
  .catch(e => console.error('✗ Error:', e));
```

### 4.2 Test With Authentication

#### Create a test user via API:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": { "id": "...", "username": "testuser", ... },
  "token": "eyJhbGc..."
}
```

#### Test in Browser Console:

```javascript
// 1. Login
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123456'
  })
})
.then(r => r.json())
.then(data => {
  if (data.token) {
    localStorage.setItem('42post_jwt_token', data.token);
    console.log('✓ Logged in, token saved');
  }
});

// 2. Generate probe (requires auth)
fetch('http://localhost:3000/api/forge/probe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('42post_jwt_token')}`
  },
  body: JSON.stringify({
    idea_text: 'AI should understand grief',
    language: 'en'
  })
})
.then(r => r.json())
.then(d => console.log('✓ Probe generated:', d))
.catch(e => console.error('✗ Error:', e));
```

### 4.3 Check Network Requests

In browser:
1. Open DevTools → Network tab
2. Open `http://localhost:8000` (or your frontend URL)
3. Try using the Skill Forge interface
4. Watch the Network tab for API calls
5. Check console for errors

---

## Step 5: Verify Key Features

### Feature: Generate Probe
1. Open Skill Forge
2. Enter an idea
3. Click "Generate Probe"
4. Should see API call in Network tab: `POST /api/forge/probe`

### Feature: Generate Skill
1. After probe, select a response
2. Click "Generate Skill"
3. Should see API call: `POST /api/forge/generate`
4. Should see 5-layer skill structure returned

### Feature: List Skills
1. Go to "Skill Archive" tab
2. Skills should load from `GET /api/skills`
3. Check Network tab to confirm API call

---

## Troubleshooting

### Problem: "Cannot GET /health"
**Solution:** Backend is not running
```bash
cd backend && npm run dev
```

### Problem: "ECONNREFUSED" errors
**Solution:** Backend running but wrong port
- Check: `curl http://localhost:3000/health`
- Update `.env`: `PORT=3000`

### Problem: "Unauthorized" (401) errors
**Solution:** No valid JWT token
- User must log in first in the UI
- Check: `localStorage.getItem('42post_jwt_token')`
- Backend validates token in Authorization header

### Problem: "Database connection failed"
**Solution:** PostgreSQL not running or wrong credentials
```bash
# Check if PostgreSQL is running
pg_isready -h localhost

# Test connection
psql -h localhost -U postgres 42post_db
```

### Problem: Claude API errors
**Solution:** Missing or invalid ANTHROPIC_API_KEY
```bash
# Verify in .env
echo $ANTHROPIC_API_KEY
# Should NOT be empty

# Get new key from: https://console.anthropic.com/
```

---

## Next Steps (After Phase 0)

Once front-back connection is verified:

### Phase 1: User Center Reorg
- Consolidate 4 HTML pages into 1 SPA
- Build unified navigation
- Implement user authentication UI

### Phase 2: Creator Tools
- Complete Skill Forging Workshop (5 steps)
- User dashboard
- Skill publishing flow

### Phase 3: Data & Analytics
- Usage tracking
- Creator feedback system
- Version comparison

---

## Quick Reference

| Component | Status | Location | Port |
|-----------|--------|----------|------|
| Backend API | ⏳ Setup needed | `/backend` | 3000 |
| Frontend | ✅ Ready | `/day1` | 8000 |
| Database | ⏳ Setup needed | PostgreSQL | 5432 |
| Claude API | ⏳ Key needed | Anthropic | — |

## Commands

```bash
# Backend
cd backend && npm run dev        # Start with hot reload
cd backend && npm start          # Start once
cd backend && npm run migrate    # Run migrations
cd backend && npm run seed       # Initialize database

# Frontend
cd day1 && python3 -m http.server 8000  # Local dev server
```

---

**Status:** Phase 0 is ready to begin. Start with Step 1 above.
