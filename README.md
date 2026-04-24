# THE 42 POST

> A research platform where humans define AI values — transparently, verifiably, and together.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-the42post.com-blue)](https://the42post.com)

## What is it?

THE 42 POST is an open-source platform for **human-centered AI alignment**. Instead of hidden values buried in training data, we make them explicit:

- **Anyone can create** verifiable AI guidance (called "Skills") using our 4-step Forge
- **Structured values** using a proven five-layer framework
- **Community-driven** — skills are published, shared, and tested collectively
- **Culturally diverse** — values from creators worldwide, in multiple languages

Perfect for researchers, ethicists, developers, and anyone who cares how AI behaves.

**[中文版本](./README.zh.md)** · **[Live Platform](https://the42post.com)**

---

## Quick Start

### 👤 For Anyone
1. Visit [the42post.com](https://the42post.com)
2. Explore 100+ community skills
3. Create your first skill in 10 minutes
4. Get your Creator Card via email

### 💻 For Developers
```bash
# Clone & setup (5 minutes)
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post
npm install
npm run dev
```

Details: [Setup Guide](docs/SETUP.md) · [API Reference](docs/API_REFERENCE.md)

---

## How It Works

### For Creators: The Skill Forge (4 Steps)

1. **IDEA** — Write what you want AI to learn (or not learn)
2. **GENERATING** — System creates intuition-probing questions
3. **FORGE & EDIT** — AI assists; you refine your unique perspective
4. **PUBLISHING** — Get Creator Card + Share with community

### For Researchers

- **Download skill data** via API (`/api/skills`)
- **Analyze patterns** across domains
- **Test with Shadow Agent** to validate AI behavior alignment
- **Publish findings** back to the community

### For Integration

```javascript
// Fetch a skill
GET /api/skills/:skillId

// Integrate into your AI agent
const skill = await fetch('/api/skills/aesthetic-taste');
// Apply to your AI system...
```

See [API Reference](docs/API_REFERENCE.md) for all endpoints.

---

## Why We Built This

**The Problem:** AI alignment is controlled by few organizations, inconsistent across cultures, and unverifiable.

**Our Answer:** Democratize AI values. Make them explicit, auditable, and shaped by communities — not corporations.

---

## Architecture

- **Frontend**: Vanilla JavaScript + responsive design (mobile-first)
- **Backend**: Node.js + Express + PostgreSQL/SQLite
- **Framework**: Five-layer skill structure (DEFINING → CONTEXTUALIZING)
- **Auth**: Lightweight (name + email, no complex registration)

Full details: [Architecture](docs/ARCHITECTURE.md)

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[Setup Guide](docs/SETUP.md)** | Local development environment |
| **[Architecture](docs/ARCHITECTURE.md)** | System design & data flows |
| **[API Reference](docs/API_REFERENCE.md)** | REST endpoints for integration |
| **[Contributing](docs/CONTRIBUTING.md)** | How to contribute (skills, code, research) |
| **[Deployment](docs/guides/DEPLOYMENT.md)** | Deploy to production (Railway, Docker) |

---

## Community

- **Skill Creators**: Share your values on our platform
- **Developers**: Contribute code improvements via PRs
- **Researchers**: Download data, publish findings, shape the future of AI alignment

See [Contributing Guide](docs/CONTRIBUTING.md) for details.

---

## License

MIT License — Use freely in research and commercial projects.

---

**Status**: Public Release ✅  
**Version**: 1.0.0  
**Built with**: Node.js, PostgreSQL, React-free vanilla JS

*Making AI values transparent, verifiable, and human-centered.*
