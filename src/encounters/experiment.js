// The by-hand experiment: play the encounter's random process one run at a
// time and watch what happens. This is the toy for every probability phase
// that has no special toy of its own — you fiddle here before you calculate.
import { makeRng } from '../systems/sim.js';
import { drawTokens } from './tokens.js';

const tidy = x => String(+Number(x).toPrecision(4));

/**
 * @param k     the toy kit
 * @param vars  the encounter's variables
 * @param sim   the phase's experiment from systems/sims (kind P, E, K or T)
 * @param icon  what flies when the answer is forged
 */
export function experiment(k, vars, sim, icon = 'scroll') {
  const { scene } = k;
  const rng = makeRng();
  const numeric = sim.kind === 'E' || sim.kind === 'T';
  let knob = sim.knob ? Math.round((sim.knob.min + sim.knob.max) / 2) : null;
  let runs = 0, counted = 0, sum = 0;
  let tally = new Map(); // outcome (or group) → how many runs landed there
  let shown = [];        // the token sprites of the latest run

  k.text(56, 28, 'Try it by hand:');
  const counts = k.text(56, 40, 'runs: 0', '#ffec27');
  const outcome = k.text(56, 72, '');
  const board = k.text(56, 83, '', '#c2c3c7').setWordWrapWidth(256);
  k.add({ destroy: () => shown.forEach(obj => obj.destroy()) }); // so kit.destroy() also clears the tokens

  function reset() { runs = 0; counted = 0; sum = 0; tally = new Map(); refresh(null); }

  function refresh(last) {
    shown.forEach(obj => obj.destroy());
    shown = last ? drawTokens(scene, last.show, 56, 52) : [];
    outcome.setY((shown.bottom ?? 68) + 3); // the verdict sits right under the tokens, however many rows they take
    board.setY(outcome.y + 11);
    counts.setText(numeric ? `runs: ${runs}   total: ${tidy(sum)}` : `runs: ${runs}   counted: ${counted}   yes: ${tidy(sum)}`);
    if (!last) outcome.setText('');
    else if (last.x === null) outcome.setText('-> does not count (condition not met)').setColor('#c2c3c7');
    else if (numeric) outcome.setText(`-> ${tidy(last.x)}`).setColor('#fff1e8');
    else outcome.setText(last.x ? '-> yes, it happened' : '-> no').setColor(last.x ? '#00e436' : '#ff77a8');
    // Where the counted runs fell: by group (which coin? which chest?) or by value.
    const groups = [...tally.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(0, 5);
    board.setText(sim.knob ? '' : groups.map(([name, n]) => `${name}: ${n}`).join(' | '));
  }

  function run(times) {
    let last = null;
    for (let i = 0; i < times; i++) {
      last = sim.trial(knob === null ? vars : { ...vars, [sim.knob.name]: knob }, rng);
      runs++;
      if (last.x === null) continue;
      counted++;
      sum += Number(last.x);
      if (last.group !== undefined || numeric) {
        const key = last.group ?? tidy(last.x);
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
    }
    refresh(last);
  }

  k.button(236, 26, 'once', () => run(1));
  k.button(278, 26, 'x10', () => run(10));

  if (sim.knob) {
    const { name, min, max } = sim.knob;
    const label = k.text(100, 94, `${name} = ${knob}`);
    const turn = step => { knob = Math.min(max, Math.max(min, knob + step)); label.setText(`${name} = ${knob}`); reset(); };
    k.button(56, 92, '-', () => turn(-1));
    k.button(76, 92, '+', () => turn(1));
    k.text(170, 94, 'turn the knob', '#c2c3c7');
  }

  return { icon, target: counts };
}
