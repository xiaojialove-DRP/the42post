# THE 42 POST — Railway 部署指南

## 🚀 部署前准备 (Pre-Deployment Checklist)

### 1. GitHub 仓库设置
- [ ] 创建 GitHub 账户（如未有）：https://github.com/signup
- [ ] 创建新的 **private** 仓库：`42-post`
- [ ] 将本地代码推送到 GitHub
  ```bash
  git init
  git add .
  git commit -m "Initial commit: THE 42 POST backend and frontend"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/42-post.git
  git push -u origin main
  ```

### 2. Railway 账户和项目创建
- [ ] 注册 Railway 账户：https://railway.app/
- [ ] 使用 GitHub 账户授权登录（推荐）
- [ ] 创建新项目

### 3. 获取所需的 API 密钥和凭据

#### Claude/Anthropic API Key
- 访问：https://console.anthropic.com/
- 创建或获取 API Key
- **不要提交到 GitHub** - 使用环境变量

#### PostgreSQL 数据库（Railway 会自动提供）
- Railway 会在部署时自动创建 PostgreSQL 插件
- 数据库凭据会通过 `DATABASE_URL` 环境变量自动注入

#### JWT 和 Signing Secrets
- 生成安全的随机密钥：
  ```bash
  # macOS/Linux
  openssl rand -base64 32
  ```
- 使用生成的值作为 JWT_SECRET 和 SIGNING_SECRET

---

## 📋 部署步骤 (Deployment Steps)

### Step 1: 连接 GitHub 仓库到 Railway

1. 打开 Railway 项目
2. 点击 **"New"** → **"GitHub Repo"**
3. 选择你的 `42-post` 仓库
4. Railway 会自动检测 `railway.json` 配置

### Step 2: 配置环境变量

在 Railway 仪表板中，设置以下环境变量：

```
NODE_ENV=production
PORT=3000

# 从 Anthropic Console 复制
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# 生成新的安全密钥
JWT_SECRET=xxxxx（使用 openssl rand -base64 32 生成）
JWT_EXPIRY=24h
SIGNING_SECRET=xxxxx（使用 openssl rand -base64 32 生成）

# FRONTEND_URL 会由 Railway 生成，格式如：
# https://42-post-production-abc123.up.railway.app
FRONTEND_URL=https://YOUR_RAILWAY_URL

# 如果使用邮件功能（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@42post.com
SMTP_PASSWORD=your_gmail_app_password
```

**关键说明：**
- Railway 会自动提供 `DATABASE_URL` 环境变量（包含 PostgreSQL 凭据）
- 不需要手动配置数据库 URL，Railway 的 PostgreSQL 插件会处理
- 所有敏感信息（密钥、API 密钥）应该在 Railway 仪表板中设置，**不要提交到 GitHub**

### Step 3: 添加 PostgreSQL 数据库插件（如果还未自动添加）

1. 在 Railway 项目中点击 **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway 会自动将 `DATABASE_URL` 注入环境变量
3. 部署时数据库初始化脚本会自动运行（由 `server.js` 中的 `initDatabase()` 处理）

### Step 4: 部署

1. Railway 会自动检测代码变更
2. 或者手动触发部署：在 Railway 仪表板点击 **"Deploy"**
3. 查看部署日志，确认：
   ```
   ✓ PostgreSQL database connected
   ✓ Server running on port 3000
   ```

### Step 5: 验证部署

1. 获取你的 Railway 应用 URL：`https://42-post-production-xxx.up.railway.app`
2. 测试健康检查端点：
   ```bash
   curl https://YOUR_RAILWAY_URL/health
   ```
   应该返回：
   ```json
   {
     "status": "OK",
     "timestamp": "2026-04-18T...",
     "version": "0.1.0"
   }
   ```

3. 测试 API（例如获取技能列表）：
   ```bash
   curl https://YOUR_RAILWAY_URL/api/skills
   ```

---

## 🔄 持续部署 (Continuous Deployment)

部署后，每当你推送代码到 GitHub 的 `main` 分支时，Railway 会自动：
1. 检测代码变更
2. 构建应用（运行 `npm install`, `npm start`）
3. 部署到生产环境
4. 应用环境变量更新

### 手动触发部署
如需强制部署，在 Railway 仪表板点击 **"Redeploy"**

---

## 📊 监控和日志

### 查看实时日志
- 在 Railway 仪表板点击你的应用
- 查看 **"Logs"** 标签页
- 可以实时看到服务器日志、错误、请求信息

### 检查部署状态
- 在 Railway 仪表板点击 **"Deployments"** 标签
- 看到所有历史部署及其状态

### 设置告警（可选）
- Railway Pro 计划支持邮件告警
- 可在仪表板设置错误通知

---

## 🔧 故障排除 (Troubleshooting)

### 错误：`DATABASE_URL not found`
**原因：** PostgreSQL 插件未正确连接
**解决：**
1. 在 Railway 仪表板确认 PostgreSQL 插件已添加
2. 检查环境变量中是否有 `DATABASE_URL`
3. 重新部署

### 错误：`ANTHROPIC_API_KEY is missing`
**原因：** 未设置 Claude API 密钥
**解决：**
1. 获取 Anthropic API Key：https://console.anthropic.com/
2. 在 Railway 仪表板添加环境变量 `ANTHROPIC_API_KEY`
3. 重新部署

### 部署后 API 返回 CORS 错误
**原因：** `FRONTEND_URL` 环境变量配置不正确
**解决：**
1. 获取正确的 Railway URL（从仪表板复制）
2. 更新 `FRONTEND_URL` 环境变量
3. 更新前端的 API 调用地址
4. 重新部署

### 数据库初始化失败
**原因：** 数据库权限或连接问题
**解决：**
1. 检查 Railway 日志中的错误信息
2. 确认 PostgreSQL 插件状态为 "Active"
3. 清除并重建数据库：在 Railway 仪表板删除 PostgreSQL，重新添加

---

## 🌐 部署后的前端配置

### 更新前端 API 地址

在前端项目中（`day1/script.js` 等），更新 API 调用地址：

```javascript
// 从：
const API_BASE = 'http://localhost:3000/api'

// 改为：
const API_BASE = 'https://YOUR_RAILWAY_URL/api'
// 例如：https://42-post-production-abc123.up.railway.app/api
```

### 部署前端到 Vercel（可选）

1. 注册 Vercel 账户：https://vercel.com/
2. 导入你的 GitHub 仓库
3. 设置环境变量 `NEXT_PUBLIC_API_URL`（如使用 Next.js）
4. 自动部署到 Vercel CDN

---

## 📈 扩展和升级

### 1000+ 用户的预期成本
- **Railway 基础套餐：** ¥10-30/月（包含 PostgreSQL）
- 根据流量自动扩展，计费按使用量

### 升级到企业级（如流量增加）
- 可无缝迁移到自托管 Kubernetes 集群
- Railway 提供方便的数据库备份和恢复工具
- 支持 CDN 加速和全球节点部署

### 后续修改和优化
- 如部署后需要修改代码，可继续在 GitHub 上推送代码
- Railway 会自动重新部署
- 无需手动重新配置或停机

---

## ✅ 部署完成清单

- [ ] GitHub 仓库已创建并推送代码
- [ ] Railway 账户已创建
- [ ] 环境变量已配置（所有必需的密钥）
- [ ] PostgreSQL 数据库已连接
- [ ] 部署日志显示 "✓ Connected"
- [ ] 健康检查端点返回 200 OK
- [ ] API 端点可访问
- [ ] 前端 API 地址已更新
- [ ] 测试用户可创建 skill（如可用）

---

## 📞 支持和资源

- Railway 文档：https://docs.railway.app/
- Anthropic Claude 文档：https://docs.anthropic.com/
- 项目 GitHub：https://github.com/YOUR_USERNAME/42-post
- 问题反馈和改进：在部署后可继续与 Claude 协作修改

**部署问题？** 在部署日志中查看具体错误信息，通常会给出解决方向。
