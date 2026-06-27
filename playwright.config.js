import { defineConfig } from '@playwright/test';

// Browser-level e2e for Forge/Playground/Archive — the backend smoke test
// (backend/test/smoke.test.js) proves the API chains correctly, but only a
// real browser catches the class of bug that's actually hit this product:
// a button that doesn't fire, a modal that doesn't open, a page that never
// advances. Same backend (:3000) + static frontend (:5173) setup already
// used for manual preview in .claude/launch.json.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node backend/server.js',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
        // Force local SQLite regardless of what's in the repo-root .env -
        // a stray DATABASE_URL there gets parsed as a Postgres connection
        // string and the server fails to boot before tests ever run.
        DATABASE_URL: '',
        POSTGRES_URI: '',
      },
    },
    {
      // No -s (SPA fallback): this is a multi-page site (index/playground/
      // archive.html are genuinely separate pages), not a single-page app.
      // -s rewrites any unmatched path to index.html, and serve's own
      // clean-URL redirect (/playground.html -> /playground) is itself an
      // "unmatched path" once the extension is stripped - so with -s on,
      // every direct navigation to /playground.html or /archive.html
      // silently serves the homepage instead.
      command: 'npx serve frontend -l 5173',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
