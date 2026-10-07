import Phaser from 'phaser';
import { el, mount } from '../ui/dom.js';
import { say, showScroll } from '../ui/dialogue.js';
import { openForge } from '../ui/forge.js';
import { openFlask } from '../ui/flask.js';
import { commit, globalAction } from '../ui/hud.js';
import { input } from '../systems/input.js';
import { state, cq, addXp, level, maxHearts } from '../systems/save.js';
import { content, fill, answerOf } from '../systems/content.js';
import { withinTol } from '../systems/evaluator.js';
import { newCard, review } from '../systems/srs.js';
import { simFor } from '../systems/sims/index.js';
import { sfx } from '../audio/sfx.js';
import { kit } from '../encounters/kit.js';
import { buildToy, FLAVOUR, BOSSES } from '../encounters/index.js';
import { runBoard, compareGauge, tidy } from '../encounters/tallyBoard.js';
import { walkToChoice } from '../encounters/pedestals.js';

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
    this.walk = null;      // set while the hero walks between pedestals (choice phases)
    this.take = null;
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
    this.events.once('shutdown', () => { this.alive = false; pop(); this.panel.remove(); document.body.classList.remove('world'); });
    this.run();
  }

  update(_time, dt) { this.walk?.(dt); }

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

  /** Play one phase until it is answered correctly. Returns false if the player left. */
  async phase(item, index) {
    const { enc, vars } = item, phase = enc.phases[index];
    const ask = fill(phase.ask, vars);
    this.kit?.destroy();
    this.kit = kit(this);
    if (phase.choices) return this.choicePhase(item, index, ask);

    // Original numbers use the stored answer; re-rolled ones are recomputed from the formula.
    const answer = this.mode === 'normal' ? phase.answer : answerOf(phase, vars);
    // Probability and expectation phases go Predict → Run → Compare (bosses skip straight to the forge).
    const sim = this.mode === 'boss' ? null : simFor(enc, index);
    const prc = sim && (sim.kind === 'P' || sim.kind === 'E') ? { sim, gut: null, run: null } : null;
    const toy = buildToy(this.kit, enc, vars, index);

    while (this.alive) {
      const action = await this.showAsk(item, ask, index, prc);
      if (action === 'leave') { this.leave(); return false; }
      if (action === 'hoot') { await this.hoot(item); continue; }
      if (action === 'scroll') { await showScroll(enc, vars); continue; }
      if (action === 'predict') {
        const gut = await openFlask(ask, sim.lo, sim.hi);
        if (gut === null) continue;
        this.panel.replaceChildren();
        prc.gut = gut;
        prc.run = await runBoard(this, sim, vars);
        cq.event = 'run-done';
        continue;
      }

      const forged = await openForge(ask, vars, fill(enc.story, vars));
      if (!forged) continue; // stepped back from the anvil
      this.panel.replaceChildren();
      const ok = withinTol(forged.value, answer, phase.tol);
      await this.kit.deliver(ok, toy.icon, toy.target);
      if (!ok) {
        toy.bad?.();
        if (await this.miss(item, ask, forged.expr, forged.value, answer)) continue;
        return false;
      }
      toy.ok?.();
      await this.hit(enc);
      if (prc) await this.compare(prc, answer);
      return true;
    }
    return false;
  }

  /** A phase with `choices`: the options are pedestals to walk to, never a list. */
  async choicePhase(item, index, ask) {
    const { enc } = item, phase = enc.phases[index];
    while (this.alive) {
      this.kit.destroy();
      this.kit = kit(this);
      const picked = walkToChoice(this, this.kit, phase.choices);
      const buttons = this.showAsk(item, ask, index, null, true); // Hoot / Leave stay available
      const action = await Promise.race([picked, buttons]);
      this.walk = null;
      this.take = null;
      this.onAction = null;
      document.body.classList.remove('world');
      if (action === 'leave') { this.leave(); return false; }
      if (action === 'hoot') { await this.hoot(item); continue; }
      if (action === 'scroll') { await showScroll(enc, item.vars); continue; }
      this.panel.replaceChildren();
      if (action === phase.correct) { await this.hit(enc); return true; }
      const stillHere = await this.miss(item, ask, `chose "${phase.choices[action]}"`, '-', phase.choices[phase.correct]);
      if (!stillHere) return false;
    }
    return false;
  }

  /** A right answer: the world reacts, XP is earned. */
  async hit(enc) {
    cq.event = `${enc.scene}-open`;
    sfx('ok');
    this.cameras.main.shake(120, 0.004);
    this.kit.note(FLAVOUR[enc.scene].ok, '#00e436');
    if (this.mode === 'boss') {
      this.hp--;
      this.cameras.main.flash(200, 255, 236, 39);
      this.tweens.add({ targets: this.npc, alpha: 0.2, duration: 80, yoyo: true, repeat: 3 });
    }
    const levelled = addXp(10);
    commit();
    await this.wait(700);
    if (levelled) await say('Hoot', `Level ${level()}! You stand a little taller. Hearts restored.`);
  }

  /**
   * A wrong answer has consequences in the world and is written in the Grimoire.
   * Returns false if it knocked the player out (the encounter is over).
   */
  async miss(item, ask, expr, value, answer) {
    const { enc, vars } = item, flavour = FLAVOUR[enc.scene];
    item.wrongs++;
    // At a betting table you lose your stake; anywhere else (or with an empty purse) it costs a heart.
    if (flavour.stake && state.gold >= 3) state.gold -= 3; else state.hearts--;
    state.mistakes.push({ id: enc.id, ch: enc.ch, sec: enc.sec, title: enc.title, ask, expr, value, answer, pattern: enc.pattern, t: Date.now() });
    this.scheduleEcho(enc);
    this.cameras.main.shake(200, 0.01);
    sfx('bad');
    this.kit.note(flavour.bad, '#ff004d');
    commit();
    if (this.mode === 'boss') await say(this.bossName, 'Ha! Wrong. Feel that?');

    if (item.wrongs >= 3 && !item.scrolled) {
      item.scrolled = true;
      state.revealed[enc.id] = true;
      commit();
      await say('Hoot', 'Three sparks. Stop guessing: read the Scroll of Insight, then answer in your own hand. This one will return as an Echo.');
      await showScroll(enc, vars);
    }
    if (state.hearts > 0) return true;
    await say('Hoot', 'You collapse! I will carry you to the tavern. Rest, think it over, and come back.');
    state.hearts = maxHearts();
    state.gold = Math.max(0, state.gold - 5);
    commit();
    this.leave();
    return false;
  }

  /** Compare: gut, simulation and exact answer side by side. */
  async compare(prc, answer) {
    const { sim, gut, run } = prc;
    const gauge = compareGauge(this, { gut, sim: run.mean, exact: answer, lo: sim.lo, hi: sim.hi });
    const off = Math.abs(gut - answer) / (sim.hi - sim.lo);
    const verdict = off < 0.03 ? 'Your gut was right on it.' : off < 0.1 ? 'Your gut was close.' : 'Your gut was well off. Worth asking yourself why.';
    await say('Hoot', `Gut ${tidy(gut)}. ${run.kept} honest runs gave ${tidy(run.mean)}. Exact: ${tidy(answer)}. ${verdict}`);
    gauge.destroy();
  }

  /** A failed or hinted encounter comes back tomorrow (unless it is already scheduled). */
  scheduleEcho(enc) {
    if (this.mode !== 'echo' && !state.echoes[enc.id]) state.echoes[enc.id] = newCard(Date.now());
  }

  /**
   * The NPC's question with the things you can do about it. Resolves to the chosen action.
   * `prc` is the Predict → Run → Compare state of this phase (or null); with
   * `worldAnswer` the answer is given in the room, so there is no forge button.
   */
  showAsk(item, ask, index, prc = null, worldAnswer = false) {
    return new Promise(resolve => {
      const done = action => { this.onAction = null; resolve(action); };
      const button = (id, label, action) => el('button', { id, textContent: label, onclick: () => done(action) });
      const main = worldAnswer ? null : prc && !prc.run ? 'predict' : 'forge';
      const progress = this.mode === 'boss'
        ? `Boss HP ${this.hp}`
        : item.enc.phases.map((_, j) => (j < index ? '*' : j === index ? '>' : '.')).join(' ');
      // The story stays on screen: its numbers are needed while thinking.
      // Optional rows are written with && and the `false` ones filtered out at the end.
      const rows = [
        el('div', { className: 'ask-story' }, el('b', { textContent: `${item.enc.title}  ` }), fill(item.enc.story, item.vars)),
        el('div', { className: 'ask-text', textContent: ask }),
        prc?.run && el('div', { id: 'ask-prc', className: 'ask-story', textContent: `Gut ${tidy(prc.gut)} | ${prc.run.kept} honest runs: ${tidy(prc.run.mean)} | now forge it.` }), // one line: the toy above needs the room
        el('div', { className: 'ask-buttons' },
          main === 'predict' && button('predict', 'Pour your guess [Enter]', 'predict'),
          main === 'forge' && button('forge-open', 'Forge [Enter]', 'forge'),
          button('hoot', 'Hoot [H]', 'hoot'),
          item.scrolled && button('scroll', 'Scroll', 'scroll'),
          button('leave', 'Leave [Esc]', 'leave'),
          el('span', { id: 'ask-progress', textContent: progress })),
      ];
      this.panel.replaceChildren(...rows.filter(Boolean));
      this.onAction = action => {
        if (action === 'hoot') done('hoot');
        else if (action === 'menu') done('leave');
        else if (action !== 'confirm' && action !== 'interact') globalAction(action);
        else if (main) done(main);
        else this.take?.(); // choice phase: E takes whatever the hero stands at
      };
    });
  }

  /** Hoot gives the next hint — always a question to ask yourself, never the answer. */
  async hoot(item) {
    const { enc, vars } = item;
    const hint = enc.hints[item.hintsUsed];
    if (!hint) {
      await say('Hoot', item.scrolled ? 'The Scroll has said it all. Now answer it yourself.' : 'I have no more questions for you. Play with the toy, trust your reasoning.');
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
    await say(this.bossName, 'Every case... weighed exactly once. I yield!');
    const next = content.regions[this.ch];
    await say('Hoot', first && next ? `The road to ${next.name} is open! (+50 gold)` : 'Beaten again. Well reasoned.');
  }
}
