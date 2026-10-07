// Shared by the seating, shelf and tiles templates: a row of things you
// drag onto each other to swap, with a tally of the distinct rows found.
import Phaser from 'phaser';

/**
 * @param k      the toy kit
 * @param items  [{ key, tex, tint?, label?, ink? }] — items with the same `key` look identical
 * @param opts   { label, y, gap, labelDy, valid(row) → bool, rule: message when invalid }
 */
export function arrange(k, items, { label, y = 74, gap = 24, labelDy = 0, valid, rule } = {}) {
  const n = items.length;
  const x0 = 180 - (n - 1) * gap / 2;
  const slotX = slot => x0 + slot * gap;
  const order = items.map((_, i) => i); // order[slot] = index of the item sitting there
  const tally = k.tally(label);

  const sprites = items.map(it => { const s = k.img(0, 0, it.tex); if (it.tint) s.setTint(it.tint); return s; });
  const labels = items.map(it => (it.label ? k.text(0, 0, it.label, it.ink ?? '#1d2b53').setOrigin(0.5) : null));
  const moveTo = (it, x, yy, depth) => {
    sprites[it].setPosition(x, yy).setDepth(depth);
    labels[it]?.setPosition(x, yy + labelDy).setDepth(depth + 1);
  };
  const place = () => order.forEach((it, slot) => moveTo(it, slotX(slot), y, 1));

  /** Count the current row, if it obeys the rule. */
  const record = () => {
    const row = order.map(i => items[i]);
    if (valid && !valid(row)) return k.note(rule, '#ff004d');
    if (!tally.see(row.map(it => it.key).join(' '))) k.note('You found this row before');
  };

  sprites.forEach((sprite, it) => {
    sprite.setInteractive({ draggable: true, useHandCursor: true });
    sprite.on('drag', (_pointer, dragX, dragY) => moveTo(it, dragX, dragY, 5));
    sprite.on('dragend', () => {
      const from = order.indexOf(it);
      const to = Phaser.Math.Clamp(Math.round((sprite.x - x0) / gap), 0, n - 1);
      const twins = from !== to && items[order[to]].key === items[it].key;
      [order[from], order[to]] = [order[to], order[from]];
      place();
      // Swapping two identical things changes nothing you can see: that is the overcount.
      if (twins) k.note('Twins swapped: it looks the same!');
      else if (from !== to) record();
    });
  });

  place();
  record();
  return { tally, sprites, record };
}
