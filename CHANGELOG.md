# CHANGELOG

All notable changes to THE 42 POST.

## [Unreleased] — 2026-07-05

Open-testing infrastructure sprint, driven by a four-lens project review (product / engineering / research / innovation-policy). Theme: lock in data quality before the corpus grows, and remove the two recurring frontend bug classes.

### Security (verified against live code, then fixed)

- **Creator email was leaking from public read endpoints.** `GET /api/skills/:skill_id` selected and returned `u.email`, and the embedded manifest carried `author.email` too — so anyone could walk the public skill list and harvest every creator's real email. Directly contradicted the just-written `PARTICIPANT_DATA.md` ("email is never public"). Fixed: dropped `u.email` from the query, and added `redactManifestEmail()` (applied here and on `GET /:skill_id/manifest`) which strips the email from the manifest before it's returned. Email is not part of the signature, so redaction never breaks verification. Verified live: no `@` address anywhere in either response.
- **`/api/email/test` and `/api/email/send-forge-success` were unauthenticated open mailers.** Anyone could POST an arbitrary recipient (and, for send-forge-success, an attacker-influenced title/blessing) and have the server send mail from the verified domain — a phishing/spam relay. Fixed: `/test` is now admin-gated (`x-admin-key`); `/send-forge-success` is rate-limited (5/hour/identity) and its title/soul-hash/domain are now read from the real skill record by `skillId` (404 if it doesn't exist), so it can only ever send a card for a genuine skill, not arbitrary "official" text. The legitimate forge → creator-email flow is unchanged (verified: real skillId reaches the send stage).
- **Fail-closed on secret fallbacks.** `DELETE /api/skills/cleanup` accepted a hardcoded `cleanup42post` when `ADMIN_KEY` was unset; manifest signing fell back to a public `default-secret` when `SIGNING_SECRET` was unset — both fail *open*. Now: cleanup requires `ADMIN_KEY` (503 if unconfigured, 403 on mismatch — the old password is rejected); signing throws without `SIGNING_SECRET`, and the server refuses to boot without it (mirroring the existing `JWT_SECRET` check). Both `.env.example` files now document `ADMIN_KEY` and mark `SIGNING_SECRET` required.
- `requireAdminKey` extracted to `utils/auth.js` (shared) instead of being re-implemented per route. Email tests updated to the new contracts; backend 85/85, e2e 3/3.

### Research integrity

- **Silent template degradation is no longer silent.** When both DeepSeek and Claude fail, the forge still serves a template draft (unchanged) — but now the operator gets an alert email within the hour (`ALERT_EMAIL`, throttled 1/hour per issue, loud console log when unconfigured), and skills published from such drafts are queryable.
- **Generation provenance on every publish.** `/api/forge/preview` stores each AI draft server-side (`generation_drafts`); publish joins back by `draft_id` and records `generation_source` ('deepseek' / 'claude' / 'template') plus `draft_edit_ratio` — a 0-to-1 Levenshtein measure of how much the author edited the AI draft before publishing. This is the measurable "human contribution" signal that separates the human's work from the LLM scaffolding — the first question any reviewer of this dataset will ask. Derived entirely server-side; the client only passes an opaque id.
- **Weekly funnel snapshot** — the 4 open-testing metrics (forge funnel conversion, Twin Tests per skill, creator D7 return, non-creator engagement share) via admin endpoint (`GET /api/analytics/funnel?format=md`) or `npm run funnel`, output paste-ready for this file. Includes a template-degradation sentinel line when any degraded publish occurred.

### Governance (docs/governance/)

- **DATA_LICENSE.md** — skill content licensed per the author's own publish choices mapped to CC 4.0 variants (BY / BY-NC / BY-ND / BY-NC-ND); research data released only aggregated/anonymized; bilingual.
- **MODERATION_POLICY.md** — the actual production rubric made public (prohibited / explicitly-allowed / medium-risk), the infra-failure-publishes-with-flag behavior, audit trail, appeals; bilingual.
- **PARTICIPANT_DATA.md** — everything collected and why, the no-list (no passwords, no third-party trackers, no data sales), consent, deletion; bilingual.

### Tech debt

- **Versioned schema migrations** (`backend/db/migrations.js`, `schema_migrations` table) replace ~20 boot-time try/catch ALTERs. Boot log noise: was ~20 expected errors every start, now zero (one clean "schema up to date" line). Test helper applies the same migration list, ending the hand-maintained test-schema drift that broke 52 tests mid-session when new columns landed.
- **Content-hash cache busting** (`scripts/bust-cache.js`, `npm run bust-cache`, CI-enforced) replaces hand-written `?v=` strings. Found live evidence for why: playground.html was still referencing a script.js version string from a week before the other pages.
- **First module split of the 9,300-line script.js**: the I18N dictionary (548 lines) now lives in `frontend/i18n.js`, loaded before script.js on every page.
- `node backend/server.js` no longer crashes when `DATABASE_URL` is a `sqlite:` URL (was handed verbatim to the PostgreSQL pool; only worked before because launch configs blanked the variable).
- Deleted the stale untracked `backend/.env` (contained a real Gmail app password; the live config is the repo-root `.env`). Both `.env.example` files now document `ALERT_EMAIL` and `SKIP_SEED`.
- README.zh.md still pointed at the dead Railway URL — now www.the42post.com; both READMEs link the governance docs.

### Repo hygiene — 2026-07-10

- **The Railway URL fix above didn't actually land.** README.zh.md and `docs/CONTRIBUTING.md` were both still sending people to `the42post-production.up.railway.app` — now both point at `www.the42post.com`.
- README.zh.md was missing an entire Self-Hosting section (README.md has one) and its documentation table only linked 4 of the 7 docs README.md links (missing CONCEPTS.md, SETUP.md, the deployment guide) — brought to parity. Also dropped a hardcoded "Version 1.0.0" footer that had drifted from `package.json`'s actual `1.1.0`.
- `docs/product-guide.md` (the end-user guide, rewritten in the 1.7.0 pass below) was linked from nowhere — added to both READMEs and `docs/README.md`.
- Dockerfile's build copied the frontend into `/app/day1/`, a path `backend/server.js` has never read (it serves `../frontend` directly) — dead copy step, removed.
- Deleted a stray local-only `claude/focused-lewin-477897` branch (no unique commits, never pushed) and an insecure `credential.helper = store` override that had been writing plaintext GitHub credentials to `~/.git-credentials`; the repo now inherits the global `osxkeychain` helper.

### Twin Test verification — 2026-07-12

A test that can never say "fail" is not a test. Twin Test voting had drifted into a reveal-then-self-report design (both response cards were tagged "with Skill"/"baseline" *before* the user reacted) — the opposite of the blind mechanism the route's own original design intended, and any creator could inflate their own Skill's numbers by testing it themselves.

- **Restored blind voting.** `/api/playground/test` no longer returns `skill_side` or `diagnostic` — both are stored server-side and only revealed by `/api/playground/vote`, after the user has committed to a pick. Frontend: both response cards are unlabeled at pick time; tapping one *is* the vote; a flip-reveal stage afterward shows which side was the Skill, the diagnostic, and the running community win rate.
- **Author self-votes excluded from every public number.** New `skill_test_votes.is_author` column, stamped at `/test` time by matching the requester's device id / forge username against the Skill's own `creator_anonymous_id` (same match `/picker` already used for "your own forge"). All win-rate math (`getSkillVerificationStats`, `getBatchVerificationStats` in `utils/verificationHealth.js`) filters these out.
- **Public verification status** on every Archive star's tooltip: ≥5 non-author blind votes and ≥60% win rate → "Community Verified"; <40% → "Verification Failed" (shown with equal visual weight — not hidden or softened); otherwise "Verifying" / "Inconclusive". Bilingual.
- **Self-check alert**: `npm run verification-health` / `GET /api/analytics/verification-health` (admin-gated) looks at every Skill that crossed the 5-vote threshold in the trailing window (default 90 days) — if none of them are in "Verification Failed" status, it emails the admin, because a mechanism that never produces a failure is more likely broken than every tested Skill genuinely earning a pass.
- **Public corpus export commitment** added to `docs/governance/DATA_LICENSE.md`: once the corpus reaches 100 published Skills, a public copy is exported quarterly to GitHub/Zenodo under each Skill's own CC license — dated, checkable, not a vague intention.
- Probe generation quality: the streaming endpoint (`/api/forge/probe/stream`, the path most users actually hit) carried its own bare prompt with none of the decode/causality/off-limits machinery the non-streaming endpoint had — both now share one prompt body. Off-limits topics broadened (all medical/health decisions, mental-health crises, legal, financial advice, divisive politics/religion) and a rule-based post-generation quality gate (`validateProbeQuality`) rejects vague scenarios, off-limits content, and near-duplicate actions, retrying once before falling back to a template.
- Playground scenario cards and arena UI retired their leftover "Taste Arena"-era vocabulary ("AI with taste", "TASTE QUESTION") for the current values framing, bilingual; two medical-adjacent cards reframed to match the same off-limits boundary as the probe.

### Twin Test verification — 2026-07-14

- **Author votes now count toward the public verification score.** Reconsidered the 2026-07-12 exclusion above: a creator's own blind Twin Test vote is still a real blind vote, and excluding it made a self-tested Skill's number look artificially low (a creator who tested their own Skill 7 times saw only their non-author votes counted). `is_author` is no longer filtered out of `getSkillVerificationStats`/`getBatchVerificationStats`/`checkVerificationSelfTest` in `utils/verificationHealth.js` — every blind vote counts. The column stays, still stamped at vote time, so provenance isn't lost: both endpoints now also return `author_votes`, and the Archive tooltip/badge appends "(incl. N by creator)" whenever a Skill's total includes one, so the number is complete but the source is never hidden.
- **Archive list badge and celestial star tooltip now agree.** The list view's "win rate" badge used to read from `skill_feedback` (self-reported, no threshold) while the same Skill's star tooltip read from the blind verification system — they could show contradictory numbers for the same Skill (e.g. "64% win rate" next to "Verifying · 3/5 votes"). Both now render through the same `renderVerificationBadge()`.

## [1.7.0] — 2026-06-27

A documentation-accuracy stretch and another round of real user-reported bugs. The big find: `docs/ARCHITECTURE.md` and several other docs described a system that no longer existed (Vue frontend, Claude-primary LLM, a real login system, Railway as the deploy target) — rewritten against the actual code rather than carried forward from an earlier draft. Alongside that, a recurring root cause showed up three separate times this round: the same skill data gets reshaped independently in multiple places, and each copy drifts from the others.

### Bug Fixes — reported by real users

- **Forge probe generation appeared to always fail** — real DeepSeek-streamed content would render, then get discarded and replaced with a generic fallback. Root cause: a client-side regex meant to catch "sensitive" generated scenarios matched on bare topic words (health, politics, death, contracts) rather than actual harmful content — on a platform whose whole purpose is AI value alignment, scenarios legitimately touch those topics constantly. Removed it; the real safety gate is the LLM-judged moderation that already runs at publish time.
- **Twin Test skipped the "Use this Skill" confirmation** when arriving from Forge completion or Archive's Play button (`?skill=` pre-loaded) — it ran two real LLM calls with zero user action. Now shows the same one-click trigger the picker-based path always required.
- **Skill markdown/LangChain exports were broken for the current data shape** — `generateFlatFiveLayerWithClaude` (the live forge path, not just a fallback) saves each layer as a plain string; every export path was still written for older shapes. Markdown downloads 500'd outright for affected skills; LangChain exports downloaded fine but came out with an empty `layers` object, silently useless.
- **Ready-to-Prompt showed a placeholder instead of the real prompt**, and **every exported markdown label was hardcoded English regardless of UI language** — both traced to `loadSkillsFromDB()` rebuilding the skill object from an explicit field whitelist with no fallback, silently dropping `ready_to_use_prompt`, plus the markdown generator never branching on language at all.
- **Forge-success email's Creator Card garbled the Soul-Hash** into one character per line. The card's layout used `display:flex` for a 10-row stack; several email clients (Outlook desktop, some webmail sanitizers) keep `display:flex` but drop `flex-direction`, which left flex's true default (row) in effect and squeezed an unbreakable string into a sliver of width. Switched to plain stacked `<div>`s, which no email client can get wrong.
- **Creator Card text overflowed on long usernames and wouldn't save on mobile** — an unbounded `white-space: nowrap` line, and Safari's `<a download>` on a blob URL usually just opening the image instead of saving it. Added `flex-wrap` and a Web Share API path with the old download as fallback.
- **Playground rating card clipped its bottom** in both portrait and landscape on mobile — the comment box (later removed entirely, see Removed) and then the rating buttons themselves could land below the visible canvas with no way to scroll to them.
- Removed the optional "anything else?" comment box from Twin Test ratings — realistically no one typed one, and it was the recurring source of the clipping bugs above.
- Forge completion copy: dropped a redundant sentence, wrote the Creator Card's URL out in full (`www.the42post.com`) instead of the bare domain.
- The post-7-scenario farewell card always suggested "go forge your own Skill" — redundant advice for someone who arrived via Forge completion's own "try it in Playground" button, since they just did exactly that. Now conditional on how the session started; Archive/direct-Playground visitors still see the full message.

### Documentation — rewritten against the real code, not an earlier draft

- **`docs/ARCHITECTURE.md`**: full rewrite. The old version was wrong about the frontend framework, the primary LLM provider, the identity/auth model, and referenced routes and pages deleted long ago. New version verified against `server.js`'s actual route mounts, `package.json`'s actual dependencies, and `db/init.js`'s actual schema.
- Added the system-architecture diagram to both `README.md` and `README.zh.md` (same Mermaid source as the one in `ARCHITECTURE.md`, so the three can't silently drift apart).
- **`backend/.env.example` and `docs/SETUP.md`**: still described the pre-DeepSeek era (`LLM_PROVIDER=gemini` default, no `DEEPSEEK_API_KEY` at all, a `DATABASE_URL=sqlite:...` pattern that would actually crash the server if followed literally).
- **`backend/docs/LLM_CONFIGURATION.md`**: full rewrite. Documented the dead `llmAdapter.js` multi-provider system as current and never once mentioned DeepSeek, the actual primary provider.
- **`docs/guides/DEPLOYMENT.md`**: replaced. It was never actually a deployment guide — it was a dated, one-off verification checklist for a specific 2026-04-24 deploy, despite three other docs linking to it as "the" deployment guide. Archived the original as a dated historical record in `docs/dev-logs/`; wrote a real generic guide at the original path.
- Removed `docs/guides/EMAIL_SETUP.md` (described SMTP/nodemailer setup; the real system has used Resend's HTTP API for a long time) — fully orphaned, nothing linked to it anymore.
- Swept stray "Railway" references to "Zeabur" (the actual, long-current deploy target) across backend comments, warnings, and one real CORS whitelist entry containing three dead `*.railway.app` origins. Left untouched: `CHANGELOG.md` and the dated docs above, which are accurate historical records of when Railway really was the target.

### Tech Debt

- **Consolidated three independently-maintained copies of the same skill-data normalization logic** (`loadSkillsFromDB()`, Archive's own skill-list pipeline, and the markdown exporter) into one shared `normalizeFiveLayerShape()`. This is the actual root cause behind two of the bugs above — a fix landed in one copy and never made it to the other two. Also fixed `loadSkillsFromDB()`'s object-rebuilding pattern (no spread fallback) so this class of silent field loss can't recur for any other field.
- Removed `backend/utils/llmAdapter.js` (and the now-orphaned `@google/generative-ai` dependency), the dead `generateKnightCard` (132 lines, plus its dead supporting HTML/CSS), and `/api/email/send-verification` plus its template (the `/verify` page itself was removed earlier; this supporting code wasn't).
- Stopped tracking `database.sqlite3` in git — runtime data, not source, and the repo is public. Checked every commit that ever touched it: only ever contained two placeholder accounts, never a real user's data, so no history rewrite was needed, just `git rm --cached` going forward.

### Added

- **Participant background field** (optional, free-text "profession / field of study") collected once per identity during Forge Step 1 — the one piece of participant context the research side was missing.
- **Minimal funnel tracking** — a real self-hosted analytics platform needs its own deployed service, which wasn't practical to stand up directly; built a lightweight substitute on the existing stack instead (`analytics_events` table, a fire-and-forget tracking endpoint, an admin-gated summary endpoint), instrumented at six funnel boundary points across Forge/Playground/Archive.
- **Archive's celestial map connections are now real relationships, not decoration** — edges used to be pure distance-plus-coin-flip; now only same-domain skills connect. Star brightness now also reflects Twin Test "clearly better" votes, not just starlight.

---

## [1.6.0] — 2026-06-24

A debug-focused stretch: real bugs reported by actual users (Reddit, screenshots), a backend reliability pass, a full bilingual consistency audit, mobile edge-case testing, CI from scratch, and a large dead-code cleanup. Most entries below were found and fixed in the same session by reproducing the bug live, not just reading code.

### Bug Fixes — reported by real users

- **Twin Test language mixing** — A Skill forged in Chinese could pull an English scenario's response into Chinese too; the Skill's prompt block was longer/more dominant than the trailing language instruction. Added an explicit, unambiguous language instruction regardless of the Skill's own language.
- **Archive download silently crashed for almost every skill** — `generateSkillMarkdown` assumed `fiveLayer.evaluation` was always present; it's `null` for most real skills.
- **`displayCardLibrary()` crash blocked all init after it** — broke Archive→Playground skill pre-selection as a side effect, with no visible error.
- **Drag-clamp asymmetry** — tall Twin Test cards could be dragged until their action buttons were off-screen, with no way to drag back.
- **Dock category list** opened centered with no scroll affordance; now starts at item 1 with an edge-fade hint.
- **About/HowTo modals** could stack open simultaneously; added mutual exclusion and Escape-to-close.
- **Playground alerts were silently swallowed** — never actually shown to users.
- Removed the entire "My Creative Works" personal card-library feature — redundant with the preset Skill library.

### Mobile

- Keyboard occlusion and textarea input experience on Forge (`autoGrowTextarea`, scroll-into-view on focus).
- Touch targets enlarged to ~44px across buttons, dock items, and close affordances.
- Card layout fixes at 360–480px widths (clipping from a fixed `aspect-ratio` switched to `min-height`).
- Twin Test response cards: removed a 260px cap that silently clipped longer answers behind a barely-visible scrollbar, then re-capped generously (`min(420px, 45vh)`) with internal scroll after finding the uncapped version could push rating buttons off-page entirely on an extreme-length response with no page-level scroll to recover.
- Verified at 360px width and in landscape orientation; found and left open a landscape-specific issue where Playground's fixed-height canvas can clip a spawned card's action buttons with no scroll (tracked, not yet fixed — needs a broader look at the canvas/drag-and-drop sizing).

### Backend Reliability

- `JWT_SECRET` (and other `.env`-sourced keys, including a real configured Claude key) were silently `undefined` at runtime in any environment relying on `.env`-file loading — `dotenv.config()` ran after server.js's own static imports, which are always hoisted ahead of it. Fixed by importing `dotenv/config` first.
- Wired up `dbRetry.js`'s retry logic (built earlier, never called) for read-only queries.
- Added structured logging across LLM calls, skill saves, and the Twin Test flow.
- **Claude fallback was fully built but never wired up** despite the file's own header and every export name documenting it as the design. Twin Test in particular had no fallback at all and would render the raw provider error (including partial API key text) straight into the UI on a DeepSeek failure.
- Archive star race condition — starring a skill could be silently un-done moments later if a slower batch-sync request resolved after the user's own click.
- `POST /playground/vote` computed its response from the current request instead of the persisted vote, which could disagree with the database on a repeat vote with a different choice.

### Bilingual Consistency (full audit)

- Forge success email body was 100% hardcoded Chinese regardless of session language.
- Two client-side offline fallback generators (probe + Twin Test response) were hardcoded Chinese with no language branch.
- Sensitive-content detection in one fallback path only matched Chinese patterns, missing equivalent English content.
- Eight raw `alert()` error messages had no Chinese version.
- Forge probe-selection confirmation mixed a Chinese prefix into an English session.
- Username hint examples taught users to type the `creator_` prefix the backend already adds automatically.
- Skill picker dropdown leaked a raw internal domain taxonomy code (e.g. `03-ethics-values`) into the label shown to users.

### Infrastructure

- **CI added from scratch** — GitHub Actions now runs the backend test suite and a frontend syntax check on every push and PR to main. Found and fixed three real gaps along the way: a PAT missing the `workflow` scope, an `actions/setup-node` cache path that didn't resolve under this job's `working-directory`, and `backend/package-lock.json` having been gitignored and never committed (so `npm ci` had nothing to install from in a fresh checkout).
- Backend test coverage for `playground.js` (Twin Test, vote, feedback, picker, stats) went from zero to 25 tests — this was the route with the most severe bug found this round. Also fixed the in-memory test schema, which had drifted from the real schema (`skill_test_votes` missing six columns, `skill_feedback` missing entirely).
- Removed `/register` and `/verify` — no registration flow by design; Soul-Hash plus anonymous forge-session covers identity for a research project.
- `.env.example` updated to document `DEEPSEEK_API_KEY`, the actual primary provider (was undocumented).

### Removed (confirmed zero callers)

- Three frontend functions left over from a removed agent-mode path, plus an entirely unreachable ~180-line email template that was never the one actually used.
- Two backend forge routes (`/forge/generate`, `/forge/generate/stream`) and their dedicated generator — the real five-layer structure is built via a different, lighter endpoint plus an async self-heal pass after publish.
- The forge-completion "export package" UI (Markdown/LangChain/MCP download buttons) — hardcoded `display:none`, never shown by any code path, confirmed via its own `showForgeCompletion()` explicitly hiding it again.
- `routes/search.js` in full (`/search`, `/search/trending`, `/search/domain/:domain`) — Archive's search box filters an already-fetched list client-side instead.
- Stale/duplicate i18n dictionary entries with zero usage.

---

## [1.5.0] — 2026-06-20

### Features

- SEO basics — title, meta description, Open Graph tags, JSON-LD structured data.
- Playground: 7-scenario limit now ends on an in-canvas farewell card (replacing a plain alert) inviting the user to forge their own Skill, with a working `#forge` deep link back to the Forge modal.

### Removed

- `/register` and `/verify` email-verification flow — no registration model for a research project where Soul-Hash already serves as identity. `/login`, `/me`, and anonymous forge-session kept.

### Bug Fixes

- Card download crash — `html2canvas` couldn't parse `color-mix()`/`color(srgb...)` and re-scanned the original CSS rule for gradients; fixed by cloning the card and stripping the class before capture, restoring the download button on error.
- Voice input now picks recognition language from `currentLang` directly, with a 中/EN badge on the mic while recording.

### UX & Copy

- How It Works modal — typography and spacing now match About (size, line-height, no dividers).
- Email — forge-success card background tinted 8% per domain to match the on-screen commemorative card; same AI "blessing" line synced between card and email.

---

## [1.4.0] — 2026-06-06

### Features

- **Streaming probe** — Real-time streaming response in the forge probe step (second implementation, no variable conflicts)
- **Creator name normalization** — Names auto-formatted to `creator_<name>` on input and auto-migrated on server startup for consistency
- **PostgreSQL support** — Backend auto-switches to PostgreSQL when `POSTGRES_URI` env var is set (Zeabur/Railway compatible), falls back to SQLite

### UX & Copy

- **Forge modal title** — Changed to an invitational question to better guide user intent
- **Post-forge acknowledgement** — Replaced consent checkbox with a cleaner post-forge research acknowledgement note
- **Post-forge copy** — "you just" → "thank you" for warmer tone
- **Download format** — Markdown download redesigned to be more user-friendly and readable
- **Howto modal** — Compacted: smaller text, tighter spacing, no scroll needed

### Bug Fixes

- **Mobile layout jump** — Keyboard open/close on mobile no longer causes layout reflow
- **Star map on mobile** — Touch support added; star map now stays visible on small screens
- **Mobile Playground cards** — Card UX and Archive flow fixed for mobile
- **Skill pre-load flow** — When arriving from Archive or Forge with `?skill=ID`, skips picker AND trigger screen, goes directly into A/B twin test
- **7-card random task limit** — Fixed double-counting bug in `spawnRandomFromRepo` where `twinScenarioCount` was incremented twice per spawn (once directly, once via `incrementScenarioCount`), causing the limit to trigger at card 4 instead of card 7
- **Missing `ready_to_use_prompt`** — Backend now synthesizes a complete System Prompt when the field is absent

### Research

- Unbiased probe labels, complete test data collection, consent flow improvements

---

## [1.3.0] — 2026-05-19

### Bug Fixes

- **Share button unresponsive** — Removed stale `creatorNameInput` references that caused a silent `ReferenceError` on every click, blocking the entire forge entry flow
- **Star state lost on refresh** — Archive stars now sync from the backend on every page load via a new batch endpoint (`GET /api/skills/stars/batch`), replacing the previous localStorage-only approach
- **Incorrect star counts** — Archive star click handler now updates the displayed count from the server response instead of estimating locally
- **Soul-hash full string in star map** — Celestial canvas now renders the correct 14-character truncation of the soul-hash
- **Archive ▶ not auto-selecting Skill A** — Fixed `saveForgedSkill` writing a fake timestamp-based ID; it now persists the real database ID so `initTwinTestMode` can fetch it correctly
- **`forging_histories` insert failure** — Fixed undefined `user_email` variable; replaced with `user?.email`

### Features

- **Voice input** — Mic button on the homepage idea input using Web Speech API with confidence threshold filtering; auto-restarts on silence; gracefully hidden when browser lacks `SpeechRecognition`
- **Skills list cache** — `GET /api/skills` now serves from a 5-minute in-memory cache; invalidated automatically on new skill publish

### Security

- Replaced `eval()` with `Function()` constructor
- Added admin route authentication
- Escaped user-supplied `innerHTML` to prevent XSS

### Project

- Removed internal dev artifacts from repo root (`DEPLOYMENT_READY.md`, `FIXES_13_ISSUES.md`, `IMPLEMENTATION_CHECKLIST.md`, `README_FIXES.md`)
- Removed `docs/dev-logs/` directory
- Moved `backend/EMAIL_API_SETUP.md` → `docs/guides/EMAIL_SETUP.md`
- Rewrote `README.md` with cleaner structure and self-hosting instructions
- Tightened `.gitignore`

---

## [1.2.0] — 2026-05-11

### 🎯 Bug Fixes & Quality Improvements

**Critical Fixes**
- ✅ Fixed Privacy Issue: User email no longer displayed on forge completion page
- ✅ Fixed Impact Dashboard HTTP 500 error for forged skills  
- ✅ Fixed soul-hash length inconsistency (now unified to 14 characters)

**Feature Enhancements**
- ✨ Auto-select Skill in Playground when forging or selecting from Archive
- 📝 Added username validation hints in Forge page with clear examples
- 🔒 Added comprehensive forged skill validation (prevents duplicates & low-quality submissions)
- ⭐ Starlight/star votes now persist via localStorage

**Data & Architecture**
- 🗂️ Restored complete skills database: 60 skills (21 SHARED + 39 ADDITIONAL)
- 🔧 Standardized field naming to snake_case throughout (creator_name, soul_hash)
- 📊 Unified data normalization in Archive for consistent display
- 🎨 Improved soul-hash and creator display consistency

### 🔍 Code Quality
- Consolidated related fixes into logical commits
- Improved commit message clarity
- Added inline documentation for new validation functions
- Cleaned up deprecated naming conventions (DEMO_SKILLS_50 → ADDITIONAL_SKILLS)

---

## [1.1.0] — 2026-05-08

### 🎯 Playground Enhancement Sprint

**Content Expansion**
- Expanded Playground question library from 32 → 70 questions
- Added 38 new high-quality test scenarios across 10 domains
- 7 questions per domain (up from 3-4 per domain)
- Focus on semantic capital: values, aesthetics, ethics, cultural significance
- New scenario coverage: voice cloning, job displacement, data privacy, authorship rights, tradition vs AI

**Content Validation**
- Implemented content meaningfulness detection on homepage
- Detects random/meaningless input: repeated characters, low-entropy text
- Bilingual support (English/Chinese) with friendly error messages
- 3-second auto-hide warning for failed validation

**UI/UX Improvements**
- Fixed Playground textarea sizing for consistent Chinese/English rendering
- Updated font to 'Noto Serif SC', 'Noto Serif JP' for proper bilingual display
- Increased textarea min-height (80px → 100px) for better usability
- Improved padding (10px → 12px) for comfortable interaction

**Architecture Cleanup**
- Consolidated Playground functionality: deleted arena.html, kept playground.html as single source of truth
- Updated all navigation links to use /playground instead of /arena.html
- Removed deprecated SAMPLE_PLAYGROUND_TASKS from script.js
- Added /playground route to backend for proper URL handling

**Code Quality**
- All new questions fully support bilingual (English/Chinese)
- Consistent difficulty levels (REAL/FUN) and skill mappings
- Maintained existing question quality standards
- Removed misleading/"pretentious" language (e.g., "AI with taste")

---

## [1.0.0] — 2026-04-24

### 🎉 Launch

**Core Platform**
- Skill Forge: 4-step workflow (IDEA → GENERATING → FORGE & EDIT → PUBLISHING)
- Five-Layer Framework: DEFINING → INSTANTIATING → FENCING → VALIDATING → CONTEXTUALIZING
- Skill Archive: Browse and search 100+ community-created skills
- Creator Cards: Shareable proof of authorship (PNG/PDF)
- Playground: Interactive canvas for exploring skill interactions
- Shadow Agent: Test how skills guide AI behavior

**User Experience**
- Mobile-first responsive design (100% adapted for small screens)
- Bilingual support: English + Simplified Chinese
- Lightweight authentication: name + email (no registration burden)
- Toast notifications system (replaced 44+ alert modals)
- Full-width adaptive layouts
- Smooth animations and visual feedback

**Developer Features**
- REST API (`/api/skills`, `/api/search`, `/api/forge/*`)
- Claude AI integration for skill generation
- Email notifications (skill published, Creator Card delivery)
- Playground drag-and-resize interactions
- Data persistence: PostgreSQL/SQLite compatible
- Docker containerization + Railway deployment

**Quality & Accessibility**
- Semantic HTML
- WCAG 2.1 AA compliant keyboard navigation
- Cross-browser testing (Chrome, Safari, Firefox)
- High-contrast options
- Error validation and recovery

### 🚀 Latest Updates (This Sprint)

**Mobile Experience**
- Fixed header lines to extend full-width on small screens
- Improved line spacing around main CTA text
- Single-column layout for Agent Archive
- Optimized Chinese typography (Noto Sans SC font)

**Interactions**
- Unified language toggle (consistent black button styling)
- Full-width card dragging in Playground
- Resize handles with visual feedback
- Touch support for all interactions

**Internationalization**
- Added i18n support for ethics pass messages
- Consistent English/Chinese rendering

---

## Roadmap

### Q2 2026 (In Progress)
- [ ] User session management
- [ ] Playground draft auto-save (cloud + local)
- [ ] Skill versioning and history
- [ ] MY CREATIONS page (published skills + drafts)

### Q3 2026
- [ ] Community feedback on skills
- [ ] Skill recommendations engine
- [ ] Advanced search (domain, difficulty, rating)
- [ ] Skill collaboration (multiple creators)
- [ ] Creator analytics dashboard

### Q4 2026+
- [ ] Offline mode support
- [ ] Skill certification system
- [ ] Multi-language expansion
- [ ] Mobile apps (iOS/Android)
- [ ] Research publication tools

---

**Status**: Production Ready ✅  
**Version**: 1.4.0  
**Last Updated**: 2026-06-06
