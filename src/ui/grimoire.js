// The Grimoire screen: Blunders (mistake log) and the Pattern Card collection.
import { el, panel, download } from './dom.js';
import { state } from '../systems/save.js';
import { groupMistakes, exportMarkdown } from '../systems/grimoire.js';
import { content, encById, fmt } from '../systems/content.js';

const revealed = id => Boolean(state.revealed[id]);
const show = v => (typeof v === 'number' ? fmt(v) : v);

function blunders() {
  if (!state.mistakes.length) return el('p', { className: 'dim', textContent: 'No blunders yet. Every wrong forge will be written here so you can learn from it.' });
  return el('div', {}, groupMistakes(state.mistakes).map(group => el('div', {},
    el('h3', { textContent: `Ch${group.ch} §${group.sec} — ${group.title}` }),
    group.items.map(m => el('p', { className: 'blunder' },
      `${m.ask}`, el('br'),
      el('span', { className: 'dim', textContent: `I forged ${m.expr} = ${show(m.value)} · Correct: ${revealed(m.id) ? show(m.answer) : 'sealed until solved'}` }),
      revealed(m.id) && el('span', { textContent: ` · ${m.pattern}` }))))));
}

function cards() {
  if (!state.cards.length) return el('p', { className: 'dim', textContent: 'Solve an encounter to earn its Pattern Card. Cards become stars at the Star Shrine.' });
  return el('div', {}, content.regions.map(region => {
    const mine = state.cards.map(encById).filter(enc => enc.ch === region.ch);
    return mine.length && el('div', {},
      el('h3', { textContent: `${region.name} (${mine.length})` }),
      mine.map(enc => el('p', {}, enc.pattern, el('span', { className: 'dim', textContent: `  — ${enc.title}` }))));
  }));
}

export function openGrimoire() {
  const page = el('div', { id: 'grimoire-page' }, blunders());
  const body = el('div', {},
    el('div', { className: 'row' },
      el('button', { id: 'tab-blunders', textContent: `Blunders (${state.mistakes.length})`, onclick: () => page.replaceChildren(blunders()) }),
      el('button', { id: 'tab-cards', textContent: `Pattern Cards (${state.cards.length})`, onclick: () => page.replaceChildren(cards()) }),
      el('button', { id: 'export-md', textContent: 'Export Markdown', onclick: () => download('grimoire-of-blunders.md', exportMarkdown(state.mistakes, revealed), 'text/markdown') })),
    page);
  return panel('Grimoire', body).done;
}
