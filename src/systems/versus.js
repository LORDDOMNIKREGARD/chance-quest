// Versus: two players race through the same questions against the same clock.
// This file is the rule book — which questions, in which order, with which
// numbers, and who wins. It has no screen code, so the tests can check it.
import { makeRng } from './sim.js';
import { content, fill, reroll, answerOf } from './content.js';

/** How long a duel may last, in seconds. */
export const CLOCKS = [120, 180, 300];

/**
 * The endless list of questions of one duel. The same seed gives the same
 * questions with the same numbers on both players' screens. Numbers are
 * re-rolled as for an Echo, so a remembered answer does not help.
 * `chapters` must name at least one chapter that has encounters.
 */
export function* questions(seed, chapters, encounters = content.encounters) {
  const rng = makeRng(seed);
  // Only phases answered at the forge: a walk-to choice has no formula.
  const pool = encounters.filter(enc => chapters.includes(enc.ch) && enc.phases.some(phase => phase.f));
  for (;;) {
    for (const enc of rng.draw(pool)) { // every encounter once, in a shuffled order, then round again
      const vars = reroll(enc, rng.u);
      for (const phase of enc.phases.filter(p => p.f)) {
        yield { id: enc.id, story: fill(enc.story, vars), ask: fill(phase.ask, vars), vars, answer: answerOf(phase, vars), tol: phase.tol };
      }
    }
  }
}

/** A room code that is easy to read out: five letters, none that look alike. */
export const roomCode = (random = Math.random) =>
  Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(random() * 24)]).join('');

/**
 * The rules of a duel arrive from the other player's browser, so nothing in
 * them is trusted: whatever is missing or odd is replaced by a safe value.
 * @param built  how many chapters this copy of the game has
 */
export function cleanRules(raw, built) {
  const asked = Array.isArray(raw?.chapters) ? raw.chapters : [];
  const chapters = [...new Set(asked)].filter(ch => Number.isInteger(ch) && ch >= 1 && ch <= built);
  return {
    seed: Number(raw?.seed) >>> 0, // any value at all becomes a whole number from 0 to 2^32 - 1
    chapters: chapters.length ? chapters : [1],
    seconds: CLOCKS.includes(raw?.seconds) ? raw.seconds : CLOCKS[1],
  };
}

/** A score from the other side, made safe to show: whole numbers from 0 to 999. */
export function cleanScore(raw) {
  const count = value => Math.min(999, Math.max(0, Math.floor(Number(value)) || 0));
  return { hits: count(raw?.hits), misses: count(raw?.misses) };
}

/** Who won? More hits wins; with equal hits, fewer misses wins. Returns 'me', 'rival' or 'draw'. */
export function verdict(me, rival) {
  const lead = me.hits - rival.hits || rival.misses - me.misses;
  return lead > 0 ? 'me' : lead < 0 ? 'rival' : 'draw';
}
