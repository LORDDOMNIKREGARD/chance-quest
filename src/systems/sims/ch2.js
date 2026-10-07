// Chapter 2 (Venn Marshes): one trial per phase, in phase order.
// `null` = that phase is a count or a choice, so there is nothing to simulate.
// v = the encounter's variables, r = the random generator (see ../sim.js).
import { P, K, DECK, rank, suit, card, dice, stones, upTo, bag, shape } from '../sim.js';

// ----- Venn diagrams: which region does a random traveller fall in? -----
const venn2 = (v, r) => {
  const both = v.ab ?? 0; // "exclusive" omens never overlap
  return r.weighted([['both', both], ['A only', v.a - both], ['B only', v.b - both], ['neither', 1 - v.a - v.b + both]]);
};
const venn3 = (v, r) => r.weighted([
  ['all three', v.ABC], ['A+B', v.AB - v.ABC], ['A+C', v.AC - v.ABC], ['B+C', v.BC - v.ABC],
  ['A only', v.A - v.AB - v.AC + v.ABC], ['B only', v.B - v.AB - v.BC + v.ABC], ['C only', v.Cc - v.AC - v.BC + v.ABC],
  ['no guild', 100 - (v.A + v.B + v.Cc - v.AB - v.AC - v.BC + v.ABC)],
]);
/** A probability phase that asks "did the traveller land somewhere that passes `test`?" */
const region = (where, test) => P((v, r) => { const spot = where(v, r); return { x: test(spot), show: [spot] }; });

// ----- cards and dice -----
const hand = (r, n) => r.draw(DECK, n);
const pokerHand = pattern => P((v, r) => { const h = hand(r, 5); return { x: shape(h.map(rank)) === pattern, show: h.map(card) }; });
const fourDice = pattern => P((v, r) => { const d = [r.die(), r.die(), r.die(), r.die()]; return { x: shape(d) === pattern, show: dice(d) }; });
const twoDiceSum = r => r.die() + r.die();

// The trickster's three dice.
const TRICK = { A: [2, 2, 4, 4, 9, 9], B: [1, 1, 6, 6, 8, 8], C: [3, 3, 5, 5, 7, 7] };

export default {
  'c2-sample-space': [null, null],

  'c2-exclusive': [
    region(venn2, spot => spot !== 'neither'),
    region(venn2, spot => spot === 'A only'),
    region(venn2, spot => spot === 'neither'),
  ],
  'c2-two-cards': [
    region(venn2, spot => spot !== 'neither'),
    region(venn2, spot => spot === 'neither'),
    region(venn2, spot => spot.endsWith('only')),
  ],
  'c2-three-guilds': [null, null, region(venn3, spot => spot === 'no guild')],

  'c2-poker': [pokerHand('2,2,1'), pokerHand('3,1,1')],
  'c2-dice-hands': [fourDice('1,1,1,1'), fourDice('2,1,1')],
  'c2-royal-pair': [P((v, r) => {
    const h = hand(r, 2);
    return { x: h.map(rank).sort((a, b) => a - b).join() === '11,12', show: h.map(card) }; // queen = 11, king = 12
  })],
  'c2-dice-sums': [
    P((v, r) => { const d = [r.die(), r.die()]; return { x: d[0] + d[1] === v.s, show: dice(d) }; }),
    P((v, r) => { const d = [r.die(), r.die()]; return { x: d[1] > d[0], show: dice(d) }; }),
  ],
  'c2-race-sums': [P((v, r) => {
    const sums = [];
    do sums.push(twoDiceSum(r)); while (sums.at(-1) !== 6 && sums.at(-1) !== 7);
    return { x: sums.at(-1) === 6, show: sums.slice(-9).map(String) };
  })],
  'c2-craps': [P((v, r) => {
    const sums = [twoDiceSum(r)], point = sums[0];
    if (point === 7 || point === 11) return { x: true, show: [String(point)] };
    if (point === 2 || point === 3 || point === 12) return { x: false, show: [String(point)] };
    do sums.push(twoDiceSum(r)); while (sums.at(-1) !== point && sums.at(-1) !== 7);
    return { x: sums.at(-1) === point, show: [`point ${point}`, ...sums.slice(-7).map(String)] };
  })],

  'c2-alternating-draws': [P((v, r) => {
    const pouch = r.draw(bag({ R: v.r, P: v.b })); // the whole pouch in the order it will be drawn
    const firstRuby = pouch.indexOf('R');          // draw 0, 2, 4… are Asha's
    return { x: firstRuby % 2 === 0, show: stones(pouch.slice(0, firstRuby + 1)) };
  })],
  'c2-urn-colours': [
    P((v, r) => { const got = r.draw(bag({ R: v.R, B: v.B, G: v.G }), 3); return { x: shape(got) === '3', show: stones(got) }; }),
    P((v, r) => { const got = r.draw(bag({ R: v.R, B: v.B, G: v.G }), 3); return { x: shape(got) === '1,1,1', show: stones(got) }; }),
  ],
  'c2-tagged-deer': [P((v, r) => {
    const caught = r.draw(bag({ Y: v.T, P: v.N - v.T }), v.n); // Y = tagged
    return { x: caught.filter(deer => deer === 'Y').length === v.k, show: stones(caught) };
  })],
  'c2-exam-prep': [0, 1].map(spare => P((v, r) => {
    const exam = r.draw(upTo(v.P), v.S);                  // riddles 0 … K−1 are the ones you can solve
    const solved = exam.filter(riddle => riddle < v.K).length;
    return { x: solved >= v.S - spare, show: exam.map(riddle => (riddle < v.K ? 'ok' : '??')) };
  })),
  'c2-socks': [K('n', 6, 14, (v, r) => {
    const two = r.draw(bag({ R: 5, W: v.n - 5 }), 2);
    return { x: two.join('') === 'RR', show: stones(two) };
  })],
  'c2-inns': [P((v, r) => {
    const inns = upTo(v.t).map(() => r.int(1, v.h));
    return { x: new Set(inns).size === v.t, show: inns.map(inn => `inn ${inn}`) };
  })],
  'c2-at-least-one': [
    P((v, r) => { const rolls = upTo(v.n).map(() => r.die()); return { x: rolls.includes(6), show: dice(rolls) }; }),
    K('m', 20, 30, (v, r) => {
      const doubleSixes = upTo(v.m).filter(() => twoDiceSum(r) === 12).length;
      return { x: doubleSixes > 0, show: [`${v.m} rolls:`, `${doubleSixes} double six`] };
    }),
  ],
  'c2-one-between': [P((v, r) => {
    const line = r.draw(upTo(v.N)); // person 0 is Asha, person 1 is Bodhi
    return { x: Math.abs(line.indexOf(0) - line.indexOf(1)) === 2, show: line.map(p => (p === 0 ? 'A' : p === 1 ? 'B' : '.')) };
  })],
  'c2-keys': [
    P((v, r) => { // failed keys are put aside: a shuffled ring, tried in order
      const tries = r.draw(upTo(v.n)).indexOf(0) + 1;
      return { x: tries === v.k, show: [...Array(tries - 1).fill('x'), 'opens'] };
    }),
    P((v, r) => { // failed keys go back: every try is a fresh 1-in-n
      let tries = 1;
      while (r.int(1, v.n) !== 1) tries++;
      return { x: tries === v.k, show: [`opens on try ${tries}`] };
    }),
  ],
  'c2-birth-months': [K('n', 2, 8, (v, r) => {
    const months = upTo(v.n).map(() => r.int(1, 12));
    return { x: new Set(months).size < v.n, show: months.map(String) };
  })],
  'c2-order-value': [P((v, r) => {
    const drawn = r.draw(upTo(12).map(i => i + 1), 4).sort((a, b) => a - b);
    return { x: drawn[1] === 7, show: drawn.map(String) };
  })],
  'c2-equal-split': [P((v, r) => {
    const patrol = r.draw(bag({ M: v.m, W: v.m }), v.m); // the other patrol is whoever is left
    return { x: patrol.filter(p => p === 'M').length === v.m / 2, show: patrol };
  })],
  'c2-no-pair-boots': [P((v, r) => {
    const pairs = r.draw(upTo(2 * v.p), v.k).map(boot => Math.floor(boot / 2)); // boots 0,1 are pair 0; 2,3 pair 1…
    return { x: new Set(pairs).size === v.k, show: pairs.map(pair => `#${pair + 1}`) };
  })],
  'c2-hat-check': [P((v, r) => {
    const got = r.draw(upTo(v.n)); // got[i] = whose helmet knight i receives
    return { x: got.some((helmet, knight) => helmet === knight), show: got.map((helmet, knight) => `${helmet + 1}${helmet === knight ? '!' : ''}`) };
  })],
  'c2-void-suit': [P((v, r) => { const h = hand(r, 13); return { x: new Set(h.map(suit)).size < 4, show: h.map(card) }; })],
  'c2-all-suits': [P((v, r) => { const h = hand(r, 5); return { x: new Set(h.map(suit)).size === 4, show: h.map(card) }; })],
  'c2-first-ace': [
    P((v, r) => { const deck = r.draw(DECK); return { x: rank(deck[13]) === 0, show: ['card 14:', card(deck[13])] }; }),
    P((v, r) => { const first = r.draw(DECK).findIndex(c => rank(c) === 0) + 1; return { x: first === 14, show: [`first ace: card ${first}`] }; }),
  ],
  'c2-last-ball': [P((v, r) => {
    const order = r.draw(bag({ R: v.r, B: v.b }));
    let reds = 0, blues = 0, i = 0;
    while (reds < v.r && blues < v.b) (order[i++] === 'R' ? reds++ : blues++); // pull until one colour runs out
    return { x: reds === v.r, show: ['...', ...stones(order.slice(Math.max(0, i - 6), i))] };
  })],
  'c2-intransitive': [
    P((v, r) => { const a = r.pick(TRICK.A), b = r.pick(TRICK.B); return { x: b > a, show: [`A rolls ${a}`, `B rolls ${b}`] }; }),
    null, // the choice of die is made by walking to it
  ],
};
