// The rule book of Versus: both players must be asked the same things, every
// question must have an answer, and nothing the other browser sends is trusted.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { questions, cleanRules, cleanScore, verdict, roomCode } from '../../src/systems/versus.js';

const { encounters } = JSON.parse(readFileSync('public/content.json', 'utf8'));
/** The first `n` questions of the duel with this seed. */
function first(n, seed, chapters) {
  const asked = [];
  for (const question of questions(seed, chapters, encounters)) {
    asked.push(question);
    if (asked.length === n) return asked;
  }
}

describe('the questions of a duel', () => {
  it('are the same for both players, numbers included', () => {
    expect(first(80, 42, [1, 2, 3, 4])).toEqual(first(80, 42, [1, 2, 3, 4]));
  });
  it('change with the seed', () => {
    const order = seed => first(30, seed, [1, 2, 3, 4]).map(q => q.id).join();
    expect(order(1)).not.toBe(order(2));
  });
  it('always have a number for an answer and come from the chosen chapters only', () => {
    for (let seed = 1; seed <= 12; seed++) {
      for (const q of first(400, seed, [2, 4])) { // 400 is more than one round of the pool: it reshuffles and carries on
        expect(Number.isFinite(q.answer), `${q.id}: ${q.ask}`).toBe(true);
        expect(q.id).toMatch(/^c[24]-/);
        expect(q.tol, q.id).toBeDefined();
        expect(q.story + q.ask, q.id).not.toMatch(/\{\w+\}/); // every {number} was filled in
      }
    }
  });
});

describe('what the other browser sends is never trusted', () => {
  it('rules are repaired', () => {
    expect(cleanRules(null, 4)).toEqual({ seed: 0, chapters: [1], seconds: 180 });
    expect(cleanRules({ seed: 'x', chapters: [9, -1, 2.5, 'a', 3, 3], seconds: 1 }, 4)).toEqual({ seed: 0, chapters: [3], seconds: 180 });
    expect(cleanRules({ seed: 123, chapters: [1, 2], seconds: 300 }, 4)).toEqual({ seed: 123, chapters: [1, 2], seconds: 300 });
    expect(cleanRules({ seed: -1.5, chapters: 'all' }, 4).seed).toBeGreaterThanOrEqual(0);
  });
  it('scores are whole numbers from 0 to 999', () => {
    expect(cleanScore({ hits: '7', misses: -3 })).toEqual({ hits: 7, misses: 0 });
    expect(cleanScore({ hits: 1e9, misses: NaN })).toEqual({ hits: 999, misses: 0 });
    expect(cleanScore('<b>')).toEqual({ hits: 0, misses: 0 });
  });
});

it('more hits wins; with equal hits, fewer misses wins', () => {
  expect(verdict({ hits: 3, misses: 9 }, { hits: 2, misses: 0 })).toBe('me');
  expect(verdict({ hits: 2, misses: 1 }, { hits: 2, misses: 0 })).toBe('rival');
  expect(verdict({ hits: 2, misses: 1 }, { hits: 2, misses: 1 })).toBe('draw');
});

it('room codes are five letters that cannot be misread', () => {
  for (let i = 0; i < 200; i++) expect(roomCode()).toMatch(/^[A-HJ-NP-Z]{5}$/);
});
