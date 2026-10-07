// Speech boxes. Both functions return Promises, so scenes can write
//   await say('Hoot', 'Welcome!');
// and carry on only after the player has read it.
import { el, mount, ui, panel } from './dom.js';
import { input } from '../systems/input.js';
import { sfx } from '../audio/sfx.js';
import { fill } from '../systems/content.js';

/** Typewriter speech. First press shows the whole line, the next one closes it. */
export function say(speaker, text) {
  return new Promise(resolve => {
    const body = el('div');
    const box = mount(el('div', { className: 'box dialogue' }, el('div', { className: 'speaker', textContent: speaker }), body));
    let shown = 0;
    // The not-yet-typed part is there but invisible, so the box never changes size.
    const paint = () => body.replaceChildren(text.slice(0, shown), el('span', { style: 'visibility:hidden', textContent: text.slice(shown) }));
    const timer = setInterval(() => {
      shown += 2;
      if (shown % 8 === 0) sfx('talk');
      if (shown >= text.length) clearInterval(timer);
      paint();
    }, 16);
    const advance = () => {
      if (shown < text.length) { shown = text.length; clearInterval(timer); paint(); return; }
      pop(); ui.busy--; box.remove(); resolve();
    };
    const pop = input.push(action => { if (action === 'interact' || action === 'confirm') advance(); });
    ui.busy++;
    box.onclick = advance;
    paint();
  });
}

/** Speech with buttons; resolves to the index of the one picked. Used for menus, never for answers. */
export function choose(speaker, text, options) {
  return new Promise(resolve => {
    const pick = i => { pop(); ui.busy--; box.remove(); resolve(i); };
    const box = mount(el('div', { className: 'box dialogue' },
      el('div', { className: 'speaker', textContent: speaker }),
      el('div', { textContent: text }),
      el('div', { className: 'choices' }, options.map((label, i) => el('button', { textContent: label, onclick: () => pick(i) })))));
    const pop = input.push(action => { if (action === 'menu') pick(options.length - 1); });
    ui.busy++;
  });
}

/** The Scroll of Insight: the full worked solution and the pattern to remember. */
export function showScroll(enc, vars) {
  const body = el('div', {},
    el('ol', {}, enc.solution.map(stepText => el('li', { textContent: fill(stepText, vars) }))),
    el('h3', { textContent: 'Pattern' }),
    el('p', { textContent: enc.pattern }));
  return panel(`Scroll of Insight — ${enc.title}`, body, 'parchment').done;
}
