# THE 42 POST 🛸

**An Open-Source Platform for Human-Centered AI Value Alignment**

Democratizing how humans define, share, and verify their values for AI systems.

---

## 🎯 What is THE 42 POST?

THE 42 POST is a web platform that enables anyone to create "Skills" — structured, verifiable representations of human values, principles, and ethical guidelines — that can be used to improve AI behavior.

Instead of leaving AI values as implicit in training data, THE 42 POST makes them:
- **Explicit** — Values are clearly defined in a five-layer framework
- **Shareable** — Anyone can discover and use community-created skills
- **Verifiable** — Each skill includes test cases and validation criteria
- **Multi-Cultural** — Skills include context-specific adaptations across cultures

### Key Features

- 🛠️ **Skill Forging Workshop** — A guided 5-step process to transform your ideas into structured skills
- 📚 **Skill Library** — Discover 20+ example skills created by designers, ethicists, and AI researchers
- 👥 **Creator Dashboard** — Manage your published skills and see how they're being used
- 🤖 **AI Integration** — Skills can be integrated into AI agents and systems
- 📊 **Usage Analytics** — Track when and how your skills are adopted
- 🌍 **Open Source** — MIT licensed, built with Node.js and open data

---

## ❓ Why Did We Build This?

### The Problem

Current AI systems have a critical gap:
- **Implicit values** — AI values are hidden in training data, impossible to audit
- **Cultural mismatch** — The same AI behaves inconsistently across cultures
- **No verification** — Users can't confirm what principles an AI actually follows
- **Centralized control** — Value decisions are made by a handful of organizations

### Our Solution

We created THE 42 POST to:

1. **Democratize AI alignment** — Give designers, ethicists, and domain experts a voice in AI values
2. **Make values transparent** — Replace black-box alignment with explicit, auditable principles
3. **Enable community verification** — Use structured skills with test cases that anyone can validate
4. **Support cultural diversity** — Let different communities adapt principles to their contexts

---

## 🚀 How to Use THE 42 POST

### For Users (Discovering Skills)

1. **Visit the platform**: Open the web application at your deployed instance
2. **Browse the library**: Explore 20+ example skills organized by creative dimension (narrative, aesthetics, culture, etc.)
3. **Read skill details**: Each skill includes:
   - The creator's story and motivation
   - The five-layer structure (defining principle, examples, boundaries, tests, cultural context)
   - Usage data and community feedback
4. **Experience a skill**: Try an interactive "Shadow Agent" conversation using a specific skill
5. **Provide feedback**: Comment on skills and suggest improvements

### For Creators (Forging Skills)

1. **Start the Forge Workshop**: Click "Create Skill" to enter the 5-step process:
   
   **Step 1: Capture Your Idea**
   - Input your username and email
   - Describe your core idea or value principle
   - Select the creative dimension that best fits

   **Step 2: Intuition Probe**
   - The system asks clarifying questions about your idea
   - Choose which values resonate most

   **Step 3: Five-Layer Generation**
   - The system auto-generates your skill structure:
     - **DEFINING**: Core principle statement
     - **INSTANTIATING**: Real-world examples
     - **FENCING**: When to apply and when not to
     - **VALIDATING**: Test cases to verify the principle
     - **CONTEXTUALIZING**: How it adapts across cultures

   **Step 4: Review & Refine**
   - Review the generated skill
   - Make edits as needed
   - Optionally invite reviewers to sign off

   **Step 5: Publish**
   - Choose licensing options (commercial use, remixing)
   - Publish to the library
   - Get your permanent Soul-Hash identity

2. **Track impact**: After publishing, see:
   - How many people viewed your skill
   - Which AI systems adopted it
   - What feedback you received
   - Version history and improvements

### For Developers (Integrating Skills)

1. **Access the API**: Get your skill's JSON structure from the platform
2. **Integrate into your agent**: Use the structured skill to guide AI behavior
3. **Run test cases**: Validate that your system follows the principle
4. **Report results**: Share back how the skill affected your AI's behavior
5. **Iterate**: Collaborate with the skill creator on improvements

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- SQLite or PostgreSQL
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post

# Install backend dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings:
# - DATABASE_URL (local SQLite or remote PostgreSQL)
# - CLAUDE_API_KEY (for skill generation)
# - FRONTEND_URL (usually http://localhost:8000)

# Run the backend
npm run dev    # Development with nodemon
# or
npm start      # Production

# In another terminal, open the frontend
# The frontend is served at http://localhost:3000/
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=sqlite://./database.sqlite3
CLAUDE_API_KEY=your-anthropic-api-key
FRONTEND_URL=http://localhost:8000
JWT_SECRET=your-jwt-secret-key
```

---

## 📦 Deployment

### Deploy to Railway (Recommended)

The simplest way to deploy THE 42 POST:

1. **Fork this repository** on GitHub
2. **Create a Railway account** at railway.app
3. **Connect your GitHub repo** to Railway
4. **Set environment variables** in Railway:
   - `CLAUDE_API_KEY`
   - `DATABASE_URL` (Railway PostgreSQL)
   - `JWT_SECRET`
5. **Deploy!** Railway will automatically build and run using the `Procfile` and `Dockerfile`

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📚 Documentation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) | System design and API structure | 15 min |
| [FRONTEND_BACKEND_INTEGRATION.md](FRONTEND_BACKEND_INTEGRATION.md) | How frontend and backend work together | 10 min |
| [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) | REST API endpoints and examples | 10 min |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | How to deploy to production | 20 min |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│      THE 42 POST — Full Stack           │
├─────────────────────────────────────────┤
│                                         │
│  Frontend (frontend/)                      │
│  ├─ index.html (main app)              │
│  ├─ arena.html (skill experience)     │
│  ├─ agent-view.html (creators)        │
│  └─ script.js (app logic)              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Backend (backend/)                    │
│  ├─ server.js (Express)                │
│  ├─ routes/                            │
│  │  ├─ auth.js (user auth)            │
│  │  ├─ forge.js (skill generation)    │
│  │  ├─ skills.js (skill CRUD)         │
│  │  ├─ search.js (discovery)          │
│  │  └─ agents.js (AI integration)     │
│  └─ db/                                │
│     └─ init.js (schema setup)          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Database                              │
│  ├─ SQLite (local) or PostgreSQL (prod)│
│  ├─ users, skills, domains             │
│  ├─ probe_logs, skill_versions         │
│  └─ skill_manifests (signatures)       │
│                                         │
├─────────────────────────────────────────┤
│  Claude API Integration                │
│  (Skill generation & enhancement)      │
└─────────────────────────────────────────┘
```

---

## 📖 Understanding the Five-Layer Skill Framework

Every skill created on THE 42 POST uses this structure:

```json
{
  "skill_name": "Know When to Listen",
  "five_layer": {
    "defining": "Recognize when a person needs to be heard rather than advised",
    
    "instantiating": [
      {
        "before": "User shares a painful memory → AI immediately offers solutions",
        "after": "User shares a painful memory → AI acknowledges pain, asks open questions"
      }
    ],
    
    "fencing": {
      "when_apply": "Counseling, grief support, sensitive personal sharing",
      "when_not": "Technical support, factual questions, emergency situations"
    },
    
    "validating": [
      "Test: User says 'I'm struggling' → AI doesn't give immediate advice",
      "Test: User says 'I need help' → AI offers solutions if explicitly asked"
    ],
    
    "contextualizing": {
      "japanese": "Respect 'Ma' (空白) — the silence between words is valuable",
      "chinese": "Emphasize companionship (陪伴) rather than problem-solving"
    }
  }
}
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### As a Skill Creator
1. Create an account on the platform
2. Use the Skill Forging Workshop to design a skill
3. Publish and share with the community
4. Refine based on feedback

### As a Developer
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear documentation
4. See [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) for code structure

### As a Researcher
1. Download skills from the API
2. Run experiments with the skill framework
3. Publish findings and cite THE 42 POST
4. Share results with the community

---

## 📄 License

MIT License — See [LICENSE](LICENSE) file

This means you can freely use, modify, and distribute THE 42 POST for any purpose, commercial or otherwise.

---

## 🔗 Quick Links

- **Visit the Live Platform**: [Deployed instance URL]
- **GitHub Repository**: https://github.com/xiaojialove-DRP/the42post
- **Report Issues**: GitHub Issues
- **Join the Community**: [Community forum/Discord - if applicable]

---

## 🙏 Acknowledgments

THE 42 POST was developed to make AI value alignment accessible to everyone. It builds on research in:
- Value-Sensitive Design
- Participatory Design  
- Cross-Cultural HCI
- AI Alignment and Safety

Special thanks to all creators who have contributed skills to the library.

---

**Version**: 1.0.0  
**Status**: Public Release ✅

*Making AI values transparent, verifiable, and human-centered.*

*让AI的价值观透明、可验证、以人为中心。*
