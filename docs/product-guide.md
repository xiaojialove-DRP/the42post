# THE 42 POST · 产品使用说明

> 面向普通用户。本文档随版本持续更新，每次功能迭代后追加对应章节。
>
> **当前版本：v1.4.0（2026-06-06）**

---

## 一、这是什么

THE 42 POST 是一个让普通人参与定义 AI 价值观的平台。

你不需要懂编程。你只需要有想法——关于 AI 应该懂什么、重视什么、拒绝什么——然后把它变成一个可以真正影响 AI 行为的「Skill（技能）」。

**三件事你可以在这里做：**
1. **锻造 Skill** — 把你的直觉或价值观变成 AI 能理解的结构化技能
2. **浏览 Archive** — 看看其他人锻造了什么，给喜欢的 Skill 点亮星星
3. **测试 Playground** — 用 A/B 对比看一个 Skill 是否真的改变了 AI 的回应

---

## 二、主页（index.html）

### 页面入口

打开网站，你会看到主标题：
> "What should and shouldn't AI learn from you?"

页面顶部有三个入口按钮：

| 按钮 | 点击后 |
|------|--------|
| **☉ PLAYGROUND** | 跳转到 Playground 页面 |
| **TASTE ARCHIVE** | 跳转到 Skill 档案页 |
| **EN / 中** | 切换英文 / 中文 |

---

### 输入框区域

主页中央有一个输入框，上方提示：
> "If your AI had taste, what would it care about?"

**你可以在这里：**
- 用文字写下你的想法（任意语言）
- 点击麦克风图标用语音输入（浏览器支持时显示）

写完后点击 **SHARE THIS** 按钮，系统会评估你的想法，随后引导你进入「锻造」流程。

---

### Skill 展示区

主页中段展示：
- **本周精选 Skill**（SKILL OF TODAY）
- **社区最新声音**（新发布的 Skill 故事）
- **最多星星的 Skills**（Most Starred Skills）

每个 Skill 卡片可以点击 **▶ Test in Playground** 按钮，直接进入 A/B 测试。

---

## 三、Skill 锻造流程（Forge）

点击主页的「SHARE THIS」或「MAKE IT REAL」后，弹出 Forge 对话框，分 4 步：

---

### 第 1 步：写下你的想法

填写：
- **你的名字**（可选，用于显示为创作者）
- **邮箱**（可选，用于接收 Creator Card）
- **你的想法**（核心输入，例如：「AI 应该懂得什么时候沉默」）

然后点击 **PROCEED →**

---

### 第 2 步：AI 生成 Skill 结构

系统将你的想法拆解为「五层结构」：

| 层级 | 含义 |
|------|------|
| 01 DEFINING | 这个 Skill 的核心定义 |
| 02 INSTANTIATING | 具体场景举例 |
| 03 FENCING | 什么情况下不应该使用 |
| 04 VALIDATING | 如何判断 AI 是否正确使用了这个 Skill |
| 05 CONTEXTUALIZING | 文化背景与更广泛的意义 |

生成完成后，你可以：
- **直接编辑**任意字段（Skill 名称、定义等）
- 在「REGENERATE」框里告诉 AI 要改什么，点 **Regen** 重新生成

---

### 第 3 步：发布权利设置

填写：
- **作者名**（你希望显示的署名）
- **商业使用**：是否允许他人商业使用这个 Skill
- **二次创作（Remix）**：是否允许他人改编

勾选三条承诺：
- 允许公开修订说明
- 接受社区评论
- 承诺不造成故意伤害

点击 **PUBLISH** 完成发布。

---

### 发布完成后

你会收到：
- **Soul-Hash** — 一串 14 位唯一标识符，代表你的 Skill 身份
- **Creator Card** — 可下载的图片凭证（PNG），证明你是这个 Skill 的创作者
- **导出选项**：
  - Markdown 文档（`.md`）— 适合阅读和分享
  - LangChain 格式（`.py`）— 适合开发者集成
  - MCP Config（`.json`）— 适合系统部署

---

## 四、Skill 档案（Archive）

地址：`/archive`，顶部显示「✦ Latest 42 Skills」

### 页面功能

- **浏览所有已发布的 Skills**，按最新发布排序
- **每张 Skill 卡片**显示：名称、领域分类、创作者、Soul-Hash、描述
- **点击星星** ☆ 给喜欢的 Skill 点亮（Starlight），星数越多排序越靠前
- **点击 ▶**（Play 按钮）→ 跳转到 Playground，该 Skill 自动预加载，直接开始 A/B 测试

### 领域分类

Skills 按领域分类：Safety / Science / Narrative / Design / Visual / Experience / Sound / Ideas / History / Fun

---

## 五、Playground（测试场）

地址：`/playground`

这里让你**用眼见为实的方式**验证一个 Skill 是否真的改变 AI 的行为。

---

### 入口方式

1. **从 Archive 点击 ▶** — 自动带入该 Skill，直接开始
2. **Forge 完成后跳转** — 自动带入你刚锻造的 Skill
3. **直接进入 Playground** — 从 Dock（底部分类栏）选一个场景分类开始

---

### 核心流程：A/B 对比测试

1. **选择场景分类**（从底部 Dock 点击任意领域）
2. 系统随机抽取一个场景问题，生成一张任务卡片
3. 卡片里同时运行：
   - 🔥 **加了 Skill 的 AI 回应**
   - ◯ **普通 AI 回应**（对照组）
4. 两个回应匿名展示，你来判断哪个更好

### 评价 & 反馈

看完两个回应后：
- 选择：**Clearly better / Not great / Can't tell**
- 可选填写文字反馈（140 字以内）
- 点击 **Submit** 提交，你的评价帮助社区评估 Skill 质量

### 场景卡片规则

- 每次最多体验 **7 张场景卡**（防沉迷限制）
- 用完后点击「CLEAR ALL」可重置，重新获得 7 次
- 点击「↻ RANDOM TASK」随机抽取任意领域的场景

---

## 六、功能更新记录

本节随版本迭代持续追加，记录每次更新的功能变化。

---

### v1.4.0（2026-06-06）

- **Playground 直通**：从 Archive 或 Forge 完成跳转后，直接进入 A/B 测试，不再需要点 START
- **随机任务修复**：7 张卡片限制现在正确触发（之前因计数 bug 在第 4 张时就触发）
- **创作者名称格式统一**：显示格式标准化
- **Forge 页面措辞优化**：更友好的提示语和流程引导

### v1.3.0（2026-05-19）

- 修复分享按钮无响应问题
- Archive 星星状态跨刷新持久化
- 新增语音输入功能（麦克风按钮）

### v1.2.0（2026-05-11）

- Forge 完成后自动预选该 Skill 进入 Playground
- 新增 Skill 质量验证（防止重复或低质量提交）

### v1.1.0（2026-05-08）

- Playground 场景库从 32 题扩展到 70 题
- 支持中英文双语切换

### v1.0.0（2026-04-24）

- 产品首次发布，核心三页面：主页 / Archive / Playground

---

## 七、常见问题

**Q：我不懂 AI，可以用吗？**
可以。不需要任何技术背景，你只需要有想法。

**Q：我的 Skill 发布后可以修改吗？**
目前发布后不支持编辑（Skill 编辑功能在 Roadmap 中）。

**Q：Soul-Hash 是什么？**
是你的 Skill 的唯一身份标识，14 位字符串，不可复制、不可伪造。

**Q：Playground 每次只能测 7 个场景吗？**
是的，单次会话限制 7 个，点击「CLEAR ALL」可重置。

**Q：我的数据安全吗？**
Skill 内容会公开在 Archive 供社区浏览。你的邮箱仅用于发送 Creator Card，不会公开显示。

---

*THE 42 POST · 为更好的 AI 未来锻造人类智慧*
