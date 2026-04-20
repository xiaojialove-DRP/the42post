# THE 42 POST 🛸

**An Open-Source Platform for Human-Centered AI Value Alignment**

Democratizing how humans define, share, and verify their values for AI systems.

> **Built on [SemanticForge](https://github.com/xiaojialove-DRP/SemanticForge)** — THE 42 POST implements SemanticForge's five-layer framework as a community platform where anyone can create and share AI-aligned skills.

---

## 🎯 What is THE 42 POST?

THE 42 POST is a web platform that enables anyone to create "Skills" — structured, verifiable representations of human values, principles, and ethical guidelines — that can be used to improve AI behavior.

Instead of leaving AI values as implicit in training data, THE 42 POST makes them:
- **Explicit** — Values are clearly defined in a five-layer framework
- **Shareable** — Anyone can discover and use community-created skills
- **Verifiable** — Each skill includes test cases and validation criteria
- **Multi-Cultural** — Skills include context-specific adaptations across cultures

### Key Features

- 🛠️ **Skill Forging Workshop** — A guided 4-step process to transform your ideas into structured skills
- 📚 **Skill Library** — Discover 42+ example skills created by designers, ethicists, and AI researchers
- 👁️ **Preview & Review** — See the complete five-layer structure before publishing
- ✏️ **Edit & Regenerate** — Refine skills based on feedback from the AI
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

1. **Democratize AI alignment** — Give everyone—from ordinary users to designers, ethicists, and domain experts—a voice in AI values. No special expertise required.
2. **Make values transparent** — Replace black-box alignment with explicit, auditable principles
3. **Enable community verification** — Use structured skills with test cases that anyone can validate
4. **Support cultural diversity** — Let different communities adapt principles to their contexts

---

## 🏗️ System Architecture

THE 42 POST connects creators, the skill library, and AI systems through a clean, modular architecture:

```
┌─────────────────────────────────────────────────────────┐
│         🌐 Web Browser (Frontend)                       │
│  Skill Forge | Library | Arena | Dashboard              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────┐
│      🔌 API Server (Node.js/Express Backend)            │
│  /auth | /skills | /forge | /search | /email | /agents  │
└──────────────────────┬──────────────────────────────────┘
         ┌─────────────┼─────────────┬──────────────┐
         │             │             │              │
    ┌────▼────┐ ┌─────▼──────┐ ┌───▼──────┐  ┌───▼─────┐
    │ Database │ │ Claude API │ │SMTP Mail │  │Analytics│
    │SQLite/PG│ │(Anthropic) │ │ Service  │  │Tracking │
    └──────────┘ └────────────┘ └──────────┘  └─────────┘
```

**For detailed architecture diagrams** (system design, data flows, database schema, deployment), see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🚀 How to Use THE 42 POST

### For Everyone (Getting Started)

1. **Visit the platform**: Open http://localhost:8080 (or your deployed instance)
2. **Browse the Skill Library**: Explore 42+ example skills created by designers, ethicists, and researchers
3. **Learn from Examples**: Read the five-layer structure of existing skills to understand the approach
4. **Try the Shadow Agent**: Experience how skills influence AI behavior in conversations
5. **Start Creating**: Click "Skill Forge" to create your first skill

### For Skill Discoverers (Using Skills)

1. **Search the Library**: Find skills by domain, creator, or keyword
2. **Read Skill Details**: Each skill includes:
   - The creator's motivation and story
   - Five-layer structure (DEFINING, INSTANTIATING, FENCING, VALIDATING, CONTEXTUALIZING)
   - Real-world usage examples
   - Community feedback and ratings
3. **Experience Skills**: Try the "Shadow Agent" to see how a skill guides AI behavior
4. **Provide Feedback**: Rate skills and suggest improvements
5. **Share Skills**: Use skills in your own AI projects or recommend them to others

### For Creators (Forging Skills)

1. **Start the Forge Workshop**: Click "Skill Forge" to enter the 4-step process:
   
   **Step 1️⃣  IDEA** (2-3 min)
   - Input your username and email
   - Describe your core idea or value principle
   - Select the creative dimension that best fits your idea
   
   **Step 2️⃣  GENERATE** (1-2 min)
   - Watch the system generate your five-layer skill structure:
     - **DEFINING**: Core principle statement
     - **INSTANTIATING**: Real-world examples of the principle
     - **FENCING**: When to apply and when NOT to apply
     - **VALIDATING**: Test cases to verify the principle
     - **CONTEXTUALIZING**: How it adapts across different cultures
   - Clear visual feedback shows you the forging process

   **Step 3️⃣  REVIEW** (3-5 min)
   - Preview your complete skill with all five layers
   - Edit the skill name and definition as needed
   - Optionally provide feedback to regenerate any part
   - View the full structure in an interactive preview modal

   **Step 4️⃣  PUBLISH** (1 min)
   - Choose licensing options (commercial use, remixing rights)
   - Accept the creator covenant
   - Publish to the library
   - Receive your permanent Soul-Hash identity
   - Download your commemorative Creator Card
   - Receive confirmation email

2. **After Publishing**: 
   - Your skill is added to the public library
   - Monitor who uses your skill
   - Receive feedback from researchers and AI developers
   - Iterate on your skill based on real-world usage

### For Researchers (Studying & Validating Skills)

Researchers can use THE 42 POST to study human values in AI systems and validate the effectiveness of structured skill definitions.

**Research Workflow:**

1. **Explore the Skill Library**
   - Browse 42+ example skills across different domains
   - Analyze the five-layer structure of each skill
   - Understand how different creators approach value definition
   - Export skill data in JSON format for analysis

2. **Study Skill Effectiveness**
   - Test how skills influence AI behavior using the "Shadow Agent"
   - Run custom test cases against the VALIDATING layer
   - Compare how the same principle is instantiated across cultures
   - Measure alignment between intended values and actual AI outputs

3. **Validate Skill Quality**
   - Use the FENCING layer to test boundary cases
   - Verify the CONTEXTUALIZING layer captures cultural nuances
   - Provide feedback on skill clarity and applicability
   - Suggest improvements through the feedback system

4. **Conduct Comparative Studies**
   - Analyze patterns across multiple skills in a domain
   - Compare how different skill creators approach similar problems
   - Study the evolution of skills through iterations
   - Extract insights about value prioritization across cultures

5. **Publish Research Findings**
   - Forge research-oriented skills based on findings
   - Document case studies in skill descriptions
   - Create reference skills for your research domain
   - Contribute to the growing body of human-centered AI research

**API Access for Research:**
- Access skill data via REST API (`/api/skills`, `/api/search`)
- Get full five-layer structure in JSON format
- Query skills by domain, creator, or tags
- Download batches of skills for large-scale analysis

**Example Research Questions You Can Answer:**
- How consistently do creators define values across cultures?
- What makes a skill's test cases more effective?
- How do skills in different domains differ in structure?
- What cultural adaptations are most important for global AI?

---

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
