# THE 42 POST

**一个锻造、分享和验证人类价值观的开放平台——以 AI 可读的方式。**

🌐 **[www.the42post.com](https://www.the42post.com)** · [English Version](./README.md)

---

## 这是什么？

AI 系统由价值观塑造——但是谁的价值观？如何结构化？由谁来验证？THE 42 POST 是一个开放平台，任何人都可以在这里创作一个**技能（Skill）**：一个结构化的、经密码学签名的人类价值观表示，AI 系统可以读取、测试并据此行动。

技能不是提示词（prompt）。它是一个五层文档——原则、示例、边界、测试、文化变体——让一种价值观变得**显式、可审计、可跨系统移植**。

产品名称来自《银河系漫游指南》。42 是关于生命、宇宙和一切的终极答案。我们仍在研究那个问题——但至少我们开始把它写下来了。

---

## 五层技能架构

在这个平台上锻造的每一个技能都遵循相同的结构：

| 层级 | 定义内容 |
|---|---|
| **定义层（Defining）** | 用一句清晰的陈述表达核心原则 |
| **例示层（Instantiating）** | 展示技能实际效果的前后对比示例 |
| **边界层（Fencing）** | 何时应用——以及明确何时不该应用 |
| **验证层（Validating）** | 测试用例：如何判断它是否在起作用 |
| **情境层（Contextualizing）** | 文化适配与情境变体 |

**示例——「奶奶过滤器（Grandma Filter）」**（点亮数最多，伦理领域）
> *在输出任何内容之前，问问自己：如果我的奶奶读到这段话，我会感到自在吗？*
> 适用于：内容审核、敏感话题、面向公众的 AI 回应。
> 不适用于：医疗/法律场景中准确性比语气更重要时。

每个发布的技能都会获得一个 **Soul-Hash**——基于核心内容、作者和时间戳的 SHA-256 指纹。`SOUL_4f2a…_1745678400000`。如果原则改变，哈希就改变。格式调整不影响哈希。这使技能可验证、可引用。

---

## 你能做什么

### 锻造技能
完成一个四步引导流程。描述你的价值观，AI 生成五层结构，你审阅并发布。全程 5–10 分钟。无需注册账号。

### 浏览档案库
21 个社区技能，跨越 9 个领域：伦理、设计、叙事、文化、科学、沉默、历史、时间、劳动。支持关键词和领域筛选，按社区点亮分数排序。

### 在 Playground 测试
从档案库选择一个技能，写一个任务，看到两个 AI 回应并排展示——一个应用了技能，一个没有。这个对比本身就是产品。

### 下载
每个发布的技能支持以下格式导出：
- **Markdown** — 可直接粘贴为系统提示词
- **LangChain** — 包含完整五层架构的 Python 文件
- **MCP** — 适配工具调用的 JSON 配置
- **创作者卡片** — 带 Soul-Hash 的可打印 HTML 证书

---

## 为什么开源？

对齐问题不是一个实验室能解决的技术问题。它是一个需要人类参与的人类问题——来自不同文化、学科和生活经历的人。将技能私有化会背离这个目标的初衷。

我们开源这个平台，是为了让：
- 社区可以运行自己的技能档案库
- 研究者能研究人们实际尝试编码哪些价值观
- 开发者无需许可即可将技能集成到自己的 AI 代理中
- 格式能通过使用来演进，而不是靠委员会决定

---

## 架构

```
前端（原生 JS + CSS）
    ↓ REST API
后端（Node.js / Express）
    ↓
SQLite（Railway 托管）
    ↓
DeepSeek API  ←  锻造时生成五层结构
```

**技术栈：** Node 24 · Express 4 · better-sqlite3 · DeepSeek API · Vitest（30 个测试）  
**部署：** Railway · 自定义域名：www.the42post.com  
**认证：** 默认匿名（`X-Anonymous-Id` 请求头）。锻造、点亮和下载均无需账号。

完整架构和数据流：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 本地运行

```bash
# 克隆仓库
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post/backend

# 安装与配置
npm install
cp .env.example .env          # 填写 DEEPSEEK_API_KEY
npm run migrate               # 初始化 SQLite 数据库结构
npm run seed                  # 导入 21 个社区技能
npm start                     # http://localhost:3000

# 测试
npm test                      # 30 个测试——涵盖锻造 / 点亮 / 下载流程
```

---

## API

所有接口均公开。变更操作（锻造、点亮）只需要一个匿名设备 ID 请求头。

```
GET  /api/skills                    获取已发布技能列表（分页、可搜索）
GET  /api/skills/:id                技能详情
POST /api/skills                    锻造并发布新技能
POST /api/skills/:id/star           点亮或取消点亮
GET  /api/skills/:id/stars          点亮数量 + 当前用户状态
GET  /api/download/:id?format=      markdown | langchain | mcp | certificate
GET  /api/skills/:id/manifest       验证 soul_hash 和盟约签名
GET  /api/search?q=                 在标题和描述中全文搜索
```

完整接口文档：[docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## 贡献

**技能作者** — 最好的贡献是一个精心创作的技能。使用这个平台。

**开发者** — 修复 Bug、新增导出格式、改进 Playground 对比效果。提交 PR。

**研究者** — 如果你在论文或实验中使用了技能，开一个 Issue 将其加入引用列表。

详见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

## 许可证

MIT — 见 [LICENSE](LICENSE)

---

**状态：** 公开测试中 · 21 个社区技能 · 30 个后端测试全部通过

*THE 42 POST 不是那个答案。它是写出更好问题的基础设施。*
