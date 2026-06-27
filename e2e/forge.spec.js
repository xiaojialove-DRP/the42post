// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Forge: idea -> probe choice -> AI preview -> rights -> publish.
 *
 * Real LLM calls (probe generation, the Step-2 preview) are exercised for
 * real here, against whatever DEEPSEEK_API_KEY/ANTHROPIC_API_KEY is in the
 * environment running this test. In CI there is none, so both fall through
 * to their template fallback — that fallback path IS what this test proves
 * still works end-to-end, which matters just as much as the real-LLM path:
 * a forge session must never dead-end just because the LLM is unavailable.
 */

test('a real idea can be forged into a published skill', async ({ page }) => {
  await page.goto('/index.html');

  // ── Step 1: idea + identity ──────────────────────────────────────────
  await page.fill('#chaosInput', 'AI should know when to stay quiet instead of offering advice.');
  await page.click('#btnTest');

  await expect(page.locator('#forgeOverlay')).toHaveClass(/active/, { timeout: 5000 });
  // The homepage idea pre-fills Step 1's textarea automatically.
  await expect(page.locator('#forgeSkillIdea')).toHaveValue(/stay quiet/);

  await page.fill('#forgeUsername', 'e2e_test_user');
  await page.fill('#forgeEmail', 'e2e-test@example.com');

  // The streaming probe call (/forge/probe/stream) reliably fails without a
  // real LLM key and the client falls through to a second, non-streaming
  // call (/forge/probe). THAT response handler is what actually populates
  // .choice-text and — every time it runs — unconditionally resets
  // selection state and hides #probeConfirmation (it's written to always
  // render a "fresh" set of choices). Waiting for non-empty .choice-text
  // is not enough: clicking a choice before this handler's reset logic has
  // finished running gets silently wiped out a moment later. Wait for the
  // network call itself to resolve first.
  const probeResponse = page.waitForResponse(
    res => res.url().includes('/forge/probe') && !res.url().includes('stream') && res.request().method() === 'POST'
  );
  await page.click('#btnGenerateProbe');
  await probeResponse;

  // ── Probe: three stances, pick one ───────────────────────────────────
  const firstChoice = page.locator('.probe-choice').first();
  await expect(firstChoice.locator('.choice-text')).not.toHaveText('', { timeout: 10000 });
  await firstChoice.click();
  await expect(firstChoice).toHaveClass(/selected/);
  await expect(page.locator('#probeConfirmation')).toBeVisible();
  await page.click('#btnProceedToForge');

  // ── Step 2: five-layer "forging" animation, then AI preview fields ──
  await expect(page.locator('#forgePage2')).toHaveClass(/active/, { timeout: 5000 });
  // The animation is 5 layers x ~3s each plus a settle delay before the
  // preview call fires - this is the slowest real step in the whole flow.
  // Advances to Step 3 on its own once #forgeReady's data is in (no click
  // needed - a manual "PROCEED TO PUBLISH" tap used to be required here,
  // which read as the flow being stuck since the animation itself looks
  // like an auto-completing progress bar).
  await expect(page.locator('#forgePage3')).toHaveClass(/active/, { timeout: 90000 });
  await expect(page.locator('#reviewSkillName')).not.toHaveValue('', { timeout: 5000 });

  // ── Step 3: confirm the generated skill, pick a domain ───────────────
  await page.click('.domain-choice[data-domain="ideas"]');
  await page.click('#btnConfirmSkill');

  // ── Step 4: rights + covenant + publish ──────────────────────────────
  await expect(page.locator('#forgePage4')).toHaveClass(/active/, { timeout: 5000 });
  await page.click('#commercialTags .forge-tag[data-value="authorized"]');
  await page.click('#remixTags .forge-tag[data-value="yes"]');
  await page.check('#oathRevision');
  await page.check('#oathChallenge');
  await page.check('#oathHarm');
  await expect(page.locator('#btnPublish')).toBeEnabled();

  const publishResponse = page.waitForResponse(
    res => res.url().includes('/api/skills') && res.request().method() === 'POST',
    { timeout: 20000 }
  );
  await page.click('#btnPublish');
  const res = await publishResponse;
  // The exact success status (201 for a new skill) is already pinned down
  // at the API level in backend/test/smoke.test.js; this browser test only
  // needs to know the publish didn't fail.
  expect(res.status()).toBeLessThan(300);

  await expect(page.locator('#forgeCompletionSection')).toBeVisible({ timeout: 15000 });
  // #completionEmail is a fixed "sent to your inbox" string, not an echo of
  // the address - the real per-publish signal is the Soul-Hash on the card.
  // The card intentionally shows only the first 14 chars of the real hash
  // (SOUL_ + 9 hex chars) for display consistency, not the full identifier.
  await expect(page.locator('#cardSoulHash')).toHaveText(/^SOUL_[0-9a-f]{9}$/, { timeout: 5000 });
});
