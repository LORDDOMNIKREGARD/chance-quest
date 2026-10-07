// Charts that grow as you repeat an experiment by hand.
//
//   histogram  piles every run onto what it scored (its `bin`: the sum of the
//              dice, the number of arrivals…). The shape of the distribution
//              appears by itself. For a quantity, a gold line marks the average
//              so far: the expectation is where the pile would balance.
//   strings    the detective's board: a red string from the clue to every
//              suspect, as thick as that suspect's share of the runs that count.
//
// Both return { add(result), draw() }: add() takes one trial result (see
// systems/sim.js), draw() repaints.
import { FONT } from './kit.js';

const tidy = x => String(+Number(x).toPrecision(4));
const GREEN = 0x00e436, PINK = 0xff77a8, GREY = 0x5f574f, BLUE = 0x29adff, GOLD = 0xffec27, RED = 0xff004d;
const DIM = { ...FONT, color: '#c2c3c7' };

/**
 * @param k     the toy kit
 * @param box   { x, y, w, h }: where to draw
 * @param sim   the experiment (its kind decides the colours; an E brings lo and hi)
 * @param axis  what the bins measure, e.g. 'sum'
 */
export function histogram(k, { x, y, w, h }, sim, axis = '') {
  const { scene } = k;
  const quantity = sim.kind === 'E' || sim.kind === 'T'; // every run is a number, and we want its average
  const BASE = y + h - 10, TALL = h - 22;                // bars stand on BASE and grow up to TALL pixels
  const bars = k.add(scene.add.graphics());
  const caption = k.text(x + w, y, axis, DIM.color).setOrigin(1, 0);
  const piles = new Map(); // bin → [it happened, it did not, run does not count]
  let labels = [], sum = 0, counted = 0;
  k.add({ destroy: () => labels.forEach(label => label.destroy()) });

  return {
    add({ x: value, bin = Number(value) }) {
      // An average may run off to the right (rolls until a six…): pile the stragglers on the end bars.
      // (Rounded, so that 2.9999999 and 3 land on the same bar.)
      const key = quantity ? +Math.min(sim.hi ?? Infinity, Math.max(sim.lo ?? -Infinity, bin)).toPrecision(6) : bin;
      if (!piles.has(key)) piles.set(key, [0, 0, 0]);
      piles.get(key)[value === null ? 2 : quantity || value ? 0 : 1]++;
      if (quantity) { sum += Number(value); counted++; }
    },

    draw() {
      labels.forEach(label => label.destroy());
      labels = [];
      bars.clear();
      if (!piles.size) return;

      // Where does each bin stand? Numbers keep their distances, so the row is a
      // real number line; words just queue up in alphabetical order.
      const words = [...piles.keys()].some(key => typeof key !== 'number');
      const keys = [...piles.keys()].sort(words ? undefined : (a, b) => a - b);
      const span = words ? keys.length - 1 : keys.at(-1) - keys[0];
      const step = words ? 1 : Math.min(...keys.slice(1).map((key, i) => key - keys[i])); // smallest gap (Infinity if alone)
      // One slot per step from the first bin to the last — but never so many that a bar gets thinner than 3 pixels.
      const slots = span ? Math.min(Math.round(span / step) + 1, Math.floor(w / 3)) : 1;
      const slotOf = key => (words ? keys.indexOf(key) : span ? (key - keys[0]) / span * (slots - 1) : 0);
      const pitch = Math.min(18, w / slots);
      const wide = Math.max(2, Math.floor(pitch) - 1);
      const xOf = key => x + Math.round(slotOf(key) * pitch);
      const name = key => (words ? String(key) : tidy(key));

      const tallest = Math.max(...[...piles.values()].map(pile => pile[0] + pile[1] + pile[2]));
      const unit = Math.min(4, TALL / tallest); // 4 pixels a run, until the tallest pile reaches the top
      for (const [key, pile] of piles) {
        let top = BASE;
        [quantity ? BLUE : GREEN, PINK, GREY].forEach((colour, i) => {
          if (!pile[i]) return;
          const height = Math.max(1, Math.round(pile[i] * unit));
          bars.fillStyle(colour).fillRect(xOf(key), top - height, wide, height);
          top -= height;
        });
      }
      bars.fillStyle(GREY).fillRect(x, BASE, w, 1);

      // Name as many bars as fit without the names running into each other.
      const named = words ? keys : Array.from({ length: slots }, (_, i) => keys[0] + (slots > 1 ? i * span / (slots - 1) : 0));
      const every = Math.ceil((Math.max(...named.map(key => name(key).length)) * 8 + 3) / pitch);
      named.forEach((key, i) => {
        if (i % every === 0) labels.push(scene.add.text(xOf(key) + wide / 2, BASE + 2, name(key), DIM).setOrigin(0.5, 0));
      });

      if (quantity && !words) {
        const mean = sum / counted, at = xOf(Math.min(keys.at(-1), Math.max(keys[0], mean))) + Math.floor(wide / 2);
        bars.fillStyle(GOLD).fillRect(at, BASE - TALL - 2, 1, TALL + 5);
        caption.setText(`avg ${+mean.toPrecision(3)}`).setColor('#ffec27');
      }
    },
  };
}

/**
 * The detective's board. Every trial names the `group` it really came from
 * (which coin? which chest?). Runs that match the clue pin a string on their
 * suspect; a suspect the clue rules out stays grey, with no string at all.
 */
export function strings(k, { x, y, w }) {
  const { scene } = k;
  const web = k.add(scene.add.graphics());
  k.text(x, y, 'fits the clue:', DIM.color);
  const suspects = new Map(); // group → how many of its runs count
  let rows = [];
  k.add({ destroy: () => rows.forEach(row => row.destroy()) });

  return {
    add({ x: value, group }) {
      suspects.set(group, (suspects.get(group) ?? 0) + (value === null ? 0 : 1));
    },

    draw() {
      rows.forEach(row => row.destroy());
      rows = [];
      web.clear();
      const names = [...suspects.keys()].sort();
      const total = [...suspects.values()].reduce((a, b) => a + b, 0);
      const pin = { x: x + 3, y: y + 12 + names.length * 5.5 };
      names.forEach((suspect, i) => {
        const count = suspects.get(suspect), rowY = y + 12 + i * 11;
        // The string is as thick as this suspect's share of the runs that count.
        if (count) web.lineStyle(1 + Math.round(3 * count / total), RED).lineBetween(pin.x, pin.y, x + 13, rowY + 4);
        const style = { ...FONT, color: count ? '#fff1e8' : '#5f574f' };
        rows.push(scene.add.text(x + 16, rowY, suspect, style), scene.add.text(x + w, rowY, String(count), style).setOrigin(1, 0));
      });
      web.fillStyle(GOLD).fillRect(pin.x - 2, pin.y - 2, 4, 4);
    },
  };
}
