import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { evaluate, ForgeError } from '../../src/systems/evaluator.js';
import { reroll } from '../../src/systems/content.js';
import { exportMarkdown } from '../../src/systems/grimoire.js';
import { newCard, review, isDue, DAY } from '../../src/systems/srs.js';

const content = JSON.parse(readFileSync('public/content.json', 'utf8'));

describe('evaluator', () => {
  const vectors = [
    ['10!/(3!3!2!)', 50400], ['C(12,4)', 495], ['P(10,3)', 720], ['2^10', 1024],
    ['1 - 0.7^10', 0.9717524751], ['e^-3', 0.0497870684], ['2C(5,2)', 20],
    ['M(10,4,3,2,1)', 12600], ['sum(k,0,3,C(3,k))', 8], ['-2^2', -4], ['2^3^2', 512],
    ['Phi(1.96)', 0.9750021],
  ];
  it.each(vectors)('%s', (expr, value) => expect(evaluate(expr)).toBeCloseTo(value, 7));
  it.each(['3!!x(', 'C(3', '4 +', '(2', '', '2 $ 3', 'constructor', '1/0'])('rejects %j', expr =>
    expect(() => evaluate(expr)).toThrow(ForgeError));
  it('C and P are 0 when k > n', () => expect(evaluate('C(3,5)+P(3,5)')).toBe(0));
  it('forge runes work too', () => expect(evaluate('2×3−√(4)÷2')).toBe(5));
});

describe('content', () => {
  it('has 146 encounters and 704 bounties', () => {
    expect(content.encounters).toHaveLength(146);
    expect(content.bounties).toHaveLength(704);
  });

  const numeric = content.encounters.flatMap(e => e.phases.filter(p => p.f).map((p, i) => [e.id, i, e, p]));
  it.each(numeric)('%s phase %i: f evaluates to the stored answer', (_id, _i, enc, phase) => {
    const got = evaluate(phase.f, enc.vars);
    expect(Math.abs(got - phase.answer)).toBeLessThanOrEqual(1e-6 * Math.abs(phase.answer));
  });

  const varied = content.encounters.filter(e => Object.keys(e.vary).length);
  it.each(varied.map(e => [e.id, e]))('%s: 50 re-rolls stay sane', (_id, enc) => {
    for (let n = 0; n < 50; n++) {
      const vars = reroll(enc);
      for (const phase of enc.phases.filter(p => p.f)) {
        const v = evaluate(phase.f, vars);
        expect(Number.isFinite(v)).toBe(true);
        if (phase.ask.startsWith('P(')) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      }
    }
  });
});

describe('grimoire markdown', () => {
  const m = { id: 'c1-gate-seal', ch: 1, sec: '1.2', title: 'The Gate Seal', ask: 'How many seals?', expr: '26*10', value: 260, answer: 676000, pattern: 'stages → multiply', t: 0 };
  it('uses the exact export format', () => {
    const md = exportMarkdown([m]);
    expect(md).toContain('### Ch1 §1.2 — The Gate Seal\n- Phase: How many seals? | I forged: 26*10 = 260 | Correct: 676000 | Pattern: stages → multiply');
  });
  it('keeps unrevealed answers sealed', () => expect(exportMarkdown([m], () => false)).not.toContain('676000'));
  it('orders by chapter then section', () => {
    const md = exportMarkdown([{ ...m, id: 'b', ch: 4, sec: '4.10', title: 'B' }, { ...m, id: 'a', ch: 4, sec: '4.8.1', title: 'A' }, m]);
    expect(md.indexOf('Gate Seal')).toBeLessThan(md.indexOf('— A'));
    expect(md.indexOf('— A')).toBeLessThan(md.indexOf('— B'));
  });
});

describe('leitner schedule', () => {
  it('comes back after 1, 3, 7, 21 days and then rests', () => {
    let card = newCard(0);
    const waits = [];
    while (card) { waits.push(card.due / DAY); card = review(card, true, 0); }
    expect(waits).toEqual([1, 3, 7, 21]);
  });
  it('a miss resets to box 1', () => expect(review({ box: 3, due: 0 }, false, 5 * DAY)).toEqual({ box: 1, due: 6 * DAY }));
  it('isDue', () => { expect(isDue(newCard(0), DAY - 1)).toBe(false); expect(isDue(newCard(0), DAY)).toBe(true); });
});
