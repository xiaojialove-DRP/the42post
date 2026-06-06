# CHANGELOG

All notable changes to THE 42 POST.

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
