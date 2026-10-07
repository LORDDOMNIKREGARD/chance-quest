// The "Run" and "Compare" steps of Predict → Run → Compare.
//  runBoard     really simulates the encounter a couple of thousand times and
//               draws the running average settling down.
//  compareGauge puts gut, simulation and exact answer on one line.
import { makeRng, runTrials } from '../systems/sim.js';
import { drawTokens } from './tokens.js';
import { FONT } from './kit.js';
import { sfx } from '../audio/sfx.js';

export const tidy = x => String(+Number(x).toPrecision(4));

/** A dark board over the toy area. Returns { add, destroy } for the things drawn on it. */
function board(scene) {
  const made = [scene.add.rectangle(180, 73, 268, 94, 0x1d2b53).setStrokeStyle(1, 0xfff1e8).setDepth(40)];
  return {
    add: obj => { made.push(obj.setDepth(41)); return obj; },
    destroy: () => made.forEach(obj => obj.destroy()),
  };
}

/**
 * Run the phase's experiment `wanted` times and animate the result.
 * All trials are computed first (it takes a few milliseconds); the animation
 * then replays how the average moved, so nothing here is faked or pre-decided.
 * @returns {Promise<{mean: number, kept: number, total: number}>}
 */
export function runBoard(scene, sim, vars, wanted = 2000) {
  return new Promise(resolve => {
    const means = [], samples = [];
    const result = runTrials(sim, vars, wanted, makeRng(), (trial, mean, kept) => {
      means.push(mean);
      if (kept % 60 === 1) samples.push(trial.show); // a few runs to flash past while the board fills
    });

    const b = board(scene);
    const title = b.add(scene.add.text(52, 30, '', FONT));
    const LEFT = 62, RIGHT = 302, BOTTOM = 114, TOP = 64;
    const xOf = n => LEFT + (RIGHT - LEFT) * n / means.length;
    const yOf = v => BOTTOM - (BOTTOM - TOP) * (Math.min(sim.hi, Math.max(sim.lo, v)) - sim.lo) / (sim.hi - sim.lo);
    b.add(scene.add.graphics()).lineStyle(1, 0x5f574f).strokeRect(LEFT, TOP, RIGHT - LEFT, BOTTOM - TOP);
    b.add(scene.add.text(LEFT + 2, TOP + 1, tidy(sim.hi), { ...FONT, color: '#83769c' }));
    b.add(scene.add.text(LEFT + 2, BOTTOM - 9, tidy(sim.lo), { ...FONT, color: '#83769c' }));
    const line = b.add(scene.add.graphics());
    let drawn = 0, tokens = [], lastSample = null;

    scene.tweens.addCounter({
      from: 0, to: means.length, duration: 2000, ease: 'Quad.easeIn', // slow at first, so the early wobble is visible
      onUpdate: tween => {
        const upto = Math.floor(tween.getValue());
        if (upto <= drawn) return;
        line.lineStyle(1, 0x29adff).beginPath().moveTo(xOf(drawn), yOf(means[Math.max(0, drawn - 1)]));
        for (let n = drawn; n < upto; n += 3) line.lineTo(xOf(n + 1), yOf(means[n]));
        line.strokePath();
        drawn = upto;
        title.setText(`${upto} honest runs: ${tidy(means[upto - 1])}`);
        const sample = samples[Math.floor(upto / 60)];
        if (sample && sample !== lastSample) {
          lastSample = sample;
          tokens.forEach(obj => obj.destroy());
          tokens = drawTokens(scene, sample, 56, 42, 244, 42);
          sfx('tick');
        }
      },
      onComplete: () => {
        const skipped = result.total - result.kept;
        title.setText(skipped ? `${result.kept} counted of ${result.total}: ${tidy(result.mean)}` : `${result.kept} honest runs: ${tidy(result.mean)}`);
        scene.time.delayedCall(1100, () => { b.destroy(); tokens.forEach(obj => obj.destroy()); resolve(result); });
      },
    });
  });
}

/** Three marks on one line: your gut, the simulation, and the exact answer. Call .destroy() when done. */
export function compareGauge(scene, { gut, sim, exact, lo, hi }) {
  const b = board(scene);
  const LEFT = 76, RIGHT = 284, Y = 84;
  const xOf = v => LEFT + (RIGHT - LEFT) * (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo);
  b.add(scene.add.text(180, 32, 'gut  vs  runs  vs  exact', FONT).setOrigin(0.5, 0));
  b.add(scene.add.graphics()).lineStyle(1, 0xc2c3c7).lineBetween(LEFT, Y, RIGHT, Y);
  b.add(scene.add.text(LEFT, Y + 3, tidy(lo), { ...FONT, color: '#83769c' }).setOrigin(0.5, 0));
  b.add(scene.add.text(RIGHT, Y + 3, tidy(hi), { ...FONT, color: '#83769c' }).setOrigin(0.5, 0));
  const marks = [['gut', gut, '#ff77a8', Y - 36], ['runs', sim, '#29adff', Y - 24], ['exact', exact, '#ffec27', Y + 16]];
  for (const [name, value, colour, labelY] of marks) {
    const x = xOf(value);
    const tick = b.add(scene.add.graphics());
    tick.lineStyle(1, Number(colour.replace('#', '0x'))).lineBetween(x, Y - 4, x, Y + 4).lineBetween(x, Y, x, labelY + 8);
    const label = b.add(scene.add.text(0, labelY, `${name} ${tidy(value)}`, { ...FONT, color: colour }));
    label.setX(Math.min(312 - label.width, Math.max(50, x - label.width / 2))); // keep the label on the board
  }
  return b;
}
