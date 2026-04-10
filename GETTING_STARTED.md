# THE 42 POST — Getting Started Guide

Welcome! The backend (内胆) for THE 42 POST has been fully implemented. This guide will help you set it up and integrate with the frontend.

## 📦 What's New

### Backend Complete ✅

A production-ready Express.js + PostgreSQL backend with:
- User authentication (email verification, JWT)
- Intuition probe generation (Claude API)
- Five-layer skill generation (Claude API)
- Soul-Hash & manifest signing
- Full skill CRUD operations
- Full-text search
- Multi-stakeholder covenant signing

### Documentation Complete ✅

Four comprehensive guides:
1. **BACKEND_ARCHITECTURE.md** - Technical architecture & design
2. **backend/README.md** - Backend setup & API reference
3. **FRONTEND_BACKEND_INTEGRATION.md** - Phase-by-phase integration with code examples
4. **API_QUICK_REFERENCE.md** - Quick API endpoint reference card
5. **BACKEND_IMPLEMENTATION_SUMMARY.md** - What was built & design decisions

### File Structure

```
42 post project/
├── backend/                              # NEW: Node.js backend
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── README.md
│   ├── db/init.js                       # PostgreSQL schema
│   ├── middleware/                      # Error handling, logging
│   ├── routes/                          # API endpoints (auth, forge, skills, search, agents)
│   ├── utils/                           # Auth, skill generation, Claude API
│   └── scripts/migrate.js               # Database setup
│
├── day1/                                # Existing frontend (unchanged)
├── BACKEND_ARCHITECTURE.md              # NEW: Architecture & design
├── BACKEND_IMPLEMENTATION_SUMMARY.md    # NEW: Implementation summary
├── FRONTEND_BACKEND_INTEGRATION.md      # NEW: Integration guide
└── API_QUICK_REFERENCE.md              # NEW: API reference card
```

## 🚀 Quick Start (5 minutes)

### 1. Install Prerequisites

```bash
# Check you have Node.js 18+
node --version

# Check you have PostgreSQL 14+
psql --version

# If not installed:
# macOS: brew install node postgresql
# Ubuntu: sudo apt install nodejs postgresql postgresql-contrib
# Windows: Download from nodejs.org and postgresql.org
```

### 2. Start PostgreSQL

```bash
# macOS (with Homebrew)
brew services start postgresql

# Ubuntu
sudo service postgresql start

# Or use Docker
docker run --name 42post-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# IMPORTANT: Edit .env with your API key
nano .env
```

**Edit `.env`**:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/42post_db
ANTHROPIC_API_KEY=sk-ant-...  # Get from https://console.anthropic.com/
JWT_SECRET=generate_a_random_32_char_string_here
SIGNING_SECRET=generate_a_random_32_char_string_here
PORT=3000
FRONTEND_URL=http://localhost:8000
```

### 4. Initialize Database

```bash
npm run migrate
# You should see: ✓ All database tables initialized
```

### 5. Start Backend

```bash
npm run dev
# You should see:
# ✓ Database connected
# ⚔ THE 42 POST — Backend Server (内胆) Running
# Port: 3000
```

### 6. Test Backend

```bash
# In another terminal:
curl http://localhost:3000/health
# Should return: {"status":"OK","version":"0.1.0"}
```

### 7. Start Frontend

```bash
cd day1
python3 -m http.server 8000
# Frontend runs on http://localhost:8000
```

## 🔌 Integration Guide

The backend is now running, but the frontend still uses localStorage. To connect them:

### Option A: Quick Integration (Today)

**Just the authentication**:
1. Update STEP 1 registration to call `/api/auth/register`
2. Test that users can create accounts in the database
3. Leave STEP 2-4 using localStorage for now

**Time**: 30 minutes
**Difficulty**: Easy
**Value**: Users stored in database, emails verified

**See**: `FRONTEND_BACKEND_INTEGRATION.md` → Phase 1

### Option B: Complete Integration (This Week)

**Full frontend-backend sync**:
1. Phase 1: User registration (STEP 1)
2. Phase 2: Probe generation with Claude API (STEP 2)
3. Phase 3: Five-layer generation with Claude API (STEP 2-3)
4. Phase 4: Skill publishing to database (STEP 4)
5. Phase 5: Skill discovery from database

**Time**: 2-3 hours
**Difficulty**: Moderate
**Value**: Full backend integration, skills persisted & verifiable

**See**: `FRONTEND_BACKEND_INTEGRATION.md` → All phases with code examples

## 📚 Documentation

### For Backend Setup
👉 **backend/README.md** — Full setup guide, endpoint reference, troubleshooting

### For Architecture Understanding
👉 **BACKEND_ARCHITECTURE.md** — Database schema, API design, security, implementation roadmap

### For Integration
👉 **FRONTEND_BACKEND_INTEGRATION.md** — Phase-by-phase guide with code examples for each endpoint

### For Quick API Reference
👉 **API_QUICK_REFERENCE.md** — All endpoints with example requests/responses

### For Implementation Details
👉 **BACKEND_IMPLEMENTATION_SUMMARY.md** — What was built, design decisions, next steps

## 🧪 Test Endpoints

### 1. Register & Login

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "knight@example.com",
    "username": "daring_knight",
    "password": "securepass123",
    "account_type": "shadow_agent"
  }'

# Copy the user_id from response

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "knight@example.com",
    "password": "securepass123"
  }'

# Copy the token from response and save as $TOKEN
export TOKEN="eyJhbGc..."
```

### 2. Generate Probe

```bash
curl -X POST http://localhost:3000/api/forge/probe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "idea_text": "AI should understand when a compliment feels fake",
    "language": "en"
  }'

# Returns: scenario, thesis, antithesis, extreme
# Copy the entire response to use in next step
```

### 3. Generate Five-Layer Skill

```bash
curl -X POST http://localhost:3000/api/forge/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "skill_name": "Detect Insincere Flattery",
    "idea_text": "AI should understand when a compliment feels fake",
    "probe_data": {
      "scenario": "...",
      "thesis": "...",
      "antithesis": "...",
      "extreme": "..."
    },
    "selected_response": "antithesis",
    "domain": "human_interaction"
  }'

# Returns: five_layer skill with complete DEFINING/INSTANTIATING/FENCING/VALIDATING/CONTEXTUALIZING
```

### 4. Publish Skill

```bash
curl -X POST http://localhost:3000/api/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Detect Insincere Flattery",
    "description": "Help AI understand when compliments lack authenticity",
    "domain": "human_interaction",
    "five_layer": { /* from previous response */ },
    "forge_mode": "shadow_agent",
    "commercial_use": "authorized",
    "remix_allowed": true,
    "applicable_when": ["When user expresses concern about authenticity"],
    "disallowed_uses": ["Do not use to isolate users socially"]
  }'

# Returns: skill_id, soul_hash, manifest with author_signature
```

### 5. View Published Skills

```bash
# List all published skills
curl http://localhost:3000/api/skills

# Search for skills
curl "http://localhost:3000/api/search?q=authenticity"

# Get specific skill with manifest
curl http://localhost:3000/api/skills/[skill_id]
```

## ⚙️ Understanding the Architecture

### Three-Layer Design

```
Frontend (表皮) — Warm, Intuitive, Low-Friction
├── STEP 0: Choose forge mode (Shadow Agent vs Direct Knight)
├── STEP 1: Register/login with email + username
├── STEP 2: Share idea → Intuition Probe → Select response
├── STEP 3: Review refined skill
└── STEP 4: Publish with rights & boundaries

Backend (内胆) — Rigorous, Verifiable, Machine-Executable
├── Authentication Layer (email verification, JWT)
├── Generation Layer (Claude API for probes & skills)
├── Storage Layer (PostgreSQL with five-layer architecture)
├── Verification Layer (Soul-Hash, manifests, signatures)
└── Discovery Layer (full-text search, filtering)
```

### Five-Layer Architecture

Every skill contains:

1. **DEFINING** → What principle or value?
2. **INSTANTIATING** → How to show it? (exemplars)
3. **FENCING** → When applies/doesn't apply? (boundaries)
4. **VALIDATING** → How to test? (evaluation)
5. **CONTEXTUALIZING** → How to adapt? (cultural variants)

### Key Features

**Soul-Hash Identity**:
```
SOUL_[24-char-hash]_[timestamp]
```
Immutable, verifiable, unique to each skill

**Manifest Covenant**:
```
{
  "author_signature": "hmac_sha256_hex",
  "covenant_signatures": [
    { "signer": "email", "signature": "hex", "timestamp": "iso" }
  ]
}
```
Signed record with multi-stakeholder approval

**Email + Username = Copyright**:
```
User Registration:
  email: user@example.com
  username: knight_name
  account_type: shadow_agent | direct_knight

↓ Every skill authored by this user includes this info in manifest
```

## 🔑 Key Environment Variables

```bash
# REQUIRED: Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/42post_db

# REQUIRED: Claude API
ANTHROPIC_API_KEY=sk-ant-...

# REQUIRED: Security
JWT_SECRET=random_32_char_string_minimum
SIGNING_SECRET=random_32_char_string_minimum

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8000
```

Get your Anthropic API key:
1. Go to https://console.anthropic.com/
2. Create account if needed
3. Generate API key
4. Add to `.env`

## 🆘 Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
psql -U postgres -d 42post_db -c "SELECT NOW();"

# If database doesn't exist:
createdb 42post_db -U postgres

# If all else fails, use Docker:
docker run --name 42post-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

### "ANTHROPIC_API_KEY is not set"
```bash
# Add to .env:
ANTHROPIC_API_KEY=sk-ant-...

# Verify:
echo $ANTHROPIC_API_KEY
```

### "Invalid JWT"
- User token expired (24h expiry)
- User needs to login again
- Check header format: `Authorization: Bearer <token>`

### "Probe/skill generation failed"
- Check Claude API key is valid
- Check API quota (anthropic.com/account)
- Check input isn't too long
- Check internet connection

### CORS errors
- Verify `FRONTEND_URL` in `.env` matches frontend origin
- Frontend should be on `http://localhost:8000`
- Backend on `http://localhost:3000`

## 📖 Next Steps

### Immediate (Today)
1. ✅ Backend running locally
2. ✅ Database initialized
3. ✅ Test endpoints with curl
4. **→ Read**: FRONTEND_BACKEND_INTEGRATION.md

### This Week
1. **Integrate Phase 1**: User registration (STEP 1)
2. **Integrate Phase 2**: Probe generation (STEP 2)
3. **Integrate Phase 3**: Skill generation (STEP 2-3)
4. **Integrate Phase 4**: Skill publishing (STEP 4)
5. **Integrate Phase 5**: Skill discovery

### Production (Next 2-4 weeks)
1. Deploy backend to cloud (Heroku, Railway, AWS)
2. Set up production database (RDS, Supabase)
3. Configure production environment variables
4. Update frontend to use production backend URL
5. Set up CI/CD for automatic deployments

## 💡 Key Design Philosophy

**设计秩序、建立信任、守护文化**

- **秩序 (Order)**: Five-layer structure, manifest covenant, signature chain
- **信任 (Trust)**: Email verification, author tracking, transparent manifests
- **文化 (Culture)**: Cultural variants, boundary respect, collective signing

The表皮 (user-facing frontend) is warm, intuitive, low-friction.
The内胆 (backend machine layer) is rigorous, verifiable, legally sound.

## 📞 Need Help?

1. **Setup issues?** → backend/README.md (Troubleshooting section)
2. **API questions?** → API_QUICK_REFERENCE.md
3. **Integration help?** → FRONTEND_BACKEND_INTEGRATION.md
4. **Architecture details?** → BACKEND_ARCHITECTURE.md

## 🎯 Success Criteria

✅ Backend setup working:
- `npm run dev` starts server
- `curl /health` returns OK
- PostgreSQL tables created
- API endpoints responding

✅ Authentication working:
- Can register new user
- User verification email stored
- Can login with JWT token

✅ Forge workflow working:
- Probe generation with Claude API
- Five-layer generation with Claude API
- Skill publishing with soul-hash
- Manifest signing working

✅ Discovery working:
- Can list published skills
- Can search skills
- Can view individual skill manifests

---

**Ready to integrate?** 
→ See **FRONTEND_BACKEND_INTEGRATION.md** for phase-by-phase code examples

**Questions about the backend?**
→ See **BACKEND_ARCHITECTURE.md** for technical details

**Need quick API reference?**
→ See **API_QUICK_REFERENCE.md** for all endpoints with examples
