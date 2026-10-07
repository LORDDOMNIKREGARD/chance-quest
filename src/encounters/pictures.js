// Pictures of ONE run of an experiment.
//
// Most trials are drawn as tokens (dice, cards, stones, words). A trial can
// instead ask for a small scene by adding `act: { play: '<name>', … }` to what
// it returns (see systems/sim.js):
//
//   stopwatch  a time window is swept and travellers pop up when they arrive
//   page       a page of 500 letters with the scribe's slips circled
//   ledge      the gambler's gold wandering between broke and the goal
//   roulette   the wheel spins once per bet
//   duel       two fighters; whoever lands the last blow fires
//
// Each picture only shows what the trial already decided: nothing here rolls
// dice of its own.
import { FONT } from './kit.js';
import { sfx } from '../audio/sfx.js';

const GREEN = 0x00e436, RED = 0xff004d, GREY = 0x5f574f, GOLD = 0xffec27, WHITE = 0xfff1e8, NAVY = 0x1d2b53;

/**
 * The list of things one run drew, so the experiment can clear them before the
 * next run. `bottom` is the y just below the picture; put() adds an object.
 * A tween is stopped together with its picture: put({ destroy: () => tween.remove() }).
 */
function drawing(bottom) {
  const made = [];
  made.bottom = bottom;
  made.put = obj => { made.push(obj); obj.setDepth?.(2); return obj; };
  return made;
}

/** A time window: the hand sweeps across and each traveller appears at the moment of arrival. */
function stopwatch(scene, { x, y, w }, { minutes, times }) {
  const d = drawing(y + 38);
  const LEFT = x + 2, RIGHT = x + w - 6, xOf = minute => LEFT + (RIGHT - LEFT) * minute / minutes;
  const frame = d.put(scene.add.graphics());
  frame.fillStyle(NAVY).fillRect(LEFT, y + 10, RIGHT - LEFT, 13).lineStyle(1, WHITE).strokeRect(LEFT, y + 10, RIGHT - LEFT, 13);
  for (let minute = 0; minute <= minutes; minute++) frame.fillStyle(WHITE).fillRect(Math.round(xOf(minute)), y + 23, 1, 3);
  d.put(scene.add.text(LEFT, y + 28, '0', FONT));
  d.put(scene.add.text(RIGHT, y + 28, `${minutes} min`, FONT).setOrigin(1, 0));
  const clock = d.put(scene.add.text(LEFT, y, '', { ...FONT, color: '#ffec27' }));
  const travellers = times.map(t => d.put(scene.add.image(xOf(t), y + 16, 'stone').setVisible(false)));
  const hand = d.put(scene.add.rectangle(LEFT, y + 16, 1, 17, GOLD));

  const sweep = scene.tweens.addCounter({
    from: 0, to: minutes, duration: 700,
    onUpdate: tween => {
      const now = tween.getValue();
      hand.setX(xOf(now));
      travellers.forEach((traveller, i) => {
        if (times[i] <= now && !traveller.visible) { traveller.setVisible(true); sfx('tick'); }
      });
      clock.setText(`${now.toFixed(1)} min: ${times.filter(t => t <= now).length} came`);
    },
  });
  d.put({ destroy: () => sweep.remove() });
  return d;
}

/** One page: 500 letters in 10 lines of 50. A slip is red and circled. */
function page(scene, { x, y }, { slips }) {
  const d = drawing(y + 38);
  const sheet = d.put(scene.add.graphics());
  sheet.fillStyle(0xffccaa).fillRect(x, y, 106, 36);
  const spot = letter => [x + 3 + (letter % 50) * 2, y + 4 + Math.floor(letter / 50) * 3];
  for (let letter = 0; letter < 500; letter++) sheet.fillStyle(0xab5236).fillRect(...spot(letter), 1, 2);
  for (const letter of slips) {
    const [sx, sy] = spot(letter);
    sheet.fillStyle(RED).fillRect(sx - 1, sy, 3, 2).lineStyle(1, RED).strokeRect(sx - 3.5, sy - 2.5, 8, 7);
  }
  return d;
}

/** The gambler's ledge: gold after every bet, between the red floor (broke) and the green goal. */
function ledge(scene, { x, y, w }, { path, top }) {
  const d = drawing(y + 44);
  const LEFT = x + 2, RIGHT = x + w - 22, TOP = y + 3, BOTTOM = y + 40;
  const xOf = bet => LEFT + (RIGHT - LEFT) * bet / (path.length - 1), yOf = gold => BOTTOM - (BOTTOM - TOP) * gold / top;
  const rails = d.put(scene.add.graphics());
  rails.fillStyle(GREEN).fillRect(LEFT, TOP, RIGHT - LEFT, 1).fillStyle(RED).fillRect(LEFT, BOTTOM, RIGHT - LEFT, 1);
  d.put(scene.add.text(RIGHT + 3, TOP - 3, String(top), { ...FONT, color: '#00e436' }));
  d.put(scene.add.text(RIGHT + 3, BOTTOM - 5, '0', { ...FONT, color: '#ff004d' }));
  const trail = d.put(scene.add.graphics());
  let drawn = 0;
  const walk = scene.tweens.addCounter({
    from: 0, to: path.length - 1, duration: 600,
    onUpdate: tween => {
      const upto = Math.floor(tween.getValue());
      if (upto <= drawn) return;
      trail.lineStyle(1, WHITE).beginPath().moveTo(xOf(drawn), yOf(path[drawn]));
      for (let bet = drawn + 1; bet <= upto; bet++) trail.lineTo(xOf(bet), yOf(path[bet]));
      trail.strokePath();
      drawn = upto;
    },
  });
  d.put({ destroy: () => walk.remove() });
  return d;
}

/** The wheel turns once per bet; each bet leaves a red stone (red came up) or a grey one. */
function roulette(scene, { x, y }, { spins, net }) {
  const d = drawing(y + 36);
  const wheel = d.put(scene.add.graphics({ x: x + 17, y: y + 17 }));
  for (let pocket = 0; pocket < 12; pocket++) { // red and black in turn, and one green zero
    wheel.fillStyle(pocket === 0 ? GREEN : pocket % 2 ? RED : 0x000000)
      .slice(0, 0, 16, pocket * Math.PI / 6, (pocket + 1) * Math.PI / 6).fillPath();
  }
  wheel.lineStyle(1, WHITE).strokeCircle(0, 0, 16);
  const stones = spins.map((red, i) => d.put(scene.add.image(x + 46 + i * 12, y + 10, 'stone').setTint(red ? RED : GREY).setVisible(false)));
  const total = d.put(scene.add.text(x + 42, y + 22, '', FONT));
  const spin = scene.tweens.addCounter({
    from: 0, to: spins.length, duration: 350 * spins.length,
    onUpdate: tween => {
      const turns = tween.getValue();
      wheel.setAngle(turns * 360);
      stones.forEach((stone, i) => stone.setVisible(turns >= i + 1));
      if (turns >= spins.length) total.setText(`net ${net > 0 ? '+' : ''}${net}`);
    },
  });
  d.put({ destroy: () => spin.remove() });
  return d;
}

const RUN_PICTURES = { stopwatch, page, ledge, roulette };

/**
 * The duel ground: your champion (right) faces the encounter's owner (left).
 * They stay for the whole phase, so they can also act out what the forge decides:
 * ok() is your clean hit, bad() is the rival's free shot.
 */
function duelGround(k, { x, y, w }) {
  const { scene } = k;
  const GROUND = y + 42;
  let shots = [];
  /** Stop whatever is still moving and stand both fighters up again. */
  const calm = () => {
    scene.tweens.killTweensOf([rival, hero, ...shots]);
    shots.forEach(shot => shot.destroy());
    shots = [];
    for (const fighter of [rival, hero]) fighter.setAlpha(1).clearTint();
  };
  k.add({ destroy: () => { scene.tweens.killTweensOf([rival, hero, ...shots]); shots.forEach(shot => shot.destroy()); } });
  const rival = k.img(x + 14, GROUND, scene.npc.texture.key).setOrigin(0.5, 1);
  const hero = k.img(x + w - 18, GROUND, 'hero_side_0').setOrigin(0.5, 1); // the side view faces left
  k.text(rival.x, y + 14, 'rival', '#c2c3c7').setOrigin(0.5, 0);
  k.text(hero.x, y + 14, 'you', '#c2c3c7').setOrigin(0.5, 0);
  k.add(scene.add.rectangle(x + w / 2, GROUND, w - 4, 1, GREY));

  /** A shot flies from one fighter to the other, who flinches. */
  function fire(from, to) {
    const shot = scene.add.image(from.x, from.y - 8, 'spark').setScale(2).setTint(GOLD).setDepth(3);
    shots.push(shot);
    scene.tweens.add({
      targets: shot, x: to.x, duration: 220,
      onComplete: () => {
        shot.setVisible(false);
        to.setTint(RED);
        scene.tweens.add({ targets: to, alpha: 0.3, duration: 70, yoyo: true, repeat: 2, onComplete: () => to.clearTint() });
      },
    });
  }

  return {
    target: hero,
    ok() { calm(); fire(hero, rival); },
    bad() { calm(); fire(rival, hero); },
    /** bouts: one letter per bout — W yours, L the rival's, B both hit, '-' nobody. The last one is acted out. */
    play({ bouts }) {
      calm();
      const d = drawing(GROUND + 3);
      const colour = { W: GREEN, L: RED, B: GOLD, '-': GREY };
      [...bouts.slice(-20)].forEach((bout, i) => d.put(scene.add.rectangle(x + 4 + i * 6, y + 4, 5, 5, colour[bout])));
      const last = bouts.at(-1);
      if (last !== 'L') fire(hero, rival);
      if (last !== 'W') fire(rival, hero);
      return d;
    },
  };
}

/**
 * Set the stage for an experiment whose trials carry an `act`.
 * @param act  the act of any one run (it tells us which kind of picture this experiment uses)
 * @returns {{ play: (act) => object[], target?, ok?, bad? }}
 */
export function stage(k, box, act) {
  if (act.play === 'duel') return duelGround(k, box);
  return { play: run => RUN_PICTURES[run.play](k.scene, box, run) };
}
