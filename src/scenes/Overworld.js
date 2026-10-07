import Phaser from 'phaser';
import { Walker } from './walker.js';
import { say } from '../ui/dialogue.js';
import { commit, globalAction } from '../ui/hud.js';
import { input } from '../systems/input.js';
import { state, cq } from '../systems/save.js';
import { content } from '../systems/content.js';
import { music } from '../audio/sfx.js';
import { FONT } from '../encounters/kit.js';

// One screen, 20×11 tiles.  T tree · ~ water · = road · 1-8 region gates · . grass
const MAP = [
  'TTTTTTTTTTTTTTTTTTTT',
  'T.....T......~~~...T',
  'T.1===2==3...~~~.T.T',
  'T........=....~....T',
  'T..T.....=.........T',
  'T.....5==4....T....T',
  'T.T...=............T',
  'T.....6===7==8..T..T',
  'T...........~~.....T',
  'T..T.....T..~~...T.T',
  'TTTTTTTTTTTTTTTTTTTT',
];
const isGate = ch => ch >= '1' && ch <= '8';

/** A region opens once the previous region's boss is beaten. */
export const unlocked = ch => ch === 1 || state.bosses.includes(ch - 1);

export default class Overworld extends Phaser.Scene {
  constructor() { super('Overworld'); }

  create({ from = 1 } = {}) {
    cq.scene = 'Overworld';
    cq.near = null;
    document.body.classList.add('playing', 'world');
    state.where = { scene: 'Overworld', from };
    commit();
    music(10);
    this.cameras.main.setBackgroundColor('#008751').setScroll(0, -2); // centre the 176px map in 180px

    this.gates = {};
    MAP.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = c * 16 + 8, y = r * 16 + 8;
      this.add.image(x, y, ch === '~' ? 'water' : ch === '=' || isGate(ch) ? 'path' : 'grass');
      if (ch === 'T') this.add.image(x, y, 'tree');
      if (!isGate(ch)) return;
      const town = this.add.image(x, y, 'town');
      if (!unlocked(+ch)) { town.setTint(0x5f574f); this.add.image(x, y + 2, 'lock'); }
      this.gates[ch] = { c, r, x, y };
    }));

    const gate = this.gates[from];
    this.walker = new Walker(this, gate.x - 14, gate.y + 6); // just left of the gate you came out of
    this.label = this.add.text(0, 0, '', { ...FONT, backgroundColor: '#000000' }).setOrigin(0.5, 1).setDepth(20);

    this.handler = action => globalAction(action);
    const pop = input.push(this.handler);
    this.events.once('shutdown', () => { pop(); document.body.classList.remove('world'); });
  }

  tileAt(x, y) { return MAP[Math.floor(y / 16)]?.[Math.floor(x / 16)]; }

  update(_time, dt) {
    if (!input.isTop(this.handler)) return; // a dialogue or panel is open
    const s = this.walker.sprite;
    this.walker.update(dt, input.dir(), (x, y) => { const t = this.tileAt(x, y - 3); return t !== undefined && t !== 'T' && t !== '~'; });

    const here = this.tileAt(s.x, s.y - 3);
    if (isGate(here)) return this.enter(+here);

    const near = Object.entries(this.gates).find(([, g]) => Math.hypot(g.x - s.x, g.y - s.y) < 26);
    if (near) {
      const [ch, g] = near;
      this.label.setText(`${content.regions[ch - 1].name}${unlocked(+ch) ? '' : ' (sealed)'}`);
      this.label.setPosition(Phaser.Math.Clamp(g.x, this.label.width / 2 + 2, 318 - this.label.width / 2), g.y - 10);
    }
    this.label.setVisible(Boolean(near));
  }

  enter(ch) {
    const gate = this.gates[ch], region = content.regions[ch - 1];
    const stepBack = () => this.walker.sprite.setPosition(gate.x - 14, gate.y + 6);
    if (!unlocked(ch)) {
      stepBack();
      say('Gate guard', `The road to ${region.name} is sealed. Defeat the boss of ${content.regions[ch - 2].name} first.`);
    } else if (ch > 1) {
      stepBack(); // TODO(M2): remove once Ch 2–4 scene templates exist
      say('Hoot', `${region.name} is still being built — it arrives with the next milestone. Tallyburg's Echoes and bounties are waiting meanwhile!`);
    } else {
      this.scene.start('Region', { ch });
    }
  }
}
