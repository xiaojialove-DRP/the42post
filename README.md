# 🛠️ Skill Forging Methodology — 技能铸造方法论

**将自然语言的想法转化为清晰、可验证、跨文化适用的技能**

---

## 📌 项目说明

这是**技能铸造方法论**（Skill Forging Methodology）的开源发布。

这是一套通用的、独立的框架，用于将任何人的价值观想法转化成清晰、可验证、跨文化适用的"技能"。

**核心理念**：
- ✅ 民主化 — 任何人都能定义价值观，不仅仅是专家
- ✅ 透明化 — 价值观不再是黑盒，而是明确可见
- ✅ 可验证 — 有明确的测试和标准来验证价值观是否被遵循
- ✅ 跨文化 — 同样的价值观在不同文化中能被正确理解

**应用场景**：
- 心理咨询师定义"同情心原则"
- 设计师定义"美学标准"  
- 工程师定义"代码质量标准"
- 团队定义"企业价值观"
- AI系统定义"伦理原则"

---

## 🎯 什么是五步技能铸造模式？

THE 42 POST 是一个**将人类价值观转化为AI可执行技能**的系统。

不同于传统AI对齐（黑盒训练数据），THE 42 POST 通过**五步铸造流程**，让AI的价值观变得：
- ✅ **透明可见** — 不再是黑盒
- ✅ **可以验证** — 有明确的测试用例
- ✅ **民主定义** — 任何人都能参与

### 五步技能铸造流程：

```
你的价值观想法
     ↓
【STEP 0】选择铸造模式（影子代理 vs 直接骑士）
     ↓
【STEP 1】账户链接（确定你的身份和版权）
     ↓
【STEP 2】直觉探针（系统帮你澄清你的想法）
     ↓
【STEP 3】五层架构生成（自动生成可信的技能）
     ├─ DEFINING：核心原则
     ├─ INSTANTIATING：具体例子
     ├─ FENCING：应用边界
     ├─ VALIDATING：测试用例
     └─ CONTEXTUALIZING：文化适配
     ↓
【STEP 4】发布与签名（获得Soul-Hash和多方署名）
     ↓
可验证、可审计的AI技能

---

## ❌ 现状问题

当前AI系统的困境：
- ❌ AI的价值观隐含在训练数据中（黑盒）
- ❌ 用户无法验证AI遵循哪些原则
- ❌ 同一个AI在不同文化中表现不一致
- ❌ 无法证明AI尊重某些边界

## ✅ 我们的解决方案

**五步技能铸造模式**：将自然语言的价值观转化为可验证的AI技能

**实际例子**：

```
你的想法：
"AI应该知道何时保持沉默"

      ↓ 【STEP 2】直觉探针
    系统问你三个问题，澄清你的想法

      ↓ 【STEP 3】五层架构
    DEFINING: 识别真实的痛苦，不最小化它
    INSTANTIATING: 用户说"我很难过" → AI不给出"5个应对步骤"，而是陪伴
    FENCING: 何时应用？心理咨询场景。不应用？日常闲聊
    VALIDATING: 测试用例1: 用户说痛苦 → AI没有说教
                        测试用例2: 失败案例 → AI不能给出快速建议
    CONTEXTUALIZING: 
      - 日本文化：强调"间"（空白）的价值
      - 中文文化：强调"陪伴"而不是"解决"

      ↓ 【STEP 4】发布
    获得Soul-Hash身份：SOUL_abc123xyz_1712762400000
    多方签名：作者 + 心理学家 + 文化顾问的签名
    
      ↓
    完成！现在这个技能可以被AI系统使用、审计和信任
```

---

## 📖 快速入门

### 【核心文档】— 4个文件，90分钟完成

1. **[GETTING_STARTED.md](GETTING_STARTED.md)** — 5分钟
   → 了解五步流程的整体概览

2. **[SKILL_DESIGN_GUIDE.md](SKILL_DESIGN_GUIDE.md)** — 60分钟
   → 手把手教你如何铸造一个技能
   
3. **[EXAMPLES.md](EXAMPLES.md)** — 20分钟
   → 看成功的技能例子

4. **[RESEARCH_FOUNDATION.md](RESEARCH_FOUNDATION.md)** — 可选，30分钟
   → 理解为什么要这样设计（学术基础）

### 【技术实现】— 仅开发者

- **[backend/](backend/)** — Node.js + PostgreSQL后端
  - 29个API端点实现五步铸造流程
  - Claude API集成用于智能生成
  - Soul-Hash和Manifest签名
  
- **[day1/](day1/)** — 前端用户界面
  - 交互式五步铸造流程
  
- **[docs/](docs/)** — 完整技术文档
  - 五层架构规范
  - API速查表
  - 系统架构

---

## 🔑 五步铸造的关键概念

### 1️⃣ 五层架构 — 让价值观变成可信的技能

每个技能由五层组成，每层都有明确的规则：

```
【DEFINING】
核心原则 — "你的价值观是什么？"
例：识别真实的痛苦，不最小化它
规则：必须是价值观，不是规则

【INSTANTIATING】  
具体例子 — "这在实际中是什么样的？"
例：用户说"我很难过" → AI陪伴而不是给建议
规则：例子必须完美体现DEFINING

【FENCING】
应用边界 — "什么时候应用？什么时候不应用？"
例：应用于心理咨询，不应用于技术问题
规则：清晰说明边界和冲突

【VALIDATING】
测试用例 — "怎样验证这个技能是否遵循？"
例：测试1：用户表达痛苦 → AI没有说教
     测试2：失败案例 → AI不能轻率给建议
规则：必须是可验证的、明确的

【CONTEXTUALIZING】
文化适配 — "在不同文化中怎样适配？"
例：日本文化强调"间"（空白）
     中文文化强调"陪伴"
规则：保留核心精神，改变表达形式
```

### 2️⃣ Soul-Hash — 技能的不可伪造身份

```
SOUL_abc123xyz_1712762400000
      ↑ 24字符唯一哈希值
```

- 由技能内容 + 作者邮箱 + 时间戳生成
- 不能篡改（改了内容，哈希就变了）
- 任何人都能验证这个技能的真实性

### 3️⃣ Manifest Covenant — 多方署名

```json
{
  "soul_hash": "SOUL_abc123xyz_1712762400000",
  "five_layer": { /* 完整的五层 */ },
  "author": { "username": "心理咨询师", "email": "..." },
  "signatures": [
    "作者签名",
    "心理学家的批准",
    "文化顾问的批准"
  ]
}
```

不是单个人决定，而是**多个利益相关者的共识**

---

## 🚀 如何开始？

### 【选项1】我想创建一个技能（非开发者）

```bash
# 1. 阅读指南（90分钟）
   GETTING_STARTED.md → SKILL_DESIGN_GUIDE.md → EXAMPLES.md

# 2. 使用前端工具
   cd day1
   python3 -m http.server 8000
   # 在浏览器打开 http://localhost:8000
   
# 3. 按照五步铸造流程创建你的技能
   STEP 0 → STEP 1 → STEP 2 → STEP 3 → STEP 4
```

### 【选项2】我想部署整个系统（开发者）

```bash
# 启动后端
cd backend
npm install
cp .env.example .env
# 编辑 .env 添加你的 ANTHROPIC_API_KEY
npm run migrate
npm run dev
# 后端运行在 http://localhost:3000

# 启动前端
cd day1
python3 -m http.server 8000
# 前端运行在 http://localhost:8000
```

### 【选项3】我想深入研究理论（研究者）

```bash
# 阅读完整学术基础
RESEARCH_FOUNDATION.md 
→ RESEARCH_FOUNDATION_COMPLETE.md
→ 学术论文和引用
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

## 🔄 五步技能铸造的完整流程

### 用户旅程（从想法到可信技能）

```
【STEP 0】选择铸造模式
├─ 影子代理（Shadow Agent）："我有个想法，不知道怎么做"
│  系统帮你自动生成五层架构
│  
└─ 直接骑士（Direct Knight）："我有一个现成的AI Agent"
   把现有Agent的价值观明确下来

   ↓↓↓

【STEP 1】账户链接
└─ 用邮箱和用户名注册
   确定你是这个技能的版权所有者

   ↓↓↓

【STEP 2】直觉探针
├─ 你说出你的价值观（一句话）
│  例："AI应该知道何时保持沉默"
│  
├─ 系统生成3个对比探针
│  正题 / 反题 / 极端情况
│  
└─ 你选择共鸣最强的一个
   这个选择决定了DEFINING的方向

   ↓↓↓

【STEP 3】自动生成五层架构
├─ DEFINING：系统澄清你的核心原则
├─ INSTANTIATING：生成具体例子
├─ FENCING：定义应用边界
├─ VALIDATING：创建测试用例
└─ CONTEXTUALIZING：文化适配（中文、日文、英文等）

   ↓↓↓

【STEP 4】细化和发布
├─ 可选：调整五层内容
├─ 邀请其他人署名（心理学家、文化顾问等）
│  
└─ 发布
   ├─ 生成Soul-Hash身份
   ├─ 创建Manifest签名记录
   └─ 技能现在可以被审计和信任
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
