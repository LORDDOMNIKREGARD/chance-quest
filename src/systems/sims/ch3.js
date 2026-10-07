// Chapter 3 (Bayesport): conditional probability.
// The trick every conditional trial uses: play the whole story, and if the
// condition did not happen return x: null — that run is thrown away. What is
// left is exactly "the world, given the condition".
import { P, T, DECK, rank, card, dice, stones, upTo, bag } from '../sim.js';

const twoDice = r => [r.die(), r.die()];
const eggs = r => r.pick('FM') + r.pick('FM'); // older egg first

// One morning for the guard: weather first, then late or not.
const morning = (v, r) => { const rain = r.chance(v.r); return { rain, late: r.chance(rain ? v.a : v.c) }; };
// One villager at the healer's: sick or not, then flagged by the test or not.
const patient = (v, r) => { const sick = r.chance(v.p); return { sick, flagged: r.chance(sick ? v.s : v.fp) }; };
// The magic pouch: every bead drawn goes back with c more of its colour.
function pouch(v, r, draws) {
  let white = v.w, black = v.b;
  return upTo(draws).map(() => {
    const isWhite = r.chance(white / (white + black));
    if (isWhite) white += v.c; else black += v.c;
    return isWhite ? 'W' : 'K';
  });
}
// The jailer names one of B, C who stays free (at random if both do).
const jail = r => { const exiled = r.pick('ABC'); return { exiled, says: exiled === 'A' ? r.pick('BC') : exiled === 'B' ? 'C' : 'B' }; };
// A first-to-four series.
function series(v, r) {
  const bouts = [];
  while (bouts.filter(b => b === 'W').length < 4 && bouts.filter(b => b === 'L').length < 4) bouts.push(r.chance(v.p) ? 'W' : 'L');
  return bouts;
}
// Both fire each round until somebody is hit.
function duel(v, r) {
  let rounds = 0, youHit, heHits;
  do { rounds++; youHit = r.chance(v.a); heHits = r.chance(v.b); } while (!youHit && !heHits);
  return { rounds, youHit, heHits, show: [`round ${rounds}:`, youHit && heHits ? 'both hit' : youHit ? 'you hit him' : 'he hits you'] };
}
const herb = (v, r) => { const watered = r.chance(v.w); return { watered, dead: r.chance(watered ? v.d2 : v.d1) }; };
const coinPick = (v, r) => { const p = r.pick([v.p1, v.p2]); return { p, twoHeads: r.chance(p) && r.chance(p) }; };

export default {
  'c3-dice-given': [
    P((v, r) => { const d = twoDice(r); return { x: d[0] === d[1] ? null : d.includes(6), show: dice(d) }; }),
    P((v, r) => { const d = twoDice(r); return { x: d[0] + d[1] !== 9 ? null : d[0] === 6, show: dice(d) }; }),
  ],
  'c3-chain-draws': [P((v, r) => {
    const got = r.draw(bag({ W: v.w, K: v.b }), 4);
    return { x: got.join('') === 'WWKK', show: stones(got) };
  })],
  'c3-dragon-eggs': [
    P((v, r) => { const e = eggs(r); return { x: e[0] !== 'F' ? null : e === 'FF', show: [e], group: e }; }),
    P((v, r) => { const e = eggs(r); return { x: !e.includes('F') ? null : e === 'FF', show: [e], group: e }; }),
  ],
  'c3-polya': [
    P((v, r) => { const seen = pouch(v, r, 3); return { x: seen.join('') === 'WWW', show: stones(seen) }; }),
    P((v, r) => { const seen = pouch(v, r, 2); return { x: seen[1] === 'W', show: stones(seen) }; }),
  ],
  'c3-late-for-guard': [
    P((v, r) => { const day = morning(v, r); return { x: day.late, show: [day.rain ? 'rain' : 'dry', day.late ? 'late' : 'on time'] }; }),
    P((v, r) => { const day = morning(v, r); return { x: day.late ? day.rain : null, show: [day.rain ? 'rain' : 'dry', day.late ? 'late' : 'on time'], group: day.rain ? 'rain' : 'dry' }; }),
  ],
  'c3-clinic': [true, false].map(wantFlagged => P((v, r) => {
    const one = patient(v, r);
    return { x: one.flagged === wantFlagged ? one.sick : null, show: [one.sick ? 'sick' : 'healthy', one.flagged ? 'test +' : 'test -'], group: one.sick ? 'sick' : 'healthy' };
  })),
  'c3-three-coins': [P((v, r) => {
    const coin = r.pick(['two-headed', 'fair', 'biased']);
    const heads = r.chance({ 'two-headed': 1, fair: 0.5, biased: v.q }[coin]);
    return { x: heads ? coin === 'two-headed' : null, show: [coin, heads ? 'heads' : 'tails'], group: coin };
  })],
  'c3-chests': [P((v, r) => {
    const chest = r.pick('AB'), drawers = chest === 'A' ? 'GG' : 'GS', opened = r.int(0, 1);
    const gold = drawers[opened] === 'G';
    return { x: gold ? drawers[1 - opened] === 'G' : null, show: [`chest ${chest}`, gold ? 'gold' : 'silver'], group: `chest ${chest}` };
  })],
  'c3-transfer': [true, false].map(askDrawn => P((v, r) => {
    const moved = r.pick('WWWRR');          // urn I: 3 white, 2 red
    const drawn = r.pick(`WWRRR${moved}`);  // urn II: 2 white, 3 red, plus the one that moved
    const x = askDrawn ? drawn === 'W' : drawn === 'W' ? moved === 'W' : null;
    return { x, show: ['moved', ...stones(moved), 'drew', ...stones(drawn)], group: `moved ${moved === 'W' ? 'white' : 'red'}` };
  })),
  'c3-colorblind': [P((v, r) => {
    const man = r.chance(0.5), blind = r.chance(man ? v.m : v.w);
    return { x: blind ? man : null, show: [man ? 'man' : 'woman', blind ? 'colour-blind' : 'not'], group: man ? 'man' : 'woman' };
  })],
  'c3-three-prisoners': ['A', 'C'].map(who => P((v, r) => {
    const { exiled, says } = jail(r);
    return { x: says === 'B' ? exiled === who : null, show: [`exiled: ${exiled}`, `jailer: ${says}`], group: `${exiled} exiled` };
  })),
  'c3-independence': [null],
  'c3-circuit': [P((v, r) => {
    const on = [v.p1, v.p2, v.p3].map(p => r.chance(p));
    return { x: on[0] && (on[1] || on[2]), show: on.map((works, i) => `gate ${i + 1} ${works ? 'on' : 'off'}`) };
  })],
  'c3-k-of-n': [P((v, r) => { const working = r.count(v.n, v.p); return { x: working >= v.k, show: [`${working} of ${v.n} wards hold`] }; })],
  'c3-series': [
    P((v, r) => { const bouts = series(v, r); return { x: bouts.filter(b => b === 'W').length === 4, show: bouts }; }),
    P((v, r) => { const bouts = series(v, r); return { x: bouts.length === 7, show: bouts }; }),
  ],
  'c3-duel': [
    P((v, r) => { const d = duel(v, r); return { x: d.heHits && !d.youHit, show: d.show }; }),
    P((v, r) => { const d = duel(v, r); return { x: d.rounds === 3, show: d.show }; }),
  ],
  'c3-alternate-dice': [P((v, r) => {
    for (let turn = 1; ; turn++) { // you roll, then the ferryman, until someone gets their sum
      if (r.die() + r.die() === 8) return { x: true, show: [`your 8 on turn ${turn}`] };
      if (r.die() + r.die() === 7) return { x: false, show: [`his 7 on turn ${turn}`] };
    }
  })],
  'c3-ruin': [P((v, r) => {
    let gold = v.i, bets = 0;
    while (gold > 0 && gold < v.N) { gold += r.chance(v.p) ? 1 : -1; bets++; }
    return { x: gold === v.N, show: [`${bets} bets:`, gold ? `reached ${v.N}` : 'broke'] };
  })],
  'c3-carrier': [P((v, r) => {
    const cursed = r.chance(0.5);
    const princesClean = !cursed || upTo(v.k).every(() => !r.chance(0.5));
    return { x: princesClean ? cursed : null, show: [cursed ? 'queen cursed' : 'queen clear', princesClean ? 'princes clean' : 'a prince has it'], group: cursed ? 'cursed' : 'clear' };
  })],
  'c3-plant': [
    P((v, r) => { const h = herb(v, r); return { x: !h.dead, show: [h.watered ? 'watered' : 'forgot', h.dead ? 'dead' : 'alive'] }; }),
    P((v, r) => { const h = herb(v, r); return { x: h.dead ? !h.watered : null, show: [h.watered ? 'watered' : 'forgot', h.dead ? 'dead' : 'alive'], group: h.watered ? 'watered' : 'forgot' }; }),
  ],
  'c3-each-hand-ace': [P((v, r) => {
    const deck = r.draw(DECK); // shuffle, then cut into four hands of 13
    const aces = upTo(4).map(h => deck.slice(h * 13, h * 13 + 13).filter(c => rank(c) === 0).length);
    return { x: aces.every(n => n === 1), show: aces.map((n, h) => `${'NESW'[h]}: ${n}`) };
  })],
  'c3-mixed-coin': [
    P((v, r) => { const c = coinPick(v, r); return { x: c.twoHeads ? c.p === v.p2 : null, show: [`coin ${c.p}`, c.twoHeads ? 'H H' : 'not H H'], group: `coin ${c.p}` }; }),
    P((v, r) => { const c = coinPick(v, r); return { x: c.twoHeads ? r.chance(c.p) : null, show: [`coin ${c.p}`, c.twoHeads ? 'H H then...' : 'not H H'], group: `coin ${c.p}` }; }),
  ],
  'c3-odds': [T((v, r) => { const wins = r.chance(3 / 8); return { x: wins, show: [wins ? 'rider wins' : 'rider loses'] }; })],
  'c3-friend-cards': [
    P((v, r) => { const h = r.draw(DECK, 2), aces = h.filter(c => rank(c) === 0).length; return { x: aces ? aces === 2 : null, show: h.map(card) }; }),
    P((v, r) => { const h = r.draw(DECK, 2), aces = h.filter(c => rank(c) === 0).length; return { x: h.includes(0) ? aces === 2 : null, show: h.map(card) }; }), // card 0 is the ace of spades
  ],
};
