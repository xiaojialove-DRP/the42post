# System Architecture

## Overview

THE 42 POST combines a modern frontend with a powerful API backend for human-centered AI alignment.

## Architecture

```
┌─────────────────────────────────┐
│    Browser (Frontend - frontend/)    │
│  Skill Forge | Arena | Dashboard │
└─────────────────────────────────┘
              ↓ HTTP/REST
┌─────────────────────────────────┐
│   Backend API (Node.js/Express)  │
│  /api/{auth,skills,forge,email}  │
└─────────────────────────────────┘
       ↓                    ↓
    ┌──────┐           ┌──────────┐
    │ DB   │           │Claude API│
    │      │           │          │
    └──────┘           └──────────┘
```

## Data Flow: Skill Creation

```
User Input → Intuition Probe → Five-Layer Generation → Review → Publish
              ↓                ↓                          ↓
         API Call         Claude API              Email Notification
```

## Key Components

### Frontend (frontend/)
- `index.html` - Main application (850 lines)
- `script.js` - Logic and API integration (6,567 lines)
- `styles.css` - Responsive design (134 KB)
- `arena.html` - Skill experience page

### Backend (backend/)
- Routes: auth, skills, forge, search, agents, email
- Utils: email service, certificate generation
- Middleware: auth, logging, error handling
- Database: SQLite/PostgreSQL

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `skills` - Skill definitions with five-layer structure
- `email_logs` - Email delivery tracking

See `backend/db/init.js` for complete schema.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Register user |
| `/api/auth/login` | POST | User login |
| `/api/skills` | GET/POST/PATCH/DELETE | Skill CRUD |
| `/api/forge/probe` | POST | Generate intuition probes |
| `/api/forge/generate` | POST | Generate skill structure |
| `/api/email/send-forge-success` | POST | Send notification email |
| `/api/email/certificate/:id` | GET | Download certificate |

## Authentication

JWT-based with 24-hour expiry:
- Register with email + password
- Email verification required
- JWT token in Authorization header
- Token refresh endpoint

## Email Service

Uses Nodemailer:
- Configuration: SMTP (Gmail, SendGrid, custom)
- Dev mode: Logs to console
- Certificate generation: HTML template
- Automatic email on skill publication

---

**Last Updated**: 2026-04-20
