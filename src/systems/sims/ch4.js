// Chapter 4 (Fortune Bazaar): random variables. Many trials return a number
// instead of true/false; its long-run average is the expectation E[X].
import { P, E, T, dice, stones, upTo, bag } from '../sim.js';

const pearls = (v, r) => {
  const two = r.draw(bag({ W: v.w, K: v.b, Y: v.o }), 2); // white, black, gold
  return { two, won: two.reduce((sum, pearl) => sum + (pearl === 'K' ? 3 : pearl === 'W' ? -1 : 0), 0) };
};
const higherBone = r => { const d = [r.die(), r.die()]; return { d, max: Math.max(...d) }; };
// The "sure-win" roulette system: one bet on red; if it loses, two more.
function redSystem(r) {
  const spins = [r.chance(18 / 38)];
  if (!spins[0]) spins.push(r.chance(18 / 38), r.chance(18 / 38));
  const net = spins[0] ? 1 : -1 + (spins[1] ? 1 : -1) + (spins[2] ? 1 : -1);
  return { net, show: [...spins.map(red => (red ? 'red' : 'lose')), `net ${net}`] };
}
const staircase = r => r.weighted([[0, 0.2], [1, 0.3], [2, 0.4], [3, 0.1]]); // the jumps of the CDF
// Travellers arrive one by one; the gaps between them are exponential with mean r minutes.
function arrivals(v, r, minutes) {
  let clock = 0, seen = 0;
  for (;;) {
    clock += -Math.log(1 - r.u()) * v.r;
    if (clock > minutes) return seen;
    seen++;
  }
}
function rollsUntilSix(r) {
  const rolls = [];
  do rolls.push(r.die()); while (rolls.at(-1) !== 6);
  return rolls;
}
function joustsUntil(v, r) {
  let wins = 0, jousts = 0;
  while (wins < v.r) { jousts++; if (r.chance(v.p)) wins++; }
  return jousts;
}
// A page is ~500 letters, each one a tiny chance of a slip: rare events, many opportunities.
const pageErrors = (v, r) => r.count(500, v.l / 500);
const spicePrice = r => r.pick([1, 4]);

export default {
  'c4-urn-winnings': [
    P((v, r) => { const t = pearls(v, r); return { x: t.won === 2, show: [...stones(t.two), `wins ${t.won}`] }; }),
    E(-2, 6, (v, r) => { const t = pearls(v, r); return { x: t.won, show: [...stones(t.two), `wins ${t.won}`] }; }),
  ],
  'c4-max-roll': [
    P((v, r) => { const t = higherBone(r); return { x: t.max === v.m, show: dice(t.d) }; }),
    E(1, 6, (v, r) => { const t = higherBone(r); return { x: t.max, show: dice(t.d) }; }),
  ],
  'c4-insurance': [T((v, r) => { const raided = r.chance(v.p); return { x: raided ? v.A : 0, show: [raided ? `raided: pay ${v.A}` : 'safe year: pay 0'] }; })],
  'c4-defect-sample': [E(0, 5, (v, r) => {
    const grabbed = r.draw(bag({ x: v.D, o: v.N - v.D }), v.n); // x = warped
    return { x: grabbed.filter(arrow => arrow === 'x').length, show: grabbed };
  })],
  'c4-moments': [null, null],
  'c4-pooled-testing': [E(12, 132, (v, r) => {
    const groups = upTo(v.N / v.g).map(() => r.count(v.g, v.p) > 0); // true = somebody in the group has the fever
    const tests = groups.reduce((sum, positive) => sum + (positive ? 1 + v.g : 1), 0);
    return { x: tests, show: [...groups.map(positive => (positive ? '+' : '-')), `${tests} tests`] };
  })],
  'c4-guessing': [P((v, r) => { const right = r.count(v.n, 1 / v.c); return { x: right >= v.k, show: [`${right} of ${v.n} right`] }; })],
  'c4-seer': [P((v, r) => { const right = r.count(v.n, 0.5); return { x: right >= v.k, show: [`${right} of ${v.n} right`] }; })],
  'c4-mean-var-binom': [null, P((v, r) => { const x = r.count(20, 0.4); return { x: x === 8, show: [`X = ${x}`] }; })],
  'c4-jury': [P((v, r) => { const right = r.count(v.n, v.p); return { x: right >= (v.n + 1) / 2, show: [`${right} of ${v.n} judges right`] }; })],
  'c4-typos': [
    P((v, r) => { const errors = pageErrors(v, r); return { x: errors === 0, show: [`${errors} errors`] }; }),
    P((v, r) => { const errors = pageErrors(v, r); return { x: errors >= 2, show: [`${errors} errors`] }; }),
  ],
  // Both phases watch the true process (n tickets, each a win with probability p);
  // the Poisson formula is the approximation being tested against it.
  'c4-poisson-approx': [0, 1].map(() => P((v, r) => { const winners = r.count(v.n, v.p); return { x: winners === v.k, show: [`${winners} winners`] }; })),
  'c4-arrivals': [
    P((v, r) => { const n = arrivals(v, r, 6); return { x: n === 0, show: [`${n} in 6 min`] }; }),
    P((v, r) => { const n = arrivals(v, r, 9); return { x: n >= 4, show: [`${n} in 9 min`] }; }),
  ],
  'c4-first-six': [
    P((v, r) => { const rolls = rollsUntilSix(r); return { x: rolls.length === v.k, show: dice(rolls.slice(-10)) }; }),
    E(1, 20, (v, r) => { const rolls = rollsUntilSix(r); return { x: rolls.length, show: [`${rolls.length} rolls`] }; }),
    P((v, r) => { const rolls = rollsUntilSix(r); return { x: rolls.length > v.k, show: dice(rolls.slice(-10)) }; }),
  ],
  'c4-third-win': [
    P((v, r) => { const n = joustsUntil(v, r); return { x: n === v.n, show: [`${n} jousts`] }; }),
    E(3, 20, (v, r) => { const n = joustsUntil(v, r); return { x: n, show: [`${n} jousts`] }; }),
  ],
  'c4-lot-inspection': [P((v, r) => {
    const tested = r.draw(bag({ x: v.D, o: v.N - v.D }), v.n); // x = broken lantern
    return { x: !tested.includes('x'), show: tested };
  })],
  'c4-roulette-system': [
    P((v, r) => { const t = redSystem(r); return { x: t.net > 0, show: t.show }; }),
    E(-3, 1, (v, r) => { const t = redSystem(r); return { x: t.net, show: t.show }; }),
  ],
  'c4-cdf': [
    P((v, r) => { const x = staircase(r); return { x: x === 2, show: [`X = ${x}`] }; }),
    P((v, r) => { const x = staircase(r); return { x: x > 1 && x <= 3, show: [`X = ${x}`] }; }),
    E(0, 3, (v, r) => { const x = staircase(r); return { x, show: [`X = ${x}`] }; }),
  ],
  'c4-short-series': [E(2, 3, (v, r) => {
    const bouts = [];
    while (bouts.filter(b => b === 'W').length < 2 && bouts.filter(b => b === 'L').length < 2) bouts.push(r.chance(v.p) ? 'W' : 'L');
    return { x: bouts.length, show: bouts };
  })],
  'c4-odd-one-pays': [E(1, 5, (v, r) => {
    let rounds = 0, flips;
    do { rounds++; flips = upTo(3).map(() => r.pick('HT')); } while (new Set(flips).size === 1); // all three match: flip again
    return { x: rounds, show: [...flips, `round ${rounds}`] };
  })],
  'c4-commodity': [
    E(500, 2000, (v, r) => { const price = spicePrice(r); return { x: 500 * price, show: [`price ${price}:`, `worth ${500 * price}`] }; }),
    E(250, 1000, (v, r) => { const price = spicePrice(r); return { x: 1000 / price, show: [`price ${price}:`, `${1000 / price} oz`] }; }),
    null, // which plan to follow is chosen by walking to it
  ],
};
