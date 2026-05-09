# 实施与验证检查清单

## 快速导航

**总时间**: 6-8 小时  
**优先级**: 阶段一 > 阶段二 > 阶段三  
**风险**: 最小（所有修改都向后兼容）

---

## 阶段一：防止Crash（2小时）

### Issue #1: SQLite多语句处理
- [ ] 打开 `backend/db/sqlite-adapter.js`
- [ ] 定位第35-45行
- [ ] 移除 `db.exec(s)` 调用
- [ ] 实现逐语句 prepare/bind/run
- [ ] 测试: `npm start` 启动无误

### Issue #5: 缓存容量限制
- [ ] 打开 `backend/utils/cache.js`
- [ ] MemoryCache 添加 maxSize=5000
- [ ] 实现 accessOrder LRU 跟踪
- [ ] 修复 invalidatePattern() 清理逻辑
- [ ] 验证: 内存不会无限增长

### Issue #6: 速率限制器清理
- [ ] 打开 `backend/middleware/rateLimiter.js`
- [ ] 更新末尾 setInterval 逻辑
- [ ] 添加 MAX_IPS_TRACKED = 10000
- [ ] 实现容量超限驱逐
- [ ] 测试: 压力测试无误

---

## 阶段二：防止数据损坏（2小时）

### Issue #3: 数据库连接关闭
- [ ] 打开 `backend/server.js`
- [ ] 修改 SIGTERM 处理
- [ ] 添加数据库类型检测
- [ ] 测试: `kill -TERM` 优雅关闭
- [ ] 验证: 数据库文件完整

### Issue #4: 事务处理
- [ ] 打开 `backend/routes/skills.js`
- [ ] 添加 transactionActive 标志
- [ ] 验证每个 INSERT 的 rowCount
- [ ] 改进错误报告逻辑
- [ ] 测试: 创建 skill，重复测试应返回409

---

## 阶段三：功能稳定性（2小时）

### Issue #2: Promise.all改进
- [ ] 打开 `backend/routes/playground.js`
- [ ] 替换 Promise.all 为 allSettled
- [ ] 添加 status === 'rejected' 检查
- [ ] 分别处理两个响应

### Issue #7: 超时保护
- [ ] 打开 `backend/utils/skillGeneration.js`
- [ ] 添加 fetchWithTimeout() 函数
- [ ] 在 callDeepSeekSingle 中使用
- [ ] 测试: 模拟慢速API

### Issues #8-13: 其他改进
- [ ] Issue #8: 缓存键命名空间 (CacheKeys)
- [ ] Issue #9: Redis 健康检查
- [ ] Issue #10: 竞态条件处理
- [ ] Issue #11: 日志上下文中间件
- [ ] Issue #12: 重试机制
- [ ] Issue #13: 连接池清理

---

## 完整验证

```bash
# 1. 启动服务器
npm start

# 2. 基本健康检查
curl http://localhost:3000/api/health

# 3. 内存测试 (10分钟)
for i in {1..100}; do
  curl "http://localhost:3000/api/skills?page=$i"
done

# 4. 关闭验证
kill -TERM $(pgrep -f "node.*server.js")

# 验证输出中应包含：
# "✓ SQLite database closed"
# "Database operations completed"
```

---

## 最终检查清单

修改完成后验证：

- [ ] npm install 无错误
- [ ] npm start 成功启动
- [ ] API 基本功能正常
- [ ] 内存使用稳定
- [ ] 日志无 ERROR/WARN
- [ ] 压力测试通过
- [ ] 数据库完整性OK
- [ ] 所有文件已保存

**预期时间**: 6-8 小时  
**下一步**: 提交代码并创建 PR

