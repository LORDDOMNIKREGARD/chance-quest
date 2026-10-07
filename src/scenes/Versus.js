import Phaser from 'phaser';
import { el, panel } from '../ui/dom.js';
import { openForge, closeForge } from '../ui/forge.js';
import { withinTol } from '../systems/evaluator.js';
import { cq } from '../systems/save.js';
import { questions, roomCode, cleanRules, cleanScore, verdict, CLOCKS } from '../systems/versus.js';
import { openLink } from '../systems/net.js';
import { sfx, music } from '../audio/sfx.js';
import { FONT } from '../encounters/kit.js';
import { BUILT_CHAPTERS } from '../encounters/index.js';

// Why a room could not be joined, by PeerJS error type.
const WHY_NOT = {
  'peer-unavailable': 'No duel is waiting under that code.',
  'unavailable-id': 'That room code is taken. Host again for a new one.',
  'browser-incompatible': 'This browser cannot play online.',
};

/**
 * Versus: you and a rival forge the same questions against the same clock.
 * Every exact answer is a hit; most hits when the clock runs out wins. The
 * rival is a friend's browser (online, by room code) or nobody (practice).
 *
 * This is the one place in the game with a clock: the adventure itself never
 * times a calculation. Nothing here touches the saved journey.
 *
 * Messages between the two browsers: { t: 'hello' } from the guest,
 * { t: 'rules', seed, chapters, seconds } from the host, and
 * { t: 'score', hits, misses } from both whenever their score changes.
 */
export default class Versus extends Phaser.Scene {
  constructor() { super('Versus'); }

  create() {
    cq.scene = 'Versus';
    cq.event = null;
    document.body.classList.remove('playing', 'world');
    document.body.classList.add('versus'); // style.css keeps the forge below the arena strip while this is set
    music(0);
    this.alive = true;
    this.link = null;       // the connection to the rival's browser (null: practising alone)
    this.window = null;     // the lobby or result window, while one is open
    this.deadline = null;   // performance.now() at which the duel ends; null while nobody is playing
    this.question = null;   // the question on the anvil
    this.me = { hits: 0, misses: 0 };
    this.rival = null;      // the rival's score; null when practising alone
    this.rivalGone = false; // true once the rival's browser has left
    this.onHello = null;    // set while the host waits for the guest to say hello
    this.onRules = null;    // set while the guest waits for the host's rules
    this.showResult = null; // set once the result window is open, to keep its score line fresh

    // The arena is the top 22 pixels: the forge covers the rest of the screen while a duel runs.
    this.add.tileSprite(160, 90, 320, 180, 'wood').setTint(0x9a9a9a);
    this.hero = this.add.image(12, 20, 'hero_side_0').setOrigin(0.5, 1).setFlipX(true); // the side view faces left
    this.foe = this.add.image(308, 20, 'ghost').setOrigin(0.5, 1);                      // a training ghost, until a rival joins
    this.clock = this.add.text(160, 3, '', { ...FONT, fontSize: '16px', color: '#ffec27' }).setOrigin(0.5, 0);
    this.myScore = this.add.text(24, 7, '', FONT);
    this.foeScore = this.add.text(296, 7, '', FONT).setOrigin(1, 0);
    this.note = this.add.text(160, 30, '', { ...FONT, color: '#c2c3c7' }).setOrigin(0.5, 0); // for the moments without a forge
    // Skipping is Esc on a keyboard; this button is for phones. Either way it just closes the forge.
    this.skip = this.add.text(78, 5, 'skip', FONT).setBackgroundColor('#5f574f').setPadding(3, 2, 3, 2).setVisible(false)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.deadline) closeForge(); });

    this.events.once('shutdown', () => {
      document.body.classList.remove('versus');
      this.alive = false;
      this.deadline = null;
      this.link?.close();
      this.window?.close();
      closeForge(); // which also ends the duel loop
    });
    this.lobby();
  }

  /** Promise that resolves after `ms` of game time. */
  wait(ms) { return new Promise(resolve => this.time.delayedCall(ms, resolve)); }

  update() {
    if (!this.deadline) return;
    const left = Math.max(0, this.deadline - performance.now()), seconds = Math.ceil(left / 1000);
    this.clock.setText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
    if (left === 0) { this.deadline = null; closeForge(); } // time! Closing the forge is what ends the duel loop
  }

  /** The window where a duel is set up: host one, join one, or practise alone. */
  lobby() {
    const rules = { chapters: Array.from({ length: BUILT_CHAPTERS }, (_, i) => i + 1), seconds: CLOCKS[1] };
    const newSeed = () => Math.floor(Math.random() * 2 ** 32);
    const status = el('p', { id: 'versus-status' });
    const code = el('input', { id: 'versus-code', placeholder: 'code', maxLength: 5, autocomplete: 'off', spellcheck: false });
    let started = false;

    const begin = (duelRules, link) => {
      if (!link) { this.link?.close(); this.link = null; } // practising: drop a room we may still be waiting in
      started = true;
      win.close();
      this.duel(duelRules, link);
    };

    /** Link up with the other player in `room`. Resolves to true once the two browsers are connected. */
    const connect = async (room, isHost) => {
      this.link?.close();
      const link = this.link = openLink(room, isHost, message => this.hear(message), () => this.rivalLeft());
      try { await link.ready; } catch (error) {
        if (this.link === link) { // (otherwise we have moved on to another room and this one no longer matters)
          this.link = null;
          status.textContent = WHY_NOT[error.type] ?? 'Could not reach the matchmaking server. Check your connection, or practise alone.';
        }
        return false;
      }
      return this.alive && this.link === link;
    };

    const host = async () => {
      const room = roomCode();
      status.textContent = `Your room code is ${room}. Tell your rival: the duel starts when they join.`;
      const hello = new Promise(resolve => { this.onHello = resolve; }); // listen first, connect second
      if (!(await connect(room, true))) return;
      await hello; // the guest is listening now, so the rules cannot be missed
      const duelRules = cleanRules({ ...rules, seed: newSeed() }, BUILT_CHAPTERS);
      this.link.send({ t: 'rules', ...duelRules });
      begin(duelRules, this.link);
    };

    const join = async () => {
      const room = code.value.trim().toUpperCase();
      if (!room) { status.textContent = 'Type the room code your rival gave you.'; return; }
      status.textContent = `Looking for room ${room}...`;
      const rulesArrive = new Promise(resolve => { this.onRules = resolve; });
      if (!(await connect(room, false))) return;
      status.textContent = 'Connected. Waiting for the host...';
      this.link.send({ t: 'hello' });
      begin(await rulesArrive, this.link);
    };

    // Chapter buttons switch on and off; the last one stays on, so there is always something to ask.
    const chapterButton = ch => el('button', { className: 'on', textContent: `Ch ${ch}`, onclick: ev => {
      const others = rules.chapters.filter(c => c !== ch);
      if (others.length === rules.chapters.length) rules.chapters.push(ch);
      else if (others.length) rules.chapters = others;
      ev.target.classList.toggle('on', rules.chapters.includes(ch));
    } });
    const clock = el('button', { id: 'versus-clock', textContent: `${rules.seconds / 60} min`, onclick: () => {
      rules.seconds = CLOCKS[(CLOCKS.indexOf(rules.seconds) + 1) % CLOCKS.length];
      clock.textContent = `${rules.seconds / 60} min`;
    } });

    const win = this.window = panel('Versus', el('div', { className: 'versus' },
      el('p', { textContent: 'You and a rival forge the same questions against the same clock. Every exact answer is a hit. Esc (or the skip button) passes on a question.' }),
      el('div', { className: 'row' }, el('span', { className: 'dim', textContent: 'Questions from' }), rules.chapters.map(chapterButton)),
      el('div', { className: 'row' }, el('span', { className: 'dim', textContent: 'Clock' }), clock),
      el('div', { className: 'row' },
        el('button', { id: 'versus-host', textContent: 'Host a duel', onclick: host }),
        code,
        el('button', { id: 'versus-join', textContent: 'Join', onclick: join }),
        el('button', { id: 'versus-solo', textContent: 'Practise alone', onclick: () => begin(cleanRules({ ...rules, seed: newSeed() }, BUILT_CHAPTERS), null) })),
      status,
      el('p', { className: 'dim', textContent: 'An online duel links your two browsers directly; the public PeerJS service only introduces them. Nothing is saved, and your journey is not affected.' })));
    win.done.then(() => { this.window = null; if (!started && this.alive) this.scene.start('Title'); });
  }

  /** A message from the rival's browser. Nothing in it is trusted. */
  hear(message) {
    if (message?.t === 'hello') this.onHello?.();
    else if (message?.t === 'rules') this.onRules?.(cleanRules(message, BUILT_CHAPTERS));
    else if (message?.t === 'score' && this.rival) {
      const before = this.rival.hits;
      this.rival = cleanScore(message);
      if (this.rival.hits > before) this.fire(this.foe, this.hero);
      this.showScores();
      this.showResult?.();
    }
  }

  rivalLeft() {
    this.rivalGone = true;
    if (this.alive && this.rival) this.showScores();
  }

  showScores() {
    this.myScore.setText(`YOU ${this.me.hits}`);
    this.foeScore.setText(!this.rival ? 'practice' : this.rivalGone ? `${this.rival.hits} (left)` : `${this.rival.hits} RIVAL`);
  }

  /** A shot flies from one fighter to the other, who flinches. */
  fire(from, to) {
    const shot = this.add.image(from.x, from.y - 8, 'spark').setScale(2).setTint(0xffec27);
    this.tweens.add({
      targets: shot, x: to.x, duration: 250,
      onComplete: () => {
        shot.destroy();
        this.tweens.add({ targets: to, alpha: 0.3, duration: 70, yoyo: true, repeat: 2 });
      },
    });
  }

  /** Play one duel under `rules`. `link` is the rival's browser, or null when practising. */
  async duel(rules, link) {
    this.rival = link ? { hits: 0, misses: 0 } : null;
    if (link) this.foe.setTexture('hero_side_0').setTint(0xff77a8);
    this.showScores();
    for (const count of [3, 2, 1]) {
      this.note.setText(`Get ready... ${count}`);
      sfx('blip');
      await this.wait(600);
    }
    this.note.setText('');
    this.skip.setVisible(true);
    this.deadline = performance.now() + rules.seconds * 1000;
    cq.event = 'versus-go';

    for (const question of questions(rules.seed, rules.chapters)) {
      this.question = question;
      let forged;
      // Forge this question until it is exact, skipped (Esc), or the clock closes the forge.
      while (this.deadline && (forged = await openForge(question.ask, question.vars, question.story))) {
        const exact = withinTol(forged.value, question.answer, question.tol);
        if (exact) this.me.hits++; else this.me.misses++;
        sfx(exact ? 'ok' : 'bad');
        if (exact) this.fire(this.hero, this.foe); else this.fire(this.foe, this.hero); // a wrong answer is the rival's free shot
        this.showScores();
        this.link?.send({ t: 'score', ...this.me });
        if (exact) break;
      }
      if (!this.deadline) break;
    }
    this.result();
  }

  /** Time is up: show the scores and offer another duel. */
  result() {
    if (!this.alive) return;
    cq.event = 'versus-over';
    this.clock.setText('0:00');
    this.note.setText('Time!');
    this.skip.setVisible(false);
    sfx('win');
    this.link?.send({ t: 'score', ...this.me });

    const line = el('p', { id: 'versus-result' });
    this.showResult = () => {
      const mine = `You: ${this.me.hits} exact, ${this.me.misses} missed.`;
      const outcome = { me: 'You win!', rival: 'Your rival wins.', draw: 'A draw.' };
      line.textContent = this.rival
        ? `${mine} Rival: ${this.rival.hits} exact, ${this.rival.misses} missed. ${outcome[verdict(this.me, this.rival)]}`
        : mine;
    };
    this.showResult();

    let again = false;
    const win = this.window = panel('Time!', el('div', { className: 'versus' },
      line,
      this.rival && el('p', { className: 'dim', textContent: 'Your rival\'s clock may still be running for a moment: the line above follows their score.' }),
      el('div', { className: 'row' },
        el('button', { id: 'versus-again', textContent: 'Another duel', onclick: () => { again = true; win.close(); } }),
        el('button', { id: 'versus-title', textContent: 'Back to title', onclick: () => win.close() }))));
    win.done.then(() => { this.window = null; if (this.alive) this.scene.start(again ? 'Versus' : 'Title'); });
  }
}
