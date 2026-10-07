// The by-hand experiment: play the encounter's random process one run at a
// time and watch what happens. This is the toy for every probability phase
// that has no special toy of its own — you fiddle here before you calculate.
//
// On the left, the latest run: as tokens, or as a small scene (pictures.js).
// On the right, a chart of all your runs so far (charts.js), when the trial
// reports something a chart can be made of.
import { makeRng } from '../systems/sim.js';
import { drawTokens } from './tokens.js';
import { histogram, strings } from './charts.js';
import { stage } from './pictures.js';

const tidy = x => String(+Number(x).toPrecision(4));
// Everything stays above y = 98: a long story can push the question box that high.
const CHART = { x: 190, y: 40, w: 118, h: 58 };

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
  const settings = () => (knob === null ? vars : { ...vars, [sim.knob.name]: knob });
  let runs = 0, counted = 0, sum = 0;
  let shown = []; // what the latest run drew

  // One throwaway run tells us what this experiment reports, and so how to show it.
  const sample = sim.trial(settings(), makeRng(1));
  const chart = sim.knob ? null // a knob changes the experiment itself: old runs could not share a chart with new ones
    : sample.group !== undefined ? strings(k, CHART)
      : sample.bin !== undefined || numeric ? histogram(k, CHART, sim, sample.axis)
        : null;
  const room = { x: 56, y: 40, w: chart ? 126 : 250 }; // the picture of one run; it shares the row with the chart
  const set = sample.act ? stage(k, room, sample.act) : null;

  const counts = k.text(56, 28, 'Try it by hand:', '#ffec27'); // shares its row with the buttons, so it is kept short
  const outcome = k.text(56, 59, '');
  k.add({ destroy: () => shown.forEach(obj => obj.destroy()) }); // so kit.destroy() also clears the latest run

  function reset() { runs = 0; counted = 0; sum = 0; refresh(null); }

  function refresh(last) {
    shown.forEach(obj => obj.destroy());
    shown = !last ? [] : set ? set.play(last.act) : drawTokens(scene, last.show, room.x, room.y, room.w);
    outcome.setY((shown.bottom ?? 56) + 3); // the verdict sits right under the picture, however tall it is
    counts.setText(!runs ? 'Try it by hand:'
      : numeric ? `runs ${runs} total ${tidy(sum)}`
        : `runs ${runs}${counted < runs ? ` kept ${counted}` : ''} yes ${sum}`); // "kept" appears once a run was thrown away
    if (!last) outcome.setText('');
    else if (last.x === null) outcome.setText(chart ? '-> not counted' : '-> does not count (condition not met)').setColor('#c2c3c7');
    else if (numeric) outcome.setText(`-> ${tidy(last.x)}`).setColor('#fff1e8');
    else outcome.setText(last.x ? (chart ? '-> yes' : '-> yes, it happened') : '-> no').setColor(last.x ? '#00e436' : '#ff77a8');
    chart?.draw();
  }

  function run(times) {
    let last = null;
    for (let i = 0; i < times; i++) {
      last = sim.trial(settings(), rng);
      runs++;
      chart?.add(last);
      if (last.x === null) continue;
      counted++;
      sum += Number(last.x);
    }
    refresh(last);
  }

  k.button(236, 26, 'once', () => run(1));
  k.button(278, 26, 'x10', () => run(10));

  if (sim.knob) {
    const { name, min, max } = sim.knob;
    const label = k.text(100, 82, `${name} = ${knob}`);
    const turn = step => { knob = Math.min(max, Math.max(min, knob + step)); label.setText(`${name} = ${knob}`); reset(); };
    k.button(56, 80, '-', () => turn(-1));
    k.button(76, 80, '+', () => turn(1));
    k.text(170, 82, 'turn the knob', '#c2c3c7');
  }

  // A scene with actors lets them play out the forge's verdict too.
  return { icon, target: set?.target ?? counts, ok: set?.ok, bad: set?.bad };
}
