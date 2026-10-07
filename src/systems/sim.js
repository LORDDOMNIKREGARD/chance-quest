// Honest simulation.
//
// A "trial" plays an encounter's random process ONCE — really shuffling the
// deck, really rolling the dice — and reports what happened:
//
//   { x, show, group }
//     x      true/false for "did the event happen", a number for a quantity
//            whose average we want, or null for "this run does not count"
//            (that is how conditioning works: throw away the worlds where the
//            condition is false and look only at the rest).
//     show   little tokens the screen can draw: 'd5' a die, 'sR' a red stone,
//            'cKS' the king of spades, anything else is shown as text.
//     group  optional label (which coin? which chest?) for the detective board.
//
// Nothing in here knows the exact answer. Run a trial thousands of times and
// the average of x drifts towards it by itself — that is the Law of Large
// Numbers, the final boss of this game.
//
// The trials themselves live in ./sims/ch2.js, ch3.js, ch4.js.

/**
 * A small random number generator (mulberry32) with handy helpers.
 * Giving it a seed makes a run repeatable, which the tests rely on.
 */
export function makeRng(seed = Math.floor(Math.random() * 2 ** 32)) {
  let state = seed >>> 0;
  const u = () => { // uniform in [0, 1)
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(u() * (hi - lo + 1)); // whole number, both ends included

  return {
    u,
    int,
    die: () => int(1, 6),
    chance: p => u() < p,
    pick: items => items[int(0, items.length - 1)],

    /** k items drawn WITHOUT replacement, in random order (all of them, shuffled, if k is left out). */
    draw(items, k = items.length) {
      const pool = [...items];
      for (let i = 0; i < k; i++) {
        const j = int(i, pool.length - 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, k);
    },

    /** Pick a label from [[label, weight], …] with probability proportional to its weight. */
    weighted(pairs) {
      let left = u() * pairs.reduce((sum, [, weight]) => sum + weight, 0);
      for (const [label, weight] of pairs) {
        left -= weight;
        if (left < 0) return label;
      }
      return pairs.at(-1)[0];
    },

    /** How many of n independent tries succeed, each with probability p (a binomial, by actually trying). */
    count(n, p) {
      let hits = 0;
      for (let i = 0; i < n; i++) if (u() < p) hits++;
      return hits;
    },
  };
}

// ----- how a phase declares its experiment -----

/** A probability phase: the answer is a number in [0, 1]. Gets Predict → Run → Compare. */
export const P = trial => ({ kind: 'P', lo: 0, hi: 1, trial });
/** An expectation phase: the answer is an average somewhere in [lo, hi]. Also gets Predict → Run → Compare. */
export const E = (lo, hi, trial) => ({ kind: 'E', lo, hi, trial });
/** A "find the number" phase: the player turns a knob (say, group size n) and tries the experiment by hand. */
export const K = (name, min, max, trial) => ({ kind: 'K', knob: { name, min, max }, trial });
/** A by-hand experiment for a phase whose answer is neither a probability nor an average. */
export const T = trial => ({ kind: 'T', trial });

// ----- small helpers shared by the trials -----

export const DECK = Array.from({ length: 52 }, (_, i) => i);
export const rank = c => c % 13;             // 0 = ace, 1 = two, … 12 = king
export const suit = c => Math.floor(c / 13); // 0 spades, 1 hearts, 2 diamonds, 3 clubs
export const card = c => `c${'A23456789TJQK'[rank(c)]}${'SHDC'[suit(c)]}`;
export const dice = values => values.map(d => `d${d}`);
export const stones = letters => [...letters].map(c => `s${c}`);
export const upTo = n => Array.from({ length: n }, (_, i) => i); // [0, 1, …, n−1]
/** n copies of each letter, e.g. bag({R: 2, B: 1}) → ['R', 'R', 'B'] */
export const bag = counts => Object.entries(counts).flatMap(([letter, n]) => Array(n).fill(letter));
/** How often each value appears, biggest first: [5, 5, 2, 9, 9] → "2,2,1" */
export function shape(values) {
  const seen = {};
  for (const v of values) seen[v] = (seen[v] ?? 0) + 1;
  return Object.values(seen).sort((a, b) => b - a).join(',');
}

/**
 * Run trials until `wanted` of them count (or we have tried 100× that many).
 * `each(result, meanSoFar, kept)` is called after every trial that counts.
 * @returns {{mean: number, kept: number, total: number, sd: number}}
 */
export function runTrials(sim, vars, wanted = 2000, rng = makeRng(), each = null) {
  let kept = 0, total = 0, sum = 0, sumSquares = 0;
  while (kept < wanted && total < wanted * 100) {
    total++;
    const result = sim.trial(vars, rng);
    if (result.x === null) continue; // condition not met: this world does not count
    const value = Number(result.x);
    kept++;
    sum += value;
    sumSquares += value * value;
    each?.(result, sum / kept, kept);
  }
  const mean = sum / kept;
  return { mean, kept, total, sd: Math.sqrt(Math.max(0, sumSquares / kept - mean * mean)) };
}
