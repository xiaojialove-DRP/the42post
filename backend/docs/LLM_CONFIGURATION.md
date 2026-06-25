# LLM Configuration Guide

## Overview

THE 42 POST calls LLMs directly over HTTPS (`fetch()`), not through an official SDK. There's no provider-abstraction layer — `backend/utils/skillGeneration.js` hardcodes a 3-tier chain:

```
1. DeepSeek   — primary, required
2. Claude     — automatic fallback if DeepSeek fails
3. Template   — last resort, so the forge flow never fully blocks
```

A separate, multi-provider `backend/utils/llmAdapter.js` (Gemini/Claude/OpenAI, switchable via `LLM_PROVIDER`) exists in the repo but has zero call sites — it predates the DeepSeek switch and isn't part of the running system. Don't configure `LLM_PROVIDER`; it does nothing.

---

## 1. DeepSeek (primary)

```bash
# .env
DEEPSEEK_API_KEY=your_key
# Optional: DEEPSEEK_MODEL=deepseek-chat
```

**Get a key:** [platform.deepseek.com](https://platform.deepseek.com) → API Keys

Without this key set, every generation call fails over to Claude (if configured) or the template tier — the app still runs, but nothing is real model output. `skillGeneration.js` logs a startup warning if it's missing.

**Models:** defaults to `deepseek-chat` (DeepSeek-V3, general purpose, fast). `deepseek-reasoner` (R1-style reasoning model) is used automatically as a same-provider fallback if the primary model's calls keep failing — not selectable as the primary via env var beyond setting `DEEPSEEK_MODEL` directly.

**Built-in resilience:** each call retries the primary model up to 3 times with backoff (0ms, 800ms, 1600ms) before trying the alternate DeepSeek model alias. Only after all of that fails does it hand off to Claude.

---

## 2. Claude (fallback)

```bash
# .env — optional
ANTHROPIC_API_KEY=your_key
# Optional: ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

**Get a key:** [console.anthropic.com](https://console.anthropic.com/keys)

This is only called when `ANTHROPIC_API_KEY` is set **and** the DeepSeek failure looks external (auth/quota/rate-limit/timeout/5xx — see `isExternalFailure()` in `skillGeneration.js`). Internal errors (e.g. a bug in our own prompt-building code) propagate as a real error instead of silently failing over, so they show up in logs rather than being masked.

Leave `ANTHROPIC_API_KEY` unset to skip this tier entirely — the app falls straight from DeepSeek to the template tier, which is a perfectly valid configuration (this is what production currently runs, per the last verified deployment audit).

---

## 3. Template fallback (last resort)

If both DeepSeek and Claude fail (or Claude isn't configured), the calling route falls back to a static, non-LLM template so the forge flow doesn't dead-end for the user. This is degraded output, not real generation — it's a safety net, not something to rely on. Logs carry a `skill_generation_step_fell_back_to_template` event when this fires, which is worth alerting on if it happens often in production (it means DeepSeek is unhealthy).

---

## Where this is actually called

| Route | File | Purpose |
|---|---|---|
| `POST /api/forge/probe` | `routes/forge.js` | Generate the intuition-probe scenario |
| `POST /api/forge/probe/stream` | `routes/forge.js` | Streaming variant |
| `POST /api/forge/preview-from-probe` | `routes/forge.js` | Build the five-layer Skill structure |
| `POST /api/forge/preview` | `routes/forge.js` | Same, skipping the probe step |
| `POST /api/forge/blessing` | `routes/forge.js` | Creator Card "blessing" line |
| `POST /api/playground/test` | `routes/playground.js` | Twin Test — baseline vs. Skill response |

All of the above go through `callLLMWithClaudeFallback()` (forge generation additionally wraps it in `callWithFallback()` for the template tier). There's a single shared implementation — no route duplicates the fallback logic.

---

## Rate Limiting

`rateLimitLLM` middleware: **10 requests/minute per IP**, applied to every route in the table above. This protects the DeepSeek/Claude spend, not just abuse — a runaway client loop hits this before it can rack up real API cost.

---

## Timeouts

- DeepSeek calls: 60s (`fetchWithTimeout`)
- Claude calls: 90s

Both are hard `AbortController` timeouts, not soft client-side warnings — a call that exceeds these throws and proceeds to the next fallback tier exactly like an HTTP error would.

---

## Adding a Third Provider

There's no plugin system to extend — `llmAdapter.js`'s switch-statement abstraction is the dead one. To add a real third provider, follow the pattern `callClaudeJSON()` already establishes in `skillGeneration.js`: a `call<Provider>JSON(prompt, maxTokens)` function that does a raw `fetch()`, parses the response into the same `{ data, model, usage }` shape, and gets called from inside `callLLMWithClaudeFallback()`'s catch block alongside (or instead of) the Claude branch.

---

## Troubleshooting

### "DEEPSEEK_API_KEY not configured" / generations look like generic templates

Check `DEEPSEEK_API_KEY` is actually set in the running environment (not just `.env.example`). If it's set but still falling back, check the server logs for `skill_generation_step_fell_back_to_template` — the attached error message tells you whether DeepSeek itself is rejecting the key (401/403) or just timing out.

### Results are inconsistent in quality

This usually means generation is silently landing on the template tier some fraction of the time. Search logs for `skill_generation_claude_fallback_failed` and `skill_generation_step_fell_back_to_template` rather than assuming a prompt-quality problem.

### Claude fallback never seems to fire even when DeepSeek is down

Confirm `ANTHROPIC_API_KEY` is actually set — without it, `callLLMWithClaudeFallback()` skips straight past Claude to whatever the caller's template fallback is. Also confirm the DeepSeek error matches `isExternalFailure()`'s pattern list; a malformed-JSON response from DeepSeek does count as external (it's in the regex), but a genuine bug in our own request-building code would not, and would surface as a hard error instead — that's intentional, not a bug.

---

**Last Updated**: 2026-06-25
**Reflects**: `backend/utils/skillGeneration.js`, `backend/middleware/rateLimiter.js`, and route mounts in `backend/routes/forge.js` / `backend/routes/playground.js` as of this date — not the unused `llmAdapter.js`.
