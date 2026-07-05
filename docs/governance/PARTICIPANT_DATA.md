# Participant Data / 参与者数据说明

> Effective 2026-07-05 · Written to match what the code actually collects.
> Questions or deletion requests → [GitHub Issues](https://github.com/xiaojialove-DRP/the42post/issues) (public) or reply to any email the platform sent you (private).

---

## English

### What we collect, and why

| Data | When | Why |
|---|---|---|
| Username (chosen by you) | Forge step 1 | Attribution on the Archive and Creator Card |
| Email | Forge step 1 | Delivering your Creator Card and publish confirmation; never shown publicly, never in data releases |
| Profession / field of study (optional, free text) | Forge step 1 | Understanding who contributes — research context only |
| Your idea text, probe scenario, and which stance you chose | Forge flow | The core research record: how a raw intuition becomes a structured skill |
| Skill content and its version history | Publish / edit | The published artifact itself |
| AI-draft provenance (which model generated the draft, how much you edited it) | Generate / publish | Research integrity: separating human contribution from AI scaffolding |
| Twin Test votes, ratings, response texts, decision time | Playground | Measuring whether skills actually change AI behavior |
| Stars | Archive | Community ranking |
| Country code + browser language (from request headers, coarse) | Forge / publish | Cultural-context research; never precise location |
| Anonymous device ID (random string in localStorage + a first-party cookie, 1 year) | All pages | Remembering your stars and forges without an account; funnel analytics |
| Funnel events (e.g. "forge started", "published") | Key steps | Knowing where people drop off |

### What we do NOT do

- No passwords, no accounts, no identity verification.
- No third-party trackers, no ad tech, no analytics SDKs — the one cookie is
  first-party and holds only the random anonymous ID.
- No selling or sharing of personal data, ever.
- Emails are used for delivery only and are excluded from any dataset release.

### Research use and consent

This platform is an open research project on participatory AI alignment.
Contributions may be analyzed and published in **aggregated or anonymized**
form (see [DATA_LICENSE.md](./DATA_LICENSE.md) §3). Probe sessions carry a
`research_consent` flag; skills you publish are public by intent.

### Your choices

- **Deletion**: ask for your skill and/or associated records to be removed
  (contacts above). Identify the skill by title or Soul-Hash.
- **Anonymity**: you can forge under any username; the platform works without
  any real-name information.
- **Fresh start**: clearing your browser's site data (localStorage + cookie)
  detaches the device from its history.

---

## 中文

### 收集什么、为什么

| 数据 | 何时 | 用途 |
|---|---|---|
| 用户名（你自己起的） | 锻造第 1 步 | 在 Archive 和 Creator Card 上署名 |
| 邮箱 | 锻造第 1 步 | 发送 Creator Card 和发布确认；永不公开展示、永不进入数据发布 |
| 职业/学习背景（选填，自由文本） | 锻造第 1 步 | 了解参与者构成——仅用于研究背景 |
| 你的想法原文、探针场景、你选择的立场 | 锻造流程 | 核心研究记录：一个直觉如何变成结构化 Skill |
| Skill 内容及版本历史 | 发布/编辑 | 发布物本身 |
| AI 草稿溯源（哪个模型生成、你编辑了多少） | 生成/发布 | 研究可信度：区分人类贡献与 AI 脚手架 |
| Twin Test 投票、评价、回答文本、决策耗时 | Playground | 测量 Skill 是否真的改变 AI 行为 |
| 星标 | Archive | 社区排序 |
| 国家代码 + 浏览器语言（来自请求头，粗粒度） | 锻造/发布 | 文化语境研究；永不涉及精确位置 |
| 匿名设备 ID（localStorage + 一年期第一方 cookie 里的随机字符串） | 所有页面 | 无账号情况下记住你的星标和锻造记录；漏斗统计 |
| 漏斗事件（如"开始锻造""已发布"） | 关键步骤 | 了解用户在哪一步流失 |

### 我们不做的事

- 无密码、无账号、无实名验证；
- 无第三方追踪器、无广告技术、无外部统计 SDK——唯一的 cookie 是第一方的，
  只存那串随机匿名 ID；
- 永不出售或共享个人数据；
- 邮箱只用于送达，任何数据集发布都不包含邮箱。

### 研究用途与同意

本平台是关于"参与式 AI 对齐"的公开研究项目。你的贡献可能以**聚合或匿名化**
形式被分析和发表（见 [DATA_LICENSE.md](./DATA_LICENSE.md) 第 3 节）。探针会话
带有 `research_consent` 标志；你主动发布的 Skill 本身即是公开物。

### 你的选择

- **删除**：可申请移除你的 Skill 及相关记录（联系方式见顶部），请附 Skill
  名称或 Soul-Hash；
- **匿名**：用户名随意起，平台不需要任何实名信息即可完整使用；
- **重新开始**：清除浏览器站点数据（localStorage + cookie）即可让设备与
  历史记录脱钩。
