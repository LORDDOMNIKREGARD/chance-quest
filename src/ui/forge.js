// The Chance Forge: build an expression from rune tiles (or type it) and
// watch its value glow in the crystal. Nothing here knows the right answer —
// the forge only reports what the player made.
import { el, mount, ui } from './dom.js';
import { input } from '../systems/input.js';
import { evaluate, ForgeError } from '../systems/evaluator.js';
import { fmt } from '../systems/content.js';
import { sfx } from '../audio/sfx.js';

// [label on the tile, text it inserts]
const TILES = [
  ['7', '7'], ['8', '8'], ['9', '9'], ['+', '+'], ['-', '-'], ['C(', 'C('], ['P(', 'P('], ['⌫', 'DEL'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'], ['÷', '/'], ['M(', 'M('], ['Σ(', 'sum('], ['CLR', 'CLR'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['^', '^'], ['!', '!'], ['√(', 'sqrt('], ['ln(', 'ln('], ['Φ(', 'Phi('],
  ['0', '0'], ['.', '.'], ['(', '('], [')', ')'], [',', ','], ['e', 'e'],
];

/** Typed ASCII shown as runes: 2*sqrt(9) → 2×√(9) */
export const runes = text => text
  .replace(/\*/g, '×').replace(/\//g, '÷')
  .replace(/sqrt/g, '√').replace(/sum/g, 'Σ').replace(/Phi/g, 'Φ');

/** Close an open forge from outside, as if the player had stepped away (the versus clock ran out). */
export const closeForge = () => document.getElementById('forge-input')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

/**
 * Open the forge. Resolves to { expr, value } when the player strikes a
 * valid expression, or null if they step away (Esc).
 */
export function openForge(ask, vars = {}, story = '') {
  return new Promise(resolve => {
    const runeView = el('span', { className: 'runes' });
    const valueView = el('span', { className: 'value' });
    const crystal = el('div', { className: 'crystal' }, runeView, valueView);
    const field = el('input', { id: 'forge-input', autocomplete: 'off', spellcheck: false, placeholder: 'type here, or tap runes — Σ is sum(k, from, to, expr)' });
    if (matchMedia('(pointer: coarse)').matches) field.inputMode = 'none'; // phones: use the tiles, keep the keyboard away
    let result = null; // { expr, value } while the current text is valid

    function preview() {
      const expr = field.value.trim();
      runeView.textContent = runes(expr);
      crystal.classList.remove('crack');
      result = null;
      if (!expr) { valueView.textContent = ''; return; }
      try {
        result = { expr, value: evaluate(expr, vars) };
        valueView.textContent = `= ${fmt(result.value)}`;
      } catch (err) {
        if (!(err instanceof ForgeError)) throw err;
        crystal.classList.add('crack');
        valueView.textContent = `The metal cracks: ${err.message}`;
      }
    }

    function insert(text) {
      const at = field.selectionStart ?? field.value.length;
      if (text === 'CLR') field.value = '';
      else if (text === 'DEL') { field.value = field.value.slice(0, Math.max(0, at - 1)) + field.value.slice(at); field.setSelectionRange(at - 1, at - 1); }
      else { field.value = field.value.slice(0, at) + text + field.value.slice(at); field.setSelectionRange(at + text.length, at + text.length); }
      sfx('tick');
      field.focus();
      preview();
    }

    const close = value => { pop(); ui.busy--; box.remove(); resolve(value); };
    function strike() {
      if (result) { sfx('forge'); close(result); return; }
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); // restart the CSS animation
    }

    const box = mount(el('div', { className: 'box forge' },
      story && el('div', { className: 'ask-story', textContent: story }),
      el('div', { className: 'ask-text', textContent: ask }),
      crystal, field,
      el('div', { className: 'tiles' },
        TILES.map(([label, text]) => el('button', { textContent: label, onclick: () => insert(text) })),
        el('button', { id: 'forge-strike', className: 'strike', textContent: 'STRIKE', onclick: strike }))));
    field.addEventListener('input', preview);
    field.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') strike();
      if (ev.key === 'Escape') close(null);
    });
    const pop = input.push(action => { if (action === 'menu') close(null); if (action === 'confirm') strike(); });
    ui.busy++;
    field.focus();
  });
}
