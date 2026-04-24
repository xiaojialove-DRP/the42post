# 快速参考卡 - 三个改动

## 1️⃣ 匿名用户追踪

```
用户下载 skill
    ↓
生成唯一的匿名ID（存在 localStorage）
    ↓
前端发送请求：GET /api/download/{skillId}
             Headers: X-Anonymous-Id: anon_xxx_xxx
    ↓
后端记录到 skill_usage_logs 表
```

**配置：** 无需配置，自动工作

**验证：**
```javascript
// 浏览器 Console
localStorage.getItem('42post_anon_id')
// 返回：anon_1702838400000_a1b2c3d4e5
```

---

## 2️⃣ Impact Dashboard

```
用户完成 Skill 铸造
    ↓
点击 "📊 Impact Dashboard" 按钮
    ↓
GET /api/skills/{skillId}/stats
    ↓
显示 Modal：
  📥 Downloads: 0
  👥 People: 0
  📅 Days Live: 0
  📈 Per Day: 0
```

**配置：** 无需配置，自动工作

**验证：**
```bash
# 手动测试API
curl http://localhost:3000/api/skills/{skillId}/stats
```

---

## 3️⃣ LLM 可切换架构

```
当前：Gemini（免费、快速）
   ↓
未来：Claude（更强的推理）
   ↓
未来：OpenAI（GPT-4）
```

**配置：**
```bash
# .env 文件中
LLM_PROVIDER=gemini        # ← 改这里就可以切换

# 还需要对应的API密钥
GOOGLE_API_KEY=xxx         # 给 Gemini
# ANTHROPIC_API_KEY=xxx    # 给 Claude（暂未实现）
# OPENAI_API_KEY=xxx       # 给 OpenAI（暂未实现）
```

**验证：**
```bash
# 启动时应该看到日志：
# ✓ LLM Provider: gemini
```

---

## 📊 改动影响面

### 改动了哪些文件？

| 文件 | 改动内容 |
|-----|--------|
| `backend/routes/downloads.js` | ✅ 添加下载日志记录 |
| `backend/routes/skills.js` | ✅ 添加 /stats 端点 |
| `backend/utils/llmAdapter.js` | ✅ **新建** - LLM抽象层 |
| `backend/.env.example` | ✅ 添加LLM配置 |
| `backend/docs/LLM_CONFIGURATION.md` | ✅ **新建** - 详细文档 |
| `frontend/script.js` | ✅ 匿名ID生成、Dashboard UI |

### 没改动的文件：

- ❌ 数据库schema（无需迁移）
- ❌ 认证系统（保持原样）
- ❌ Email 系统（保持原样）
- ❌ Forge 流程（保持原样）

---

## 🔄 何时使用

### 匿名追踪

- **何时激活：** 自动激活（无需配置）
- **何时使用：** 用户每次下载skill时
- **何时看到数据：** Dashboard中显示

### Impact Dashboard

- **何时激活：** 自动激活
- **何时使用：** 用户完成skill铸造后，点击按钮
- **何时看到数据：** 如果有人下载过这个skill

### LLM 切换

- **何时激活：** 在.env中配置时
- **何时使用：** 用户创建新skill时（Probe和Five-Layer生成）
- **何时切换：** 需要不同的AI能力时

---

## ⚙️ 维护检查清单

- [ ] 所有新文件都在git中提交了
- [ ] `.env.example` 包含了必要的配置项
- [ ] 测试了匿名ID生成（localStorage中能看到）
- [ ] 测试了Dashboard API（能看到数据返回）
- [ ] 确认了当前使用的LLM提供商（日志中能看到）

---

## 🚨 常见问题处理

| 问题 | 症状 | 解决 |
|-----|-----|------|
| 匿名ID未生成 | localStorage 中找不到 `42post_anon_id` | 检查 script.js 中 getAnonymousId() 函数是否被调用 |
| Dashboard 显示空 | 点击按钮后没有数据 | 确认 skill_usage_logs 表中有数据；检查 /stats API 是否返回 |
| 无法找到提供商 | 日志报错 "Unsupported LLM provider" | 检查 LLM_PROVIDER 环境变量；Claude/OpenAI 还未实现，只支持 gemini |
| API 密钥错误 | Gemini API 调用失败 | 检查 GOOGLE_API_KEY 是否正确；访问 https://aistudio.google.com 确认密钥有效 |

---

## 📈 期望的行为

### 匿名追踪

```
用户A 下载 Skill_1
  → 记录：user_id=anon_xxx_aaa, skill_id=1, outcome=success

用户A 下载 Skill_2
  → 记录：user_id=anon_xxx_aaa, skill_id=2, outcome=success

用户B 下载 Skill_1
  → 记录：user_id=anon_xxx_bbb, skill_id=1, outcome=success

Dashboard 显示：
  Skill_1: 2 downloads, 2 unique users
  Skill_2: 1 download, 1 unique user
```

### Dashboard 数据

```
一个新铸造的 Skill：
  Downloads: 0 ✅
  People: 0 ✅
  Days Live: 0 ✅
  Per Day: 0/day ✅

一个已发布1周、有10次下载的 Skill：
  Downloads: 10 ✅
  People: 8 ✅ (可能有人下了多次)
  Days Live: 7 ✅
  Per Day: 1.43/day ✅
```

### LLM 日志

```
# 启动时
✓ LLM Provider: gemini

# 用户创建skill时（如果启用了日志）
[LLM] Calling gemini.generateContent()
[LLM] Tokens used: in=234, out=1203
[LLM] Time: 4.2s
```

---

## 💾 备份建议

这些文件是新增或改动的，建议备份：

```bash
# 新增文件
backend/utils/llmAdapter.js
backend/docs/LLM_CONFIGURATION.md

# 改动的文件
backend/routes/downloads.js
backend/routes/skills.js
backend/.env.example
frontend/script.js

# 文档
IMPLEMENTATION_SUMMARY.md
QUICK_REFERENCE.md (本文件)
```

---

## 🎓 学到的模式

### 1. 匿名追踪模式

```javascript
// 前端生成唯一ID
const id = `anon_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;

// 存储到本地
localStorage.setItem('key', id);

// 每次请求时携带
headers: { 'X-Custom-Id': id }

// 后端记录
db.insert(table, { custom_id: req.headers['x-custom-id'], ... })
```

### 2. 统计聚合模式

```javascript
// 后端聚合统计
SELECT 
  COUNT(*) as total_downloads,
  COUNT(DISTINCT user_id) as unique_users
FROM usage_logs
WHERE skill_id = ?
```

### 3. 多提供商适配器模式

```javascript
const LLMAdapter = {
  async generateText(input) {
    switch(process.env.PROVIDER) {
      case 'a': return await providerA(input);
      case 'b': return await providerB(input);
      default: throw new Error();
    }
  }
}
```

这个模式可以用于：
- AI 模型切换
- 数据库 driver 切换
- 存储服务切换
- 支付方式切换

---

## 🔮 未来扩展建议

### 第一阶段（下周）
- [ ] 实现 Claude 适配器
- [ ] 添加 Dashboard 时间序列图表

### 第二阶段（2周后）
- [ ] 版本控制界面
- [ ] 评论系统

### 第三阶段（1个月后）
- [ ] 用户认证系统
- [ ] 创作者 Profile 页面
- [ ] Skill 推荐算法

---

**最后更新：** 2026-04-23
**状态：** ✅ 所有改动已实施并测试
