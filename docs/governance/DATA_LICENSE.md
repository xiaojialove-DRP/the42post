# Data & Content Licensing / 数据与内容许可

> Effective 2026-07-05 · Applies to www.the42post.com and this repository.
> Questions → [GitHub Issues](https://github.com/xiaojialove-DRP/the42post/issues)

---

## English

### 1. Platform code — MIT

All source code in this repository is licensed under the [MIT License](../../LICENSE).

### 2. Published Skills — Creative Commons, per the author's own choices

Every Skill is authored by a person who chooses, at publish time, whether to
allow **commercial use** and whether to allow **remixing**. Those choices are
stored with the skill and map to the corresponding Creative Commons 4.0 license:

| Commercial use | Remix allowed | Effective license |
|---|---|---|
| ✅ | ✅ | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| ❌ | ✅ | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) |
| ✅ | ❌ | [CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/) |
| ❌ | ❌ | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) |

**Attribution** for any reuse must include: the skill title, the creator name
shown on the skill (`creator_...`), its Soul-Hash, and a link to the platform.
Attribution example:

> "Wittgenstein's Silence" by creator_42 (SOUL_9362ea1dc2737737_…), from THE 42 POST (the42post.com), CC BY 4.0.

The "Skill" content covered by this license = title, description, the
five-layer text, and the Ready-to-Use Prompt.

### 3. Research data — aggregated releases only

Behavioral and research data (Twin Test votes and response texts, probe
sessions, forging histories, edit-distance metrics, funnel events) is **not
published raw**. It may be released as **aggregated and/or anonymized research
datasets**, each accompanied by its own documentation describing scope,
anonymization method, and known sampling biases. Emails are never included in
any release. See [PARTICIPANT_DATA.md](./PARTICIPANT_DATA.md) for what is
collected and why.

**Public corpus export commitment (dated 2026-07-12).** The published-skill
corpus (title, description, five-layer text, Ready-to-Use Prompt — the same
scope defined in §2 above) is meant to function as a public record, not just
a database inside this one product. So: **once the corpus reaches 100
published skills, a public copy is exported quarterly to GitHub and/or
Zenodo**, under the CC license each skill was actually published with. This
is a checkable promise, not a vague intention — if the corpus passes 100 and
four consecutive quarters pass with no export, treat this commitment as
broken and raise it as an issue.

### 4. What you agree to when publishing

By publishing a Skill you (a) confirm the content is yours to license,
(b) grant the platform the right to display, archive, and export it in the
formats offered (Markdown / LangChain / MCP), and (c) license it to the
public under the CC license matching your publish choices, irrevocably for
the published version. You can request takedown of a skill at any time
(see contact above); already-distributed copies remain licensed.

---

## 中文

### 1. 平台代码 — MIT

本仓库全部源代码以 [MIT 协议](../../LICENSE) 开源。

### 2. 已发布的 Skill — 按作者发布时的选择映射 Creative Commons

每个 Skill 的作者在发布时自行选择是否允许**商业使用**、是否允许**二次创作**。
这些选择随 Skill 存储，并对应如下 Creative Commons 4.0 许可：

| 商业使用 | 允许二创 | 生效许可 |
|---|---|---|
| ✅ | ✅ | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hans) |
| ❌ | ✅ | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans) |
| ✅ | ❌ | [CC BY-ND 4.0](https://creativecommons.org/licenses/by-nd/4.0/deed.zh-hans) |
| ❌ | ❌ | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh-hans) |

任何转载/使用必须**署名**：Skill 名称、页面显示的创作者名（`creator_...`）、
Soul-Hash，并注明来自 THE 42 POST（the42post.com）。

许可覆盖的"Skill 内容" = 标题、描述、五层文本、Ready-to-Use Prompt。

### 3. 研究数据 — 只做聚合发布

行为与研究数据（Twin Test 投票及回答文本、探针会话、锻造历史、编辑距离指标、
漏斗事件）**不公开原始记录**，只可能以**聚合/匿名化研究数据集**形式发布，且每次
发布附带说明文档（范围、匿名化方法、已知抽样偏差）。邮箱地址永远不会出现在任何
发布中。收集内容详见 [PARTICIPANT_DATA.md](./PARTICIPANT_DATA.md)。

**公开语料导出承诺（写于 2026-07-12）。** 已发布 Skill 的语料（标题、描述、
五层文本、Ready-to-Use Prompt——与上文第 2 条定义的范围一致）意在成为一份
公共记录，而不只是这一个产品内部的数据库。因此：**一旦语料达到 100 条已发布
Skill，将按季度把公开副本导出到 GitHub 和/或 Zenodo**，遵循每个 Skill 实际
发布时选择的 CC 协议。这是一个可被检验的承诺，不是含糊的意向——如果语料已过
100 条、且连续四个季度未导出，应视为承诺未兑现，可作为 issue 提出。

### 4. 发布即同意的内容

发布 Skill 即表示：(a) 你确认内容有权由你授权；(b) 授权平台展示、归档并以
现有格式（Markdown / LangChain / MCP）导出；(c) 按你发布时的选择以对应 CC
协议向公众授权，对已发布版本不可撤销。你可以随时申请下架（联系方式见顶部）；
已分发的副本仍受原许可约束。
