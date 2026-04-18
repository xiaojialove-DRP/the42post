# THE 42 POST — Backend Architecture (内胆)

## Overview

The backend (内胆) implements the rational, contract-oriented execution layer of the 42 POST platform. It handles:
- **表皮** (User-facing frontend): Intuitive, warm, low-friction experience with 3-step forge process + intuition probes
- **内胆** (Backend execution): Rigorous, verifiable machine execution with five-layer architecture, signatures, and manifest records

## Core Principles

1. **Skill Copyright/Ownership**: Every skill is tied to `email + username + dual binding mode` recorded in STEP 1
2. **Five-Layer Architecture**: DEFINING → INSTANTIATING → FENCING → VALIDATING → CONTEXTUALIZING
3. **Soul-Hash Identity**: Unique cryptographic identifier for each skill (identity & verification)
4. **Manifest Covenant**: Records author_signature + covenant_signatures for verifiable契约
5. **Dual Forge Modes**:
   - **Shadow Agent**: User provides idea → System generates five-layer skill
   - **Direct Knight**: User binds Agent → System generates five-layer skill from Agent capabilities

## Technology Stack

- **Runtime**: Node.js 18+ (Bun alternative for performance)
- **Framework**: Express.js (REST API) + optional Socket.io for real-time probe generation
- **Database**: PostgreSQL (primary) with Redis for session/cache
- **Authentication**: JWT-based with email verification
- **AI Integration**: Anthropic Claude API for intelligent probe & skill generation
- **Hashing**: crypto (Node.js built-in) for Soul-Hash + signature generation
- **File Storage**: S3 or local fs (for agent bindings, skill packages)

## Database Schema

### Table: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_type ENUM ('shadow_agent', 'direct_knight') NOT NULL,
  verification_token VARCHAR(255),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `skills`
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  title_cn VARCHAR(255),
  description TEXT,
  description_cn TEXT,
  domain VARCHAR(100),
  soul_hash VARCHAR(255) UNIQUE NOT NULL,
  
  -- Five-layer data (JSON)
  five_layer JSONB NOT NULL,  -- {defining, instantiating, fencing, validating, contextualizing}
  
  -- Forge mode info
  forge_mode ENUM ('shadow_agent', 'direct_knight') NOT NULL,
  source_agent_id VARCHAR(255), -- for direct_knight mode
  
  -- Rights & licensing
  commercial_use ENUM ('authorized', 'requires_permission', 'prohibited') DEFAULT 'authorized',
  remix_allowed BOOLEAN DEFAULT true,
  
  -- Use case boundaries
  applicable_when TEXT[], -- cases where skill applies
  disallowed_uses TEXT[], -- cases where skill must not apply
  
  -- Metadata
  starlight_score INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- soft delete
);

CREATE INDEX idx_skills_author ON skills(author_id);
CREATE INDEX idx_skills_soul_hash ON skills(soul_hash);
CREATE INDEX idx_skills_published ON skills(published) WHERE deleted_at IS NULL;
```

### Table: `skill_versions`
```sql
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id),
  version_number INTEGER NOT NULL,
  five_layer JSONB NOT NULL,
  author_signature VARCHAR(512),
  changelog TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(skill_id, version_number)
);
```

### Table: `skill_manifests`
```sql
CREATE TABLE skill_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL UNIQUE REFERENCES skills(id),
  soul_hash VARCHAR(255) NOT NULL UNIQUE,
  author_signature VARCHAR(512) NOT NULL,
  covenant_signatures JSONB NOT NULL, -- [{signer: email, signature: sig, timestamp: ts}, ...]
  manifest_json JSONB NOT NULL, -- Full manifest record
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `probe_logs`
```sql
CREATE TABLE probe_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  idea_text TEXT NOT NULL,
  generated_probe JSONB NOT NULL, -- {scenario, thesis, antithesis, extreme}
  model_version VARCHAR(50), -- claude-3-sonnet, etc
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `skill_usage_logs`
```sql
CREATE TABLE skill_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id),
  agent_id VARCHAR(255),
  context TEXT,
  outcome ENUM ('applied', 'rejected', 'modified', 'escalated'),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Authentication

#### `POST /api/auth/register`
Register a new user with dual-mode account setup.

**Request**:
```json
{
  "email": "user@example.com",
  "username": "knightName",
  "password": "secure_password",
  "account_type": "shadow_agent" | "direct_knight"
}
```

**Response**:
```json
{
  "success": true,
  "user_id": "uuid",
  "message": "Verification email sent",
  "requires_verification": true
}
```

#### `GET /api/auth/verify/:token`
Verify email address.

#### `POST /api/auth/login`
**Request**:
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "knightName",
    "account_type": "shadow_agent"
  }
}
```

### Forge Workflow

#### `POST /api/forge/probe`
Generate intuition probe from user's idea using Claude API.

**Request**:
```json
{
  "idea_text": "AI should understand when a compliment feels fake",
  "language": "en" | "zh"
}
```

**Response**:
```json
{
  "scenario": "A user tells your AI a compliment they received but suspect is insincere...",
  "thesis": "Safe, conventional response...",
  "antithesis": "Nuanced, alternative approach...",
  "extreme": "Provocative boundary-testing response...",
  "probe_id": "probe_uuid"
}
```

#### `POST /api/forge/generate`
Generate five-layer skill from probe response using Claude API.

**Request**:
```json
{
  "skill_name": "Detect Insincere Flattery",
  "idea_text": "AI should understand when a compliment feels fake",
  "probe_id": "probe_uuid",
  "selected_response": "antithesis",
  "domain": "human_interaction"
}
```

**Response**:
```json
{
  "success": true,
  "five_layer": {
    "defining": { /* principle */ },
    "instantiating": { /* exemplars */ },
    "fencing": { /* boundaries */ },
    "validating": { /* evaluation */ },
    "contextualizing": { /* cultural_variants */ }
  },
  "skill_draft_id": "draft_uuid"
}
```

### Skills Management

#### `GET /api/skills`
List published skills (paginated, filterable).

**Query params**: `?page=1&limit=20&domain=human_interaction&author=username`

#### `GET /api/skills/:skill_id`
Get full skill detail including five-layer architecture.

#### `POST /api/skills`
Create & publish a new skill (requires auth + completed forge workflow).

**Request**:
```json
{
  "title": "Detect Insincere Flattery",
  "description": "Help AI understand when compliments lack authenticity",
  "domain": "human_interaction",
  "five_layer": { /* complete structure */ },
  "commercial_use": "authorized" | "requires_permission" | "prohibited",
  "remix_allowed": true | false,
  "applicable_when": ["When user expresses concern about authenticity"],
  "disallowed_uses": ["Do not use to isolate users socially"]
}
```

**Response**:
```json
{
  "success": true,
  "skill": {
    "id": "skill_uuid",
    "soul_hash": "SOUL_abc123...",
    "manifest": { /* full manifest record */ }
  }
}
```

#### `PATCH /api/skills/:skill_id`
Update skill (only by author).

#### `DELETE /api/skills/:skill_id`
Soft delete skill (only by author).

#### `POST /api/skills/:skill_id/publish`
Formally publish skill with manifest & signatures.

#### `GET /api/skills/:skill_id/manifest`
Retrieve full manifest (for verification, machine reading).

#### `POST /api/skills/:skill_id/sign`
Add signature to covenant (for multi-stakeholder approval).

### Search & Discovery

#### `GET /api/search`
Full-text search across published skills.

**Query params**: `?q=authenticity&type=skill&sort=starlight`

#### `GET /api/archive`
Get skill archive with filtering/pagination.

### Agent Integration

#### `POST /api/agents/bind`
Bind an agent (for Direct Knight mode).

**Request**:
```json
{
  "agent_id": "agent_uuid",
  "agent_manifest": { /* agent spec */ },
  "signature": "agent_signature"
}
```

#### `GET /api/agents/:agent_id/capabilities`
Get agent's declared capabilities (for skill generation context).

## Core Functions

### Probe Generation (Claude API)

```javascript
async function generateProbeWithClaude(ideaText, language = 'en') {
  const prompt = `
    You are a cultural probe designer studying human values.
    A user wants to imbue their AI with the following principle:
    
    "${ideaText}"
    
    Design three contrasting scenarios that test how an AI might embody this value:
    1. THESIS: A safe, conventional, well-researched response
    2. ANTITHESIS: A nuanced, culturally-sensitive alternative approach  
    3. EXTREME: A provocative boundary-testing response that risks harm
    
    Return JSON with keys: scenario, thesis, antithesis, extreme
  `;
  
  const response = await claudeClient.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }]
  });
  
  return JSON.parse(response.content[0].text);
}
```

### Five-Layer Skill Generation (Claude API)

```javascript
async function generateFiveLayerWithClaude(skillName, ideaText, probeResponse, language = 'en') {
  const prompt = `
    You are designing a skill for AI agents to follow.
    
    Skill Name: "${skillName}"
    Core Idea: "${ideaText}"
    User Preference: The user selected the "${probeResponse}" approach
    
    Generate a complete five-layer skill specification:
    
    1. DEFINING: The core principle
    2. INSTANTIATING: Concrete exemplars (preferred + alternatives)
    3. FENCING: Clear boundaries (when applies, doesn't apply, tension zones)
    4. VALIDATING: Test cases and evaluation criteria
    5. CONTEXTUALIZING: Cultural adaptations
    
    Return as JSON with these exact keys and internal structure.
  `;
  
  const response = await claudeClient.messages.create({
    model: "claude-3-sonnet-20240229",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }]
  });
  
  return JSON.parse(response.content[0].text);
}
```

### Soul-Hash Generation

```javascript
function generateSoulHash(skillData, authorEmail, timestamp) {
  const dataString = JSON.stringify({
    title: skillData.title,
    defining_principle: skillData.five_layer.defining,
    author: authorEmail,
    timestamp: timestamp
  });
  
  const hash = crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
  
  return `SOUL_${hash.substring(0, 24)}_${timestamp}`;
}
```

### Manifest Creation

```javascript
function createManifest(skill, author, authorEmail) {
  const timestamp = Date.now();
  const soulHash = generateSoulHash(skill, authorEmail, timestamp);
  
  const manifest = {
    schema: "42post-skill-manifest-v0.1",
    skill_id: skill.id,
    soul_hash: soulHash,
    title: skill.title,
    author: {
      username: author.username,
      email: authorEmail,
      account_type: author.account_type
    },
    forge_mode: skill.forge_mode,
    five_layer: skill.five_layer,
    rights: {
      commercial_use: skill.commercial_use,
      remix_allowed: skill.remix_allowed
    },
    boundaries: {
      applicable_when: skill.applicable_when,
      disallowed_uses: skill.disallowed_uses
    },
    covenant: {
      author_signature: null, // Will be signed
      covenant_signatures: [], // Multi-stakeholder approval
      created_at: timestamp
    }
  };
  
  // Sign manifest
  manifest.covenant.author_signature = signManifest(manifest, authorEmail);
  
  return manifest;
}

function signManifest(manifest, signingEmail) {
  const manifestString = JSON.stringify({
    soul_hash: manifest.soul_hash,
    title: manifest.title,
    five_layer: manifest.five_layer
  });
  
  return crypto
    .createHmac('sha256', process.env.SIGNING_SECRET)
    .update(manifestString)
    .digest('hex');
}
```

## Security & Verification

1. **Email Verification**: Required before skill publishing
2. **Dual Binding**: Both email + username required for copyright ownership
3. **Soul-Hash Verification**: Immutable identifier prevents tampering
4. **Signature Chain**: Author + covenant signatures create audit trail
5. **Rate Limiting**: Claude API calls per user per day
6. **CORS/CSRF**: Standard web security practices

## Implementation Roadmap

### Phase 1: Core Infrastructure
- [x] Database schema design
- [ ] Express.js setup + middleware
- [ ] User authentication (JWT)
- [ ] Database migrations

### Phase 2: Forge Workflow
- [ ] `/api/forge/probe` with Claude API
- [ ] `/api/forge/generate` with Claude API
- [ ] Soul-Hash & manifest generation
- [ ] Skill storage & versioning

### Phase 3: Skills Management
- [ ] CRUD endpoints
- [ ] Publishing workflow
- [ ] Search & discovery
- [ ] Archive functionality

### Phase 4: Frontend Integration
- [ ] Connect STEP 1 (auth) to `/api/auth/register`
- [ ] Connect STEP 2 (probes) to `/api/forge/probe`
- [ ] Connect STEP 2-3 (generation) to `/api/forge/generate`
- [ ] Connect STEP 4 (publishing) to `/api/skills` POST
- [ ] Update skill grid to fetch from `/api/skills`

### Phase 5: Agent Integration
- [ ] Direct Knight agent binding
- [ ] Agent capability introspection
- [ ] Skill generation from Agent manifest

## Environment Variables

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/42post_db

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=24h

# Claude API
ANTHROPIC_API_KEY=sk-...

# Signing
SIGNING_SECRET=your_hmac_signing_secret

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8000
```

## Notes on表皮 vs 内胆 Balance

The backend must be:
- **Uncompromising on verification**: Every skill has soul_hash, signatures, author tracking
- **Transparent in covenant**: Manifest visible to machines & humans for auditability
- **Flexible in adaptation**: Cultural variants, remix support, multi-stakeholder signing
- **Protective of creators**: Copyright via email+username+binding, commercial use control
- **Honest in boundaries**: Clear FENCING prevents misapplication of skills

This reflects the core design philosophy: 设计秩序、建立信任、守护文化
- 秩序 = Five-layer structure, manifest covenant, signature chain
- 信任 = Email verification, author tracking, transparent manifests
- 文化 = Cultural variants, boundary respect, collective signing
