// The top bar (hearts, gold, level, Echo badge), the pause menu, and the
// on-screen pad for phones.
import { el, mount, icon, ui, panel, download } from './dom.js';
import { input } from '../systems/input.js';
import { state, save, importSave, maxHearts, level } from '../systems/save.js';
import { isDue } from '../systems/srs.js';
import { setMuted } from '../audio/sfx.js';
import { openGrimoire } from './grimoire.js';

let bar = null;

/** Ids of Echoes that are due now. Pass 'book:' for Book Echoes only. */
export const echoesDue = (prefix = '') =>
  Object.entries(state.echoes).filter(([id, card]) => id.startsWith(prefix) && isDue(card, Date.now())).map(([id]) => id);

export function refreshHud() {
  if (!bar) return;
  const hearts = Array.from({ length: maxHearts() }, (_, i) => icon(i < state.hearts ? 'heart' : 'heart_empty'));
  const due = echoesDue().length;
  bar.replaceChildren(
    el('span', {}, hearts, icon('coin'), el('span', { id: 'hud-gold', textContent: `${state.gold}  Lv${level()}` }),
      due && el('span', { id: 'echo-badge', className: 'badge', textContent: `Echoes due: ${due}` })),
    el('span', {},
      el('button', { id: 'btn-grimoire', textContent: 'Grimoire', onclick: () => globalAction('grimoire') }),
      el('button', { id: 'btn-mute', textContent: state.mute ? 'Sound off' : 'Sound on', onclick: () => globalAction('mute') }),
      el('button', { id: 'btn-menu', textContent: 'Menu', onclick: () => globalAction('menu') })));
}

/** Save the journey and redraw the bar. Call after any change to `state`. */
export function commit() { save(); refreshHud(); }

/** Actions that work anywhere in the world. Returns true if it handled the action. */
export function globalAction(action) {
  if (ui.busy) return false; // something is already open
  if (action === 'grimoire') openGrimoire();
  else if (action === 'mute') { state.mute = !state.mute; setMuted(state.mute); commit(); }
  else if (action === 'menu') openMenu();
  else return false;
  return true;
}

/** Ask for a save file and load it. `onError(message)` is called if the file is not a save. */
export function pickSave(onError) {
  const picker = el('input', { type: 'file', accept: '.json' });
  picker.onchange = async () => {
    try { importSave(await picker.files[0].text()); location.reload(); }
    catch { onError('That file is not a Chance Quest save.'); }
  };
  picker.click();
}

function openMenu() {
  const note = el('p', { className: 'dim', textContent: 'Your journey saves itself in this browser. Export it to keep a copy or move it to another device.' });
  panel('Menu', el('div', {}, note,
    el('div', { className: 'row' },
      el('button', { id: 'export-save', textContent: 'Export save', onclick: () => download('chance-quest-save.json', JSON.stringify(state, null, 1), 'application/json') }),
      el('button', { id: 'import-save', textContent: 'Import save', onclick: () => pickSave(message => { note.textContent = message; }) }),
      el('button', { textContent: 'Back to title', onclick: () => location.reload() })),
    el('p', { className: 'dim', textContent: 'Keys: WASD/arrows walk · E or Space interact · Enter confirm · G Grimoire · M sound · Esc menu' })));
}

export function initHud() {
  bar = mount(el('div', { className: 'hud' }));
  setMuted(state.mute);
  refreshHud();

  // Phone controls: a d-pad that "holds" directions and an A button that interacts.
  const hold = (label, move, style) => {
    const b = el('button', { textContent: label, style });
    b.onpointerdown = () => input.press(move);
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => input.release(move);
    return b;
  };
  mount(el('div', { className: 'touch dpad' },
    hold('▲', 'up', 'left:33%;top:0'), hold('▼', 'down', 'left:33%;bottom:0'),
    hold('◀', 'left', 'left:0;top:33%'), hold('▶', 'right', 'right:0;top:33%')));
  mount(el('button', { className: 'touch abtn', textContent: 'A', onclick: () => input.fire('interact') }));
}
