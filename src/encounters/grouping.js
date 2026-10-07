// Toys about splitting things into groups: chests, banner, card-table, and
// the rune-smith's forge (binomial expansion).
import Phaser from 'phaser';

/** chests: stars and bars. Dividers in the gaps between coins split them into chests. */
export function chests(k) {
  const COINS = 5, CHESTS = 3, X0 = 70, Y = 78, GAP = 22;
  k.text(56, 30, `${COINS} coins, ${CHESTS} chests: click gaps`);
  const tally = k.tally('splits found (none empty)');
  const bars = new Set(); // gap numbers holding a divider
  const readout = k.text(56, 96, '');
  for (let i = 0; i < COINS; i++) k.img(X0 + i * GAP, Y, 'coin');
  for (let gap = 1; gap < COINS; gap++) {
    k.button(X0 + gap * GAP - GAP / 2 - 7, Y - 6, '.', button => {
      if (bars.has(gap)) bars.delete(gap);
      else if (bars.size < CHESTS - 1) bars.add(gap);
      else return k.note(`${CHESTS - 1} dividers already make ${CHESTS} chests`);
      button.setText(bars.has(gap) ? '|' : '.');
      if (bars.size < CHESTS - 1) return readout.setText('');
      const cuts = [0, ...[...bars].sort((a, b) => a - b), COINS];
      const split = cuts.slice(1).map((cut, i) => cut - cuts[i]).join(' | ');
      readout.setText(`chests get ${split}`);
      if (!tally.see(split)) k.note('You found this split before');
    });
  }
  return { icon: 'coin', target: k.img(272, 80, 'chest').setScale(2) };
}

/** banner: four recruits under two banners of two; toggle whether the banners have names. */
export function banner(k) {
  const NAMES = 'ABCD';
  k.text(56, 30, 'Click a recruit to switch side');
  const tally = k.tally('divisions found');
  let named = true;
  const side = [0, 0, 1, 1]; // which banner each recruit stands under
  const flags = [k.text(72, 54, 'RED', '#ff004d'), k.text(172, 54, 'BLUE', '#29adff')];
  const recruits = [...NAMES].map((name, i) => {
    const body = k.img(0, 0, `npc_${i}`).setInteractive({ useHandCursor: true });
    const tag = k.text(0, 0, name).setOrigin(0.5);
    body.on('pointerdown', () => { side[i] ^= 1; place(); record(); });
    return { body, tag };
  });
  const place = () => {
    const count = [0, 0];
    recruits.forEach(({ body, tag }, i) => {
      const x = 80 + side[i] * 100 + count[side[i]]++ * 20;
      body.setPosition(x, 74);
      tag.setPosition(x, 88);
    });
  };
  const record = () => {
    const teams = [0, 1].map(s => [...NAMES].filter((_, i) => side[i] === s).join(''));
    if (teams[0].length !== 2) return; // not a 2–2 split yet
    // With unnamed banners, AB|CD and CD|AB are the same division.
    const signature = (named ? teams : [...teams].sort()).join('|');
    if (!tally.see(signature)) k.note(named ? 'You found this division before' : 'Same teams, banners swapped!');
  };
  k.button(56, 98, 'Banners: named', button => {
    named = !named;
    button.setText(`Banners: ${named ? 'named' : 'unnamed'}`);
    flags[0].setText(named ? 'RED' : 'TEAM');
    flags[1].setText(named ? 'BLUE' : 'TEAM');
    tally.reset();
    record();
  });
  place();
  record();
  return { icon: 'scroll', target: recruits[0].body };
}

/** card-table: deal four cards into two named hands; a deal is known by who holds what. */
export function cardTable(k) {
  const FACES = 'AKQJ';
  k.text(56, 30, '4 cards, 2 named hands of 2');
  const tally = k.tally('deals found');
  k.text(66, 58, 'North');
  k.text(166, 58, 'South');
  const cards = [...FACES].map(face => ({ back: k.img(0, 0, 'card'), face: k.text(0, 0, face, '#ff004d').setOrigin(0.5) }));
  const deal = () => {
    const deck = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    deck.forEach((card, seat) => {
      const x = (seat < 2 ? 76 : 176) + (seat % 2) * 18;
      cards[card].back.setPosition(x, 82);
      cards[card].face.setPosition(x, 82);
    });
    const north = deck.slice(0, 2).sort().map(card => FACES[card]).join('');
    if (!tally.see(north)) k.note(`North held ${north} before`);
  };
  k.button(240, 76, 'DEAL', deal);
  deal();
  return { icon: 'coin', target: cards[0].back };
}

/** forge (Ch 1): expand (x+y)^3 by picking x or y from each bracket, and watch Pascal's row appear. */
export function expand(k) {
  const TERMS = ['xxx', 'xxy', 'xyy', 'yyy'], SHOWN = ['x^3', 'x^2 y', 'x y^2', 'y^3'];
  k.text(56, 30, '(x+y)^3: pick from each bracket');
  const pick = ['x', 'x', 'x'];
  const used = new Set();
  const rows = SHOWN.map((name, i) => k.text(196, 46 + i * 12, `${name}: 0`));
  pick.forEach((_, i) => k.button(62 + i * 34, 62, '(x)', button => {
    pick[i] = pick[i] === 'x' ? 'y' : 'x';
    button.setText(`(${pick[i]})`);
  }));
  k.button(62, 86, 'MULTIPLY', () => {
    const word = pick.join('');
    if (used.has(word)) return k.note(`${word} is already counted`);
    used.add(word);
    const sorted = w => [...w].sort().join('');
    const i = TERMS.indexOf(sorted(word));
    rows[i].setText(`${SHOWN[i]}: ${[...used].filter(w => sorted(w) === TERMS[i]).length}`);
    k.note(`${word} gives ${SHOWN[i]}`);
  });
  return { icon: 'scroll', target: k.img(286, 100, 'chest') };
}
