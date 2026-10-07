// Plays every encounter of chapters 2–4 from its first line to its Pattern
// Card, and then each region's boss fight. The answers typed into the forge are
// the content's own formulas, so this is not a test of the maths (the unit
// tests do that) but of the game: every toy builds and can be tried by hand,
// every Predict → Run → Compare runs, the forge accepts every intended
// expression, the walk-to choices work, and nothing throws along the way.
import { test, expect } from '@playwright/test';

/** What is on screen right now, and what the current phase expects. */
const look = page => page.evaluate(() => {
  const cq = window.__cq, scene = cq.game.scene.getScene('Encounter');
  if (cq.scene !== 'Encounter') return { where: cq.scene };
  scene.tweens.timeScale = 20; // test only: hurry the animations along
  scene.time.timeScale = 20;

  // Which phase are we on? Normal encounters show a star per finished phase; a boss counts hit points down.
  const total = scene.queue.reduce((sum, item) => sum + item.enc.phases.length, 0);
  const stars = (document.querySelector('#ask-progress')?.textContent.match(/\*/g) ?? []).length;
  let done = scene.mode === 'boss' ? total - scene.hp : stars;
  const item = scene.queue.find(it => done < it.enc.phases.length || ((done -= it.enc.phases.length), false));
  const phase = item?.enc.phases[done];

  const has = selector => Boolean(document.querySelector(selector));
  const busy = has('.dialogue') || has('.forge') || has('.flask-box');
  return {
    where: 'Encounter',
    key: `${item?.enc.id}/${done}`,
    dialogue: has('.dialogue'),
    predict: !busy && has('#predict'),
    forge: !busy && has('#forge-open'),
    choose: !busy && has('.ask #leave') && !has('#predict') && !has('#forge-open'),
    f: phase?.f,
    choices: phase?.choices,
    correct: phase?.correct,
  };
});

/** Try the toy by hand, as a player would before answering. */
const fiddle = page => page.evaluate(() => {
  const things = window.__cq.game.scene.getScene('Encounter').children.list;
  for (const label of ['once', 'x10', 'x10', 'drop', 'x20']) things.find(o => o.type === 'Text' && o.text === label)?.emit('pointerdown');
});

/** Walk the hero to the pedestal with this label and take it. */
async function walkTo(page, choices, correct) {
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowUp');
  const side = correct - (choices.length - 1) / 2; // left of the middle, on it, or right of it
  if (side !== 0) {
    const key = side < 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await page.waitForFunction(label => window.__cq.near === label, choices[correct], { timeout: 10_000 });
    await page.keyboard.up(key);
  }
  await page.keyboard.press('e');
}

/** Play whatever encounter (or boss fight) has just started, until we are back on the street. */
async function play(page) {
  await page.waitForFunction(() => window.__cq.scene === 'Encounter');
  let fiddled = null;
  for (;;) {
    const view = await look(page);
    if (view.where !== 'Encounter') return;
    if (view.dialogue) { await page.keyboard.press('Enter'); continue; }
    if ((view.predict || view.forge) && fiddled !== view.key) { fiddled = view.key; await fiddle(page); }
    if (view.predict) {
      await page.click('#predict');
      await page.click('#flask-pour');
    } else if (view.forge) {
      await page.click('#forge-open');
      await page.fill('#forge-input', view.f);
      await page.keyboard.press('Enter');
    } else if (view.choose && view.choices) {
      await walkTo(page, view.choices, view.correct);
    } else {
      await page.waitForTimeout(30); // an animation is playing
    }
  }
}

for (const ch of [2, 3, 4]) {
  test(`chapter ${ch}: every encounter and the boss can be played to the end`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(String(error)));

    // A journey that has beaten the earlier bosses, standing at the start of this region's street.
    const bosses = [1, 2, 3].filter(n => n < ch);
    await page.addInitScript(save => localStorage.setItem('chance-quest-save-v1', JSON.stringify(save)),
      { v: 1, solved: {}, bosses, where: { scene: 'Region', ch, x: 40 } });
    await page.goto('/');
    await page.click('#continue');
    await page.waitForFunction(() => window.__cq.scene === 'Region');

    // Knock on a door: the same call the game makes when you press E in front of it.
    const knock = id => page.evaluate(wanted => {
      const region = window.__cq.game.scene.getScene('Region');
      region.interact(region.things.find(thing => thing.id === wanted));
    }, id);

    const ids = await page.evaluate(() => window.__cq.game.scene.getScene('Region').things.filter(thing => thing.kind === 'enc').map(thing => thing.id));
    expect(ids.length).toBeGreaterThan(15);
    for (const id of ids) {
      await knock(id);
      await play(page);
      const state = await page.evaluate(() => window.__cq.state);
      expect(state.solved[id], `${id} was not finished`).toBeTruthy();
      expect(state.mistakes.map(m => `${m.id}: ${m.expr}`), `${id}: the content's own formula was refused`).toEqual([]);
      expect(errors, `after ${id}`).toEqual([]);
    }

    await knock('boss');
    await page.click('.choices button'); // "Fight"
    await play(page);
    const state = await page.evaluate(() => window.__cq.state);
    expect(state.bosses).toContain(ch);
    expect(state.mistakes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
