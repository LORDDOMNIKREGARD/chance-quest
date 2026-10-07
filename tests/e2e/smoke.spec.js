// Smoke test: plays the first minutes of the game with real key presses.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/** Press Enter until no speech box is left on screen. */
async function talk(page) {
  await page.waitForTimeout(150);
  while (await page.locator('.dialogue').count()) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
}

/** Hold → until the browser-side condition is true. */
async function walkRightUntil(page, condition) {
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(condition, null, { timeout: 30_000 });
  await page.keyboard.up('ArrowRight');
}

async function forge(page, expression) {
  await page.click('#forge-open');
  await page.fill('#forge-input', expression);
  await page.keyboard.press('Enter');
}

test('new game → Tallyburg → forge right and wrong → Grimoire export', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });

  // 1. Boot and start a new game.
  await page.goto('/');
  await page.click('#new-game');
  await talk(page);
  await page.waitForFunction(() => window.__cq.scene === 'Overworld');

  // 2. Walk into Tallyburg and up to the Locksmith who owns The Gate Seal.
  await walkRightUntil(page, () => window.__cq.scene === 'Region');
  await walkRightUntil(page, () => window.__cq.near === 'c1-gate-seal');
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__cq.scene === 'Encounter');
  await talk(page);
  await expect(page.locator('.ask .ask-story')).toContainText('The Gate Seal');

  // 3. Forge the right count: the gate opens.
  await forge(page, '26^2*10^3');
  await page.waitForFunction(() => window.__cq.event === 'lock-open');
  expect(await page.evaluate(() => window.__cq.state.mistakes.length)).toBe(0);
  await expect(page.locator('#ask-progress')).toHaveText('* >'); // on to phase two

  // 4. A wrong value in another encounter lands in the Grimoire.
  await page.click('#leave');
  await page.waitForFunction(() => window.__cq.scene === 'Region');
  await walkRightUntil(page, () => window.__cq.near === 'c1-wheel-spins');
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__cq.scene === 'Encounter');
  await talk(page);
  await forge(page, '8*4');
  await page.waitForFunction(() => window.__cq.state.mistakes.length === 1);
  expect(await page.evaluate(() => window.__cq.state.hearts)).toBe(4);
  await expect(page.locator('#forge-open')).toBeVisible(); // the world reacted; we may try again

  await page.click('#btn-grimoire');
  const grimoire = page.locator('#grimoire-page');
  await expect(grimoire).toContainText('Wheel of the Night Market');
  await expect(grimoire).toContainText('I forged 8*4 = 32');
  await expect(grimoire).toContainText('sealed until solved'); // the answer is not leaked

  // 5. Export the Markdown.
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-md')]);
  const markdown = await readFile(await download.path(), 'utf8');
  expect(markdown).toContain('### Ch1 §1.2 — Wheel of the Night Market');
  expect(markdown).toMatch(/- Phase: How many different recorded sequences are possible\? \| I forged: 8\*4 = 32 \| Correct: .+ \| Pattern: independent repeated stages → power/);
  expect(markdown).not.toContain('4096');

  // 6. Nothing went wrong along the way.
  expect(errors).toEqual([]);
});

test('Venn Marshes: Predict → Run → Compare, then a walk-to choice', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));

  // A journey that has beaten the first boss, standing at the Trickster's door (last house in Venn Marshes).
  await page.addInitScript(() => {
    if (!localStorage.getItem('chance-quest-save-v1')) {
      localStorage.setItem('chance-quest-save-v1', JSON.stringify({ v: 1, solved: {}, bosses: [1], where: { scene: 'Region', ch: 2, x: 1528 } }));
    }
  });
  await page.goto('/');
  await page.click('#continue');
  await page.waitForFunction(() => window.__cq.near === 'c2-intransitive');
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__cq.scene === 'Encounter');
  await talk(page);

  // Predict: the forge is not offered until a gut estimate has been poured.
  await expect(page.locator('#predict')).toBeVisible();
  await expect(page.locator('#forge-open')).toHaveCount(0);
  await page.click('#predict');
  await page.locator('#flask-slider').evaluate(slider => { slider.value = 0.6; slider.dispatchEvent(new Event('input')); });
  await expect(page.locator('#flask-reading')).toHaveText('0.6');
  await page.click('#flask-pour');

  // Run: two thousand honest rolls of the trickster's dice land near 4/9 without being told the answer.
  await page.waitForFunction(() => window.__cq.event === 'run-done', null, { timeout: 20_000 });
  const summary = await page.locator('#ask-prc').innerText();
  const estimate = Number(/honest runs: ([\d.]+)/.exec(summary)[1]);
  expect(Math.abs(estimate - 4 / 9)).toBeLessThan(0.05);

  // Compare: forge the exact value and see all three side by side.
  await forge(page, '4/9');
  await expect(page.locator('.dialogue')).toContainText('Exact: 0.4444', { timeout: 10_000 });
  await talk(page);

  // The second phase is a choice: walk to die C and take it.
  await expect(page.locator('#ask-progress')).toHaveText('* >');
  await expect(page.locator('#forge-open')).toHaveCount(0);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  await walkRightUntil(page, () => window.__cq.near === 'C');
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__cq.state.solved['c2-intransitive']);
  expect(await page.evaluate(() => window.__cq.state.mistakes.length)).toBe(0);
  await talk(page);
  await page.waitForFunction(() => window.__cq.scene === 'Region');

  expect(errors).toEqual([]);
});
