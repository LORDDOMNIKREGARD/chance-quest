// One place for keyboard and touch input.
//  - Movement is "held" state: scenes ask input.dir() every frame.
//  - Everything else is an *action* ('interact', 'confirm', 'menu', …) sent to
//    the handler on top of a stack. A dialogue box pushes its own handler
//    while open, so the world underneath stops reacting until it closes.

const KEYS = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
  e: 'interact', ' ': 'interact', Enter: 'confirm', Escape: 'menu',
  g: 'grimoire', m: 'mute', h: 'hoot',
};
const MOVES = ['left', 'right', 'up', 'down'];
const held = new Set();
const stack = [];

export const input = {
  /** Current movement direction, each axis −1, 0 or 1. */
  dir: () => ({ x: held.has('right') - held.has('left'), y: held.has('down') - held.has('up') }),
  /** Make `handler(action)` the active one. Returns a function that removes it again. */
  push(handler) {
    stack.push(handler);
    return () => { const i = stack.indexOf(handler); if (i >= 0) stack.splice(i, 1); };
  },
  isTop: handler => stack.at(-1) === handler,
  fire: action => stack.at(-1)?.(action),
  press: move => held.add(move),
  release: move => held.delete(move),
};

const actionOf = ev => KEYS[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key];

window.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT' || ev.ctrlKey || ev.metaKey || ev.altKey) return; // typing, or a browser shortcut
  const action = actionOf(ev);
  if (!action) return;
  ev.preventDefault();
  if (MOVES.includes(action)) held.add(action);
  else if (!ev.repeat) input.fire(action);
});
window.addEventListener('keyup', ev => held.delete(actionOf(ev)));
window.addEventListener('blur', () => held.clear());
// A clicked button would otherwise keep focus and swallow Space/Enter.
document.addEventListener('click', ev => ev.target.closest?.('button')?.blur());
