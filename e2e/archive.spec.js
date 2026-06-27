// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Archive: star a skill, then download it.
 *
 * The domain grid (not the celestial canvas map - that's pixel-drawn, not
 * real DOM elements) is the reliable interaction surface here. Download is
 * deliberately gated behind starring first (see attachArchiveSkillListeners
 * in script.js), so this test exercises both in their required order.
 *
 * This also re-guards a real bug fixed earlier in this project's history:
 * syncArchiveStarStates() batch-syncing stale data right after a user's own
 * star click used to silently revert it. Checking the star state again
 * after a short pause (not just immediately after the click) is what would
 * catch a regression of that exact bug.
 */

test('starring a skill enables download, and the star sticks after the background sync', async ({ page }) => {
  await page.goto('/archive.html');

  const firstSkill = page.locator('#domainGrid .skill-item').first();
  await expect(firstSkill).toBeVisible({ timeout: 15000 });

  const starBtn = firstSkill.locator('.star-btn');
  const downloadBtn = firstSkill.locator('.download-btn');

  // Download starts disabled until the skill is starred.
  await expect(downloadBtn).toBeDisabled();

  const starResponse = page.waitForResponse(
    res => res.url().includes('/star') && res.request().method() === 'POST'
  );
  await starBtn.click();
  await starResponse;

  await expect(starBtn).toHaveClass(/starred/);
  await expect(downloadBtn).toBeEnabled();

  // Give syncArchiveStarStates' batch background sync time to run and
  // confirm it does NOT revert the star we just placed.
  await page.waitForTimeout(2000);
  await expect(starBtn).toHaveClass(/starred/);
  await expect(downloadBtn).toBeEnabled();

  // Download produces a real client-generated markdown file.
  const downloadPromise = page.waitForEvent('download');
  await downloadBtn.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^The42Post_.*\.md$/);

  const downloadPath = await download.path();
  const fs = await import('fs');
  const content = fs.readFileSync(downloadPath, 'utf-8');
  expect(content.length).toBeGreaterThan(50);
});
