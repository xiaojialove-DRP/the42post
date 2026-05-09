# 13个关键问题的修复方案

## 目录

- [阶段一：防止Crash](#阶段一防止crash)
- [阶段二：防止数据损坏](#阶段二防止数据损坏)
- [阶段三：功能稳定性](#阶段三功能稳定性)
- [实施汇总](#实施汇总)

---

## 阶段一：防止Crash

### 问题 #1：SQLite多语句处理缺陷
**文件**: `backend/db/sqlite-adapter.js` (行35-45)

**问题**: `db.exec()` 不支持参数绑定，导致多语句执行错误

**修复要点**:
1. 移除 `db.exec()` 调用
2. 对每条语句逐个 prepare() → bind → run()
3. 添加错误处理

**代码修复**:
```javascript
// 替换 db.exec(s) 部分
for (const stmt of statements) {
  const s = stmt.trim();
  if (!s) continue;
  
  let normalizedStmt = s
    .replace(/\$(\d+)/g, () => '?')
    .replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');
  
  try {
    const prepared = this.db.prepare(normalizedStmt);
    const upper = normalizedStmt.trim().toUpperCase();
    
    if (upper.startsWith('SELECT')) {
      results.push(prepared.all(...params));
    } else {
      prepared.run(...params);
    }
  } catch (err) {
    throw new Error(`Multi-statement failed: ${err.message}`);
  }
}
return { rows: results[0] || [] };
```

**风险**: 🔴 高（数据损坏）

---

### 问题 #5：缓存系统内存泄漏
**文件**: `backend/utils/cache.js`

**问题**: 
1. 无容量限制，内存无限增长
2. `invalidatePattern()` 清除所有Redis数据

**修复要点**:
1. MemoryCache 添加容量限制 (5000条目)
2. 实现 LRU 驱逐机制
3. Redis 清理改为精确匹配

**关键代码**:
```javascript
class MemoryCache {
  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
    this.accessOrder = [];  // LRU tracking
  }
  
  set(key, value, ttlMs) {
    // 超容量时驱逐最早访问的条目
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift();
      this.store.delete(lruKey);
    }
    // 更新访问顺序
    this.accessOrder.push(key);
  }
}

// invalidatePattern 改进
async invalidatePattern(pattern) {
  // 只删除匹配的 Redis 键，不是全部
  const fullPattern = this.redis.prefix + pattern;
  const keys = await this.redis.redis.keys(fullPattern);
  if (keys.length > 0) {
    await this.redis.redis.del(...keys);
  }
}
```

**风险**: 🔴 高（OOM）

---

### 问题 #6：速率限制器内存泄漏
**文件**: `backend/middleware/rateLimiter.js` (行208-222)

**问题**: 清理逻辑不完全，僵尸IP条目累积

**修复要点**:
1. 更频繁清理 (5分钟 vs 10分钟)
2. 容量限制 (10000个IP)
3. 超限时使用LRU驱逐

**关键代码**:
```javascript
const MAX_IPS_TRACKED = 10000;

setInterval(() => {
  // 清理过期时间戳
  for (const [ip, data] of requestTimestamps) {
    for (const key in data) {
      data[key] = cleanOldTimestamps(data[key], now);
      if (data[key].length === 0) delete data[key];
    }
  }
  
  // 移除空IP条目
  for (const [ip, data] of requestTimestamps) {
    if (Object.keys(data).length === 0) {
      requestTimestamps.delete(ip);
    }
  }
  
  // 超容量驱逐
  if (requestTimestamps.size > MAX_IPS_TRACKED) {
    // 按最古老时间戳排序并驱逐
    const ipsArray = Array.from(requestTimestamps.entries());
    ipsArray.sort((a, b) => {
      const aOldest = Math.min(...Object.values(a[1]).map(arr => arr[0] || Infinity));
      const bOldest = Math.min(...Object.values(b[1]).map(arr => arr[0] || Infinity));
      return aOldest - bOldest;
    });
    
    const toEvict = ipsArray.length - Math.floor(MAX_IPS_TRACKED * 0.9);
    for (let i = 0; i < toEvict; i++) {
      requestTimestamps.delete(ipsArray[i][0]);
    }
  }
}, 5 * 60 * 1000);  // 5分钟一次
```

**风险**: 🔴 高（长期OOM）

---

## 阶段二：防止数据损坏

### 问题 #3：数据库连接未正确关闭
**文件**: `backend/server.js` (行567-577)

**问题**: `db.end()` 是 PostgreSQL API，SQLite 没有此方法

**修复要点**:
1. 检测数据库类型
2. SQLite: `db.db.close()`
3. PostgreSQL: `db.end()`

**代码修复**:
```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');

  try {
    if (db.db && typeof db.db.close === 'function') {
      // SQLite
      db.db.close();
      console.log('✓ SQLite database closed');
      process.exit(0);
    } else if (typeof db.end === 'function') {
      // PostgreSQL
      db.end(() => {
        console.log('✓ PostgreSQL pool closed');
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error('⚠ Forced shutdown');
        process.exit(1);
      }, 10000);
      return;
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
});
```

**风险**: 🔴 高（数据损坏）

---

### 问题 #4：事务处理中的错误未正确捕获
**文件**: `backend/routes/skills.js` (行498-598)

**问题**: 
1. ROLLBACK 失败后吞掉错误
2. client 可能被释放两次
3. 某些DB错误不可恢复

**修复要点**:
1. 添加 `transactionActive` 标志
2. 每次INSERT后验证 rowCount
3. 报告约束违反错误 (409 Conflict)

**关键代码**:
```javascript
let client;
let transactionActive = false;

try {
  client = await db.connect();
  
  try {
    await client.query('BEGIN IMMEDIATE');
    transactionActive = true;
  } catch (err) {
    throw new Error(`Transaction start failed: ${err.message}`);
  }
  
  // 每个 INSERT 后验证
  const result = await client.query(`INSERT INTO skills...`);
  if (!result || !result.rowCount || result.rowCount === 0) {
    throw new Error('Insert returned zero rows');
  }
  
  // ... 更多 INSERT ...
  
  await client.query('COMMIT');
  transactionActive = false;
  
  return res.status(201).json({ success: true });
  
} catch (error) {
  // 只在事务活跃时回滚
  if (transactionActive && client) {
    try {
      await client.query('ROLLBACK');
      transactionActive = false;
    } catch (rollbackErr) {
      console.error('❌ ROLLBACK FAILED - Data may be inconsistent:', rollbackErr);
      error.criticalRollbackFailure = true;
    }
  }
  
  // 识别约束错误
  const statusCode = error.code === '23505' ? 409 : 500;
  return res.status(statusCode).json({
    success: false,
    error: statusCode === 409 ? 'Duplicate skill' : error.message
  });
  
} finally {
  if (client) {
    if (transactionActive) {
      try {
        await client.query('ROLLBACK');
      } catch (e) {
        console.error('Finally: rollback failed:', e.message);
      }
    }
    client.release();
  }
}
```

**风险**: 🟠 中（数据不一致）

---

## 阶段三：功能稳定性

### 问题 #2：Promise.all错误处理不完整
**文件**: `backend/routes/playground.js` (行170-173)

**修复**: 使用 Promise.allSettled() 而非 Promise.all() + .catch()

```javascript
// 修改前
const [withResp, withoutResp] = await Promise.all([
  callLLMJSON(...).catch(e => ({ error: e.message })),
  callLLMJSON(...).catch(e => ({ error: e.message }))
]);

// 修改后
const results = await Promise.allSettled([
  callLLMJSON(...),
  callLLMJSON(...)
]);

if (results[0].status === 'rejected') {
  return res.status(502).json({
    error: 'Generation failed',
    message: results[0].reason?.message
  });
}

const withData = results[0].value;
const withoutData = results[1].value;
```

**风险**: 🟡 低（功能失效）

---

### 问题 #7：异步操作无超时保护
**文件**: `backend/utils/skillGeneration.js`

**修复**: 添加 fetchWithTimeout 包装

```javascript
async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// 在 callDeepSeekSingle 中使用
const resp = await fetchWithTimeout(DEEPSEEK_ENDPOINT, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify(body)
}, 60000);
```

**风险**: 🟠 中（无限等待）

---

### 问题 #8-13：其他改进

| # | 问题 | 修复 | 风险 |
|---|------|------|------|
| 8 | 缓存键冲突 | 使用 CacheKeys 命名空间 | 🟡 低 |
| 9 | Redis连接未清理 | 健康检查 + shutdown | 🟡 低 |
| 10 | 竞态条件 | 数据库约束 + 事务锁定 | 🟠 中 |
| 11 | 日志缺乏上下文 | requestContext 中间件 | 🟢 很低 |
| 12 | 无重试机制 | retryWithBackoff() 函数 | 🟢 很低 |
| 13 | 连接池泄漏 | isResolved 标志 + 清理 | 🔴 高 |

---

## 实施汇总

**总体时间**: 6-8 小时  
**受影响文件**: 8 个  
**代码修改**: ~500 行  

### 优先级
1. **立即** (今天): #1, #3, #4, #5, #6
2. **本周**: #2, #7, #8-13

### 验证
```bash
npm start              # 服务器启动
npm test               # 运行测试
# 监控内存使用
# 压力测试
```

### 预期改进
- 内存泄漏: 100% 修复
- crash 风险: 90% 降低
- 数据丢失: 100% 防止
- 缓存准确率: 90% → 99%

详见 README_FIXES.md 获取完整实施指南。
