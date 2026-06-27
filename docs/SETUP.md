# Local Development Setup

This guide walks you through setting up THE 42 POST for local development.

## Prerequisites

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** (included with Node.js)
- **PostgreSQL** 14+ (optional, for production-like setup) or use SQLite for quick start
- **DeepSeek API key** (get one at [platform.deepseek.com](https://platform.deepseek.com)) — primary LLM, required for real Skill/Twin Test generation
- **Anthropic API key** (optional — get one at [console.anthropic.com](https://console.anthropic.com)) — only used as a fallback if the DeepSeek call fails

## Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Key environment variables to set:**
- `DEEPSEEK_API_KEY` — Get from [DeepSeek Platform](https://platform.deepseek.com) — required for real generation; without it the app falls back to template-based output
- `ANTHROPIC_API_KEY` — Optional, only used as a fallback if DeepSeek fails. Leave unset to skip it.
- `JWT_SECRET` — Random 32+ character string (for authentication)
- `SIGNING_SECRET` — Random 32+ character string (for data signing)
- `POSTGRES_URI` — Only needed for a production-like PostgreSQL setup. Leave unset and the app uses a local SQLite file automatically — zero config.

### 3. Initialize Database

Nothing to do here for local SQLite — `npm start`/`npm run dev` calls `initDatabase()` on every boot, which creates any missing tables and auto-seeds the 42 curated Skills if the database is empty. `npm run migrate` exists separately for explicitly running migrations against a PostgreSQL `POSTGRES_URI` before the app starts (e.g. in a deploy pipeline) — skip it for local dev.

### 4. Start Backend Server

```bash
# Start in development mode
npm run dev

# Or production build
npm start
```

Backend will be available at: **http://localhost:3000**

### 5. Frontend Setup

In a new terminal:

```bash
cd frontend

# No dependencies needed! Frontend is vanilla JavaScript
# Just open index.html or serve via HTTP server

# Quick HTTP server (Python 3):
python3 -m http.server 8000

# Or use any HTTP server (Node.js http-server):
npx http-server -p 8000
```

Frontend will be available at: **http://localhost:8000**

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:8000
```

You should see THE 42 POST homepage!

---

## Detailed Configuration

### Database Selection

#### Option A: SQLite (Quick Start) ✓ Recommended

Nothing to configure — leave `POSTGRES_URI` and `DATABASE_URL` unset in `.env`, and the server automatically creates a local `database.sqlite3` file on first run.

**Pros:** No external database needed, auto-creates file
**Cons:** Not suitable for production, single-user only

#### Option B: PostgreSQL (Production-Like)

```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql postgresql-contrib
# Windows: Download installer from postgresql.org

# Start PostgreSQL service
# macOS: brew services start postgresql
# Ubuntu: sudo systemctl start postgresql

# Create database
createdb 42post_db

# In .env:
POSTGRES_URI=postgresql://username:password@localhost:5432/42post_db
```

### DeepSeek API Key Setup

1. Visit [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up / Log in
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key and paste into `.env`:
   ```
   DEEPSEEK_API_KEY=your_key
   ```

#### (Optional) Anthropic Fallback

Only called if the DeepSeek request fails. Get a key at [console.anthropic.com](https://console.anthropic.com) and add `ANTHROPIC_API_KEY=your_key` to `.env`. Leave it unset to skip this fallback entirely — the app works fine without it.

### Email Setup (Optional)

Publish-confirmation emails (with the Creator Card attached) go through [Resend](https://resend.com)'s HTTP API, not SMTP — most cloud platforms block outbound SMTP ports, so this project never uses it.

```bash
# In .env:
RESEND_API_KEY=re_your_resend_api_key
```

Get a key at [resend.com/api-keys](https://resend.com/api-keys). Without it, emails are logged to the console instead of actually sent — fine for local dev.

---

## Development Workflow

### File Structure

```
the42post/
├── frontend/              # Vanilla JavaScript UI, no build step
│   ├── index.html         # Homepage + Skill Forge
│   ├── playground.html    # Twin Test Playground
│   ├── archive.html       # Skill Archive
│   ├── script.js
│   └── styles.css
├── backend/              # Express.js API server
│   ├── server.js
│   ├── routes/
│   ├── db/              # Database schema
│   ├── utils/           # Helpers & validators
│   └── package.json
├── docs/                # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── CONTRIBUTING.md
│   ├── guides/         # Operational guides
│   └── dev-logs/       # Development notes
└── README.md           # Project overview
```

### Making Changes

1. **Frontend changes:** Edit files in `frontend/` → Refresh browser (no build needed)
2. **Backend changes:** Edit files in `backend/` → Restart dev server (Ctrl+C, then `npm run dev`)
3. **Database schema:** Modify `backend/db/init.js` → Run migrations → Restart server

### Testing Locally

#### Test Archive Functionality
```bash
# 1. Create a skill via Skill Forge
# 2. Go to Archive page
# 3. Star and download skills
# 4. Verify data appears in console (F12)
```

#### Test API Endpoints
```bash
# Get all skills
curl http://localhost:3000/api/skills

# Star a skill
curl -X POST http://localhost:3000/api/skills/skill-id/star \
  -H "Content-Type: application/json" \
  -H "X-Anonymous-Id: test-user-123" \
  -d '{"starred": true}'
```

### Debugging

#### Browser Console
- Press `F12` to open Developer Tools
- Check `Console` tab for JavaScript errors
- Check `Network` tab to see API calls

#### Server Logs
```bash
# Backend logs appear in terminal where you ran `npm run dev`
# Watch for:
# ✓ Server started on port 3000
# ✓ Loaded X published skills from API
# ✗ Error messages in red
```

#### Database Inspection

**SQLite:**
```bash
# Using sqlite3 CLI
sqlite3 data/42post.db

# List tables:
.tables

# View skills:
SELECT id, title, published FROM skills LIMIT 5;
```

**PostgreSQL:**
```bash
# Using psql
psql 42post_db

# List tables:
\dt

# View skills:
SELECT id, title, published FROM skills LIMIT 5;
```

---

## Common Issues

### Issue: Backend won't start

```
Error: Cannot find module 'express'
```

**Solution:** Run `npm install` in the backend directory

### Issue: Frontend shows blank page

```
Open http://localhost:8000 → white screen
```

**Solution:** 
1. Check if backend is running: `curl http://localhost:3000/api/skills`
2. Open browser console (F12) for JavaScript errors
3. Check network tab for failed requests

### Issue: API returns 403 Forbidden

```
POST /api/skills/xyz/star → 403 Forbidden
```

**Solution:** Skills must be published first. Use Skill Forge to create and publish a skill.

---

## Next Steps

After setup is complete:

1. **Read the docs:**
   - [ARCHITECTURE.md](./ARCHITECTURE.md) — System design overview
   - [API_REFERENCE.md](./API_REFERENCE.md) — API endpoints documentation
   - [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines

2. **Explore the code:**
   - Frontend: `frontend/script.js` — Main application logic
   - Backend: `backend/routes/` — API endpoints
   - Database: `backend/db/init.js` — Schema definition

3. **Try creating a skill:**
   - Navigate to "Skill Forge" (home page)
   - Follow the 4-step process
   - Publish your skill
   - View it in the Archive

4. **Make your first contribution:**
   - Pick an issue or feature from CONTRIBUTING.md
   - Create a branch: `git checkout -b feature/your-feature`
   - Make changes and test locally
   - Submit a pull request

---

## Getting Help

- **Documentation:** See [docs/](../../docs/)
- **Architecture questions:** Check [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API questions:** Check [API_REFERENCE.md](./API_REFERENCE.md)
- **Issues:** Open a GitHub issue with details about your setup

---

## Production Deployment

For deploying to Zeabur or other platforms, see [guides/DEPLOYMENT.md](./guides/DEPLOYMENT.md).
