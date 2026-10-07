// Special toys for Chapter 2: the Venn ponds and the two-draw well.
import { askValue } from '../ui/dialogue.js';
import { evaluate } from '../systems/evaluator.js';
import { makeRng } from '../systems/sim.js';
import { SIMS } from '../systems/sims/index.js';
import { drawTokens } from './tokens.js';

const tidy = x => String(+Number(x).toPrecision(4));

// Pond layouts: circles as [x, y, radius, colour], and where a traveller
// dropped into each region lands. Region names match the trials in sims/ch2.js.
const LAYOUTS = {
  apart: {
    circles: [[90, 68, 24, 0x29adff], [150, 68, 24, 0xff004d]],
    spots: { 'A only': [90, 68], 'B only': [150, 68], neither: [188, 92] },
  },
  two: {
    circles: [[102, 68, 27, 0x29adff], [136, 68, 27, 0xff004d]],
    spots: { 'A only': [88, 68], both: [119, 68], 'B only': [150, 68], neither: [188, 92] },
  },
  three: {
    circles: [[104, 58, 22, 0x29adff], [136, 58, 22, 0xff004d], [120, 80, 22, 0xffec27]],
    spots: {
      'A only': [93, 51], 'B only': [147, 51], 'C only': [120, 93], 'A+B': [120, 47],
      'A+C': [105, 73], 'B+C': [135, 73], 'all three': [120, 63], 'no guild': [188, 94],
    },
  },
};

/**
 * venn-pond: overlapping ponds. Type what you think belongs in each region
 * (the list on the right) and drop random travellers in to see where they land.
 */
export function venn(k, enc, vars) {
  const { scene } = k;
  const layout = LAYOUTS[enc.id === 'c2-three-guilds' ? 'three' : vars.ab === undefined ? 'apart' : 'two'];
  const sampler = SIMS[enc.id].find(Boolean); // any phase's trial tells us which region a traveller hit
  const rng = makeRng();
  k.text(56, 28, 'Fill the ponds:');

  const ponds = k.add(scene.add.graphics());
  for (const [x, y, radius, colour] of layout.circles) {
    ponds.fillStyle(colour, 0.25).fillCircle(x, y, radius);
    ponds.lineStyle(1, colour).strokeCircle(x, y, radius);
  }

  // The list of regions: click one to write down its share.
  const typed = {};
  const total = k.text(212, 40 + Object.keys(layout.spots).length * 8, '', '#ffec27');
  Object.keys(layout.spots).forEach((name, i) => {
    const line = k.text(212, 40 + i * 8, `${name}: ?`).setInteractive({ useHandCursor: true });
    line.on('pointerdown', async () => {
      const answer = await askValue(`What belongs in "${name}"? (a number or an expression)`);
      if (!answer) return;
      try { typed[name] = evaluate(answer, vars); } catch { return k.note('That is not a number', '#ff004d'); }
      line.setText(`${name}: ${tidy(typed[name])}`);
      total.setText(`sum: ${tidy(Object.values(typed).reduce((a, b) => a + b, 0))}`);
    });
  });

  let dropped = 0;
  const count = k.text(180, 28, '', '#c2c3c7');
  const drop = times => {
    for (let i = 0; i < times; i++) {
      const [x, y] = layout.spots[sampler.trial(vars, rng).show[0]];
      k.img(x + rng.int(-7, 7), y + rng.int(-5, 5), 'spark').setTint(0xfff1e8);
      dropped++;
    }
    count.setText(`(${dropped})`);
  };
  k.button(240, 26, 'drop', () => drop(1));
  k.button(282, 26, 'x20', () => drop(20));
  return { icon: 'scroll', target: { x: 120, y: 68 } };
}

/**
 * urn-well without a probability to estimate (The Two-Draw Well): draw two
 * stones, with or without putting the first back, and collect the outcomes.
 */
export function sampleSpace(k, enc, vars, phaseIndex) {
  const { scene } = k;
  const colours = 'RBGYOW'.slice(0, vars.k);
  const rng = makeRng();
  let putBack = phaseIndex === 0;
  let shown = [];
  k.text(56, 28, `${vars.k} stones: draw one, then another`);
  const tally = k.tally('ordered pairs seen');
  k.add({ destroy: () => shown.forEach(obj => obj.destroy()) });
  drawTokens(scene, [...colours].map(c => `s${c}`), 56, 96).forEach(k.add); // what is in the well

  const draw = times => {
    let pair;
    for (let i = 0; i < times; i++) {
      pair = putBack ? [rng.pick(colours), rng.pick(colours)] : rng.draw([...colours], 2);
      tally.see(pair.join(''));
    }
    shown.forEach(obj => obj.destroy());
    shown = drawTokens(scene, ['first', `s${pair[0]}`, 'then', `s${pair[1]}`], 56, 58);
  };
  k.button(56, 78, 'draw two', () => draw(1));
  k.button(130, 78, 'x10', () => draw(10));
  k.button(170, 78, `put back: ${putBack ? 'yes' : 'no'}`, button => {
    putBack = !putBack;
    button.setText(`put back: ${putBack ? 'yes' : 'no'}`);
    tally.reset();
  });
  return { icon: 'coin', target: tally.view };
}
