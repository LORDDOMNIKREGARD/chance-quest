// Turns the string grids in sprites.js into Phaser textures at boot.
import { PALETTE } from './palette.js';
import { HERO, NPC_GRID, NPC_SWAPS, PROPS, ICONS, TILES, ROOF_SWAPS, DIE_PIPS } from './sprites.js';

/**
 * Paint one grid into a new texture called `key`.
 * `swap` recolours on the way, e.g. {8: 'c'} draws every red pixel blue.
 */
export function bake(scene, key, rows, swap = {}) {
  const tex = scene.textures.createCanvas(key, rows[0].length, rows.length);
  const ctx = tex.getContext();
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = PALETTE[parseInt(swap[ch] ?? ch, 16)];
    ctx.fillRect(x, y, 1, 1);
  }));
  tex.refresh();
}

// An 8×8 pattern repeated twice across and twice down → a 16×16 tile.
const tile16 = rows => { const wide = rows.map(r => r + r); return [...wide, ...wide]; };

// A plain bordered rectangle (letter tiles, cards, book spines).
const framed = (w, h, border, fill) =>
  Array.from({ length: h }, (_, y) => (y === 0 || y === h - 1 ? border.repeat(w) : border + fill.repeat(w - 2) + border));

export function bakeAll(scene) {
  for (const [face, frames] of Object.entries(HERO)) frames.forEach((grid, i) => bake(scene, `hero_${face}_${i}`, grid));
  NPC_SWAPS.forEach((swap, i) => bake(scene, `npc_${i}`, NPC_GRID, swap));
  for (const [key, rows] of Object.entries({ ...PROPS, ...ICONS })) bake(scene, key, rows);
  bake(scene, 'door_open', PROPS.door, { 4: '0', a: '0' });
  bake(scene, 'heart_empty', ICONS.heart, { 8: '5', e: '5' });
  for (const [key, rows] of Object.entries(TILES)) bake(scene, key, tile16(rows));
  ROOF_SWAPS.forEach((swap, i) => bake(scene, `roof_${i}`, tile16(TILES.roof), swap));
  bake(scene, 'tile', framed(16, 16, '4', 'f'));
  bake(scene, 'card', framed(12, 16, '5', '7'));
  bake(scene, 'book', framed(10, 16, '5', '7')); // white, so scenes can tint it per subject
  for (const [value, pips] of Object.entries(DIE_PIPS)) bake(scene, `die_${value}`, dieFace(pips));
}

/** A 12×12 die face as a grid: white with a grey rim, clipped corners and black 2×2 pips. */
function dieFace(pips) {
  const grid = framed(12, 12, '5', '7').map(row => [...row]);
  for (const [x, y] of [[0, 0], [11, 0], [0, 11], [11, 11]]) grid[y][x] = '.';
  for (const [px, py] of pips) for (const dy of [0, 1]) for (const dx of [0, 1]) grid[py + dy][px + dx] = '0';
  return grid.map(row => row.join(''));
}
