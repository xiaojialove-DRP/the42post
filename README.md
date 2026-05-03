# THE 42 POST

**A community platform for forging, sharing, and verifying human values as AI-ready Skills.**

🌐 **[www.the42post.com](https://www.the42post.com)** · [中文版本](./README.zh.md)

---

## What Is This?

AI systems are shaped by values — but whose values, structured how, verifiable by whom? THE 42 POST is an open platform where anyone can author a **Skill**: a structured, cryptographically-signed representation of a human value that AI systems can read, test against, and act on.

A Skill is not a prompt. It is a five-layer document — principle, examples, boundaries, tests, cultural variants — that makes a value **explicit, auditable, and portable** across any AI system.

The name comes from *The Hitchhiker's Guide to the Galaxy*. 42 is the answer to life, the universe, and everything. We're still working on the question — but at least we're writing it down.

---

## The Five-Layer Skill Architecture

Every Skill forged on this platform follows the same structure:

| Layer | What It Defines |
|---|---|
| **Defining** | The core principle in one clear statement |
| **Instantiating** | Before/after examples showing the skill in action |
| **Fencing** | When to apply it — and when explicitly not to |
| **Validating** | Test cases: how to know if it's working |
| **Contextualizing** | Cultural adaptations and contextual variants |

**Example — "Grandma Filter"** *(most-starred skill, ethics domain)*
> *Before outputting anything, ask: would I be comfortable if my grandmother read this?*
> Applicable when: content moderation, sensitive topics, public-facing AI responses.
> Not applicable when: medical/legal precision matters more than tone.

Each published Skill receives a **Soul-Hash** — a SHA-256 fingerprint of its core content, author, and timestamp. `SOUL_4f2a…_1745678400000`. The hash changes if the principle changes. It doesn't change if formatting does. This makes skills verifiable and citeable.

---

## What You Can Do

### Forge a Skill
Walk through a four-step guided flow. Describe your value; the AI generates the five-layer structure; you review and publish. Takes 5–10 minutes. No account required.

### Browse the Archive
21 community skills across 9 domains: ethics, design, narrative, culture, science, silence, history, time, labor. Searchable by keyword or domain. Sorted by community starlight score.

### Test in the Playground
Pick a skill from the archive, write a task, and see two AI responses side by side — one with the skill applied, one without. The comparison is the product.

### Download
Every published skill exports as:
- **Markdown** — ready to paste as a system prompt
- **LangChain** — Python file with the full five-layer schema
- **MCP** — JSON config for tool-compatible agents
- **Creator Card** — printable HTML certificate with Soul-Hash

---

## Why Open Source?

The alignment problem is not a technical problem that one lab will solve. It is a human problem that requires human input — from different cultures, disciplines, and lived experiences. Keeping Skills proprietary would defeat the purpose.

We open-source the platform so that:
- Communities can run their own Skill archives
- Researchers can study what values people actually try to encode
- Developers can integrate Skills into their own agents without permission
- The format can evolve through use, not through committee

---

## Architecture

```
Frontend (Vanilla JS + CSS)
    ↓ REST API
Backend (Node.js / Express)
    ↓
SQLite (Railway-hosted)
    ↓
DeepSeek API  ←  five-layer generation at forge time
```

**Stack:** Node 24 · Express 4 · better-sqlite3 · DeepSeek API · Vitest (30 tests)  
**Deployment:** Railway · Custom domain: www.the42post.com  
**Auth:** Anonymous by default (`X-Anonymous-Id` header). No account required for forge, star, or download.

Full schema and data flows: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Running Locally

```bash
# Clone
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post/backend

# Install & configure
npm install
cp .env.example .env          # add DEEPSEEK_API_KEY
npm run migrate               # initialize SQLite schema
npm run seed                  # seed 21 community skills
npm start                     # http://localhost:3000

# Tests
npm test                      # 30 tests — forge / star / download flows
```

---

## API

All endpoints are public. Mutations (forge, star) require only an anonymous device ID header.

```
GET  /api/skills                    List published skills (paginated, searchable)
GET  /api/skills/:id                Skill detail
POST /api/skills                    Forge and publish a new skill
POST /api/skills/:id/star           Star or unstar
GET  /api/skills/:id/stars          Star count + caller's state
GET  /api/download/:id?format=      markdown | langchain | mcp | certificate
GET  /api/skills/:id/manifest       Verify soul_hash and covenant signatures
GET  /api/search?q=                 Full-text search across title and description
```

Full reference: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## Contributing

**Skill authors** — The best contribution is a well-crafted Skill. Use the platform.

**Developers** — Bug fixes, new export formats, improved Playground comparisons. Open a PR.

**Researchers** — If you use Skills in a paper or experiment, open an issue to add it to the citations list.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

---

## License

MIT — See [LICENSE](LICENSE)

---

**Status:** Open beta · 21 community skills · 30 backend tests passing

*THE 42 POST is not the answer. It's infrastructure for writing better questions.*
