# THE 42 POST 🛸

**An Open-Source Platform for Human-Centered AI Value Alignment**

Democratizing how humans define, share, and verify their values for AI systems.
🌐 **[中文版本 (Chinese Version)](./README.zh.md)** 

> **Built on [SemanticForge](https://github.com/xiaojialove-DRP/SemanticForge)** — THE 42 POST implements SemanticForge's five-layer framework as a community platform where anyone can create and share AI-aligned skills.

---

## 🎯 What is THE 42 POST?

A platform where anyone can create verifiable AI Skills — structured representations of human values that guide AI behavior. Instead of hidden values in training data, THE 42 POST makes them **explicit**, **shareable**, **verifiable**, and **multi-cultural**.

### Key Features

- 🛠️ **Skill Forging Workshop** — Turn your values into verifiable AI guidance in 4 steps
- 📚 **Skill Library** — Discover and learn from 42+ community-created skills
- 👁️ **Preview & Iterate** — Review before publishing and refine based on feedback
- 🤖 **AI-Ready** — Integrate into agents and systems, or use the Shadow Agent to test behavior


---

## 🚀 Getting Started

**[👉 Visit THE 42 POST](https://the42post-production.up.railway.app)** — Browse skills, learn the five-layer framework, create your own, and share with the community.

---

## 🛠️ Development Setup (For Contributors)

**Most users should just visit the [live platform](https://the42post-production.up.railway.app).**

To develop locally:

```bash
# Clone and install
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post/backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys and database URL

# Run development server
npm run dev     # Starts on http://localhost:8080
```

**Required environment variables:**
- `ANTHROPIC_API_KEY` — for skill generation
- `DATABASE_URL` — PostgreSQL or SQLite connection string
- `JWT_SECRET` — for user authentication
- `SMTP_*` — for email notifications

See `backend/.env.example` for all configuration options.

---

## 📦 Deployment

THE 42 POST is deployed on Railway and automatically updated when you push to GitHub.

**To deploy your own instance:**
1. Fork this repository on GitHub
2. Create a Railway account at [railway.app](https://railway.app)
3. Connect your repo and set the required environment variables
4. Railway automatically builds and runs using `Dockerfile` and `Procfile`

For detailed instructions, see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file

---

## 🔗 Quick Links

- **🌐 Visit the Live Platform**: [https://the42post-production.up.railway.app](https://the42post-production.up.railway.app)
- **📦 GitHub Repository**: https://github.com/xiaojialove-DRP/the42post
- **🐛 Report Issues**: [GitHub Issues](https://github.com/xiaojialove-DRP/the42post/issues)
- **💬 Feedback**: Open an issue or email us

---

**Version**: 1.0.0 · **Status**: Public Release ✅

*Making AI values transparent, verifiable, and human-centered.*
