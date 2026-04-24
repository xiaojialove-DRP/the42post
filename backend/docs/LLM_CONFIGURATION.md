# LLM Configuration Guide

## 概述

THE 42 POST 支持多个 AI 模型提供商，通过环境变量 `LLM_PROVIDER` 来切换。

## 支持的提供商

### 1. Google Gemini（当前默认）

**优点：**
- ✅ 免费额度充足（每分钟 60 请求）
- ✅ 支持长上下文（100K tokens）
- ✅ 响应快速
- ✅ 多模态能力

**配置：**
```bash
# .env
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your_key_from_https://aistudio.google.com
```

**获取密钥：**
1. 访问 https://aistudio.google.com/apikey
2. 点击 "Create API Key"
3. 选择项目并创建
4. 复制密钥到 `.env` 文件

---

### 2. Anthropic Claude（计划中）

**优点：**
- ✅ 超强的推理能力
- ✅ 无幻觉倾向
- ✅ 长上下文支持（200K tokens）
- ⚠️ 付费制（按使用量计费）

**配置：**
```bash
# .env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_key
ANTHROPIC_MODEL=claude-3-opus-20240229
```

**获取密钥：**
1. 访问 https://console.anthropic.com/keys
2. 创建新的 API Key
3. 复制到 `.env`
4. 需要绑定信用卡

**模型选择：**
```
- claude-3-opus-20240229    (最强，最慢，最贵)
- claude-3-sonnet-20240229  (均衡)
- claude-3-haiku-20240307   (最快，最便宜)
```

---

### 3. OpenAI（计划中）

**优点：**
- ✅ 强大的 GPT-4 模型
- ✅ 庞大的生态系统
- ⚠️ 需要充值

**配置：**
```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4-turbo-preview
```

**获取密钥：**
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 需要付费账户

---

## 如何切换模型

### 方式 1：通过环境变量（推荐）

```bash
# 开发环境
LLM_PROVIDER=gemini GOOGLE_API_KEY=xxx npm start

# 生产环境（Railway）
# 在 Railway Dashboard 中设置：
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=xxx
```

### 方式 2：修改代码中的默认值

编辑 `backend/utils/llmAdapter.js`：
```javascript
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini'; // 改为你的默认提供商
```

---

## 性能对比

| 指标 | Gemini | Claude | OpenAI |
|-----|--------|--------|--------|
| **Probe 生成速度** | 3-5s | 5-8s | 4-6s |
| **Five-Layer 生成时间** | 8-12s | 10-15s | 10-14s |
| **成本（100个probes）** | 免费 | ~$0.03 | ~$0.05 |
| **推理质量** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **稳定性** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 添加新的提供商

### 步骤 1：在 llmAdapter.js 中添加实现

```javascript
async function generateProbeWithNewProvider(ideaText, language) {
  const client = new NewProviderClient(process.env.NEW_PROVIDER_KEY);
  
  const result = await client.generate({
    prompt: ideaText,
    temperature: 0.7,
    maxTokens: 2000
  });

  return {
    success: true,
    data: JSON.parse(result.text),
    model: 'new-provider-model',
    usage: {
      inputTokens: result.usage.prompt_tokens,
      outputTokens: result.usage.completion_tokens
    }
  };
}
```

### 步骤 2：在 switch 语句中注册

```javascript
async generateProbe(ideaText, language = 'en') {
  switch (LLM_PROVIDER) {
    case 'gemini':
      return await generateProbeWithGemini(ideaText, language);
    case 'claude':
      return await generateProbeWithClaude(ideaText, language);
    case 'new-provider':
      return await generateProbeWithNewProvider(ideaText, language);
    default:
      throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
  }
}
```

### 步骤 3：更新 .env.example

```bash
# New Provider
# NEW_PROVIDER_API_KEY=your_key
```

---

## 错误处理

如果某个提供商的 API 调用失败：

```javascript
// 自动fallback 到备用提供商（可选）
async generateProbeWithFallback(ideaText, language) {
  try {
    return await LLMAdapter.generateProbe(ideaText, language);
  } catch (error) {
    console.warn(`${LLM_PROVIDER} failed, falling back to gemini...`);
    // 临时切换到 gemini
    process.env.LLM_PROVIDER = 'gemini';
    return await generateProbeWithGemini(ideaText, language);
  }
}
```

---

## 成本估算

### 月度用户增长假设

| 月份 | 活跃用户 | Probes/用户 | 总 Probes | 成本（Gemini） | 成本（Claude） |
|-----|---------|-----------|----------|--------------|--------------|
| 1月 | 100 | 2 | 200 | 免费 | $0.06 |
| 2月 | 200 | 2 | 400 | 免费 | $0.12 |
| 3月 | 500 | 2 | 1,000 | 免费 | $0.30 |
| 6月 | 2,000 | 2 | 4,000 | 免费 | $1.20 |
| 12月 | 10,000 | 2 | 20,000 | 免费 | $6.00 |

**结论：** Gemini 对于启动阶段最经济，后续可根据需求升级到 Claude 或 OpenAI。

---

## 最佳实践

1. **开发环境**：使用 Gemini（免费、快速）
2. **测试环境**：使用 Claude（质量最高）
3. **生产环境**：使用 Gemini（成本考虑），或 Claude/OpenAI（质量考虑）
4. **监控**：记录所有 API 调用的耗时和成本
5. **速率限制**：为每个提供商设置合理的 rate limit
6. **日志**：记录使用哪个提供商、耗时、成本等信息

---

## 故障排查

### 问题：收到 "Invalid API Key" 错误

**解决：**
```bash
# 检查 .env 文件中的密钥是否正确
# 确保没有多余的空格或换行符
cat .env | grep LLM_PROVIDER
cat .env | grep API_KEY
```

### 问题：Probe 生成速度太慢

**尝试：**
1. 切换到 Gemini（最快）
2. 检查网络连接
3. 检查 API 配额限制

### 问题：生成的结果质量不稳定

**尝试：**
1. 检查 prompt 模板是否一致
2. 调整 temperature 参数（0.7 是平衡值）
3. 增加 maxTokens（允许更长的回应）
4. 切换到 Claude（更稳定）
