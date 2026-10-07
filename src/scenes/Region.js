import Phaser from 'phaser';
import { Walker } from './walker.js';
import { say, choose } from '../ui/dialogue.js';
import { commit, globalAction, echoesDue } from '../ui/hud.js';
import { openBounty } from '../ui/bounty.js';
import { openShrine } from '../ui/shrine.js';
import { input } from '../systems/input.js';
import { state, cq, maxHearts } from '../systems/save.js';
import { encById, regionEncounters, reroll } from '../systems/content.js';
import { music } from '../audio/sfx.js';
import { FONT } from '../encounters/kit.js';
import { BOSSES } from '../encounters/index.js';

// A region is one long street, 11 tiles high and a few screens wide:
//   row 0      forest edge
//   rows 1–3   buildings (two rows of roof, one of wall with a door)
//   row 4      porch — everything you can talk to stands here
//   rows 5–8   the road you walk on (Echoes haunt its lower edge)
//   rows 9–10  meadow and river
const ROWS = 11, T = 16;
const PORCH_Y = 5 * T;     // feet of things standing on the porch
const ECHO_Y = 8 * T;      // feet of Echo ghosts
// What each region's street is painted with: the ground behind the houses,
// the road, the strip below the road, and the far edge.
const LOOK = {
  1: { ground: 'grass', road: 'path', verge: 'grass', edge: 'water', trees: true },  // Tallyburg: a village green
  2: { ground: 'moss', road: 'moss', verge: 'reeds', edge: 'water', ponds: true },   // Venn Marshes: bog and ponds
  3: { ground: 'path', road: 'wood', verge: 'water', edge: 'water' },                // Bayesport: a boardwalk over the harbour
  4: { ground: 'sand', road: 'sand', verge: 'sand', edge: 'path', trees: true },     // Fortune Bazaar: desert market
};
const slotCol = i => 4 + i * 3;             // left column of the i-th building
const slotX = i => (slotCol(i) + 1) * T + 8; // its door, where the owner stands

export default class Region extends Phaser.Scene {
  constructor() { super('Region'); }

  create({ ch, x = 40 }) {
    this.ch = ch;
    cq.scene = 'Region';
    cq.near = null;
    document.body.classList.add('playing', 'world');
    state.where = { scene: 'Region', ch, x };
    commit();
    music(ch);

    const encounters = regionEncounters(ch);
    // The final boss chains the region's last (up to) three boss encounters.
    this.bossFight = encounters.filter(enc => enc.boss).slice(-3);
    this.things = [
      { kind: 'board', id: 'board', label: 'Tavern: Bounty Board', tex: 'board' },
      { kind: 'shrine', id: 'shrine', label: 'Star Shrine', tex: 'shrine' },
      ...encounters.map((enc, i) => ({ kind: 'enc', id: enc.id, label: enc.title, tex: `npc_${i % 8}`, enc })),
      { kind: 'boss', id: 'boss', label: `BOSS: ${BOSSES[ch - 1]}`, tex: 'npc_7' },
    ];
    this.things.forEach((thing, i) => { thing.x = slotX(i); thing.y = PORCH_Y; });

    const cols = slotCol(this.things.length) + 3;
    this.widthPx = cols * T;
    this.paintStreet(cols);

    for (const thing of this.things) {
      this.add.image(thing.x, thing.y, thing.tex).setOrigin(0.5, 1);
      const crowned = thing.kind === 'boss' || thing.enc?.boss;
      if (crowned) this.add.image(thing.x, thing.y - 17, 'crown');
      if (state.solved[thing.id] || (thing.kind === 'boss' && state.bosses.includes(ch))) this.add.image(thing.x, thing.y - 26, 'star');
    }

    // Due Echoes of this region appear as ghosts on the road below their owner.
    for (const id of echoesDue()) {
      const enc = encById(id), owner = this.things.find(thing => thing.id === id);
      if (!enc || enc.ch !== ch || !owner) continue;
      const ghost = this.add.image(owner.x, ECHO_Y, 'ghost').setOrigin(0.5, 1).setAlpha(0.85).setTint(0x83769c);
      this.tweens.add({ targets: ghost, y: ECHO_Y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.things.push({ kind: 'echo', id: `echo:${id}`, label: `Echo: ${enc.title}`, tex: owner.tex, enc, x: owner.x, y: ECHO_Y });
    }

    this.add.text(4, PORCH_Y - 14, '< map', { ...FONT, backgroundColor: '#000000' });
    this.walker = new Walker(this, x, PORCH_Y + 10);
    this.label = this.add.text(0, 0, '', { ...FONT, backgroundColor: '#000000', padding: { x: 2, y: 2 } }).setOrigin(0.5, 1).setDepth(20);
    this.cameras.main.setBackgroundColor('#29adff').setBounds(0, -2, this.widthPx, 180).startFollow(this.walker.sprite, true);

    this.near = null;
    this.handler = action => {
      if (action !== 'interact' && action !== 'confirm') return void globalAction(action);
      if (this.near) this.interact(this.near);
    };
    const pop = input.push(this.handler);
    this.events.once('shutdown', () => { pop(); document.body.classList.remove('world'); });
  }

  /** Draw the whole street once into a single big texture. */
  paintStreet(cols) {
    if (this.textures.exists('street')) this.textures.remove('street');
    const tex = this.textures.createCanvas('street', cols * T, ROWS * T);
    const ctx = tex.getContext();
    const put = (key, c, r) => ctx.drawImage(this.textures.get(key).getSourceImage(), c * T, r * T);
    const look = LOOK[this.ch] ?? LOOK[1];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= 3; r++) put(look.ground, c, r);
      put('tree', c, 0);
      for (let r = 4; r <= 8; r++) put(look.road, c, r);
      put(look.verge === 'grass' && c % 3 === 1 ? 'flowers' : look.verge, c, 9);
      if (look.ponds && c % 4 < 2) put('water', c, 9);
      else if (look.trees && c % 5 === 2) put('tree', c, 9);
      put(look.edge, c, 10);
    }
    this.things.forEach((thing, i) => {
      const c0 = slotCol(i);
      if (thing.kind === 'shrine') { put('tree', c0, 3); put('tree', c0 + 2, 3); put('flowers', c0 + 1, 3); return; }
      for (let dc = 0; dc < 3; dc++) {
        put(`roof_${i % 4}`, c0 + dc, 1);
        put(`roof_${i % 4}`, c0 + dc, 2);
        put('wall', c0 + dc, 3);
      }
      put('door', c0 + 1, 3);
    });
    tex.refresh();
    this.add.image(0, 0, 'street').setOrigin(0);
  }

  update(_time, dt) {
    if (!input.isTop(this.handler)) return; // a dialogue or panel is open
    const s = this.walker.sprite;
    this.walker.update(dt, input.dir(), (x, y) => x > 4 && x < this.widthPx - 8 && y >= PORCH_Y + 4 && y <= 9 * T);
    if (s.x < 10) return this.scene.start('Overworld', { from: this.ch });

    this.near = this.things.find(thing => Math.abs(thing.x - s.x) < 12 && Math.abs(thing.y - s.y) < 22) ?? null;
    cq.near = this.near?.id ?? null;
    this.label.setVisible(Boolean(this.near));
    if (this.near) {
      this.label.setText(this.near.label);
      const half = this.label.width / 2, view = this.cameras.main.worldView;
      this.label.setPosition(Phaser.Math.Clamp(this.near.x, view.x + half + 2, view.right - half - 2), this.near.y - 30);
    }
  }

  async interact(thing) {
    const { ch } = this, x = this.walker.sprite.x;
    const fight = (mode, queue) => this.scene.start('Encounter', { ch, x, mode, queue });

    if (thing.kind === 'enc') return fight('normal', [{ enc: thing.enc, vars: thing.enc.vars, tex: thing.tex }]);
    if (thing.kind === 'echo') return fight('echo', [{ enc: thing.enc, vars: reroll(thing.enc), tex: 'ghost' }]);
    if (thing.kind === 'shrine') return openShrine(ch);
    if (thing.kind === 'board') {
      if (state.hearts < maxHearts()) {
        state.hearts = maxHearts();
        commit();
        await say('Innkeeper', 'You look worn out. Have some stew — on the house. (Hearts restored.)');
      }
      return openBounty(ch);
    }
    // The boss: old problems with fresh numbers, back to back.
    const boss = BOSSES[ch - 1];
    const pick = await choose(boss, `So you can count, little one? Face ${this.bossFight.length} of my trials in a row — with numbers you have not seen.`, ['Fight', 'Not yet']);
    if (pick === 0) fight('boss', this.bossFight.map(enc => ({ enc, vars: reroll(enc), tex: 'npc_7' })));
  }
}
