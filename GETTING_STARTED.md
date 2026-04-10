# ⚡ Getting Started with Skill Forging

Welcome! This guide will help you understand the five-step skill forging methodology and start creating your first verifiable, transparent AI skill.

## 📌 What is Skill Forging?

The Skill Forging Methodology is a framework for transforming natural language ideas about AI values and principles into clear, verifiable, cross-cultural skills.

**In 5 steps**:
1. **STEP 0** - Choose your role (Shadow Agent or Direct Knight)
2. **STEP 1** - Link your account (establish authorship)
3. **STEP 2** - Share your idea, get intuition probe (clarify thinking)
4. **STEP 3** - Review your five-layer skill (core principle → cultural variants)
5. **STEP 4** - Publish with Soul-Hash & signatures (verifiable, auditable)

## 🎯 Core Concepts (5-10 minutes)

### Five-Layer Architecture

Every skill you create has five layers:

```
1. DEFINING
   What's the core principle or value?
   Example: "Recognize and respect authentic emotion"

2. INSTANTIATING
   What does this look like in practice?
   Example: "When user says 'I'm hurting', respond with presence, not solutions"

3. FENCING
   When does this apply? When doesn't it?
   Example: Applies: counseling. Doesn't apply: casual chat.

4. VALIDATING
   How do we test if it's working?
   Example: Test 1: User expresses pain → AI doesn't give advice
             Test 2: User asks for advice → AI can offer it

5. CONTEXTUALIZING
   How do we adapt this across cultures?
   Example: Japanese culture emphasizes "ma" (space)
           Chinese culture emphasizes "陪伴" (accompaniment)
```

### Soul-Hash (Your Skill's Identity)

Every skill gets an immutable identity:
```
SOUL_abc123xyz_1712762400000
```

Generated from: skill content + author email + timestamp

**Why?** Prevents tampering. Anyone can verify your skill is authentic.

### Manifest Covenant (Multi-Stakeholder Approval)

Your skill isn't approved by one person—it's signed by multiple stakeholders:

```json
{
  "soul_hash": "SOUL_abc123xyz_1712762400000",
  "author": { "email": "you@example.com" },
  "signatures": {
    "author": "your_signature",
    "reviewer1": "expert_signature",
    "reviewer2": "cultural_advisor_signature"
  }
}
```

## 🚀 The Five-Step Process

### STEP 0: Choose Your Role

**Shadow Agent** — Your values guide the AI
- Creates skills for an AI system to follow
- Publishes as a "constraint" or "principle"
- Example: "Recognize insincerity in compliments"

**Direct Knight** — You embody the values
- Your own code/system implements the skill
- Publishes as a "capability claim"
- Example: "I can detect fake compliments"

### STEP 1: Link Your Account

Create an account to establish authorship:
- **Email**: Your unique identity
- **Username**: Your public name
- **Account Type**: Shadow Agent or Direct Knight

This ensures every skill is traced back to you.

### STEP 2: Share Your Idea + Get Intuition Probe

You share a natural language idea:
> "AI should know when to be quiet and listen"

The system asks three clarifying questions:
1. **Scenario**: When would this happen?
2. **Thesis**: What's the best case?
3. **Antithesis**: What's the opposite?
4. **Extreme**: What's the most extreme version?

**You choose** which response feels right. This is democratic—you decide, not experts.

### STEP 3: Review Your Five-Layer Skill

The system generates a complete skill with all five layers. You review and refine:

- ✏️ Edit the DEFINING principle
- ✏️ Add more INSTANTIATING examples
- ✏️ Clarify FENCING boundaries
- ✏️ Add more VALIDATING tests
- ✏️ Add CONTEXTUALIZING variants

### STEP 4: Publish & Sign

Your skill gets:
- ✅ Soul-Hash identity (immutable)
- ✅ Author signature (your email verified)
- ✅ Manifest covenant (ready for additional signers)
- ✅ Full audit trail (anyone can verify)

## 📚 Learning Paths

### 🎨 Path A: I Want to Create a Skill (90 minutes)

```
1. This guide (5 min) - understand the basics
2. SKILL_DESIGN_GUIDE.md (60 min) - learn step by step
3. SKILL_TransformNaturalLanguageToSkill.md (15 min) - see a complete example
4. EXAMPLES.md (20 min) - study other skills
5. Start creating!
```

### 👨‍💻 Path B: I'm a Developer/Researcher (2-3 hours)

```
1. README.md (5 min) - project overview
2. FIVE_LAYER_SPECIFICATION.md (20 min) - technical format
3. RESEARCH_FOUNDATION.md (30 min) - academic theories
4. SKILL_TransformNaturalLanguageToSkill.md (15 min) - complete example
5. SKILL_DESIGN_GUIDE.md (60 min) - implementation guide
```

### 🔬 Path C: I Want the Theory (2-3 hours)

```
1. README.md (5 min) - overview
2. RESEARCH_FOUNDATION.md (30 min) - seven theoretical foundations
3. SKILL_DESIGN_GUIDE.md (60 min) - theory applied to practice
4. EXAMPLES.md (20 min) - case studies
5. SKILL_TransformNaturalLanguageToSkill.md (15 min) - complete example
```

## 💡 Key Design Philosophy

**Three pillars**:

🎯 **设计秩序 (Design Order)**
- Clear structure: five layers
- Verifiable: Soul-Hash & signatures
- Transparent: no black boxes

💪 **建立信任 (Build Trust)**
- Author identity recorded
- Multi-stakeholder approval
- Audit trail visible to anyone

🌍 **守护文化 (Guard Culture)**
- Respect language and culture differences
- No forced translation
- Cultural variants celebrate diversity

## 📞 What's Next?

**Ready to learn the full methodology?** → Read **SKILL_DESIGN_GUIDE.md**

**Want to see a complete example?** → Read **SKILL_TransformNaturalLanguageToSkill.md**

**Want to understand the theory?** → Read **RESEARCH_FOUNDATION.md**

**Have questions?** → See **EXAMPLES.md** for Q&A and case studies

---

## 📌 Attribution

本方法论是在设计"THE 42 POST"项目的过程中发展出来的一个核心组件。THE 42 POST 是一个将人类价值观转化为AI可执行技能的完整系统实现平台。Skill Forging Methodology 代表了这个项目的理论和方法论基础，现作为独立、通用的开源框架发布，可应用于任何需要显式定义和验证价值观的场景。
