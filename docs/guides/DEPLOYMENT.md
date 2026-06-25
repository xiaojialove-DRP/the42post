# Deployment

THE 42 POST is one process: Express serves both the REST API and the static frontend (`express.static`). There's no separate frontend build or CDN step — whatever serves `backend/server.js` serves the whole app.

This guide covers the current production target (Zeabur) and generic Docker / self-hosted deployment. For the one-time verification record of a specific past deploy (2026-04-24, pre-Zeabur), see [docs/dev-logs/2026-04-24-deployment-verification.md](../dev-logs/2026-04-24-deployment-verification.md) — that file is a dated historical snapshot, not a how-to guide.

---

## Required Environment Variables

See [backend/.env.example](../../backend/.env.example) for the authoritative list. Summary:

| Variable | Required? | Purpose |
|---|---|---|
| `DEEPSEEK_API_KEY` | **Yes** | Primary LLM. Without it, generation falls back to templates — the app still runs, but Skills/Twin Test responses won't be real model output. |
| `JWT_SECRET` | **Yes** | Signs the JWT issued by `forge-session` (the real identity flow — see [ARCHITECTURE.md](../ARCHITECTURE.md#-identity-model)). |
| `SIGNING_SECRET` | **Yes** | HMAC signing used in Soul-Hash generation (`skillGeneration.js`). |
| `ANTHROPIC_API_KEY` | No | Optional Claude fallback, only called if the DeepSeek request fails. Leave unset to skip it entirely. |
| `POSTGRES_URI` | No | If set, the app uses PostgreSQL. If unset, it uses a local SQLite file automatically — zero config. `DATABASE_URL` also works as a fallback alias for this same variable. |
| `RESEND_API_KEY` | No, but recommended | Without it, emails are logged to the console instead of actually sent. |
| `EMAIL_FROM`, `EMAIL_FROM_NAME` | No | Defaults to Resend's shared test sender, which can only deliver to your own Resend account email. Verify a domain in Resend for real delivery. |
| `FRONTEND_URL` | No | Used to build links in outgoing emails. |
| `PORT` | No | Defaults to 3000. Most PaaS platforms (Zeabur included) inject their own value — don't hardcode this. |
| `NODE_ENV` | No | Set to `production` in production; affects logging verbosity. |

---

## Deploying to Zeabur (current production target)

The repo includes both a `Dockerfile` and a `Procfile` (`web: node backend/server.js`) at the root — Zeabur can build from either depending on what it auto-detects for this repo. Both ultimately just run `backend/server.js`, so either path produces the same running app.

1. **Connect the repo** to a new Zeabur project/service.
2. **Set the environment variables** from the table above in the service's environment variables settings. At minimum: `DEEPSEEK_API_KEY`, `JWT_SECRET`, `SIGNING_SECRET`.
3. **Database**: add a PostgreSQL service in the same Zeabur project if you want persistent, production-grade storage — Zeabur-provisioned Postgres services typically auto-inject a connection string to sibling services as `POSTGRES_URI` (this is the standard pattern across Railway/Zeabur-style platforms; double-check the exact variable name Zeabur injects in your project before relying on it). If you skip this, the app falls back to a local SQLite file inside the container, which is fine for testing but **will not persist** across redeploys unless a volume is mounted at `/app/data` (the path `server.js` checks for first).
4. **Custom domain**: `www.the42post.com` / `the42post.com` are already whitelisted in [backend/config/cors.js](../../backend/config/cors.js). If you're deploying a fork under a different domain, add it there — CORS is an explicit whitelist, not env-var-driven.
5. **Email**: SMTP ports (25/465/587) are blocked outbound on Zeabur, which is why this project uses [Resend](https://resend.com)'s HTTPS API instead of SMTP. Set `RESEND_API_KEY` or emails will just be logged, not sent.
6. **Verify**: hit `/api/health` once deployed — it reports whether the DB connected and whether the LLM key is configured (presence check only, not a live call). For a real end-to-end check, trigger an actual `/api/forge/probe` and confirm the response looks like model output, not a generic template.

---

## Docker (self-hosted / any platform)

```bash
docker build -t the42post .
docker run -p 8080:8080 \
  -e DEEPSEEK_API_KEY=your_key \
  -e JWT_SECRET=your_secret \
  -e SIGNING_SECRET=your_secret \
  the42post
```

The `Dockerfile` installs backend dependencies, copies the frontend into the image, and runs `node backend/server.js` from `/app`. It sets `PORT=8080` internally — map whatever host port you want to `8080`, or override `PORT` at `docker run` time.

---

## Database Backups (self-hosted SQLite only)

If you're running without `POSTGRES_URI` (i.e. on SQLite), [backend/utils/backupScheduler.js](../../backend/utils/backupScheduler.js) takes a daily snapshot with 7-day retention at `/app/data/backups/`. This matters because container redeploys replace the running container — a Volume mounted at `/app/data` survives redeploys, but the running process doesn't, so a corrupted DB or bad migration needs a same-day snapshot to roll back from. See that file's header comment for the manual restore procedure (it's intentionally vague about the exact CLI/dashboard steps for getting a shell on the container — that part is platform-specific and hasn't been re-verified since the Railway→Zeabur migration; check Zeabur's current docs before relying on it during a real incident).

If you're running on PostgreSQL in production, use your hosting provider's own backup mechanism instead — this scheduler is SQLite-only.

---

## Post-Deploy Checklist

- [ ] `GET /api/health` returns `db: connected` and `llm: configured`
- [ ] A real `/api/forge/probe` call returns model-generated content (not a generic template — check for specific, non-repeating phrasing)
- [ ] Your domain is in the `backend/config/cors.js` whitelist if it's not `the42post.com`
- [ ] `RESEND_API_KEY` is set if you need real email delivery, or you've accepted that emails will only be logged
- [ ] If using SQLite in production: a persistent Volume is mounted at `/app/data`

---

**Last Updated**: 2026-06-25
**Reflects**: verified `backend/.env.example`, `Dockerfile`, `Procfile`, `backend/server.js`, and `backend/config/cors.js` as of this date.
