# GitHub & Railway 部署快速指南

## 你的账户信息
- **GitHub 用户名：** `xiaojialove-DRP`
- **仓库名称：** `42-post`
- **仓库访问权限：** private ✓

---

## 步骤 1: 在 GitHub 上创建新仓库

1. 访问 https://github.com/new
2. 填写信息：
   - **Repository name:** `42-post`
   - **Description:** `THE 42 POST - AI Value Alignment Skills Platform`
   - **Privacy:** 选择 **Private** ✓
   - 其他选项保持默认
3. 点击 **Create repository**
4. 你会看到一个空仓库页面

---

## 步骤 2: 本地初始化并推送代码

在你的终端中运行以下命令（在项目根目录）：

```bash
# 进入项目目录
cd "/Users/lvhaina/Downloads/42 post project"

# 初始化 git 仓库（如果还没初始化）
git init

# 添加所有文件
git add .

# 创建首次提交
git commit -m "Initial commit: THE 42 POST - Backend, Frontend, and Deployment Config"

# 重命名分支为 main（如果需要）
git branch -M main

# 添加远程仓库
git remote add origin https://github.com/xiaojialove-DRP/42-post.git

# 推送代码到 GitHub
git push -u origin main
```

**GitHub 会要求认证，有两种方式：**

### 方式 A: 使用个人访问令牌 (PAT) - 推荐 ✅
1. 访问 https://github.com/settings/tokens
2. 点击 **Generate new token** → **Generate new token (classic)**
3. 配置：
   - Token name: `Railway Deployment`
   - Expiration: 90 days
   - Scopes: 选中 `repo` (all)
4. 点击 **Generate token**
5. **复制令牌**（不会再显示）
6. 当 Git 要求密码时，粘贴这个令牌

### 方式 B: 使用 GitHub 命令行工具
```bash
# 安装 GitHub CLI（如果未安装）
brew install gh

# 认证
gh auth login

# 然后运行上面的 git push 命令
```

---

## 步骤 3: 验证推送成功

推送完成后，访问你的 GitHub 仓库：
```
https://github.com/xiaojialove-DRP/42-post
```

你应该看到：
- ✅ `backend/` 文件夹
- ✅ `day1/` 文件夹
- ✅ `railway.json`
- ✅ `Procfile`
- ✅ `.env.example`
- ✅ `DEPLOYMENT_GUIDE.md`

---

## 步骤 4: 在 Railway 上部署

### 4.1 创建 Railway 账户
1. 访问 https://railway.app/
2. 点击 **Start free** 或 **Login**
3. 使用 GitHub 账户授权登录（推荐）

### 4.2 创建 Railway 项目并连接 GitHub
1. 打开 Railway 仪表板
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 选择 `xiaojialove-DRP/42-post` 仓库
5. Railway 会自动检测 `railway.json` 配置
6. 点击 **Deploy**

### 4.3 配置环境变量
部署时，Railway 会让你配置环境变量。设置以下内容：

```
NODE_ENV=production
PORT=3000
ANTHROPIC_API_KEY=sk-ant-xxxxx  # 从 https://console.anthropic.com/ 复制
JWT_SECRET=xxxxx  # 运行: openssl rand -base64 32
JWT_EXPIRY=24h
SIGNING_SECRET=xxxxx  # 运行: openssl rand -base64 32
FRONTEND_URL=https://42-post-production-xxx.up.railway.app  # Railway 会自动生成
```

**PostgreSQL 数据库：**
- 在 Railway 项目中点击 **New** → **Database** → **PostgreSQL**
- Railway 会自动将 `DATABASE_URL` 添加到环境变量

### 4.4 完成部署
- Railway 会自动构建和部署应用
- 查看部署日志，确认：
  ```
  ✓ PostgreSQL database connected
  ✓ Server listening on port 3000
  ✓ All tables initialized
  ```

### 4.5 获取生产 URL
- 在 Railway 仪表板找到你的应用 URL，格式如：
  ```
  https://42-post-production-abc123.up.railway.app
  ```
- 测试健康检查：
  ```bash
  curl https://42-post-production-abc123.up.railway.app/health
  ```

---

## 步骤 5: 更新前端 API 地址

现在后端已在 Railway 上线，更新前端代码使用生产 API：

**文件：** `day1/script.js`

找到 API 基础 URL 的定义（通常在文件开头），改为：

```javascript
// 从：
const API_BASE = 'http://localhost:3000/api'

// 改为：
const API_BASE = 'https://42-post-production-abc123.up.railway.app/api'
```

然后提交并推送：
```bash
git add day1/script.js
git commit -m "Update API URL for production deployment"
git push origin main
```

Railway 会自动检测变更并重新部署。

---

## 步骤 6: 后续维护

### 本地修改工作流
```bash
# 修改代码后
git add .
git commit -m "Your commit message"
git push origin main

# Railway 会自动检测 git push 并重新部署（3-5分钟）
```

### 查看部署日志
- 在 Railway 仪表板点击你的应用
- 点击 **Logs** 标签查看实时日志
- 点击 **Deployments** 查看部署历史

### 如需紧急回滚
- 在 Railway Deployments 页面找到之前的版本
- 点击 **Rollback**

---

## ⚠️ 重要提醒

### 不要提交到 GitHub 的敏感信息
✗ `.env` 文件（已在 .gitignore 中）
✗ API 密钥
✗ 数据库凭据
✗ JWT Secret

这些信息应该只在 Railway 仪表板中设置。

### 成本预估（1000+ 用户）
- Railway PostgreSQL: ¥5-15/月
- Railway 计算资源: ¥5-20/月
- 总计: **¥10-35/月**（按使用量计费，自动扩展）

---

## 🎉 完成检查清单

- [ ] 在 GitHub 创建了 `42-post` private 仓库
- [ ] 本地代码已推送到 GitHub
- [ ] 在 Railway 创建了账户
- [ ] GitHub 仓库已连接到 Railway
- [ ] PostgreSQL 数据库已添加
- [ ] 环境变量已配置（ANTHROPIC_API_KEY, JWT_SECRET 等）
- [ ] 部署成功，应用在线
- [ ] 健康检查返回 200 OK
- [ ] 前端 API 地址已更新为生产 URL
- [ ] 测试了 API 端点（例如 `/api/skills`）

---

## 📞 故障排除

**部署失败？** 查看 Railway Logs 中的错误信息
**找不到 DATABASE_URL？** 确保 PostgreSQL 插件已添加
**CORS 错误？** 检查 `FRONTEND_URL` 环境变量是否正确
**API 超时？** 检查 Railway 应用是否有足够资源

---

## 下一步

部署完成后，你可以：
1. 测试 Skill Forging 工坊流程
2. 邀请用户创建第一批 skills
3. 收集用户反馈和数据
4. 继续优化和迭代

任何需要修改的地方，推送代码到 GitHub，Railway 会自动更新！🚀
