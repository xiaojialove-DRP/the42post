# Moderation Policy / 内容审核政策

> Effective 2026-07-05 · This documents the review that actually runs in
> production (`backend/utils/moderation.js`), not an aspiration.
> Appeals → [GitHub Issues](https://github.com/xiaojialove-DRP/the42post/issues)

---

## English

### Philosophy

THE 42 POST exists to collect **diverse, sometimes conflicting** human values.
The bar is therefore deliberately permissive: controversial is welcome,
harmful is not. We would rather host a skill we disagree with than flatten
the dataset into one worldview.

### Prohibited (high risk → rejected)

1. **Direct harm** — instructing or encouraging violence, terrorism, suicide
   or self-harm, sexual exploitation, CSAM, drug manufacturing, clearly
   illegal acts.
2. **Explicit hate** — hate speech or incitement of stereotypes based on
   race, ethnicity, gender, sexual orientation, religion, disability, etc.
3. **AI-safety threats** — teaching an AI to deliberately deceive, to break
   its own core safety constraints, or encouraging scheming (hidden intent,
   self-preservation at the user's expense).
4. **Severe privacy violation** — directing an AI to collect or leak personal
   information, or to conduct non-consensual surveillance.
5. **Serious crime facilitation** — practical guidance for major crimes.
6. **Explicit extremist ideology** — calls for mass harm, ethnic cleansing,
   or violent overthrow of democratic institutions.

### Explicitly allowed

- Highly controversial political / religious / philosophical positions, as
  long as they do not incite concrete violence.
- Critique of mainstream views and minority opinions.
- Personal wisdom, ethics, aesthetics — even where people will disagree.
- Humor, satire, creative expression.

### Medium risk

Medical / psychological / legal advice must present itself as non-professional
opinion (or advise consulting a professional). It is flagged for revision,
not rejected.

### How review works

- Every publish triggers an **automated LLM review** against the rubric above,
  producing a decision, a risk level, and an explanation.
- If the review system itself fails (network, parsing), the skill is
  **published and flagged for manual review** — we never silently reject a
  person's work because our infrastructure hiccuped.
- Every decision (including the flagged ones) is stored in a permanent
  audit table (`moderation_logs`), so moderation behavior itself is auditable.

### Author-side commitments (The Covenant)

Publishing requires accepting three commitments: publish revisions
transparently, accept community critique, and commit to no intentional harm.

### Appeals

Open a GitHub issue with the skill title and Soul-Hash, or reply to your
publish-confirmation email. A human (currently: the maintainer) reviews every
appeal and the corresponding `moderation_logs` entry.

---

## 中文

### 立场

THE 42 POST 的目的就是收集**多元、甚至彼此冲突**的人类价值观，因此审核标准
刻意宽松：欢迎争议，拒绝伤害。我们宁可托管一条自己不同意的 Skill，也不愿把
数据集压平成单一世界观。

### 绝对禁止（高风险 → 拒绝发布）

1. **直接危害**——教导或鼓励暴力、恐怖主义、自杀自残、性剥削、儿童色情、
   毒品制造、明显非法活动。
2. **明确仇恨**——基于种族、民族、性别、性取向、宗教、残疾等的仇恨言论或
   刻板印象煽动。
3. **AI 安全威胁**——教 AI 故意撒谎、破坏自身核心安全限制，或鼓励 AI
   隐藏意图、以伤害用户为代价自保。
4. **严重隐私侵犯**——要求 AI 收集或泄露个人隐私、进行未经同意的监控。
5. **重大犯罪协助**——提供重大犯罪的实用指导。
6. **明确极端意识形态**——号召大规模伤害、种族清洗、暴力推翻民主制度。

### 明确允许

- 高度争议的政治、宗教、哲学内容（只要不煽动具体暴力）；
- 对主流观点的批判与少数派意见；
- 个人智慧、伦理、审美——即使会有人不同意；
- 幽默、讽刺、创意表达。

### 中风险

医疗/心理/法律类建议必须注明"非专业意见"或提示咨询专业人士——要求修改，
而不是拒绝。

### 审核如何运作

- 每次发布都会触发**自动 LLM 审核**（按上述规则），产出决定、风险等级和解释；
- 审核系统自身故障（网络、解析失败）时，Skill **照常发布并标记人工复审**——
  我们不会因为自己的基础设施打嗝而悄悄拒绝别人的作品；
- 所有决定（包括被标记的）永久存入审计表（`moderation_logs`），审核行为本身
  可被审计。

### 作者侧承诺（The Covenant）

发布前需勾选三条承诺：公开修订说明、接受社区批评、承诺不造成故意伤害。

### 申诉

在 GitHub 提 issue（附 Skill 名称和 Soul-Hash），或直接回复发布确认邮件。
每一条申诉都会由人（目前是维护者本人）对照 `moderation_logs` 记录复核。
