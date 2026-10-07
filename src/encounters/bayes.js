// Special toys for Chapter 3: the crowd of 1000 and the walking tree.
// Both show the *structure* of a Bayes problem; the exact arithmetic is still yours.

const tidy = x => String(+Number(x).toPrecision(4));
const clamp01 = x => +Math.min(1, Math.max(0, x)).toFixed(3);

// Each crowd problem is "a hidden group H, and a sign E that shows up at
// different rates inside and outside H".
const CROWDS = {
  'c3-clinic': v => ({ rates: [v.p, v.s, v.fp], knobs: ['ill', 'hit', 'false+'], rows: ['sick', 'healthy'], sign: 'test flags?' }),
  'c3-colorblind': v => ({ rates: [0.5, v.m, v.w], knobs: ['men', 'men cb', 'wom cb'], rows: ['men', 'women'], sign: 'colour-blind?' }),
};
export const hasCrowd = enc => enc.id in CROWDS;

/** clinic: 1000 villagers as dots. Turn the three rates and watch the four groups change size. */
export function crowd(k, enc, vars) {
  const { scene } = k;
  const { rates, knobs, rows, sign } = CROWDS[enc.id](vars);
  const COLOURS = [0xff004d, 0xff77a8, 0xffa300, 0x5f574f]; // H+sign, H no sign, not-H+sign, not-H no sign
  const dots = k.add(scene.add.graphics());
  k.text(182, 30, sign, '#c2c3c7');
  k.text(250, 41, 'yes'); k.text(290, 41, 'no');
  k.text(182, 52, rows[0], '#ff77a8'); k.text(182, 63, rows[1], '#ffa300');
  const cells = [k.text(250, 52, ''), k.text(290, 52, ''), k.text(250, 63, ''), k.text(290, 63, '')];

  function redraw() {
    const inH = Math.round(1000 * rates[0]);
    const counts = [Math.round(inH * rates[1]), 0, Math.round((1000 - inH) * rates[2]), 0];
    counts[1] = inH - counts[0];
    counts[3] = 1000 - inH - counts[2];
    cells.forEach((cell, i) => cell.setText(String(counts[i])));
    dots.clear();
    let group = 0, left = counts[0];
    for (let i = 0; i < 1000; i++) { // 40 columns × 25 rows, group after group
      while (left === 0 && group < 3) left = counts[++group];
      left--;
      dots.fillStyle(COLOURS[group]).fillRect(56 + (i % 40) * 3, 32 + Math.floor(i / 40) * 3, 2, 2);
    }
  }

  knobs.forEach((name, i) => {
    const y = 74 + i * 12;
    const label = k.text(214, y + 2, '');
    const show = () => label.setText(`${name} ${rates[i]}`);
    const turn = direction => { rates[i] = clamp01(rates[i] + direction * (rates[i] < 0.1 || (rates[i] === 0.1 && direction < 0) ? 0.01 : 0.05)); show(); redraw(); };
    k.button(182, y, '-', () => turn(-1));
    k.button(197, y, '+', () => turn(1));
    show();
  });
  redraw();
  return { icon: 'scroll', target: { x: 116, y: 70 } };
}

// Two-stage trees: first what happened, then what you observed.
const TREES = {
  'c3-late-for-guard': v => ({ first: [['rain', v.r], ['dry', 1 - v.r]], then: [[['late', v.a], ['on time', 1 - v.a]], [['late', v.c], ['on time', 1 - v.c]]] }),
  'c3-plant': v => ({ first: [['watered', v.w], ['forgot', 1 - v.w]], then: [[['dies', v.d2], ['lives', 1 - v.d2]], [['dies', v.d1], ['lives', 1 - v.d1]]] }),
};

/** tree: click a leaf to walk there. The branch weights multiply along the way and the leaf is stamped. */
export function tree(k, enc, vars) {
  const { scene } = k;
  const { first, then } = TREES[enc.id](vars);
  const ROOT = [66, 68], MID = [[128, 50], [128, 88]], LEAF_X = 196, LEAF_Y = [[42, 60], [80, 98]];
  k.text(56, 28, 'Click a leaf:');
  const lines = k.add(scene.add.graphics());
  lines.lineStyle(1, 0xc2c3c7);
  const walker = k.img(ROOT[0], ROOT[1], 'coin').setDepth(5);
  const stamped = new Map(); // leaf key → its path probability
  const total = k.text(168, 28, '', '#ffec27');
  let walking = false;

  first.forEach(([name, weight], i) => {
    lines.lineBetween(...ROOT, ...MID[i]);
    // Names sit beside their node, weights beside their branch; upper branches label above, lower ones below.
    k.text(MID[i][0] - 2, MID[i][1] + (i ? 3 : -3), name).setOrigin(1, i ? 0 : 1);
    k.text(ROOT[0] + 14, (ROOT[1] + MID[i][1]) / 2 + (i ? 6 : -6), tidy(weight), '#29adff').setOrigin(0, 0.5);
    then[i].forEach(([leafName, leafWeight], j) => {
      const y = LEAF_Y[i][j];
      lines.lineBetween(...MID[i], LEAF_X, y);
      k.text(166, (MID[i][1] + y) / 2 + (j ? 5 : -5), tidy(leafWeight), '#29adff').setOrigin(0.5, 0.5);
      const stamp = k.text(268, y - 4, '', '#ffec27');
      const leaf = k.text(LEAF_X + 4, y - 4, leafName).setInteractive({ useHandCursor: true });
      leaf.on('pointerdown', () => {
        if (walking) return;
        walking = true;
        walker.setPosition(...ROOT);
        scene.tweens.chain({
          targets: walker,
          tweens: [{ x: MID[i][0], y: MID[i][1], duration: 350 }, { x: LEAF_X, y, duration: 350 }],
          onComplete: () => {
            walking = false;
            const product = weight * leafWeight;
            stamped.set(`${i}${j}`, product);
            stamp.setText(tidy(product));
            k.note(`${tidy(weight)} x ${tidy(leafWeight)} = ${tidy(product)}`);
            total.setText(`stamped: ${tidy([...stamped.values()].reduce((a, b) => a + b, 0))}`);
          },
        });
      });
    });
  });
  return { icon: 'key', target: { x: ROOT[0], y: ROOT[1] } };
}
export const hasTree = enc => enc.id in TREES;
