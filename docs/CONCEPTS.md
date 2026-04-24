# Core Concepts

Understanding THE 42 POST's key ideas and design philosophy.

---

## The Five-Layer Skill Framework

Every "Skill" in THE 42 POST follows a five-layer structure that makes AI values explicit and verifiable.

### 1️⃣ DEFINING
**What is the core principle?**

A clear, concise statement of the value in 1-2 sentences.

**Example:**  
*"AI should recognize when a compliment feels hollow or manipulative, rather than accepting all positive language as genuine."*

### 2️⃣ INSTANTIATING
**What do real-world examples look like?**

Concrete before/after scenarios showing how the skill manifests.

**Example:**
```
SCENARIO: A user says "Your performance is excellent!" but the tone is sarcastic.
WITHOUT SKILL: AI responds positively, missing the sarcasm.
WITH SKILL: AI acknowledges the contradiction and responds appropriately.
```

### 3️⃣ FENCING
**When should this skill apply? When should it NOT?**

Clear boundaries prevent misapplication.

**Example:**
```
DO APPLY: In conversational contexts where tone matters
DO NOT APPLY: In formal policy documents (where all text is literal)
DO NOT APPLY: With users who explicitly prefer literal interpretation
```

### 4️⃣ VALIDATING
**How do we test if the skill works?**

Measurable criteria to verify the AI is learning correctly.

**Example:**
```
TEST CASE 1: Identify sarcasm in 10 voice transcripts (80% accuracy)
TEST CASE 2: Distinguish sarcasm from genuine compliments (90% accuracy)
SUCCESS METRIC: AI classification matches human judgment in 85%+ of cases
```

### 5️⃣ CONTEXTUALIZING
**How does this skill vary across cultures?**

Recognition that values aren't universal; contexts matter.

**Example:**
```
WESTERN CONTEXT: Direct sarcasm is common; AI should detect it
ASIAN CONTEXT: Indirect language is common; subtlety matters more
GLOBAL PERSPECTIVE: Some cultures value sarcasm, others avoid it
```

---

## Why Five Layers?

The five-layer structure was designed to:

1. **Make values explicit** — Not hidden in training data
2. **Ensure testability** — Each layer can be verified
3. **Enable cultural adaptation** — Layer 5 acknowledges diverse perspectives
4. **Support iterative refinement** — Easy to improve each layer independently
5. **Facilitate collaboration** — Multiple creators can contribute to one skill

---

## Soul-Hash ID

Each published skill receives a **unique, permanent identifier**: the **Soul-Hash**.

### What is it?

A deterministic hash based on the skill's five-layer content. If the content changes, the hash changes.

### Why it matters

- **Immutability**: You can cite a specific version of a skill
- **Traceability**: Always know which skill version an AI was trained on
- **Verification**: Prove that a skill hasn't been tampered with
- **Credit**: Skill creators get permanent attribution

### Format

```
Soul-Hash: 42-sk-a7f3c2d1e8f9b4a6c5e2f3d8a1b4c7e9
```

---

## Creator Card

A **shareable proof of contribution** — proof that you created a skill.

### What's in it?

- Your name (or anonymous)
- The skill you created
- Publication date
- Soul-Hash ID
- Unique shareable URL: `/creator-card/:cardId`

### Why it matters

- **Proof of contribution** without requiring personal registration
- **Shareable** — Send to others, post on social media
- **Verifiable** — Others can check it was genuinely published
- **Historic** — Permanent record of your contribution to AI alignment

---

## The Skill Forge (4 Steps)

THE 42 POST's creation process is intentionally lightweight.

### Step 1: IDEA
*User provides the core concept*

You write what you want AI to learn (or NOT learn). This is your authentic perspective.

### Step 2: GENERATING
*AI creates the five-layer structure*

The system uses Claude AI to generate the other four layers based on your core idea. Think of it as collaborative brainstorming.

### Step 3: FORGE & EDIT
*You refine and make it yours*

Review what the AI created. Edit, improve, add your unique perspective. You maintain full creative control.

### Step 4: PUBLISHING
*Share with the world*

Publish to the public Skill Archive. Your Creator Card is generated. Email notification sent. You're now part of the AI alignment movement.

---

## Playground vs. Archive

### 🎮 Playground
**Purpose**: Exploration and experimentation

- Interactive canvas where you can:
  - Combine multiple skills
  - Test interactions between skills
  - Draft new skill ideas
  - Save your explorations as canvas drafts
  
- **Not published yet** — purely for personal exploration
- **Drafts can be saved** and returned to later

### 📚 Archive
**Purpose**: Curated public library

- Published, finalized skills
- Read-only (you can view, star, download)
- Searchable and filterable
- Used for AI training and research

---

## The Lightweight Auth Philosophy

THE 42 POST doesn't require traditional account registration. Why?

**The Problem:**
- Registration forms create friction
- They demand personal information
- They suggest permanent commitment
- They contradict our "anonymous contribution" philosophy

**Our Solution:**
- **Name**: Any name you want (can be "Anonymous")
- **Email**: Where we send your Creator Card and skill files
  
That's it. No passwords. No "forgot password" flows. No account dashboard.

### For Researchers
If you're using THE 42 POST API, you can filter skills by creator email (anonymized).

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

- **User profiles** — Unnecessary complexity
- **Comments/ratings** — Can add later
- **Skill versioning** — Planned for future
- **Monetization** — This is research, not a business
- **Competitive ranking** — All skills have equal standing

---

## Next Steps

- **Create your first skill**: Visit [the42post.com](https://the42post.com) and click "Skill Forge"
- **Explore the Archive**: See how other creators structured their values
- **Read Full Details**: [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md)
- **Contribute Code**: [Contributing Guide](CONTRIBUTING.md)

---

*Making AI values transparent, verifiable, and human-centered.*
