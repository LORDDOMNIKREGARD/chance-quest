// "Predict": before any calculating, pour your gut feeling into a flask.
// The fuller the flask, the bigger the number you are betting on.
import { el, mount, ui } from './dom.js';
import { input } from '../systems/input.js';
import { sfx } from '../audio/sfx.js';

const tidy = x => String(+Number(x).toPrecision(4));

/**
 * Ask for a gut estimate between lo and hi (0 and 1 for a probability).
 * Resolves to the number poured, or null if the player steps back.
 */
export function openFlask(ask, lo, hi) {
  return new Promise(resolve => {
    // The flask starts empty: any starting level would be a hint (the middle is sometimes the answer).
    const slider = el('input', { id: 'flask-slider', type: 'range', min: lo, max: hi, step: (hi - lo) / 100, value: lo });
    const potion = el('div', { className: 'potion' });
    const reading = el('div', { id: 'flask-reading', className: 'reading' });
    const show = () => {
      potion.style.height = `${100 * (slider.value - lo) / (hi - lo)}%`;
      reading.textContent = tidy(slider.value);
    };
    const done = value => { pop(); ui.busy--; box.remove(); resolve(value); };
    const pour = () => { sfx('forge'); done(Number(slider.value)); };

    const box = mount(el('div', { className: 'box flask-box' },
      el('div', { className: 'speaker', textContent: 'Before you calculate: what does your gut say?' }),
      el('div', { className: 'ask-text', textContent: ask }),
      el('div', { className: 'flask-row' },
        el('div', { className: 'flask' }, potion),
        el('div', { className: 'flask-side' },
          reading, slider,
          el('div', { className: 'dim', textContent: `${tidy(lo)} at the bottom, ${tidy(hi)} at the top. No sums yet - just pour.` }),
          el('button', { id: 'flask-pour', textContent: 'Pour [Enter]', onclick: pour })))));
    slider.oninput = show;
    slider.onkeydown = ev => {
      if (ev.key === 'Enter') pour();
      if (ev.key === 'Escape') done(null);
    };
    const pop = input.push(action => { if (action === 'confirm') pour(); if (action === 'menu') done(null); });
    ui.busy++;
    show();
    slider.focus();
  });
}
