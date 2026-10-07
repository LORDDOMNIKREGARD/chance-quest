// Click-to-count toys for Chapter 1: lock, wheel, guild-hall, lattice.
// Each is a tiny version of the real problem that you can exhaust by hand.

/** lock: a seal of one letter (A/B/C) and one digit (0/1/2). */
export function lock(k) {
  const SETS = ['ABC', '012'];
  k.text(56, 30, 'Tiny seal: click the dials');
  const tally = k.tally('codes tried');
  const now = [0, 0];
  SETS.forEach((set, i) => k.button(100 + i * 26, 68, set[0], dial => {
    now[i] = (now[i] + 1) % set.length;
    dial.setText(set[now[i]]);
    tally.see(now.join(''));
  }));
  tally.see('00');
  k.text(56, 94, '3 letters, 3 digits...', '#c2c3c7');
  const door = k.img(262, 78, 'door').setScale(2);
  return { icon: 'key', target: door, ok: () => door.setTexture('door_open') };
}

/** wheel: three sectors, two spins; every recorded sequence is tallied. */
export function wheel(k) {
  const { scene } = k;
  const COLORS = [0xff004d, 0x29adff, 0x00e436], NAMES = 'RBG';
  k.text(56, 30, 'Tiny wheel: 3 sectors, 2 spins');
  const tally = k.tally('sequences seen');
  const disc = k.add(scene.add.graphics({ x: 96, y: 86 }));
  COLORS.forEach((color, i) => {
    disc.fillStyle(color);
    disc.slice(0, 0, 22, i * 2 * Math.PI / 3, (i + 1) * 2 * Math.PI / 3).fillPath();
  });
  k.text(96, 58, 'v').setOrigin(0.5); // the pointer, at the top
  const record = k.text(140, 68, 'record: --');
  let seq = '', angle = 0, spinning = false;
  k.button(140, 84, 'SPIN', () => {
    if (spinning) return;
    spinning = true;
    const sector = Math.floor(Math.random() * 3);
    // Sector s is centred at 60+120s degrees on the disc. Rotate until that
    // centre sits under the pointer (270°), after two full turns for show.
    const extra = (((270 - 60 - 120 * sector - angle) % 360) + 360) % 360;
    const to = angle + 720 + extra;
    scene.tweens.addCounter({
      from: angle, to, duration: 700, ease: 'Cubic.easeOut',
      onUpdate: tween => disc.setAngle(tween.getValue()),
      onComplete: () => {
        angle = to % 360;
        spinning = false;
        seq += NAMES[sector];
        record.setText(`record: ${seq.padEnd(2, '-')}`);
        if (seq.length < 2) return;
        if (!tally.see(seq)) k.note(`${seq} was recorded before`);
        seq = '';
      },
    });
  });
  return { icon: 'coin', target: k.img(270, 84, 'chest').setScale(2) };
}

/** guild-hall: choose 2 of 5 people; a committee is a set, so order is ignored. */
export function guildHall(k) {
  const { scene } = k;
  const NAMES = 'ABCDE', FLOOR = 82;
  k.text(56, 30, 'Click any 2 for the committee');
  const tally = k.tally('committees found');
  const picked = new Set();
  const people = [...NAMES].map((name, i) => {
    const x = 84 + i * 30;
    const person = k.img(x, FLOOR, `npc_${i}`).setInteractive({ useHandCursor: true });
    k.text(x, FLOOR + 14, name).setOrigin(0.5);
    person.on('pointerdown', () => {
      if (picked.has(i)) { picked.delete(i); person.y = FLOOR; return; }
      if (picked.size === 2) return;
      picked.add(i);
      person.y = FLOOR - 12; // step forward
      if (picked.size < 2) return;
      const committee = [...picked].sort().map(j => NAMES[j]).join('');
      if (!tally.see(committee)) k.note(`${committee} again: same committee`);
      scene.time.delayedCall(600, () => { picked.clear(); people.forEach(p => { p.y = FLOOR; }); });
    });
    return person;
  });
  return { icon: 'scroll', target: k.img(280, 80, 'board') };
}

/** lattice: walk a 3×2 street grid yourself; each new route is tallied. */
export function lattice(k) {
  const { scene } = k;
  const R = 3, U = 2, X0 = 76, Y0 = 104, CELL = 22;
  const px = r => X0 + r * CELL, py = u => Y0 - u * CELL;
  k.text(56, 30, 'Reach the castle: > or ^ only');
  const tally = k.tally('routes found');
  const streets = k.add(scene.add.graphics());
  streets.lineStyle(1, 0xc2c3c7);
  for (let r = 0; r <= R; r++) streets.lineBetween(px(r), py(0), px(r), py(U));
  for (let u = 0; u <= U; u++) streets.lineBetween(px(0), py(u), px(R), py(u));
  const trail = k.add(scene.add.graphics());
  const castle = k.img(px(R), py(U), 'town');
  const me = k.img(px(0), py(0), 'coin');
  let r = 0, u = 0, route = '';
  const restart = () => { r = 0; u = 0; route = ''; trail.clear(); me.setPosition(px(0), py(0)); };
  const walk = (dr, du) => {
    if (r + dr > R || u + du > U) return k.note('The city wall is in the way');
    trail.lineStyle(3, 0xffec27).lineBetween(px(r), py(u), px(r + dr), py(u + du));
    r += dr; u += du; route += dr ? 'R' : 'U';
    me.setPosition(px(r), py(u));
    if (r < R || u < U) return;
    k.note(tally.see(route) ? `New route: ${route}` : `${route}: walked before`);
    scene.time.delayedCall(600, restart);
  };
  k.button(180, 66, '>', () => walk(1, 0));
  k.button(200, 66, '^', () => walk(0, 1));
  k.button(180, 86, 'restart', restart);
  return { icon: 'key', target: castle };
}
