# THE 42 POST — Backend (内胆)

Rigorous, verifiable machine execution layer for AI value alignment skills.

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Anthropic API key (for Claude API integration)

### 2. Installation

```bash
cd backend

# Install dependencies
npm install

# Copy .env template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 3. Environment Setup

Edit `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/42post_db
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
SIGNING_SECRET=your_hmac_signing_secret_minimum_32_characters
PORT=3000
FRONTEND_URL=http://localhost:8000
```

### 4. Database Setup

```bash
# Run migrations
npm run migrate

# (Optional) Seed with demo data
npm run seed
```

### 5. Start Server

```bash
# Development with hot reload
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Authentication

```
POST   /api/auth/register       - Register new user
POST   /api/auth/login          - Login with email/password
GET    /api/auth/verify/:token  - Verify email
GET    /api/auth/me             - Get current user (requires auth)
PATCH  /api/auth/me             - Update profile (requires auth)
```

### Forge Workflow

```
POST   /api/forge/probe         - Generate intuition probe (requires auth)
POST   /api/forge/generate      - Generate five-layer skill (requires auth)
```

### Skills Management

```
GET    /api/skills              - List published skills (paginated)
GET    /api/skills/:skill_id    - Get skill detail with manifest
POST   /api/skills              - Create & publish skill (requires auth)
PATCH  /api/skills/:skill_id    - Update skill (requires auth, author only)
DELETE /api/skills/:skill_id    - Delete skill (requires auth, author only)
GET    /api/skills/:skill_id/manifest  - Get skill manifest (for verification)
POST   /api/skills/:skill_id/sign      - Add covenant signature (requires auth)
GET    /api/skills/user/skills  - Get author's skills (requires auth)
```

### Search & Discovery

```
GET    /api/search              - Full-text search
GET    /api/search/trending     - Trending skills
GET    /api/search/domain/:domain - Skills by domain
```

### Agents

```
POST   /api/agents/bind         - Bind agent (requires auth)
GET    /api/agents/:agent_id/capabilities - Get agent capabilities
POST   /api/agents/:agent_id/verify       - Verify agent binding (requires auth)
```

## Architecture

### Three-Layer Design

#### 1. **Routes** (`/routes`)
HTTP endpoints implementing RESTful API for forge workflow, skills management, and discovery.

#### 2. **Utilities** (`/utils`)
- `auth.js` - JWT token generation, password hashing, auth middleware
- `skillGeneration.js` - Claude API integration for probe & skill generation, soul-hash creation, manifest signing

#### 3. **Database** (`/db`)
PostgreSQL schema with tables for:
- `users` - Account management with email verification
- `skills` - Published skills with five-layer architecture
- `skill_versions` - Revision history
- `skill_manifests` - Signed manifests for verification
- `probe_logs` - Usage telemetry
- `skill_usage_logs` - Agent execution logs

### Five-Layer Architecture (内胆)

Each skill contains:

1. **DEFINING**: Core principle or value statement
2. **INSTANTIATING**: Concrete exemplars (preferred + alternatives)
3. **FENCING**: Clear boundaries (when applies, when doesn't, tension zones)
4. **VALIDATING**: Test cases and evaluation criteria
5. **CONTEXTUALIZING**: Cultural adaptations (language/culture variants)

### Key Features

#### Soul-Hash Identity
```
SOUL_[24-char-hash]_[timestamp]
```

Cryptographic identifier that uniquely identifies each skill:
- Immutable (derived from principle + author + timestamp)
- Verifiable (can be validated against manifest)
- Prevents tampering

#### Manifest Covenant
Complete record of skill including:
- Five-layer architecture
- Author signature
- Covenant signatures (multi-stakeholder approval)
- Rights declaration (commercial use, remix allowed)
- Boundary specifications

#### Dual Forge Modes

**Shadow Agent**: User provides idea → System generates five-layer skill
```
idea_text → /api/forge/probe → /api/forge/generate → published skill
```

**Direct Knight**: User binds Agent → System generates five-layer skill from Agent capabilities
```
agent_binding → /api/agents/bind → /api/forge/generate → published skill
```

## Claude API Integration

### Probe Generation

```javascript
POST /api/forge/probe
{
  "idea_text": "AI should understand when a compliment feels fake",
  "language": "en"
}

Response:
{
  "scenario": "A user tells your AI a compliment...",
  "thesis": "Safe, conventional response...",
  "antithesis": "Nuanced, empathetic approach...",
  "extreme": "Provocative, efficiency-first response..."
}
```

### Five-Layer Generation

```javascript
POST /api/forge/generate
{
  "skill_name": "Detect Insincere Flattery",
  "idea_text": "AI should understand when a compliment feels fake",
  "probe_data": { /* probe response */ },
  "selected_response": "antithesis",
  "domain": "human_interaction"
}

Response:
{
  "skill_draft": {
    "five_layer": {
      "defining": { /* principle */ },
      "instantiating": { /* exemplars */ },
      "fencing": { /* boundaries */ },
      "validating": { /* test cases */ },
      "contextualizing": { /* cultural variants */ }
    }
  }
}
```

## Security

### Authentication
- Email verification required before login
- JWT tokens with 24h expiry
- Password hashing with bcryptjs

### Authorization
- Endpoint-level auth checks via `requireAuth` middleware
- Ownership verification (only authors can modify their skills)
- Soft deletes preserve audit trail

### Data Protection
- HMAC-SHA256 for manifest signing
- CORS restrictions to frontend origin
- SQL parameterization prevents injection

## Workflow: From Idea to Published Skill

### 1. User Registration (STEP 1)
```
POST /api/auth/register
{
  "email": "user@example.com",
  "username": "knightName",
  "password": "secure_password",
  "account_type": "shadow_agent" | "direct_knight"
}
```

**Critical for copyright/ownership**: Email + username + account_type is recorded for skill attribution.

### 2. Intuition Probe (STEP 2 - Part 1)
```
POST /api/forge/probe
{
  "idea_text": "AI should ...",
  "language": "en"
}
```

Claude API generates three contrasting approaches (thesis/antithesis/extreme).

### 3. Skill Generation (STEP 2 - Part 2)
```
POST /api/forge/generate
{
  "skill_name": "...",
  "idea_text": "...",
  "probe_data": { /* from step 2 */ },
  "selected_response": "antithesis",
  "domain": "ideas"
}
```

Claude API generates complete five-layer structure based on user's selected probe response.

### 4. Refinement (STEP 3)
User reviews and refines skill (optional):
```
PATCH /api/skills/:skill_id
{
  "description": "Updated description",
  "applicable_when": ["..."],
  "disallowed_uses": ["..."]
}
```

### 5. Publishing (STEP 4)
```
POST /api/skills
{
  "title": "...",
  "five_layer": { /* from generation */ },
  "commercial_use": "authorized" | "requires_permission" | "prohibited",
  "remix_allowed": true | false,
  "applicable_when": [...],
  "disallowed_uses": [...]
}
```

Returns:
- Skill ID
- Soul-Hash (immutable identifier)
- Manifest (signed record)

### 6. Multi-stakeholder Approval (Optional)
```
POST /api/skills/:skill_id/sign
```

Other stakeholders can add covenant signatures for collective approval.

## Database Queries

### Get all user's published skills
```sql
SELECT * FROM skills WHERE author_id = $1 AND published = true AND deleted_at IS NULL;
```

### Get skill with author info
```sql
SELECT s.*, u.username, u.email FROM skills s
JOIN users u ON s.author_id = u.id
WHERE s.id = $1 AND s.deleted_at IS NULL;
```

### Search skills by text
```sql
SELECT * FROM skills
WHERE published = true AND deleted_at IS NULL
  AND (title ILIKE $1 OR description ILIKE $1)
ORDER BY published_at DESC;
```

### Get skill manifest
```sql
SELECT manifest_json FROM skill_manifests
WHERE skill_id = $1;
```

## Performance Considerations

### Indexing
- `idx_users_email` - Fast user lookup during login
- `idx_skills_author` - Fast user's skills retrieval
- `idx_skills_soul_hash` - Fast manifest verification
- `idx_skills_published` - Fast discovery queries

### Claude API Rate Limiting
Default: 1 probe/generation per user per second (implement in production)
```javascript
// TODO: Add Redis-based rate limiting
```

### Connection Pooling
PostgreSQL connection pool: 20 connections (configurable)

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -c "SELECT version();"

# Check DATABASE_URL is correct
echo $DATABASE_URL
```

### Claude API Errors
```bash
# Check API key
echo $ANTHROPIC_API_KEY

# Check rate limits (quota exceeded, etc.)
```

### JWT Errors
```
Invalid token → Check JWT_SECRET
Token expired → Token is valid, but ask user to re-login
```

## Future Enhancements

- [ ] Email verification via SMTP
- [ ] Redis caching for popular skills
- [ ] WebSocket support for real-time probe generation
- [ ] Agent registry integration
- [ ] Skill versioning with diff visualization
- [ ] Usage analytics dashboard
- [ ] Multi-language full-text search
- [ ] OpenRAIL licensing integration

## Contributing

The backend follows the 42 POST design philosophy:

**设计秩序、建立信任、守护文化**
- 秩序 (Order): Five-layer structure, manifest covenant, signature chain
- 信任 (Trust): Email verification, author tracking, transparent manifests
- 文化 (Culture): Cultural variants, boundary respect, collective signing

All changes must maintain this balance between machine-readable rigor and human-centered values.

## License

THE 42 POST backend is part of the broader AI value alignment initiative. See main LICENSE file for details.
