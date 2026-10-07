// Grimoire of Blunders: the mistake log and its Markdown export.
import { compareSec, fmt } from './content.js';

/**
 * @typedef {Object} Mistake
 * @property {string} id       encounter id, or the book ref for a Book Bounty
 * @property {number} ch
 * @property {string} sec
 * @property {string} title
 * @property {string} ask      the phase question, placeholders already filled
 * @property {string} expr     exactly what was typed at the forge
 * @property {number} value    what it evaluated to
 * @property {number|string} answer
 * @property {string} pattern
 * @property {number} t        timestamp (ms)
 */

/** Group mistakes by encounter, ordered by chapter then section. */
export function groupMistakes(mistakes) {
  const groups = new Map();
  for (const m of mistakes) {
    if (!groups.has(m.id)) groups.set(m.id, { ch: m.ch, sec: m.sec, title: m.title, id: m.id, items: [] });
    groups.get(m.id).items.push(m);
  }
  return [...groups.values()].sort((a, b) => a.ch - b.ch || compareSec(a.sec, b.sec));
}

const num = v => (typeof v === 'number' ? fmt(v) : v);

/**
 * Markdown export. `revealed(id)` says whether the player has earned the
 * answer (solved it or opened the Scroll of Insight); otherwise it stays sealed.
 */
export function exportMarkdown(mistakes, revealed = () => true) {
  const lines = ['# Grimoire of Blunders', ''];
  for (const g of groupMistakes(mistakes)) {
    lines.push(`### Ch${g.ch} §${g.sec} — ${g.title}`);
    for (const m of g.items) {
      const correct = revealed(m.id) ? num(m.answer) : '(sealed until solved)';
      lines.push(`- Phase: ${m.ask} | I forged: ${m.expr} = ${num(m.value)} | Correct: ${correct} | Pattern: ${m.pattern}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
