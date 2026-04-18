# THE 42 POST 简化工坊流程 - 测试指南

## 🔧 已完成的改进

### ✅ Problem 1: Probe 反馈距离太远
**已修复** - Probe Modal 从 forgePage1 内部移出，现在使用 `position: fixed` 在屏幕中心显示
- HTML 改动：probeModal 现在在 forge-modal 的顶层（全局）
- CSS：已有 `position: fixed; z-index: 1000; display: flex; align-items/justify-content: center`
- **结果**：点击"生成直觉探针"后，modal 应该立即在屏幕中心出现

### ✅ Problem 2: 进入铸造后重复填写描述
**已修复** - 移除了 forgePage0 和 pathA/pathB 的分支
- 用户现在在 **forgePage1** 一次性填写：
  - 账户信息（用户名、邮箱）
  - 想法（textarea）
  - Domain 选择（10 个选项）
  - **不再需要重复输入**
- **结果**：工坊流程更直接，无冗余步骤

### ✅ Problem 3: 卡在验证环节
**已改进** - Domain 选择逻辑已简化和整合
- Domain 选择现在在 forgePage1 中（而不是在 forgePage2 之后）
- 点击 Domain 时会立即保存到 `window.forgeData.domain`
- "生成直觉探针"按钮验证：username, email, idea, domain - 四项必填
- **可能仍需调试**：某些旧的 Domain 验证代码可能需要清理

### ✅ Bonus: 移除 Shadow Agent/Direct Knight 复杂性
- 完全移除了 forgePage0 的路径选择
- 单一的"生成直觉探针"按钮替代了 btnOpenProbe-A 和 btnOpenProbe-B
- 流程简化为：想法 → Domain → Probe → 五层生成 → 发布

---

## 📋 简化后的工作流（4 步）

```
┌─────────────────────────────────────────────────┐
│ STEP 1: 账户 + 想法 + Domain 选择              │
│ ────────────────────────────────────           │
│ □ 输入用户名 & 邮箱                            │
│ □ 输入你的想法 (textarea)                     │
│ □ 选择一个 Domain (10个选项)                  │
│ □ 点击 "生成直觉探针" 按钮                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ STEP 2: Intuition Probe Modal (居中显示)      │
│ ────────────────────────────────────           │
│ 📍 **modal 应该在屏幕中间弹出** ✨            │
│                                                 │
│ 场景：[AI 在什么情况下...]                    │
│                                                 │
│ 选择一个响应：                                 │
│ ⭕ A · 舒适区                                 │
│ ⭕ B · 反题                                   │
│ ⭕ C · 道德边界                               │
│                                                 │
│ ✓ 你选择了 [A/B/C]                           │
│ [开始铸造 / BEGIN FORGING →]                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ STEP 3: 五层自动生成 (2-5)                    │
│ ────────────────────────────────────           │
│ ⟳ 生成中...                                    │
│                                                 │
│ 01 DEFINING / 定义原则                         │
│ 02 INSTANTIATING / 具体示例                   │
│ 03 FENCING / 边界限制                          │
│ 04 VALIDATING / 验证测试                       │
│ 05 CONTEXTUALIZING / 文化适配                 │
│                                                 │
│ ✓ 准备铸造 / Ready to forge                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ STEP 4: 发布与权益 (forgePage3)              │
│ ────────────────────────────────────           │
│ 技能名称：[自动生成的名称]                    │
│ 定义：[自动生成的定义]                        │
│ ...                                             │
│                                                 │
│ 商业使用：[Authorized / Restricted]           │
│ 允许混搭：[Yes / No]                          │
│                                                 │
│ [← BACK] [⚔ PUBLISH & FORGE]                │
│                                                 │
│ ✓ 技能已发布，获得 Soul-Hash                 │
└─────────────────────────────────────────────────┘
```

---

## 🧪 实际测试步骤

### 前提条件
- ✅ 后端服务器正在 `http://localhost:3000` 运行
- ✅ 前端服务器正在 `http://localhost:8000` 运行
- ✅ 有有效的 ANTHROPIC_API_KEY 在 `.env` 中

### 测试序列

#### TEST 1: 页面加载
```
1. 打开 http://localhost:8000
2. 滚动到下方，找到 "TASTE SKILL FORGE" 部分
3. 点击方块卡片或"开始铸造"按钮打开工坊 overlay
4. ✅ 预期：直接看到 STEP 1（用户名、邮箱、想法、Domain、按钮）
5. ❌ 如果看到"CHOOSE YOUR PATH" - 说明 forgePage0 没有移除
```

#### TEST 2: Domain 选择
```
1. 在 forgePage1 中，选择一个 Domain（点击任何选项）
2. ✅ 预期：Domain 卡片变亮/高亮（选中状态）
3. ❌ 如果没有反应，检查浏览器控制台有无错误
```

#### TEST 3: Probe 生成 (关键!)
```
1. 填写用户名、邮箱、想法
2. 选择一个 Domain
3. 点击 "生成直觉探针" 按钮
4. ✅ 预期：Modal 立即在屏幕中间出现，显示三个选择
5. ❌ 如果 modal 没有出现：
   - 检查浏览器控制台有无 JavaScript 错误
   - 检查页面是否滚动到了下方（modal 可能超出视口）
   - 检查 CSS `z-index: 1000` 是否被覆盖
```

#### TEST 4: 选择 Probe 响应
```
1. Modal 出现后，选择一个响应（A/B/C）
2. ✅ 预期：
   - 选中的卡片高亮
   - 下方出现 "✓ 你选择了 [选项]" 确认
   - "开始铸造"按钮出现
3. ❌ 如果没反应，检查 JavaScript 控制台
```

#### TEST 5: 五层生成
```
1. 点击 "开始铸造" 按钮
2. ✅ 预期：
   - Modal 关闭
   - 显示五层动画（01-05 进度条）
   - 完成后显示 "✓ 准备铸造"
3. ❌ 如果卡住或出错：
   - 检查后端日志（看是否有 API 错误）
   - 检查 Claude API key 是否正确
```

#### TEST 6: 发布与完成
```
1. 五层生成完成后，自动进入 forgePage3
2. ✅ 预期：看到自动生成的技能信息
3. 点击 "PUBLISH & FORGE"
4. ✅ 预期：
   - 技能被发布到数据库
   - 获得 Soul-Hash ID
   - 看到 "Knight Card" 下载选项
```

---

## 📊 问题诊断矩阵

| 症状 | 可能原因 | 解决方案 |
|------|--------|--------|
| Probe Modal 不出现 | 1. forgePage1 没有正确显示 2. Modal 被页面遮挡 | 检查 z-index, 确保父元素没有 transform |
| Domain 选择无反应 | JavaScript 事件监听器未绑定 | 检查浏览器控制台，重新加载页面 |
| "生成直觉探针" 点击后出现对话框 "Please select a domain" | Domain 选择没被保存 | 确保点击 Domain 后有视觉反馈（高亮）|
| 五层生成停止在 01 | 后端 API 错误 | 检查后端日志和 ANTHROPIC_API_KEY |
| 看不到任何页面 | 工坊 overlay 没有激活 | 检查 forgeOverlay 的 `display` 状态 |

---

## 🔍 浏览器调试技巧

### Chrome DevTools 中检查关键变量
```javascript
// 在 Console 标签页执行
window.forgeData  // 应该看到 {username, email, idea, domain, probeChoice}

// 检查 Modal 元素
document.getElementById('probeModal').style  // 应该看到 display: "flex"

// 检查 Domain 选择
document.querySelector('.domain-choice.selected')  // 应该找到一个元素
```

### 检查 API 调用
1. 打开 DevTools → Network 标签
2. 重新生成 Probe
3. 应该看到 POST 请求到：
   - `/api/forge/probe` (生成探针)
   - `/api/forge/generate` (生成五层)
   - `/api/skills` (发布技能)

---

## ⚠️ 已知限制（仍需修复）

1. **shadowAgent/directKnight 的残留代码**
   - 仍有对 `selectedMode` 变量的引用
   - 需要全局搜索和删除

2. **forgePage2 仍然存在**
   - 现在用户跳过了 forgePage2，直接进入 forgePage2-5
   - 可以保留 forgePage2 用于未来的版本显示

3. **Domain 在 forgePage2 中仍然有副本**
   - 现在 forgePage1 有一个 Domain 选择（domainGridStep1）
   - forgePage2 中也有 Domain 选择（domainGridStep2） - 可以删除

4. **导出格式尚未实现**
   - Markdown、LangChain、MCP 导出还需要编码

---

## ✅ 下一步行动

### 立即测试
1. 启动后端和前端服务器
2. 按照上述"测试步骤"逐个执行
3. 记录任何错误或问题

### 基于测试结果
- 如果 TEST 1-2 失败 → 检查 HTML 修改
- 如果 TEST 3 失败 → 检查 JavaScript 和 z-index
- 如果 TEST 4-6 失败 → 检查后端 API 和 Claude 集成

### 之后的优化
- 清理残留的旧代码（selectedMode, forgePage0 引用）
- 删除重复的 Domain 选择代码
- 实现导出格式（Phase E）
- 添加完整的错误处理和用户反馈

---

**记录时间**: 2026-04-16
**版本**: 0.2-simplified
**状态**: Ready for User Testing
