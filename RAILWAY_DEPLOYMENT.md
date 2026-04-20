# Railway 部署指南

## 🚀 快速开始（5 分钟）

### Step 1: 准备 GitHub 仓库

```bash
# 确保所有改动已提交
git status
git add -A
git commit -m "Ready for Railway deployment"
git push origin main
```

### Step 2: Railway 连接

1. 访问 [railway.app](https://railway.app)
2. 登录或注册账户
3. 点击 **"New Project"**
4. 选择 **"Deploy from GitHub"**
5. 授权 GitHub 并选择 `xiaojialove-DRP/the42post` 仓库
6. Railway 会自动检测到 `Procfile` 和 `Dockerfile`

### Step 3: 环境变量配置

在 Railway 项目中，点击 **Variables** 添加以下环境变量：

```env
# 数据库（Railway PostgreSQL）
DATABASE_URL=postgresql://[自动生成]

# 认证
JWT_SECRET=your-secret-key-minimum-32-chars-change-this
JWT_EXPIRY=24h

# Claude API（技能生成必需）
ANTHROPIC_API_KEY=sk-ant-[你的Anthropic API密钥]

# 邮件服务（✅ 必需 - 否则邮件只在日志中，不会实际发送）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=[Google应用密码，不是账户密码]
SMTP_SECURE=false

# 前端 URL
FRONTEND_URL=https://[你的Railway域名].railway.app

# 签名密钥
SIGNING_SECRET=your-signing-secret-minimum-32-chars-change-this

# 环境
NODE_ENV=production
PORT=8080
```

#### ⚠️ 邮件配置说明（重要）

**如果不配置 SMTP 环境变量，系统会进入"开发模式"，邮件只会被记录到日志中，不会实际发送给用户。**

**配置 Gmail SMTP 步骤：**

1. 打开 [Google 账户设置](https://myaccount.google.com/)
2. 进入左侧菜单 **安全** 
3. 找到 **应用密码**（如果看不到，说明还未开启两步验证）
4. 选择应用为"邮件"，选择设备为"Windows PC"（或您使用的设备）
5. Google 会生成一个 16 位的专用密码
6. 复制这个密码到 Railway Variables 的 `SMTP_PASSWORD` 字段（**不是你的 Google 账户密码！**）

**验证邮件是否正确配置：**

部署后，在 Railway 仪表板查看实时日志：
- ✅ 如果看到 `✓ Email sent successfully to...` → 邮件配置正确，正在发送
- ⚠️ 如果看到 `📧 [DEV MODE] Email would be sent to...` → SMTP 未配置，邮件只记录日志

**测试邮件发送：**
1. 创建一个技能并完成发布
2. 查看 Railway 日志，确认邮件发送消息
3. 检查用户邮箱（包括垃圾邮件文件夹）

### Step 4: 添加 PostgreSQL 数据库

1. 在 Railway 项目中，点击 **+ Add**
2. 选择 **Provision PostgreSQL**
3. 等待数据库创建完成
4. Railway 会自动注入 `DATABASE_URL`

### Step 5: 部署

1. 确保 `Dockerfile` 和 `Procfile` 在根目录
2. 提交改动：`git push origin main`
3. Railway 会自动检测到推送，开始构建
4. 在 Railway 仪表板查看构建日志
5. 部署完成后，你会获得一个公开的 URL

---

## 🔍 故障排查

### 问题 1: 构建失败（Build Failed）

**症状**: 构建日志显示 npm install 失败

**解决方案**:
```bash
# 清理 node_modules 和 lock 文件
rm -rf backend/node_modules backend/package-lock.json
cd backend
npm install
cd ../
git add -A
git commit -m "Clean reinstall dependencies"
git push origin main
```

### 问题 2: 端口错误

**症状**: 应用启动但无法访问，错误提示 "Port 3000 already in use"

**解决方案**:
- 确保 `Dockerfile` 中有 `ENV PORT=8080`
- 确保 `backend/server.js` 中使用 `process.env.PORT || 3000`

### 问题 3: 数据库连接失败

**症状**: 错误 "Cannot connect to database"

**解决方案**:
1. 确认 `DATABASE_URL` 已在 Railway 中设置
2. 检查数据库是否已启动
3. 如果使用 SQLite（本地开发），确保改用 PostgreSQL

### 问题 4: API 响应 500 错误

**症状**: 技能创建或生成失败，返回 500 错误

**解决方案**:
1. 检查 `ANTHROPIC_API_KEY` 是否正确
2. 检查 API 密钥是否有效且未过期

### 问题 5: CORS 错误

**症状**: 前端无法调用后端 API

**解决方案**:
1. 确保 `FRONTEND_URL` 已设置正确
2. 确保与 Railway 域名匹配

### 问题 6: 图片或资源无法加载（404 错误）

**症状**: 前端页面显示但图片、样式或脚本无法加载

**解决方案**:
1. 检查 Dockerfile 是否正确复制前端文件到 `day1` 目录：
   ```
   RUN mkdir -p /app/day1 && cp -r /app/frontend/* /app/day1/
   ```
2. 在浏览器开发者工具 (F12 → Network) 检查 404 错误
3. 查看 Railway 日志，搜索 `404` 或 `Not Found`
4. 确保 `backend/server.js` 中正确设置了 `frontendPath`

---

## 📋 完整检查清单

部署前确认以下内容：

- [ ] 所有代码已 commit 和 push 到 GitHub main 分支
- [ ] `Dockerfile` 存在于项目根目录
- [ ] `Procfile` 存在于项目根目录
- [ ] `backend/server.js` 存在并可运行
- [ ] `backend/package.json` 包含所有依赖
- [ ] `ANTHROPIC_API_KEY` 已获取并有效
- [ ] Railway PostgreSQL 已创建
- [ ] 所有环境变量已在 Railway 中设置
- [ ] `FRONTEND_URL` 与 Railway 域名匹配

---

## 🌐 部署后验证

部署完成后，测试以下端点：

```bash
# 后端健康检查
curl https://[你的Railway域名].railway.app/health

# 前端访问
https://[你的Railway域名].railway.app

# API 测试（获取技能列表）
curl https://[你的Railway域名].railway.app/api/skills
```

---

**最后更新**: 2026-04-20
