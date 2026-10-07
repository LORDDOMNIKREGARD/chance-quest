// The tavern's Bounty Board: one poster per end-of-chapter Problem and
// Self-Test problem in the book. Only the reference is shown — never the
// book's text. The player solves on paper and self-marks against the key.
import { el, panel } from './dom.js';
import { state } from '../systems/save.js';
import { commit, echoesDue } from './hud.js';
import { content, encById, fmt } from '../systems/content.js';
import { evaluate } from '../systems/evaluator.js';
import { newCard, review } from '../systems/srs.js';
import { sfx } from '../audio/sfx.js';

const num = ref => ref.replace(/^[A-Z]+/, '');               // "ST1.12" → "1.12"
const bookName = b => `Ross ${b.kind} ${num(b.ref)}`;
const trained = b => b.linkedEncounters.some(id => state.solved[id]);

export function openBounty(ch) {
  const list = content.bounties.filter(b => b.ch === ch);
  const header = el('p');
  const grid = el('div', { className: 'posters' });
  const detail = el('div', { id: 'bounty-detail' }, el('p', { className: 'dim', textContent: 'Pick a poster. Blue = trained in-game, green = solved in the book, pink = missed (it will return as a Book Echo).' }));

  function redraw() {
    const due = echoesDue('book:');
    const ok = list.filter(b => state.bounties[b.ref]?.r === 'ok').length;
    const tr = list.filter(trained).length;
    header.textContent = `Book bounties ${ok}/${list.length} (${Math.round(100 * ok / list.length)}%) · trained ${tr} · reputation ${2 * ok + tr}`;
    grid.replaceChildren(...list.map(b => {
      const mark = state.bounties[b.ref]?.r ?? (trained(b) ? 'trained' : '');
      return el('button', { className: `poster ${mark} ${due.includes(`book:${b.ref}`) ? 'due' : ''}`, textContent: b.ref, onclick: () => open(b) });
    }));
  }

  function open(b) {
    const field = el('input', { id: 'bounty-input', placeholder: 'your final answer', autocomplete: 'off' });
    const value = el('span', { className: 'dim' });
    let forged = null;
    field.oninput = () => {
      try { forged = { expr: field.value, value: evaluate(field.value) }; value.textContent = `= ${fmt(forged.value)}`; }
      catch { forged = null; value.textContent = field.value ? '(not a number yet)' : ''; }
    };
    const mark = ok => {
      const first = !state.bounties[b.ref];
      state.bounties[b.ref] = { r: ok ? 'ok' : 'miss', t: Date.now() };
      state.revealed[b.ref] = true; // nothing to seal: the answer lives in the book
      // Leitner: a miss (re)starts the Book Echo; a hit on an existing Echo promotes it.
      const key = `book:${b.ref}`, card = state.echoes[key];
      const next = card ? review(card, ok, Date.now()) : ok ? null : newCard(Date.now());
      if (next) state.echoes[key] = next; else delete state.echoes[key];
      if (ok && first) state.gold += 5;
      if (!ok) state.mistakes.push({
        id: b.ref, ch, sec: 'Book', title: bookName(b), ask: 'Book bounty (solved on paper)',
        expr: forged?.expr ?? '(no answer forged)', value: forged?.value ?? '—', answer: 'see the book key', pattern: '—', t: Date.now(),
      });
      sfx(ok ? 'ok' : 'bad');
      commit(); redraw();
      detail.replaceChildren(el('p', { textContent: ok ? `${bookName(b)} claimed.${first ? ' +5 gold.' : ''}` : `${bookName(b)} goes into the Grimoire and will return as a Book Echo.` }));
    };
    const mirrors = b.linkedEncounters.map(encById).map(e => `${e.title}${state.solved[e.id] ? ' (cleared)' : ''}`).join(', ');
    detail.replaceChildren(
      el('h3', { textContent: `WANTED: ${bookName(b)}` }),
      el('p', { textContent: `Open your Ross book to ${b.kind} ${num(b.ref)}. Solve it on paper, forge your final answer, then check it against the book's answer key.` }),
      mirrors && el('p', { className: 'dim', textContent: `Mirrored in-game by: ${mirrors}` }),
      el('div', { className: 'row' }, field, value),
      el('div', { className: 'row' },
        el('button', { id: 'bounty-ok', textContent: 'It matched the key', onclick: () => mark(true) }),
        el('button', { id: 'bounty-miss', textContent: 'I missed it', onclick: () => mark(false) })));
    detail.scrollIntoView({ block: 'nearest' });
  }

  redraw();
  // The chosen poster's details sit above the grid, so they never need scrolling to.
  return panel(`Bounty Board — ${content.regions[ch - 1].name}`, el('div', {}, header, detail, grid)).done;
}
