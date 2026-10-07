import Phaser from 'phaser';
import { el, mount } from '../ui/dom.js';
import { say, showScroll } from '../ui/dialogue.js';
import { openForge } from '../ui/forge.js';
import { commit, globalAction } from '../ui/hud.js';
import { input } from '../systems/input.js';
import { state, cq, addXp, level, maxHearts } from '../systems/save.js';
import { content, fill, answerOf } from '../systems/content.js';
import { withinTol } from '../systems/evaluator.js';
import { newCard, review } from '../systems/srs.js';
import { sfx } from '../audio/sfx.js';
import { kit } from '../encounters/kit.js';
import { buildToy, FLAVOUR, BOSSES } from '../encounters/index.js';

/**
 * One scene plays every encounter. It is given a queue of { enc, vars, tex }:
 *   mode 'normal' — one encounter with its original numbers
 *   mode 'echo'   — one encounter with re-rolled numbers (spaced repetition)
 *   mode 'boss'   — several in a row, one hit point per phase
 * The story is told in run(), top to bottom, with `await` wherever the game
 * waits for the player. Nothing in here is ever on a timer.
 */
export default class Encounter extends Phaser.Scene {
  constructor() { super('Encounter'); }

  create({ ch, x, mode, queue }) {
    this.ch = ch;
    this.backX = x;
    this.mode = mode;
    this.alive = true;     // false once we have left; stops the async story
    this.onAction = null;  // set while the question box is waiting for a choice
    this.kit = null;
    this.queue = queue.map(item => ({ ...item, wrongs: 0, hintsUsed: 0, scrolled: false }));
    this.hp = this.queue.reduce((sum, item) => sum + item.enc.phases.length, 0);
    this.bossName = BOSSES[ch - 1];
    cq.scene = 'Encounter';
    cq.event = null;

    this.add.tileSprite(160, 90, 320, 180, 'wood').setTint(0x9a9a9a);
    this.add.tileSprite(160, 19, 320, 16, 'wall');
    this.add.image(302, 20, 'owl'); // Hoot, watching from the rafters
    this.npc = this.add.image(26, 110, 'npc_0').setOrigin(0.5, 1);
    if (mode === 'boss') { this.npc.setScale(2); this.add.image(26, 72, 'crown').setScale(2); }

    this.panel = mount(el('div', { className: 'box ask' }));
    const pop = input.push(action => (this.onAction ? this.onAction(action) : globalAction(action)));
    this.events.once('shutdown', () => { this.alive = false; pop(); this.panel.remove(); });
    this.run();
  }

  /** Promise that resolves after `ms` of game time. */
  wait(ms) { return new Promise(resolve => this.time.delayedCall(ms, resolve)); }

  leave() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.start('Region', { ch: this.ch, x: this.backX });
  }

  async run() {
    const boss = this.mode === 'boss';
    for (const item of this.queue) {
      const { enc, vars } = item;
      this.npc.setTexture(item.tex);
      this.panel.replaceChildren();
      await say(boss ? this.bossName : FLAVOUR[enc.scene].npc, fill(enc.story, vars));
      for (let i = 0; i < enc.phases.length; i++) {
        if (!(await this.phase(item, i))) return; // walked away or fainted
      }
      await this.complete(item);
    }
    if (boss) await this.victory();
    this.leave();
  }

  /** Play one phase until it is forged correctly. Returns false if the player left. */
  async phase(item, index) {
    const { enc, vars } = item, phase = enc.phases[index];
    if (!phase.f) return true; // TODO(M2): `choices` phases become objects you walk to
    const flavour = FLAVOUR[enc.scene];
    const ask = fill(phase.ask, vars);
    // Original numbers use the stored answer; re-rolled ones are recomputed from the formula.
    const answer = this.mode === 'normal' ? phase.answer : answerOf(phase, vars);

    this.kit?.destroy();
    this.kit = kit(this);
    const toy = buildToy(this.kit, enc, vars, index);

    while (this.alive) {
      const action = await this.showAsk(item, ask, index);
      if (action === 'leave') { this.leave(); return false; }
      if (action === 'hoot') { await this.hoot(item); continue; }
      if (action === 'scroll') { await showScroll(enc, vars); continue; }

      const forged = await openForge(ask, vars, fill(enc.story, vars));
      if (!forged) continue; // stepped back from the anvil
      this.panel.replaceChildren();
      const ok = withinTol(forged.value, answer, phase.tol);
      await this.kit.deliver(ok, toy.icon, toy.target);

      if (ok) {
        toy.ok?.();
        cq.event = `${enc.scene}-open`;
        this.kit.note(flavour.ok, '#00e436');
        if (this.mode === 'boss') { this.hp--; this.cameras.main.flash(200, 255, 236, 39); this.tweens.add({ targets: this.npc, alpha: 0.2, duration: 80, yoyo: true, repeat: 3 }); }
        const levelled = addXp(10);
        commit();
        await this.wait(700);
        if (levelled) await say('Hoot', `Level ${level()}! You stand a little taller. Hearts restored.`);
        return true;
      }

      // A wrong forge has consequences in the world, and is written in the Grimoire.
      item.wrongs++;
      state.hearts--;
      state.mistakes.push({
        id: enc.id, ch: enc.ch, sec: enc.sec, title: enc.title, ask,
        expr: forged.expr, value: forged.value, answer, pattern: enc.pattern, t: Date.now(),
      });
      this.scheduleEcho(enc);
      this.kit.note(flavour.bad, '#ff004d');
      commit();
      if (this.mode === 'boss') await say(this.bossName, 'Ha! Wrong. Feel that?');

      if (item.wrongs >= 3 && !item.scrolled) {
        item.scrolled = true;
        state.revealed[enc.id] = true;
        commit();
        await say('Hoot', 'Three sparks. Stop guessing: read the Scroll of Insight, then forge it in your own hand. This one will return as an Echo.');
        await showScroll(enc, vars);
      }
      if (state.hearts <= 0) {
        await say('Hoot', 'You collapse! I will carry you to the tavern. Rest, think it over, and come back.');
        state.hearts = maxHearts();
        state.gold = Math.max(0, state.gold - 5);
        commit();
        this.leave();
        return false;
      }
    }
    return false;
  }

  /** A failed or hinted encounter comes back tomorrow (unless it is already scheduled). */
  scheduleEcho(enc) {
    if (this.mode !== 'echo' && !state.echoes[enc.id]) state.echoes[enc.id] = newCard(Date.now());
  }

  /** The NPC's question with the things you can do about it. Resolves to the chosen action. */
  showAsk(item, ask, index) {
    return new Promise(resolve => {
      const done = action => { this.onAction = null; resolve(action); };
      const button = (id, label, action) => el('button', { id, textContent: label, onclick: () => done(action) });
      const progress = this.mode === 'boss'
        ? `Boss HP ${this.hp}`
        : item.enc.phases.map((_, j) => (j < index ? '*' : j === index ? '>' : '.')).join(' ');
      // The story stays on screen: its numbers are needed while thinking.
      this.panel.replaceChildren(
        el('div', { className: 'ask-story' }, el('b', { textContent: `${item.enc.title}  ` }), fill(item.enc.story, item.vars)),
        el('div', { className: 'ask-text', textContent: ask }),
        el('div', { className: 'ask-buttons' },
          button('forge-open', 'Forge [Enter]', 'forge'),
          button('hoot', 'Hoot [H]', 'hoot'),
          item.scrolled && button('scroll', 'Scroll', 'scroll'),
          button('leave', 'Leave [Esc]', 'leave'),
          el('span', { id: 'ask-progress', textContent: progress })));
      const keys = { confirm: 'forge', interact: 'forge', hoot: 'hoot', menu: 'leave' };
      this.onAction = action => (keys[action] ? done(keys[action]) : globalAction(action));
    });
  }

  /** Hoot gives the next hint — always a question to ask yourself, never the answer. */
  async hoot(item) {
    const { enc, vars } = item;
    const hint = enc.hints[item.hintsUsed];
    if (!hint) {
      await say('Hoot', item.scrolled ? 'The Scroll has said it all. Now forge it yourself.' : 'I have no more questions for you. Play with the toy, trust your reasoning.');
      return;
    }
    item.hintsUsed++;
    this.scheduleEcho(enc);
    commit();
    await say('Hoot', `Ask yourself: ${fill(hint, vars)}`);
  }

  /** Every phase of one encounter is done: cards, gold, Echo bookkeeping. */
  async complete(item) {
    const { enc } = item, now = Date.now();
    const clean = item.wrongs === 0 && item.hintsUsed === 0;
    const first = !state.solved[enc.id];
    state.revealed[enc.id] = true;
    let laidToRest = false;
    if (this.mode === 'echo' && state.echoes[enc.id]) {
      const next = review(state.echoes[enc.id], clean, now);
      if (next) state.echoes[enc.id] = next; else { delete state.echoes[enc.id]; laidToRest = true; }
    }
    if (clean) state.hearts = Math.min(maxHearts(), state.hearts + 1);
    if (first) { state.solved[enc.id] = { clean, t: now }; state.cards.push(enc.id); }
    state.gold += first ? (clean ? 15 : 10) : 3;
    const levelled = addXp(first ? 30 : 10);
    sfx('win');
    commit();

    if (this.mode === 'echo') {
      await say('Hoot', laidToRest ? 'The Echo is at peace. You truly own this pattern.'
        : clean ? 'The Echo fades... it will return later, to check that the idea has stuck.'
          : 'The Echo lingers. It will be back tomorrow.');
    }
    if (first) await say('Hoot', `Pattern Card earned: "${enc.pattern}".${clean ? ' A clean solve!' : ' It will return as an Echo, so you can prove it sticks.'}`);
    if (levelled) await say('Hoot', `Level ${level()}! Hearts restored.`);
  }

  async victory() {
    const first = !state.bosses.includes(this.ch);
    if (first) { state.bosses.push(this.ch); state.gold += 50; }
    commit();
    sfx('win');
    this.cameras.main.shake(400, 0.01);
    await say(this.bossName, 'Every case... counted exactly once. I yield!');
    const next = content.regions[this.ch];
    await say('Hoot', first && next ? `The road to ${next.name} is open! (+50 gold)` : 'Beaten again. Well reasoned.');
  }
}
