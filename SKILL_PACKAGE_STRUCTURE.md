# 📦 THE 42 POST 文档导航地图

## 快速选择你的学习路径

### 🎯 我是谁？选择对应的路径

| 角色 | 你想做什么 | 阅读时间 | 文档清单 |
|------|----------|---------|---------|
| **Skill创建者** | 创建一个可信的技能 | 90分钟 | 【核心包】 |
| **开发者** | 部署整个系统 | 2小时 | 【核心包】+ 【技术包】 |
| **研究者** | 深入理解理论 | 3-4小时 | 【核心包】+ 【扩展包】 |

---

## 📚 【核心包】— 4个文档，所有用户必读

> **目标**：理解五步技能铸造模式，学会创建技能

### 1. **GETTING_STARTED.md** ⏱ 5分钟
**你要了解**：五步流程的整体框架是什么？

**包含**：
- STEP 0-4 的快速概览
- 三个forge模式的解释
- 核心概念（五层架构、Soul-Hash、Manifest）

**何时阅读**：最先读这个！快速了解全貌

---

### 2. **SKILL_DESIGN_GUIDE.md** ⏱ 60分钟
**你要学会**：如何从"我有个想法"变成"可信的技能"

**包含**：
```
第1部分：理解五层架构（20分钟）
  ├─ DEFINING - 定义核心原则
  ├─ INSTANTIATING - 写出具体例子
  ├─ FENCING - 定义应用边界
  ├─ VALIDATING - 创建测试用例
  └─ CONTEXTUALIZING - 文化适配

第2部分：手把手教程（25分钟）
  ├─ 步骤1：捕捉你的想法
  ├─ 步骤2：澄清原则（DEFINING）
  ├─ 步骤3：写出例子（INSTANTIATING）
  ├─ 步骤4：定义边界（FENCING）
  ├─ 步骤5：测试用例（VALIDATING）
  └─ 步骤6：文化适配（CONTEXTUALIZING）

第3部分：案例和检查清单（15分钟）
  ├─ 完整案例研究
  ├─ 常见错误
  └─ 质量检查清单
```

**何时阅读**：GETTING_STARTED之后立即读

---

### 3. **EXAMPLES.md** ⏱ 20分钟
**你要看**：成功的技能例子是什么样的？

**包含**：
- 3-5个完整的技能案例
- 每个案例展示：五层架构 + Soul-Hash + 文化变体 + 测试用例
- 反面例子和改进方案

**何时阅读**：学完SKILL_DESIGN_GUIDE后，开始创建前阅读

---

### 4. **RESEARCH_FOUNDATION.md** ⏱ 30分钟（可选但推荐）
**你要理解**：为什么要这样设计？理论基础是什么？

**包含**：
```
七大理论基础：
✓ Value-Sensitive Design - Friedman
✓ Participatory Design - Sanders, Ehn
✓ Critical Design - Dunne & Raby, Luna Maurer, Ochigame
✓ Semantic Capital Design - Bourdieu, Floridi
✓ DSPy方法 - Khattab
✓ HCI与心理学 - Winnicott, Rogers, Siegel, Fogg
✓ 文化研究与语言不可翻译性 - Whorf, Hofstede, Wittgenstein

21篇学术论文引用
```

**何时阅读**：当你想理解"为什么"，而不仅仅是"怎么做"

---

## ⚙️ 【技术包】— 仅开发者（部署系统）

> **目标**：理解和部署THE 42 POST系统

### 5. **FIVE_LAYER_SPECIFICATION.md** ⏱ 20分钟
系统期望什么样的JSON格式？五层的正式规范是什么？

---

### 6. **BACKEND_ARCHITECTURE.md** ⏱ 30分钟
后端怎样存储、生成和验证技能？Soul-Hash和Manifest怎样保证不被篡改？

---

### 7. **API_QUICK_REFERENCE.md** ⏱ 20分钟
29个API端点的速查表。你需要调用哪个端点来完成哪个功能？

---

### 8. **FRONTEND_BACKEND_INTEGRATION.md** ⏱ 45分钟
五个集成阶段，前端和后端怎样协作完成五步铸造？

---

## 🔬 【扩展包】— 仅研究者和进阶开发者

> **目标**：深入理解系统设计和学术基础

### 9. **RESEARCH_FOUNDATION_COMPLETE.md**
更详细的学术基础，包括4位关键研究者的深入分析：
- Dunne & Raby的推测性设计
- Luna Maurer的算法可视化
- Rodrigo Ochigame的替代计算模型
- Nicola Morelli的服务设计

---

### 10. **NATURAL_LANGUAGE_TO_SKILL.md** ⏱ 30分钟（待补充）
Claude API怎样理解用户的自然语言价值观？怎样自动生成五层架构？

---

### 11. **FORGING_METHODOLOGY.md** ⏱ 45分钟（待补充）
从自然语言到DEFINING的转换规则是什么？从DEFINING到INSTANTIATING怎样扩展？

---

## 🗺️ 推荐阅读顺序

### 路径A：Skill创建者（2.5小时）

```
1️⃣  GETTING_STARTED.md (5分钟)
     ↓ "了解五步是什么"
     
2️⃣  SKILL_DESIGN_GUIDE.md (60分钟)
     ↓ "学会怎样做"
     
3️⃣  EXAMPLES.md (20分钟)
     ↓ "看成功案例"
     
4️⃣  RESEARCH_FOUNDATION.md (30分钟，可选)
     ↓ "理解为什么"
     
5️⃣  打开前端工具，创建你的Skill
```

---

### 路径B：开发者（2.5小时）

```
1️⃣  README.md (5分钟)
     ↓ "快速了解项目"
     
2️⃣  GETTING_STARTED.md (5分钟)
     ↓ "理解五步流程"
     
3️⃣  BACKEND_ARCHITECTURE.md (30分钟)
     ↓ "系统怎样工作"
     
4️⃣  FIVE_LAYER_SPECIFICATION.md (20分钟)
     ↓ "数据格式是什么"
     
5️⃣  API_QUICK_REFERENCE.md (20分钟)
     ↓ "API端点速查"
     
6️⃣  FRONTEND_BACKEND_INTEGRATION.md (45分钟)
     ↓ "怎样部署"
     
7️⃣  启动backend和前端，开始测试
```

---

### 路径C：研究者（4小时）

```
1️⃣  README.md (5分钟)

2️⃣  RESEARCH_FOUNDATION.md (30分钟) + RESEARCH_FOUNDATION_COMPLETE.md (30分钟)
     ↓ "学术基础"
     
3️⃣  SKILL_DESIGN_GUIDE.md (60分钟)
     ↓ "理论在实践中怎样应用"
     
4️⃣  FIVE_LAYER_SPECIFICATION.md (20分钟)
     ↓ "正式规范"
     
5️⃣  NATURAL_LANGUAGE_TO_SKILL.md (30分钟)
     ↓ "AI如何理解和生成"
     
6️⃣  FORGING_METHODOLOGY.md (45分钟)
     ↓ "变换算法的详细步骤"
     
7️⃣  阅读21篇学术论文，深入研究
```

---

## ✅ Skill创建的质量检查清单

当你完成五层架构时，逐一检查：

```
✅ DEFINING层
   □ 用一句话清晰表达核心原则？
   □ 这是"价值观"还是"规则"？
   □ 对应RESEARCH_FOUNDATION中的哪个理论？

✅ INSTANTIATING层
   □ 有3-5个具体例子？
   □ 例子完美体现了DEFINING？
   □ 有反面例子吗？

✅ FENCING层
   □ 什么时候应该应用？
   □ 什么时候不应该应用？
   □ 有哪些道德冲突需要说明？

✅ VALIDATING层
   □ 有5-10个明确的测试用例？
   □ 测试用例能验证FENCING吗？
   □ 包括失败案例吗？

✅ CONTEXTUALIZING层
   □ 针对至少3个文化进行了适配？
   □ 核心精神是否得到了保留？
   □ 注意了语言的不可翻译性？
```

---

## 📊 文档总览

| 文档 | 字数 | 阅读时间 | 必需性 | 面向人群 |
|------|------|---------|--------|---------|
| README.md | 3000 | 5分钟 | ⭐⭐⭐ | 所有人 |
| GETTING_STARTED.md | 4000 | 5分钟 | ⭐⭐⭐ | 所有人 |
| SKILL_DESIGN_GUIDE.md | 15300 | 60分钟 | ⭐⭐⭐ | Skill创建者 |
| EXAMPLES.md | 10000 | 20分钟 | ⭐⭐⭐ | Skill创建者 |
| RESEARCH_FOUNDATION.md | 19000 | 30分钟 | ⭐⭐ | 想理解理论 |
| FIVE_LAYER_SPECIFICATION.md | 8000 | 20分钟 | ⭐⭐⭐ | 开发者 |
| BACKEND_ARCHITECTURE.md | 15100 | 30分钟 | ⭐⭐⭐ | 开发者 |
| API_QUICK_REFERENCE.md | 11700 | 20分钟 | ⭐⭐⭐ | 开发者 |
| FRONTEND_BACKEND_INTEGRATION.md | 15800 | 45分钟 | ⭐⭐⭐ | 开发者 |
| RESEARCH_FOUNDATION_COMPLETE.md | 18500 | 30分钟 | ⭐ | 研究者 |
| NATURAL_LANGUAGE_TO_SKILL.md | （待补充） | 30分钟 | ⭐ | 研究者/开发者 |
| FORGING_METHODOLOGY.md | （待补充） | 45分钟 | ⭐ | 研究者/开发者 |

---

## 🎯 快速FAQ

**Q：我没有技术背景，能创建Skill吗？**
A：完全可以！阅读路径A（2.5小时），只需要GETTING_STARTED + SKILL_DESIGN_GUIDE + EXAMPLES

---

**Q：我该读RESEARCH_FOUNDATION.md吗？**
A：可选。如果你想理解"为什么"而不仅仅是"怎么做"，建议读。它帮你对设计有信心。

---

**Q：多少时间能创建一个Skill？**
A：学习 2-3 小时，创建 30分钟-2小时（取决于复杂度）

---

**Q：为什么需要五层？不能简化吗？**
A：五层是为了确保你的技能"可信"。RESEARCH_FOUNDATION.md解释了每层的学术基础。

---

**最后更新**：2026-04-10  
**版本**：2.0 (简化版)
