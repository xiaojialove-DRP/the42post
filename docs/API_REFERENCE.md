# API Reference

Complete documentation of THE 42 POST API endpoints.

## Base URL

```
http://localhost:3000
```

## Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-04-20T12:00:00Z"
}
```

## Authentication

Use JWT tokens in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response: { "token": "jwt-token", "user": {...} }
```

### Skills

#### List Skills
```
GET /api/skills?domain=narrative&sort=starlight&limit=20
```

#### Get Skill
```
GET /api/skills/:id
```

#### Create Skill
```
POST /api/skills
Authorization: Bearer token
Content-Type: application/json

{
  "title": "Skill Name",
  "description": "Description",
  "domain": "narrative",
  "five_layer": { ... }
}
```

#### Update Skill
```
PATCH /api/skills/:id
Authorization: Bearer token
Content-Type: application/json

{
  "title": "New Title",
  "description": "New Description"
}
```

#### Delete Skill
```
DELETE /api/skills/:id
Authorization: Bearer token
```

### Forge

#### Generate Probes
```
POST /api/forge/probe
Content-Type: application/json

{
  "skill_idea": "Your idea",
  "domain": "narrative"
}

Response: { "probes": [...] }
```

#### Generate Skill
```
POST /api/forge/generate
Content-Type: application/json

{
  "skill_name": "Skill Name",
  "idea_text": "Description",
  "domain": "narrative",
  "probe_response": "thesis"
}

Response: { "five_layer": {...}, "soul_hash": "42p_..." }
```

### Email

#### Send Forge Success Email
```
POST /api/email/send-forge-success
Content-Type: application/json

{
  "recipientEmail": "user@example.com",
  "recipientName": "User Name",
  "skillTitle": "Skill Title",
  "skillId": "skill-id",
  "soulHash": "42p_...",
  "invitationCode": "42-...",
  "createdDate": "2026-04-20T12:00:00Z"
}

Response: { "success": true, "messageId": "..." }
```

#### Download Certificate
```
GET /api/email/certificate/:skill_id

Returns: HTML file (certificate.html)
```

---

## Error Responses

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2026-04-20T12:00:00Z"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Rate Limiting

Coming soon (v2.0)

---

**Last Updated**: 2026-04-20
