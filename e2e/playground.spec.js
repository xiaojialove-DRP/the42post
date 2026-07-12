// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Playground: pick a skill -> confirm -> start a real Twin Test.
 *
 * Like forge.spec.js, the actual LLM call (/api/playground/test) cannot
 * succeed deterministically without a real DEEPSEEK_API_KEY/
 * ANTHROPIC_API_KEY in the environment running this test. What IS always
 * true, with or without a real key, is the contract this test checks:
 * the flow up to "Start Test" must work, and a generation failure must
 * show a clean, translated message - never a raw provider error leaked
 * to the screen (this exact regression shipped once before, per
 * playground.test.js's backend-level version of this same check).
 */

test('picking a skill and starting a Twin Test never leaks a raw provider error', async ({ page }) => {
  await page.goto('/playground.html');

  // ── Spawn a card from the first dock category ────────────────────────
  await page.locator('.dock-item').first().click();

  const card = page.locator('.task-card').first();
  await expect(card).toBeVisible({ timeout: 5000 });

  // ── Picker: a skill is pre-selected and the dropdown is populated ────
  const select = card.locator('[data-skill-select]');
  await expect(select).not.toHaveValue('', { timeout: 10000 });
  const confirmBtn = card.locator('[data-skill-confirm]');
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  // ── Trigger: explicit "Start Test" click required ────────────────────
  const triggerBtn = card.locator('[data-trigger-btn]');
  await expect(triggerBtn).toBeVisible({ timeout: 5000 });
  await triggerBtn.click();

  // ── Wait for the loading spinner to resolve one way or the other ─────
  const rateStage = card.locator('.twin-rate');
  const loadingStage = card.locator('.twin-loading');
  await expect(loadingStage.locator('.twin-spinner')).toBeHidden({ timeout: 30000 });

  const bodyText = await card.locator('.card-body--twin').innerText();
  expect(bodyText).not.toMatch(/DeepSeek|Claude|api[_ ]?key|401|403|invalid_request_error/i);

  if (await rateStage.isVisible()) {
    // Real (or fallback-generated) responses came back. Blind pick -
    // neither card is labelled with the skill side at this point - then
    // confirm the flip-reveal appears, react to it (the separate
    // qualitative "how did this Skill do overall" question), and confirm
    // the thank-you stage appears.
    await expect(rateStage.locator('[data-text-a]')).not.toHaveText('');
    await expect(rateStage.locator('[data-text-b]')).not.toHaveText('');
    await card.locator('[data-pick-card][data-side="A"]').click();
    const revealStage = card.locator('.twin-reveal');
    await expect(revealStage).toBeVisible({ timeout: 10000 });
    await expect(revealStage.locator('[data-reveal-headline]')).not.toHaveText('');
    await revealStage.locator('.twin-rate-btn[data-rating="better"]').click();
    await expect(card.locator('.twin-thanks')).toBeVisible({ timeout: 10000 });
  } else {
    // No real LLM key in this environment - generation failed, which is
    // expected. The only thing that matters is the message stayed clean.
    await expect(loadingStage).toContainText(/try again|稍后再试|failed|失败/i);
  }
});
