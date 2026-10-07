// Versus mode. The practice duel runs entirely in one browser. The online duel
// needs the public PeerJS broker (and so the internet), so it only runs when
// asked for:  ONLINE=1 npx playwright test versus     (PowerShell: $env:ONLINE = 1)
import { test, expect } from '@playwright/test';

/** The duel as the Versus scene sees it. */
const duel = page => page.evaluate(() => {
  const scene = window.__cq.game.scene.getScene('Versus');
  return { me: scene.me, rival: scene.rival, question: `${scene.question?.id}: ${scene.question?.ask}`, answer: scene.question?.answer };
});
const forge = async (page, value) => {
  await page.fill('#forge-input', value.toFixed(10)); // plain digits: "1e-7" would mean something else at the forge
  await page.keyboard.press('Enter');
};
/** Let the clock run out in a moment instead of in minutes. */
const endSoon = page => page.evaluate(() => { window.__cq.game.scene.getScene('Versus').deadline = performance.now() + 300; });
const listen = page => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
};

test('practice duel: a hit, a miss, a skip, and the clock ends it', async ({ page }) => {
  const errors = listen(page);
  await page.goto('/');
  await page.click('#versus');
  await page.click('#versus-clock'); // 3 min → 5 min, just to turn the dial
  await page.click('#versus-solo');
  await page.waitForFunction(() => window.__cq.event === 'versus-go');

  // An exact answer is a hit and brings the next question.
  const first = await duel(page);
  await forge(page, first.answer);
  await page.waitForFunction(() => window.__cq.game.scene.getScene('Versus').me.hits === 1);

  // A wrong answer is a miss and the same question stays.
  await expect(page.locator('#forge-input')).toBeVisible();
  const second = await duel(page);
  await forge(page, second.answer * 2 + 1);
  await page.waitForFunction(() => window.__cq.game.scene.getScene('Versus').me.misses === 1);
  await expect(page.locator('#forge-input')).toBeVisible();
  expect((await duel(page)).question).toBe(second.question);

  // Esc skips to the next question without scoring.
  await page.keyboard.press('Escape');
  await page.waitForFunction(was => { const q = window.__cq.game.scene.getScene('Versus').question; return `${q.id}: ${q.ask}` !== was; }, second.question);
  expect((await duel(page)).me).toEqual({ hits: 1, misses: 1 });

  // When the clock runs out the forge closes by itself and the result is shown.
  await endSoon(page);
  await page.waitForFunction(() => window.__cq.event === 'versus-over');
  await expect(page.locator('#forge-input')).toHaveCount(0);
  await expect(page.locator('#versus-result')).toHaveText('You: 1 exact, 1 missed.');
  await page.click('#versus-title');
  await page.waitForFunction(() => window.__cq.scene === 'Title');
  expect(await page.evaluate(() => localStorage.getItem('chance-quest-save-v1'))).toBeNull(); // the journey is untouched
  expect(errors).toEqual([]);
});

test('online duel: two browsers, one room, the same questions', async ({ browser }) => {
  test.skip(!process.env.ONLINE, 'needs the public PeerJS broker: run with ONLINE=1');
  const host = await (await browser.newContext()).newPage(), guest = await (await browser.newContext()).newPage();
  const hostErrors = listen(host), guestErrors = listen(guest);
  for (const page of [host, guest]) { await page.goto('/'); await page.click('#versus'); }

  await host.click('#versus-host');
  const room = /room code is ([A-Z]{5})/.exec(await host.locator('#versus-status').innerText())[1];
  // The room exists once the broker has heard from the host, a moment after the click: knock until it does.
  await expect(async () => {
    await guest.fill('#versus-code', room.toLowerCase()); // the code is not case-sensitive
    await guest.click('#versus-join');
    await guest.waitForFunction(() => window.__cq.event === 'versus-go', null, { timeout: 8000 });
  }).toPass({ timeout: 45_000 });
  await host.waitForFunction(() => window.__cq.event === 'versus-go');

  const asked = await duel(host);
  expect(await duel(guest)).toEqual(asked); // same question, same numbers, both 0–0

  // The host's hit and the guest's miss show up on the other screen.
  await forge(host, asked.answer);
  await guest.waitForFunction(() => window.__cq.game.scene.getScene('Versus').rival.hits === 1);
  await forge(guest, asked.answer * 2 + 1);
  await host.waitForFunction(() => window.__cq.game.scene.getScene('Versus').rival.misses === 1);

  for (const page of [host, guest]) await endSoon(page);
  await expect(host.locator('#versus-result')).toHaveText('You: 1 exact, 0 missed. Rival: 0 exact, 1 missed. You win!');
  await expect(guest.locator('#versus-result')).toHaveText('You: 0 exact, 1 missed. Rival: 1 exact, 0 missed. Your rival wins.');
  expect([...hostErrors, ...guestErrors]).toEqual([]);
});
