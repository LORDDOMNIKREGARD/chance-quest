// Tiny helpers for the HTML layer that sits on top of the Phaser canvas.
// Text-heavy things (dialogue, forge, Grimoire…) are HTML so they stay sharp
// and readable; the world and the toys are drawn by Phaser.
import { input } from '../systems/input.js';

export const ui = {
  root: null,  // the #ui element
  game: null,  // the Phaser game (for turning textures into <img> icons)
  busy: 0,     // how many dialogues/panels are open right now
};

/** Create an element: el('button', {textContent: 'Hi', onclick}, child1, child2…) */
export function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.flat().filter(Boolean));
  return node;
}

export function mount(node) { ui.root.append(node); return node; }

/** A baked pixel-art texture as an <img>. */
export const icon = key => el('img', { className: 'icon', src: ui.game.textures.getBase64(key), alt: key });

/** Save text or a Blob to the player's disk. */
export function download(name, data, type = 'text/plain') {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  el('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * A framed window with a title and a close button (Esc also closes).
 * Returns { box, close, done } where `done` resolves when it closes.
 */
export function panel(title, body, className = '') {
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  const close = () => { pop(); ui.busy--; box.remove(); finish(); };
  const box = mount(el('div', { className: `box panel ${className}` },
    el('div', { className: 'panel-head' },
      el('span', { textContent: title }),
      el('button', { id: 'panel-close', textContent: 'X', onclick: close })),
    el('div', { className: 'panel-body' }, body)));
  const pop = input.push(action => { if (action === 'menu') close(); });
  ui.busy++;
  return { box, close, done };
}
