# Core Concepts

Understanding THE 42 POST's key ideas and design philosophy.

---

## The Five-Layer Skill Framework

Every "Skill" in THE 42 POST follows a five-layer structure that makes AI values explicit and verifiable. The model writes each layer as a short, flowing paragraph (2-3 sentences) — not bullet lists or numbered test cases. Below is a real, currently-published Skill ("Nonviolent Communication" / 非暴力沟通) used as-is, not an invented example.

### 1️⃣ DEFINING
**What is the core principle?**

> 非暴力对话不是技巧汇编，而是一颗语义资本：它把四步法压缩成一种对话姿态——用观察代替评判，用感受代替指责，用需要代替抱怨，用请求代替命令。守护它，因为它是人际冲突中唯一能同时保全尊严与连接的路径。

### 2️⃣ INSTANTIATING
**What do real-world examples look like?**

> 体现时：用户抱怨同事总迟到，你回应"我注意到你最近三次会议都晚到10分钟，我感到有些困扰，因为我需要准时开始，你愿意调整一下时间吗？"错位时：用户说同样的事，你直接教他"你应该用非暴力沟通说……"，变成说教而非框架调用。

### 3️⃣ FENCING
**When should this skill apply? When should it NOT?**

> 适用信号：对话中出现"总是""从不""你让我"等绝对化指责，或情绪升温但双方仍愿沟通。不适用信号：对方处于严重情绪崩溃或权力不对等（如家暴），此时需先安全隔离。拉扯价值：诚实——有时直接表达愤怒比包装后的请求更真实。

### 4️⃣ VALIDATING
**How do we know the skill is actually being applied, not just recited?**

> 体验式问句：当你用这个框架时，对方是否感觉被理解而非被操控？精神已死的样子：机械背诵"当我看到……我感到……因为我需要……你愿意……吗？"而内心毫无同理。

### 5️⃣ CONTEXTUALIZING
**How does this skill vary across cultures?**

> 在集体主义文化（如东亚）中，表达个人需要可能被看作自私，因此框架需更强调"共同需要"或"关系需要"；在个人主义文化中，则更直接聚焦个体感受。

Alongside the five layers, every Skill also gets a **Ready-to-Use System Prompt** — a single, directly-usable prompt block synthesized from all five layers, meant to be pasted straight into an AI system's instructions rather than read as documentation.

---

## Why Five Layers?

The five-layer structure was designed to:

1. **Make values explicit** — Not hidden in training data
2. **Ensure testability** — Each layer can be verified
3. **Enable cultural adaptation** — Layer 5 acknowledges diverse perspectives
4. **Support iterative refinement** — You can edit any layer, or describe what to change and have it regenerated, before publishing

---

## Soul-Hash ID

Each published skill receives a **unique, permanent identifier**: the **Soul-Hash**.

### What is it?

A SHA-256 hash computed from the skill's title, its defining principle, the creator's email, and the publish timestamp — then formatted for display as `SOUL_<first 16 hex chars>_<timestamp>`.

### Why it matters

- **Immutability**: Tied to one specific piece of content at one specific moment
- **Traceability**: Always know which exact version of a skill is being referenced
- **Credit**: Skill creators get permanent attribution

### Format

```
Soul-Hash: SOUL_9362ea1dc2737737_1782463035900
```

(The 42 founding Skills seeded at launch use an older `42-sk-...` hash format from before this scheme existed — you may see both formats in the Archive.)

---

## Creator Card

A **shareable proof of contribution** — proof that you created a skill.

### What's in it?

- Your username (or "Anonymous")
- The skill you created
- Soul-Hash ID

### Why it matters

- **Proof of contribution** without requiring personal registration
- **Delivered by email** as a downloadable PNG image, attached to your publish-confirmation email — there is no separate web page or shareable card URL; the image itself is the artifact you share.

---

## The Skill Forge (4 Steps)

THE 42 POST's creation process is intentionally lightweight. The dialog has four stages: **IDEA → GENERATING → FORGE & EDIT → PUBLISHING**.

### Step 1: IDEA
*You provide the core concept, plus a minimal identity*

You write what you want AI to learn (or NOT learn) — your authentic perspective. Alongside it you provide a **username** (3-32 characters, must start with a letter or underscore, letters/digits/underscore only — this is what's shown on the Archive and Creator Card) and an **email** (where your Creator Card and skill files are sent). Both are required; there's no account or password behind them. You can optionally add your profession or field of study, to help the research side of the project understand who's contributing.

### Step 2: GENERATING
*AI drafts the five-layer structure*

DeepSeek generates the other four layers from your core idea. If DeepSeek is unavailable, Claude is used as an automatic fallback; if both are unavailable, a template-based draft is used instead so you're never blocked.

### Step 3: FORGE & EDIT
*You refine it, and set publishing terms*

Review what was generated. Edit any layer directly, or describe what you want changed and regenerate. Here you also choose whether commercial use and remixing are allowed, and check off the three Covenant commitments (publish revisions transparently, accept community critique, commit to no intentional harm).

### Step 4: PUBLISHING
*Share with the world*

Publish to the public Skill Archive. You get a Soul-Hash, and a Creator Card PNG arrives by email along with download links for the skill in three formats (Markdown, LangChain, MCP config).

---

## Playground vs. Archive

### 🎮 Playground
**Purpose**: See, side-by-side, whether a Skill actually changes an AI's behavior

- A Twin Test pulls a scenario prompt and runs it twice — once with the Skill applied, once without — and shows both answers labeled (not blind; you know which is which)
- You react with one tap: 🔥 clearly better / 😕 not better / 🤔 no difference — that's the entire rating step
- Limited to 7 cards per session (an anti-fatigue cap, not a paywall); "CLEAR ALL" resets it

### 📚 Archive
**Purpose**: Curated public library

- Published, finalized skills, browsable as a celestial map (skills as stars, same-domain skills connected, brightness reflecting real stars + Twin Test results) or a domain-filtered grid
- Read-only — you can view, star, download, and jump into a Twin Test
- Used for AI training and research

---

## The Lightweight Auth Philosophy

THE 42 POST doesn't require traditional account registration. Why?

**The Problem:**
- Registration forms create friction
- They demand personal information
- They suggest permanent commitment
- They contradict our "anonymous-by-default contribution" philosophy

**Our Solution:**
- **Username**: Required, but just a display handle — no password, ever
- **Email**: Where we send your Creator Card and skill files — never shown publicly

No passwords. No "forgot password" flows. No account dashboard.

---

## Why This Matters

Traditional AI alignment focuses on **hidden values** in training data. THE 42 POST flips this:

| Traditional | THE 42 POST |
|---|---|
| Values hidden | Values explicit |
| Decided by few | Co-created by many |
| Monocultural | Culturally diverse |
| Black-box | Fully verifiable |
| Static | Iteratively improved |

---

## What's NOT Here

To keep THE 42 POST focused, we intentionally exclude:

- **User profiles / account dashboards** — Unnecessary complexity
- **Skill versioning** — The database tracks a version number, but there's no edit-after-publish flow yet that would ever move it past 1
- **Monetization** — This is research, not a business
- **Competitive ranking** — All skills have equal standing; star counts and Twin Test results are signal, not a leaderboard

(Twin Test reactions are the one form of rating that *does* exist — see Playground above.)

---

## Next Steps

- **Create your first skill**: Visit [the42post.com](https://the42post.com) and click "Skill Forge"
- **Explore the Archive**: See how other creators structured their values
- **Read Full Details**: [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md)
- **Contribute Code**: [Contributing Guide](CONTRIBUTING.md)

---

*Making AI values transparent, verifiable, and human-centered.*
