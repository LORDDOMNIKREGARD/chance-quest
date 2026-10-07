// The three "arrange a row" templates: seating, shelf, tiles.
// Each toy returns { icon, target, ok? }: what flies when you forge, where it
// lands, and what changes in the world on success.
import { arrange } from './arrange.js';

/** seating: four heroes on a bench, with a tool that glues two of them together. */
export function seating(k) {
  k.text(56, 30, 'Drag heroes along the bench');
  const names = ['Asha', 'Bodhi', 'Cy', 'Dee'];
  let glued = false;
  const seatOf = (row, key) => row.findIndex(it => it.key === key);
  const bench = arrange(k, names.map((name, i) => ({ key: name[0], tex: `npc_${i}`, label: name[0], ink: '#fff1e8' })), {
    label: 'orders found', y: 70, labelDy: 14,
    valid: row => !glued || Math.abs(seatOf(row, 'A') - seatOf(row, 'B')) === 1,
    rule: 'A and B are glued together!',
  });
  k.button(56, 96, 'Glue A+B: off', button => {
    glued = !glued;
    button.setText(`Glue A+B: ${glued ? 'on' : 'off'}`);
    bench.tally.reset();
    bench.record();
  });
  return { icon: 'scroll', target: bench.sprites[1] };
}

/** shelf: two novels and two maths books; a subject must stay in one block. */
export function shelf(k) {
  k.text(56, 30, 'Shelve them: subjects together');
  const TINT = { N: 0xff004d, M: 0x29adff };
  const books = ['N1', 'N2', 'M1', 'M2'].map(name => ({ key: name, tex: 'book', tint: TINT[name[0]], label: name, ink: '#fff1e8' }));
  // A subject is "together" when its books sit in neighbouring slots.
  const together = row => Object.keys(TINT).every(subject => {
    const slots = row.flatMap((book, slot) => (book.key[0] === subject ? [slot] : []));
    return slots.at(-1) - slots[0] === slots.length - 1;
  });
  const row = arrange(k, books, { label: 'valid shelves', y: 70, labelDy: 15, valid: together, rule: 'A subject got split up!' });
  return { icon: 'key', target: row.sprites[0] };
}

// A small word per encounter, chosen so identical letters appear.
const WORDS = { 'c1-banner-letters': 'ANNA', 'c1-podium': 'NNSE' };

/** tiles: letter tiles; identical letters make some swaps invisible. */
export function tiles(k, enc) {
  const word = WORDS[enc.id] ?? 'AAB';
  k.text(56, 30, `Rearrange ${word}: twins look alike`);
  const row = arrange(k, [...word].map(ch => ({ key: ch, tex: 'tile', label: ch })), { label: 'distinct rows', y: 76, gap: 22 });
  return { icon: 'scroll', target: row.sprites[0] };
}
