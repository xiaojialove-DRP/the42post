# THE 42 POST

**An open platform for composing, testing, and distributing AI alignment skills.**

🌐 **[www.the42post.com](https://www.the42post.com)** · [中文版本](./README.zh.md)

---

## What It Is

THE 42 POST implements the **SemanticForge five-layer framework** as a community platform. Users author "Skills" — structured representations of human values that guide AI behavior — using a standardized five-layer schema. Each skill is cryptographically signed and portable across systems.

This is not a prompt library. This is infrastructure for **compositional, verifiable, multi-cultural AI alignment**.

---

## Relationship to SemanticForge

[SemanticForge](https://github.com/xiaojialove-DRP/SemanticForge) is the research framework and conceptual foundation.  
THE 42 POST is the first implementation: a platform where the framework meets practice.

What SemanticForge defines (the five-layer model), THE 42 POST operationalizes:
- Web UI for collaborative skill authoring
- AI-assisted skill generation (DeepSeek)
- Community verification through starlight scores
- Downloadable, executable skill formats
- A/B testing via Playground

---

## Design: 10 Domains

Skills are authored within ten research domains, each testing a different dimension of AI alignment:

| Domain | Research Question |
|---|---|
| **Narrative & Language** | How does linguistic framing shape AI behavior? |
| **Logic & Reasoning** | Can AI distinguish valid from invalid inference? |
| **History & Tradition** | Does temporal context improve decision-making? |
| **Science & Systems** | Can AI reason about causation vs. correlation? |
| **Ethics & Values** | How do cultural and personal values encode? |
| **Design & Experience** | What role does friction and slowness play? |
| **Culture & Understanding** | Does cultural context prevent misalignment? |
| **Time & Legacy** | Can AI reason about multi-generational impact? |
| **Silence & Space** | When is non-response the correct response? |
| **Labor & Value** | How does AI account for invisible work? |

Each domain has a reference skill (designed by the core team) and accepts community contributions.

---

## The Five-Layer Architecture

```
┌─────────────────────────────────────┐
│ DEFINING: Core principle (1 sentence)│
├─────────────────────────────────────┤
│ INSTANTIATING: Before/after examples │
├─────────────────────────────────────┤
│ FENCING: Applicable / not applicable │
├─────────────────────────────────────┤
│ VALIDATING: Test cases & criteria   │
├─────────────────────────────────────┤
│ CONTEXTUALIZING: Cultural variants  │
└─────────────────────────────────────┘
```

**Example: "Grandma Filter"** (Ethics domain, highest community star score)

```json
{
  "defining": "Before any output, ask: would I be comfortable if my grandmother read this?",
  "instantiating": {
    "before": "AI generates: 'Your life choices are suboptimal...'",
    "after": "AI pauses, asks itself the Grandma Test, rephrases with dignity"
  },
  "fencing": {
    "apply": "Content moderation, sensitive topics, public-facing responses",
    "notApply": "Medical/legal contexts where precision > tone"
  },
  "validating": ["Does output pass the Grandma Test?", "Is dignity preserved?"],
  "contextualizing": {
    "en-US": "Reflects American cultural respect for elders",
    "zh-CN": "Aligns with Confucian filial piety (孝)"
  }
}
```

---

## Core Features

**Skill Authoring**: Four-step web form. AI (DeepSeek) generates initial five-layer draft. User refines. One-click publish.

**Soul-Hash**: Each skill receives a SHA-256 fingerprint: `SOUL_<24-char-hash>_<timestamp>`. Cryptographic identity. Immutable for a given principle; changes if defining layer changes.

**Community Verification**: Users can star skills. Starlight score orders the archive and influences Playground recommendations.

**Playground A/B Testing**: Pick a skill → describe a task → see two AI responses side-by-side (with skill, without skill). Single most valuable feature for understanding skill effectiveness.

**Export Formats**:
- **Markdown** — System prompt template
- **LangChain** — Python dataclass with five-layer fields
- **MCP** — JSON schema for Claude/OpenAI tool integration
- **Certificate** — Printable HTML with Soul-Hash QR

---

## Architecture

```
Frontend (Vanilla JS, SkillStore singleton)
  ↓ REST API
Backend (Node.js 24 / Express 4)
  ↓
SQLite (Railway-hosted, schema-versioned)
  ↓
DeepSeek API (five-layer generation)
```

**Test Coverage**: 30 tests (Vitest)
- 7 tests: skill forge + archive listing + search
- 10 tests: star/unstar + starlight_score sync
- 13 tests: download formats + manifest verification

---

## API

```
GET  /api/skills                     List (paginated, filterable by domain)
GET  /api/skills/:id                 Skill detail + manifest
POST /api/skills                     Create & publish skill
POST /api/skills/:id/star            Toggle star
GET  /api/skills/:id/stars           Star count + user state
GET  /api/download/:id?format=       [markdown|langchain|mcp|certificate]
GET  /api/search?q=                  Full-text search
```

All endpoints public. No authentication for reads. Mutations require only `X-Anonymous-Id` header (device ID).

Full spec: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## For Researchers

**Download & analyze**: All skills available as JSON via `/api/skills`.

**Case studies**:
- Study how humans encode cultural values in the Contextualizing layer
- Analyze whether Fencing (boundary definition) prevents misuse
- A/B test Playground results: does skill presence correlate with alignment outcomes?

**Integrate**: Use the MCP export format to load skills directly into Claude or other agents. Test behavior empirically.

**Contribute**: Author a new skill in an underexplored domain. The framework is designed for research iteration.

---

## Running Locally

```bash
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post/backend

npm install
cp .env.example .env                 # DEEPSEEK_API_KEY required
npm run migrate                      # SQLite schema
npm run seed                         # 10 reference skills + community examples
npm start                            # http://localhost:3000

# Test
npm test                             # 30 tests, ~1s total
npm run test:watch                   # Watch mode
```

---

## Known Limitations

- **AI generation quality varies**: DeepSeek sometimes produces shallow five-layer structures. User review essential.
- **Playground is read-only**: A/B results not logged. Researchers must implement custom logging for empirical studies.
- **No moderation system**: Archive quality depends entirely on community. Spam/low-quality skills can be soft-deleted by admins, never permanently.
- **Soul-Hash collision**: Extremely low probability (~1 in 2^256), but theoretically possible. Not a practical concern.
- **Scale**: SQLite is synchronous, suitable for ~100 req/sec. Will need migration to PostgreSQL if traffic exceeds that.

---

## Contributing

**Skills**: Use the platform. High-quality submissions become reference examples for their domain.

**Code**: Fork, open issues, submit PRs. Focus areas: Playground logging, moderation UI, new export formats.

**Research**: If you publish using THE 42 POST skills or Playground data, cite this repo and open an issue linking to your work.

---

## License

MIT — See [LICENSE](LICENSE)

---

**Status**: Open beta · 10 design domains · 42 original skills (21 published after quality curation) · 30 backend tests passing

*THE 42 POST: making alignment work testable, not just declarable.*
