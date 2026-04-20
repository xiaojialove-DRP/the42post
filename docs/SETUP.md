# Development Setup Guide

Get THE 42 POST running locally in 5 steps.

## Prerequisites

- **Node.js**: v20.20.2 LTS
  - Install via nvm: `curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`
  - Then: `nvm install 20.20.2 && nvm use 20.20.2`

- **Python 3**: For frontend server (`python3 -m http.server`)

## Quick Start

### 1. Clone & Navigate
```bash
git clone https://github.com/yourusername/42post.git
cd 42post
```

### 2. Install Backend
```bash
cd backend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

**Key settings:**
- `JWT_SECRET` - Random string, min 32 characters
- `ANTHROPIC_API_KEY` - From https://console.anthropic.com
- `SMTP_*` - Optional, use dev mode if not configured

### 4. Start Services

**Terminal 1 - Backend**
```bash
cd backend
npm start
# Server at http://localhost:3000
```

**Terminal 2 - Frontend**
```bash
cd day1
python3 -m http.server 8080
# Frontend at http://localhost:8080
```

### 5. Verify
```bash
# Test API
curl http://localhost:3000/health

# Open browser
open http://localhost:8080
```

## Email Configuration

### Gmail (Recommended)
1. Enable 2FA on Google Account
2. Go to myaccount.google.com/apppasswords
3. Generate app password
4. Paste into `SMTP_PASSWORD`

### Development Mode
Leave `SMTP_HOST` and `SMTP_USER` empty. Emails logged to console.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm: command not found` | Install Node.js via nvm |
| `Cannot find module` | Run `npm install` in backend/ |
| `Address already in use` | Kill process on port 3000: `lsof -ti:3000 | xargs kill -9` |
| `Email not sending` | Check SMTP config, use dev mode for testing |

## Project Structure

```
42post/
├── backend/     # API server
├── day1/        # Frontend app
├── docs/        # Documentation
└── database.sqlite3  # Local DB (auto-created)
```

---

**Next**: Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system.
