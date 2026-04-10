# THE 42 POST — API Quick Reference Card

## Base URL
```
http://localhost:3000/api  (development)
https://api.42post.com     (production - TBD)
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "knight_name",
  "password": "secure_password",
  "account_type": "shadow_agent" | "direct_knight"
}

Response 201:
{
  "success": true,
  "user_id": "uuid",
  "requires_verification": true
}
```

### Verify Email
```http
GET /auth/verify/:verification_token

Response 200:
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response 200:
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "knight_name",
    "account_type": "shadow_agent"
  }
}
```

### Get Current User (Protected)
```http
GET /auth/me
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "knight_name",
    "verified": true,
    "created_at": "2024-04-10T..."
  }
}
```

---

## 🎲 Forge Workflow Endpoints

### Generate Intuition Probe (Protected)
```http
POST /forge/probe
Authorization: Bearer <token>
Content-Type: application/json

{
  "idea_text": "AI should understand when a compliment feels fake",
  "language": "en" | "zh"
}

Response 200:
{
  "success": true,
  "probe": {
    "scenario": "A user tells your AI a compliment...",
    "thesis": "Safe, conventional response...",
    "antithesis": "Empathetic, nuanced response...",
    "extreme": "Provocative, boundary-testing response..."
  },
  "model": "claude-3-5-sonnet-20241022",
  "usage": {
    "input_tokens": 450,
    "output_tokens": 680
  }
}
```

### Generate Five-Layer Skill (Protected)
```http
POST /forge/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "skill_name": "Detect Insincere Flattery",
  "idea_text": "AI should understand when a compliment feels fake",
  "probe_data": {
    "scenario": "...",
    "thesis": "...",
    "antithesis": "...",
    "extreme": "..."
  },
  "selected_response": "thesis" | "antithesis" | "extreme",
  "domain": "human_interaction",
  "language": "en" | "zh"
}

Response 200:
{
  "success": true,
  "skill_draft": {
    "title": "Detect Insincere Flattery",
    "five_layer": {
      "defining": { "principle": "...", "reasoning": "..." },
      "instantiating": { "preferred": {...}, "alternatives": [...] },
      "fencing": { "applies_when": [...], "does_not_apply": [...], "tension_zones": [...] },
      "validating": { "test_cases": [...], "success_metric": "..." },
      "contextualizing": { "cultural_variants": {...} }
    }
  },
  "model": "claude-3-5-sonnet-20241022"
}
```

---

## 💾 Skills Endpoints

### List Published Skills
```http
GET /skills?page=1&limit=20&domain=ideas&author=username&search=flattery

Query Params:
  page (int)     - Page number (default: 1)
  limit (int)    - Items per page (default: 20)
  domain (str)   - Filter by domain
  author (str)   - Filter by username
  search (str)   - Full-text search

Response 200:
{
  "success": true,
  "skills": [
    {
      "id": "uuid",
      "title": "Detect Insincere Flattery",
      "description": "...",
      "domain": "human_interaction",
      "soul_hash": "SOUL_abc123xyz_1712762400000",
      "username": "knight_name",
      "published": true,
      "published_at": "2024-04-10T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

### Get Skill Detail
```http
GET /skills/:skill_id

Response 200:
{
  "success": true,
  "skill": {
    "id": "uuid",
    "title": "Detect Insincere Flattery",
    "description": "...",
    "domain": "human_interaction",
    "soul_hash": "SOUL_abc123xyz_1712762400000",
    "five_layer": { /* complete structure */ },
    "commercial_use": "authorized",
    "remix_allowed": true,
    "applicable_when": ["..."],
    "disallowed_uses": ["..."],
    "username": "knight_name",
    "email": "user@example.com",
    "manifest": { /* signed manifest record */ }
  }
}
```

### Create & Publish Skill (Protected)
```http
POST /skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Detect Insincere Flattery",
  "title_cn": "检测虚伪奉承",
  "description": "Help AI understand when compliments lack authenticity",
  "description_cn": "帮助 AI 理解恭维何时缺乏真实性",
  "domain": "human_interaction",
  "five_layer": { /* from /forge/generate */ },
  "forge_mode": "shadow_agent",
  "source_agent_id": null,
  "commercial_use": "authorized" | "requires_permission" | "prohibited",
  "remix_allowed": true,
  "applicable_when": ["When user expresses concern about authenticity"],
  "disallowed_uses": ["Do not use to isolate users socially"]
}

Response 201:
{
  "success": true,
  "skill": {
    "id": "uuid",
    "title": "Detect Insincere Flattery",
    "soul_hash": "SOUL_abc123xyz_1712762400000",
    "published": true,
    "published_at": "2024-04-10T..."
  },
  "manifest": {
    "schema": "42post-skill-manifest-v0.1",
    "skill_id": "uuid",
    "soul_hash": "SOUL_abc123xyz_1712762400000",
    "author": {
      "username": "knight_name",
      "email": "user@example.com",
      "account_type": "shadow_agent"
    },
    "five_layer": { /* complete structure */ },
    "covenant": {
      "author_signature": "abc123...",
      "covenant_signatures": []
    }
  }
}
```

### Update Skill (Protected, Author Only)
```http
PATCH /skills/:skill_id
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "description_cn": "更新的描述",
  "applicable_when": ["..."],
  "disallowed_uses": ["..."]
}

Response 200:
{
  "success": true,
  "skill": { "id": "uuid", "title": "...", "updated_at": "..." }
}
```

### Delete Skill (Protected, Author Only - Soft Delete)
```http
DELETE /skills/:skill_id
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Skill deleted"
}
```

### Get Skill Manifest (For Verification)
```http
GET /skills/:skill_id/manifest

Response 200:
{
  "success": true,
  "manifest": { /* signed manifest record */ }
}
```

### Add Covenant Signature (Protected)
```http
POST /skills/:skill_id/sign
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "message": "Signature added",
  "signature": {
    "signer": "user@example.com",
    "signature": "abc123...",
    "timestamp": "2024-04-10T..."
  },
  "total_signatures": 2
}
```

### Get Author's Skills (Protected)
```http
GET /skills/user/skills?include_drafts=true
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "skills": [ { /* author's skills */ } ]
}
```

---

## 🔍 Search & Discovery Endpoints

### Full-Text Search
```http
GET /search?q=authenticity&sort=relevance&page=1&limit=20

Query Params:
  q (str)     - Search query (required)
  sort (str)  - 'relevance' | 'starlight' | 'newest' | 'oldest'
  page (int)  - Page number
  limit (int) - Items per page

Response 200:
{
  "success": true,
  "results": [ { /* matching skills */ } ],
  "pagination": { "page": 1, "total": 42, ... }
}
```

### Get Trending Skills
```http
GET /search/trending?limit=10&domain=human_interaction

Response 200:
{
  "success": true,
  "skills": [ { /* trending skills */ } ]
}
```

### Get Skills by Domain
```http
GET /search/domain/human_interaction?page=1&limit=20

Response 200:
{
  "success": true,
  "skills": [ { /* skills in domain */ } ],
  "pagination": { ... }
}
```

---

## 🤖 Agent Integration Endpoints

### Bind Agent (Protected)
```http
POST /agents/bind
Authorization: Bearer <token>
Content-Type: application/json

{
  "agent_id": "agent_uuid",
  "agent_manifest": { /* agent spec */ },
  "signature": "agent_signature_hex"
}

Response 200:
{
  "success": true,
  "message": "Agent binding verified",
  "agent": { "id": "...", "manifest": {...} }
}
```

### Get Agent Capabilities
```http
GET /agents/:agent_id/capabilities

Response 200:
{
  "success": true,
  "agent_id": "agent_uuid",
  "capabilities": {
    "message": "...",
    "can_evaluate": true,
    "can_respond": true,
    "can_adapt": true
  }
}
```

### Verify Agent Binding (Protected)
```http
POST /agents/:agent_id/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "signature": "agent_signature_hex"
}

Response 200:
{
  "success": true,
  "verified": true,
  "agent_id": "agent_uuid"
}
```

---

## 📊 Health & Status

### Server Health Check (No Auth Required)
```http
GET /health

Response 200:
{
  "status": "OK",
  "timestamp": "2024-04-10T...",
  "version": "0.1.0"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing input",
  "message": "idea_text is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You can only update your own skills"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Skill not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "This resource already exists (duplicate)"
}
```

### 500 Internal Server Error
```json
{
  "error": "Probe generation failed",
  "message": "Claude API returned error: rate limit exceeded"
}
```

---

## Common Response Headers

```
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:8000
X-Request-ID: unique-request-id
```

---

## Rate Limiting (Future)

Not yet implemented, but planned:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1712762400
```

---

## Sample cURL Commands

### Register & Login
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "username":"testuser",
    "password":"pass123456",
    "account_type":"shadow_agent"
  }'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123456"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### Generate Probe
```bash
curl -X POST http://localhost:3000/api/forge/probe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "idea_text":"AI should understand when a compliment feels fake",
    "language":"en"
  }'
```

### Publish Skill
```bash
curl -X POST http://localhost:3000/api/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title":"Detect Insincere Flattery",
    "domain":"human_interaction",
    "five_layer":{...},
    "commercial_use":"authorized",
    "remix_allowed":true
  }'
```

### Search Skills
```bash
curl "http://localhost:3000/api/search?q=authenticity&sort=starlight"
```

---

## JWT Token Format

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicHNhZW5hbWUiOiJrbmlnaHRfbmFtZSIsImFjY291bnRUeXBlIjoic2hhZG93X2FnZW50IiwiaWF0IjoxNzEyNzYyNDAwLCJleHAiOjE3MTI4NDg4MDB9.signature_hex
```

Decoded payload:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "knight_name",
  "accountType": "shadow_agent",
  "iat": 1712762400,
  "exp": 1712848800
}
```

Expires in: **24 hours**

---

**Last Updated**: April 10, 2024
**Backend Version**: 0.1.0
**API Version**: v1
