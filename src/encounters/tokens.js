// Draws what a trial "shows" (see systems/sim.js): dice, stones, cards, words.
import { FONT } from './kit.js';

const STONE_TINT = {
  R: 0xff004d, B: 0x29adff, G: 0x00e436, W: 0xfff1e8, K: 0x5f574f,
  Y: 0xffec27, P: 0xc2c3c7, O: 0xffa300,
};

/** Draw one token with its top-left corner at (x, y). Returns { objects, width }. */
function drawToken(scene, token, x, y) {
  const die = /^d([1-6])$/.exec(token);
  if (die) return { objects: [scene.add.image(x + 6, y + 8, `die_${die[1]}`)], width: 12 };

  const stone = /^s([A-Z])$/.exec(token);
  if (stone) return { objects: [scene.add.image(x + 4, y + 8, 'stone').setTint(STONE_TINT[stone[1]] ?? 0xffffff)], width: 8 };

  const card = /^c([A2-9TJQK])([SHDC])$/.exec(token);
  if (card) {
    const red = card[2] === 'H' || card[2] === 'D';
    return {
      objects: [
        scene.add.image(x + 6, y + 8, 'card'),
        scene.add.text(x + 6, y + 5, card[1], { ...FONT, color: red ? '#ff004d' : '#000000' }).setOrigin(0.5),
        scene.add.image(x + 6, y + 12, `suit_${card[2]}`),
      ],
      width: 12,
    };
  }

  // Anything else is a word on a small dark label.
  const label = scene.add.text(x, y + 2, token, { ...FONT, backgroundColor: '#1d2b53', padding: { x: 2, y: 2 } });
  return { objects: [label], width: label.width };
}

/**
 * Draw a row of tokens starting at (x0, y0), wrapping after `maxWidth` pixels.
 * Returns the created objects so the caller can destroy them before the next trial;
 * the returned array also carries `.bottom`, the y just below the last row.
 */
export function drawTokens(scene, tokens, x0, y0, maxWidth = 250, depth = 2) {
  const made = [];
  let x = x0, y = y0;
  for (const token of tokens) {
    let drawn = drawToken(scene, token, x, y);
    if (x > x0 && x + drawn.width > x0 + maxWidth) { // does not fit: start a new line and draw it there
      drawn.objects.forEach(obj => obj.destroy());
      x = x0;
      y += 18;
      drawn = drawToken(scene, token, x, y);
    }
    drawn.objects.forEach(obj => obj.setDepth(depth));
    made.push(...drawn.objects);
    x += drawn.width + 3;
  }
  made.bottom = y + 16; // where the last row ends, so the caller can write underneath it
  return made;
}
