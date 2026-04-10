# 🛡️ 42 POST — Skill Forge

**A Human-Centered Framework for AI Value Alignment**

| 中文 | English |
|------|---------|
| 设计秩序、建立信任、守护文化 | Design Order, Build Trust, Guard Culture |

---

## 📌 What Is 42 POST?

THE 42 POST is a platform where humans define skills—structured value principles—that AI agents can equip. 

Unlike traditional AI alignment that happens in training data (black box), THE 42 POST makes value alignment **transparent, verifiable, and democratic**.

**Core Philosophy**:
- **表皮 (Epidermis - User-Facing)**: Warm, intuitive, low-friction experience with 3-step forge process + intuition probe
- **内胆 (Inner Lining - Machine-Executable)**: Rigorous, verifiable machine execution with five-layer architecture, signatures, and manifest records

---

## 🎯 The Problem We Solve

### Status Quo
- AI values are embedded in training data (opaque)
- Users can't verify what principles an AI actually follows
- AI behavior is unpredictable across cultural contexts
- No way to prove AI respects certain boundaries

### Our Solution
A **Five-Layer Skill Architecture** that transforms natural language values into verifiable, culturally-aware AI capabilities:

```
"AI should know when to keep silent"
         ↓
    [Five-Layer Forging Process]
         ↓
┌─────────────────────────────────┐
│ 1. DEFINING    → Core principle │
│ 2. INSTANTIATING → Concrete examples │
│ 3. FENCING     → Clear boundaries │
│ 4. VALIDATING  → Test cases │
│ 5. CONTEXTUALIZING → Cultural variants │
└─────────────────────────────────┘
         ↓
  Verifiable, auditable skill
  with Soul-Hash identity
  and multi-stakeholder signatures
```

---

## 🏗️ Project Structure

### Core Documentation
- **[FIVE_LAYER_SPECIFICATION.md](docs/)** — Complete architecture specification
- **[NATURAL_LANGUAGE_TO_SKILL.md](docs/)** — How natural language becomes five-layer skills
- **[FORGING_METHODOLOGY.md](docs/)** — Step-by-step transformation rules
- **[EXAMPLES.md](docs/)** — Case studies (Silence, Authenticity, Compassion)

### Implementation
- **[backend/](backend/)** — Node.js + PostgreSQL reference implementation
  - Express.js REST API (29 endpoints)
  - Claude API integration for intelligent generation
  - Soul-Hash generation & manifest signing
  
- **[day1/](day1/)** — Frontend (User-facing interface)
  - STEP 0: Choose forge mode (Shadow Agent vs Direct Knight)
  - STEP 1: Account linking (copyright/ownership)
  - STEP 2: Intuition probe + skill generation
  - STEP 3: Refinement
  - STEP 4: Publishing with manifest

### Specification & Rules
- **[specification/](specification/)** — JSON rules for each five-layer component
- **[templates/](templates/)** — JSON templates for skills, probes, manifests
- **[examples/](examples/)** — Complete worked examples

---

## 🎯 Core Concepts

### Five-Layer Architecture

Each skill is composed of five layers, each with specific semantic rules:

| Layer | What It Does | Rules |
|-------|--------------|-------|
| **DEFINING** | Core principle statement | Must be value-based, not prescriptive |
| **INSTANTIATING** | Concrete exemplars | Must perfectly embody DEFINING |
| **FENCING** | Clear boundaries | Specifies when applies/doesn't apply |
| **VALIDATING** | Test cases & metrics | Verifiable against FENCING |
| **CONTEXTUALIZING** | Cultural adaptations | Preserves core while adapting form |

### Soul-Hash Identity

Every skill gets an immutable identifier:
```
SOUL_[24-char-hash]_[timestamp]
```

Derived from: principle + author_email + timestamp
- **Immutable** (cannot be changed without generating new hash)
- **Verifiable** (can be validated against manifest)
- **Unique** (no two identical skills have same hash)

### Manifest Covenant

Every published skill includes a signed record containing:
```json
{
  "soul_hash": "SOUL_abc123xyz_1712762400000",
  "five_layer": { /* complete structure */ },
  "author": { "username": "...", "email": "..." },
  "covenant": {
    "author_signature": "hmac_sha256_hex",
    "covenant_signatures": [ /* multi-stakeholder approval */ ]
  }
}
```

---

## 🚀 Quick Start

### Option 1: Understand the Methodology
```bash
1. Read: docs/FIVE_LAYER_SPECIFICATION.md
2. Study: docs/EXAMPLES.md (Silence case study)
3. Reference: docs/FORGING_METHODOLOGY.md
```

### Option 2: Run the Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with ANTHROPIC_API_KEY
npm run migrate
npm run dev
# Server runs on http://localhost:3000
```

### Option 3: Use the Frontend
```bash
cd day1
python3 -m http.server 8000
# Frontend runs on http://localhost:8000
```

---

## 📖 Documentation

### For Understanding
- **[FIVE_LAYER_SPECIFICATION.md](docs/FIVE_LAYER_SPECIFICATION.md)** - What is the five-layer architecture?
- **[FORGING_METHODOLOGY.md](docs/FORGING_METHODOLOGY.md)** - How does natural language become skills?
- **[EXAMPLES.md](docs/EXAMPLES.md)** - Real case studies (Silence, Authenticity, Compassion)

### For Implementation
- **[backend/README.md](backend/README.md)** - Backend setup & API reference
- **[FRONTEND_BACKEND_INTEGRATION.md](FRONTEND_BACKEND_INTEGRATION.md)** - Phase-by-phase integration guide
- **[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)** - Technical architecture
- **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** - API endpoint reference

### For Getting Started
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - 5-minute quick start

---

## 🔄 The Forging Process

### User Journey (Skill Creator)

```
STEP 0: Choose Forge Mode
├─ Shadow Agent: "I have an idea"
└─ Direct Knight: "I have an Agent"

STEP 1: Account Linking
└─ Register with email + username
   (This becomes the copyright owner)

STEP 2: Intuition Probe
├─ Share your instinct/value
│  e.g., "AI should know when to be silent"
├─ System generates 3 contrasting probes
│  (Thesis / Antithesis / Extreme)
└─ You choose one (this unlocks the five-layer)

STEP 3: Generate Five-Layer
├─ DEFINING: Core principle
├─ INSTANTIATING: Concrete examples
├─ FENCING: Boundaries
├─ VALIDATING: Test cases
└─ CONTEXTUALIZING: Cultural variants

STEP 4: Refinement
└─ Optional: Adjust boundaries, use cases, disallowed uses

STEP 5: Publish
├─ Skill gets Soul-Hash identifier
├─ Manifest is signed with author signature
└─ Becomes verifiable & auditable
```

---

## 🎯 Design Philosophy

### 设计秩序 (Design Order)
- Five-layer structure provides semantic clarity
- Manifest covenant creates audit trails
- Signature chains prove authorship
- Database persistence ensures durability

### 建立信任 (Build Trust)
- Email verification required before publishing
- Author + email + account_type recorded immutably
- All skills have verifiable signatures
- Tamper-proof manifest records
- Transparent rule-based generation (not black-box AI)

### 守护文化 (Guard Culture)
- Cultural variants adapted by language/context
- Boundary respect prevents misapplication
- Collective signing enables multi-stakeholder approval
- Linguistic untranslatability preserved (not flattened)

---

## 💻 Technology Stack

### Frontend (表皮)
- HTML5 + CSS3 + Vanilla JavaScript
- i18n support (English & Chinese)
- No external dependencies (self-contained)

### Backend (内胆)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **AI**: Anthropic Claude API
- **Authentication**: JWT + bcryptjs
- **Security**: HMAC-SHA256 signing

---

## 📊 Project Status

### ✅ Completed
- [x] Five-layer architecture specification
- [x] Frontend UI (v=112)
- [x] Backend implementation (Express + PostgreSQL)
- [x] Claude API integration
- [x] Soul-Hash & manifest signing
- [x] Comprehensive documentation

### 🔄 In Progress
- [ ] Frontend-backend integration (5 phases)
- [ ] Production deployment
- [ ] Multi-stakeholder covenant UI

### 📋 Planned
- [ ] Agent binding for Direct Knight mode
- [ ] OpenRAIL licensing integration
- [ ] Skill versioning with diff visualization
- [ ] Community features (comments, forks)
- [ ] Constitutional AI enhancements

---

## 🤝 Contributing

THE 42 POST is open-source. We welcome:
- **Philosophers**: Help refine the five-layer semantics
- **Developers**: Implement the specification
- **Cultural Experts**: Adapt skills to different contexts
- **UX Designers**: Improve the user experience
- **Researchers**: Validate the approach

---

## 📝 License

MIT License — See [LICENSE](LICENSE) file

---

## 👥 Core Philosophy Contributors

- **维特根斯坦 (Ludwig Wittgenstein)** — "Whereof one cannot speak, thereof one must be silent"
- **张祖锦** — Design philosophy: 设计秩序、建立信任、守护文化

---

## 📞 Questions?

See [GETTING_STARTED.md](GETTING_STARTED.md) for quick setup
See [docs/](docs/) for comprehensive documentation
See [backend/README.md](backend/README.md) for technical details

---

**Version**: 0.1.0  
**Last Updated**: April 10, 2024  
**Status**: Early Development 🚀

*The future of AI alignment is transparent, verifiable, and human-centered.*
