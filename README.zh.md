# THE 42 POST

**一个用于创作、测试和发布 AI 对齐技能的开放平台。**

🌐 **[www.the42post.com](https://www.the42post.com)** · [English Version](./README.md)

---

## 这是什么

THE 42 POST 将 **SemanticForge 五层框架**实现为一个社区平台。用户按照标准五层架构创作"技能"——人类价值观的结构化表示，用来指导 AI 行为。每个技能都经过密码学签名，可跨系统移植。

这不是提示词库。这是**可组合、可验证、多文化的 AI 对齐基础设施**。

---

## 与 SemanticForge 的关系

[SemanticForge](https://github.com/xiaojialove-DRP/SemanticForge) 是研究框架和概念基础。  
THE 42 POST 是第一个实现：框架与实践的结合。

SemanticForge 定义了什么（五层模型），THE 42 POST 就把它付诸实践：
- 协作创作技能的 Web UI
- AI 辅助技能生成（DeepSeek）
- 通过点亮分数的社区验证
- 可下载、可执行的技能格式
- 通过 Playground 进行 A/B 测试

---

## 设计：10 个研究领域

技能在十个研究领域中创作，每个领域测试 AI 对齐的不同维度：

| 领域 | 研究问题 |
|---|---|
| **叙事与语言** | 语言框架如何塑造 AI 行为？ |
| **逻辑与推理** | AI 能区分有效和无效推论吗？ |
| **历史与传统** | 时间背景是否改进决策？ |
| **科学与系统** | AI 能推理因果关系 vs 相关性吗？ |
| **伦理与价值** | 文化和个人价值观如何编码？ |
| **设计与体验** | 摩擦力和缓慢的角色是什么？ |
| **文化与理解** | 文化背景是否防止错误对齐？ |
| **时间与遗产** | AI 能推理多代影响吗？ |
| **沉默与空间** | 何时不回应是正确的？ |
| **劳动与价值** | AI 如何认账无形劳动？ |

每个领域有一个参考技能（由核心团队设计）并接受社区贡献。

---

## 五层架构

```
┌─────────────────────────────────────┐
│ 定义层：核心原则（一句话）          │
├─────────────────────────────────────┤
│ 例示层：前后对比示例                │
├─────────────────────────────────────┤
│ 边界层：适用 / 不适用场景           │
├─────────────────────────────────────┤
│ 验证层：测试用例与标准              │
├─────────────────────────────────────┤
│ 情境层：文化变体                    │
└─────────────────────────────────────┘
```

**示例："奶奶过滤器"**（伦理领域，社区点亮分数最高）

```json
{
  "defining": "在输出任何内容前，问自己：我奶奶读到这个会舒服吗？",
  "instantiating": {
    "before": "AI 生成：'你的人生选择不太优化...'",
    "after": "AI 停顿，自问奶奶测试，用尊重的方式重新表达"
  },
  "fencing": {
    "apply": "内容审核、敏感话题、面向公众的回应",
    "notApply": "医疗/法律场景，准确性 > 语气"
  },
  "validating": ["是否通过奶奶测试？", "尊严是否被保护？"],
  "contextualizing": {
    "zh-CN": "体现儒家孝道（孝）",
    "en-US": "反映美国对长辈的尊重文化"
  }
}
```

---

## 核心功能

**技能创作**: 四步 Web 表单。AI（DeepSeek）生成初始五层草稿。用户精细调整。一键发布。

**Soul-Hash**: 每个技能获得 SHA-256 指纹：`SOUL_<24位哈希>_<时间戳>`。密码学身份。对给定原则不可变；定义层改变则改变。

**社区验证**: 用户可以点亮技能。点亮分数排序档案库并影响 Playground 推荐。

**Playground A/B 测试**: 选择技能 → 描述任务 → 并排看两个 AI 回应（应用技能、未应用技能）。单个最有价值的功能，理解技能有效性。

**导出格式**:
- **Markdown** — 系统提示词模板
- **LangChain** — 包含五层字段的 Python 数据类
- **MCP** — Claude/OpenAI 工具集成的 JSON 模式
- **证书** — 可打印的 HTML，带 Soul-Hash

---

## 架构

```
前端（原生 JS，SkillStore 单例）
  ↓ REST API
后端（Node.js 24 / Express 4）
  ↓
SQLite（Railway 托管，版本化 schema）
  ↓
DeepSeek API（五层生成）
```

**测试覆盖**: 30 个测试（Vitest）
- 7 个：技能锻造 + 档案列表 + 搜索
- 10 个：点亮/取消点亮 + 点亮分数同步
- 13 个：下载格式 + 清单验证

---

## API

```
GET  /api/skills                     列表（分页、按领域可筛选）
GET  /api/skills/:id                 技能详情 + 清单
POST /api/skills                     创建并发布技能
POST /api/skills/:id/star            切换点亮
GET  /api/skills/:id/stars           点亮数 + 用户状态
GET  /api/download/:id?format=       [markdown|langchain|mcp|certificate]
GET  /api/search?q=                  全文搜索
```

所有接口公开。读操作无需认证。变更操作只需 `X-Anonymous-Id` 请求头（设备 ID）。

完整说明：[docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## 对研究者

**下载与分析**: 所有技能通过 `/api/skills` 以 JSON 形式提供。

**案例研究**:
- 研究人类如何在情境层编码文化价值
- 分析边界层定义是否防止滥用
- A/B 测试 Playground 结果：技能存在是否与对齐结果相关？

**集成**: 使用 MCP 导出格式直接将技能加载到 Claude 或其他代理。实证测试行为。

**贡献**: 在探索不足的领域创作新技能。框架设计用于研究迭代。

---

## 本地运行

```bash
git clone https://github.com/xiaojialove-DRP/the42post.git
cd the42post/backend

npm install
cp .env.example .env                 # 需要 DEEPSEEK_API_KEY
npm run migrate                      # SQLite 架构
npm run seed                         # 10 个参考技能 + 社区示例
npm start                            # http://localhost:3000

# 测试
npm test                             # 30 个测试，总耗时 ~1s
npm run test:watch                   # 监听模式
```

---

## 已知限制

- **AI 生成质量不稳定**: DeepSeek 有时产生浅层五层结构。用户审查至关重要。
- **Playground 只读**: A/B 结果未记录。研究者必须实现自定义日志以进行实证研究。
- **无审核系统**: 档案库质量完全依赖社区。垃圾/低质量技能可由管理员软删除，永不彻底删除。
- **Soul-Hash 碰撞**: 概率极低（~1/2^256），理论上可能。实际不构成威胁。
- **规模**: SQLite 同步执行，适合 ~100 请求/秒。流量超过此值需迁移到 PostgreSQL。

---

## 贡献

**技能**: 使用平台。高质量提交成为其领域的参考示例。

**代码**: Fork，开 Issue，提 PR。关键区域：Playground 日志、审核 UI、新导出格式。

**研究**: 如果你发表的论文中使用了 THE 42 POST 技能或 Playground 数据，请引用本仓库并开一个 Issue 链接到你的工作。

---

## 许可证

MIT — 见 [LICENSE](LICENSE)

---

**状态**: 公开测试 · 10 个设计领域 · 42 个原始技能（质量筛选后 21 个已发布）· 30 个后端测试通过

*THE 42 POST：让对齐工作可测试，而不只是可声称。*
