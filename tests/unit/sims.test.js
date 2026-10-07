// The simulations never see the exact answers, so these tests are a real
// cross-check: thousands of honest trials must land on the stored answer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeRng, runTrials } from '../../src/systems/sim.js';
import { SIMS, simFor } from '../../src/systems/sims/index.js';
import { evaluate } from '../../src/systems/evaluator.js';
import { reroll } from '../../src/systems/content.js';

const content = JSON.parse(readFileSync('public/content.json', 'utf8'));
const byId = Object.fromEntries(content.encounters.map(e => [e.id, e]));

/** Is the simulated mean within 5 standard errors (plus a hair) of the exact value? */
function expectClose(sim, vars, exact, seed) {
  const run = runTrials(sim, vars, 30000, makeRng(seed));
  const slack = 5 * run.sd / Math.sqrt(run.kept) + 0.002 * Math.max(1, Math.abs(exact));
  expect(run.kept).toBeGreaterThan(1000);
  expect(Math.abs(run.mean - exact)).toBeLessThanOrEqual(slack);
}

describe('simulation registry', () => {
  it('covers every encounter of chapters 2–4, with one entry per phase', () => {
    for (const enc of content.encounters.filter(e => e.ch >= 2 && e.ch <= 4)) {
      expect(SIMS[enc.id], enc.id).toBeDefined();
      expect(SIMS[enc.id].length, enc.id).toBe(enc.phases.length);
    }
  });
  it('never simulates a choice phase, and only predicts on numeric ones', () => {
    for (const [id, sims] of Object.entries(SIMS)) {
      sims.forEach((sim, i) => { if (sim) expect(byId[id].phases[i].f, `${id} phase ${i}`).toBeDefined(); });
    }
  });
});

describe('honest simulations agree with the exact answers', () => {
  const predicted = Object.entries(SIMS).flatMap(([id, sims]) =>
    sims.map((sim, i) => [id, i, sim]).filter(([, , sim]) => sim && (sim.kind === 'P' || sim.kind === 'E')));

  it.each(predicted)('%s phase %i', (id, i, sim) => {
    const enc = byId[id], phase = enc.phases[i];
    expectClose(sim, enc.vars, phase.answer, 12345 + i);
    expect(phase.answer).toBeGreaterThanOrEqual(sim.lo); // the Predict slider can reach the answer
    expect(phase.answer).toBeLessThanOrEqual(sim.hi);
  });

  const varied = predicted.filter(([id]) => Object.keys(byId[id].vary).length);
  it.each(varied)('%s phase %i still agrees after an Echo re-roll', (id, i, sim) => {
    const enc = byId[id], rng = makeRng(777 + i);
    for (let n = 0; n < 2; n++) {
      const vars = reroll(enc, rng.u);
      expectClose(sim, vars, evaluate(enc.phases[i].f, vars), 999 + n);
    }
  });
});

describe('by-hand experiments (knobs and toys)', () => {
  const byHand = Object.entries(SIMS).flatMap(([id, sims]) =>
    sims.map((sim, i) => [id, i, sim]).filter(([, , sim]) => sim && (sim.kind === 'K' || sim.kind === 'T')));
  it.each(byHand)('%s phase %i runs at every knob setting', (id, i, sim) => {
    const rng = makeRng(5), { min = 0, max = 0, name } = sim.knob ?? {};
    for (let knob = min; knob <= max; knob++) {
      const result = sim.trial({ ...byId[id].vars, [name]: knob }, rng);
      expect(Array.isArray(result.show)).toBe(true);
      expect(Number.isFinite(Number(result.x))).toBe(true);
    }
  });
  it('the knob answer is where the frequency crosses the target', () => {
    const freq = (id, i, knob) => { const sim = simFor(byId[id], i); return runTrials(sim, { ...byId[id].vars, [sim.knob.name]: knob }, 30000, makeRng(1)).mean; };
    expect(freq('c2-birth-months', 0, 4)).toBeLessThan(0.5);
    expect(freq('c2-birth-months', 0, 5)).toBeGreaterThan(0.5);
    expect(freq('c2-at-least-one', 1, 24)).toBeLessThan(0.5);
    expect(freq('c2-at-least-one', 1, 26)).toBeGreaterThan(0.5);
    expect(freq('c2-socks', 0, 10)).toBeCloseTo(2 / 9, 2);
  });
});

describe('what a run shows agrees with what it counts', () => {
  const all = Object.entries(SIMS).flatMap(([id, sims]) => sims.map((sim, i) => [id, i, sim]).filter(([, , sim]) => sim));
  const varsOf = (id, sim) => (sim.knob ? { ...byId[id].vars, [sim.knob.name]: sim.knob.min } : byId[id].vars);

  // The by-hand toy picks its chart and its picture from ONE sample run, so every run must report the same fields.
  it.each(all)('%s phase %i reports the same kind of thing on every run', (id, i, sim) => {
    const rng = makeRng(11), first = sim.trial(varsOf(id, sim), rng);
    for (let n = 0; n < 200; n++) {
      const run = sim.trial(varsOf(id, sim), rng);
      expect(run.bin === undefined).toBe(first.bin === undefined);
      expect(run.group === undefined).toBe(first.group === undefined);
      expect(run.act?.play).toBe(first.act?.play);
      if (run.bin !== undefined) expect(Number.isFinite(run.bin)).toBe(true);
    }
  });

  it('pictures are drawn from the run itself, not made up', () => {
    const runs = (id, i, check) => { const rng = makeRng(21); for (let n = 0; n < 300; n++) check(simFor(byId[id], i).trial(byId[id].vars, rng)); };
    runs('c4-arrivals', 1, run => {
      expect(run.act.times.length).toBe(run.bin);              // one traveller drawn per arrival counted
      expect(run.act.times.every(t => t > 0 && t <= run.act.minutes)).toBe(true);
      expect(run.x).toBe(run.bin >= 4);
    });
    runs('c4-typos', 0, run => expect(run.act.slips.length).toBe(run.bin));
    runs('c3-ruin', 0, run => {
      const { path, top } = run.act;
      expect(path[0]).toBe(byId['c3-ruin'].vars.i);
      expect(path.slice(1).every((gold, n) => Math.abs(gold - path[n]) === 1)).toBe(true); // one gold per bet
      expect(path.slice(0, -1).every(gold => gold > 0 && gold < top)).toBe(true);          // it stops at an edge
      expect(run.x).toBe(path.at(-1) === top);
    });
    runs('c3-duel', 0, run => {
      expect(run.act.bouts).toMatch(/^-*[WLB]$/);               // misses, then the round somebody is hit
      expect(run.x).toBe(run.act.bouts.endsWith('L'));          // "only you are hit"
    });
    runs('c3-series', 0, run => expect(run.x).toBe(run.act.bouts.endsWith('W'))); // the last bout decides the title
    runs('c4-roulette-system', 1, run => {
      const { spins, net } = run.act;
      expect(net).toBe(spins.reduce((sum, red) => sum + (red ? 1 : -1), 0));
      expect(run.x).toBe(net);
    });
  });
});

it('1000 trials of every simulation take well under a second each', () => {
  for (const [id, sims] of Object.entries(SIMS)) {
    for (const sim of sims.filter(s => s && s.kind !== 'K')) {
      const start = performance.now();
      runTrials(sim, byId[id].vars, 1000, makeRng(3));
      expect(performance.now() - start, id).toBeLessThan(1000);
    }
  }
});
