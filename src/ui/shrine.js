// Star Shrine: a blank night sky for free recall. The player places their
// Pattern Cards as stars and draws labelled arrows between them. The game
// never fills this in and never grades it.
import { el, panel, download } from './dom.js';
import { state, save } from '../systems/save.js';
import { content, encById } from '../systems/content.js';

const W = 600, H = 315; // canvas pixels (3× the on-screen game pixels, so the PNG export is readable)
const FONT = '11px "Press Start 2P", monospace';

/** Break text into lines of at most `max` characters, on spaces. */
function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    if ((lines.at(-1) + ' ' + word).trim().length > max) lines.push(word);
    else lines[lines.length - 1] = (lines.at(-1) + ' ' + word).trim();
  }
  return lines;
}

export function openShrine(ch) {
  const data = (state.shrine[ch] ??= { date: null, stars: [], links: [] });
  const owned = state.cards.map(encById).filter(enc => enc.ch === ch);
  const canvas = el('canvas', { id: 'sky', className: 'sky', width: W, height: H });
  const g = canvas.getContext('2d');
  const info = el('p', { className: 'dim' });
  const verbRow = el('div', { className: 'row' });
  const cardList = el('div', { className: 'card-list' });
  let selected = null; // id of the highlighted star
  let drag = null;     // { star, moved } while a pointer is down on a star

  const starOf = id => data.stars.find(s => s.id === id);
  const changed = () => { data.date = new Date().toISOString().slice(0, 10); save(); draw(); };

  function draw() {
    g.fillStyle = '#1d2b53'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#83769c';
    for (let i = 0; i < 70; i++) g.fillRect((i * 97) % W, (i * 61 + i * i) % H, 2, 2); // fixed backdrop of faint stars
    g.font = FONT; g.textAlign = 'center';
    for (const link of data.links) {
      const a = starOf(link.a), b = starOf(link.b);
      if (!a || !b) continue;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const tipX = b.x - 16 * Math.cos(angle), tipY = b.y - 16 * Math.sin(angle);
      g.strokeStyle = g.fillStyle = '#c2c3c7'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(tipX, tipY); g.stroke();
      g.beginPath(); g.moveTo(tipX, tipY);
      g.lineTo(tipX - 10 * Math.cos(angle - 0.4), tipY - 10 * Math.sin(angle - 0.4));
      g.lineTo(tipX - 10 * Math.cos(angle + 0.4), tipY - 10 * Math.sin(angle + 0.4));
      g.fill();
      g.fillStyle = '#29adff'; g.fillText(link.verb, (a.x + b.x) / 2, (a.y + b.y) / 2 - 6);
    }
    for (const star of data.stars) {
      g.fillStyle = star.id === selected ? '#fff1e8' : '#ffec27';
      g.beginPath(); // a four-pointed star
      for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 12, t = i * Math.PI / 4; g.lineTo(star.x + r * Math.sin(t), star.y - r * Math.cos(t)); }
      g.fill();
      g.fillStyle = '#fff1e8';
      wrap(encById(star.id).pattern, 24).forEach((line, i) => g.fillText(line, star.x, star.y + 28 + i * 15));
    }
    info.textContent = `${data.date ? `Last charted: ${data.date}.` : 'A blank sky, never charted.'} Add cards as stars, drag them; click one star then another to link them with a verb.`;
    cardList.replaceChildren(...owned.map(enc => el('button', {
      textContent: enc.pattern, disabled: Boolean(starOf(enc.id)),
      onclick: () => { data.stars.push({ id: enc.id, x: 80 + Math.random() * (W - 160), y: 50 + Math.random() * (H - 140) }); changed(); },
    })));
    if (!owned.length) cardList.append(el('p', { className: 'dim', textContent: 'No Pattern Cards from this region yet.' }));
  }

  const at = ev => { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; };
  canvas.onpointerdown = ev => {
    const p = at(ev);
    const star = data.stars.find(s => Math.hypot(s.x - p.x, s.y - p.y) < 24);
    drag = star ? { star, moved: false, from: p } : null;
    if (!star) { selected = null; draw(); }
  };
  canvas.onpointermove = ev => {
    if (!drag) return;
    const p = at(ev);
    if (Math.hypot(p.x - drag.from.x, p.y - drag.from.y) < 6 && !drag.moved) return; // still a click, not a drag
    drag.moved = true; drag.star.x = p.x; drag.star.y = p.y; draw();
  };
  canvas.onpointerup = () => {
    if (!drag) return;
    const { star, moved } = drag;
    drag = null;
    if (moved) return changed();
    if (selected && selected !== star.id) askVerb(selected, star.id);
    else selected = star.id;
    draw();
  };

  function askVerb(a, b) {
    selected = null;
    const field = el('input', { id: 'verb-input', placeholder: 'verb, e.g. "is a special case of"' });
    const add = () => { if (field.value.trim()) data.links.push({ a, b, verb: field.value.trim() }); verbRow.replaceChildren(); changed(); };
    field.onkeydown = ev => { if (ev.key === 'Enter') add(); };
    verbRow.replaceChildren('Arrow label:', field, el('button', { id: 'verb-ok', textContent: 'Draw', onclick: add }));
    field.focus();
  }

  const removeStar = () => {
    if (!selected) return;
    data.stars = data.stars.filter(s => s.id !== selected);
    data.links = data.links.filter(l => l.a !== selected && l.b !== selected);
    selected = null;
    changed();
  };
  const buttons = el('div', { className: 'row' },
    el('button', { textContent: 'Remove star', onclick: removeStar }),
    el('button', { id: 'export-png', textContent: 'Export PNG', onclick: () => canvas.toBlob(blob => download(`constellation-ch${ch}.png`, blob)) }));

  draw();
  const body = el('div', { className: 'shrine-wrap' },
    el('div', { className: 'shrine-col' }, canvas, verbRow, info),
    el('div', { className: 'shrine-col side' }, el('span', { className: 'dim', textContent: 'Your cards:' }), cardList, buttons));
  return panel(`Star Shrine — ${content.regions[ch - 1].name}`, body, 'shrine').done;
}
