import Phaser from 'phaser';
import { el, mount } from '../ui/dom.js';
import { say, choose } from '../ui/dialogue.js';
import { refreshHud, pickSave } from '../ui/hud.js';
import { state, cq, hasSave, reset } from '../systems/save.js';
import { music } from '../audio/sfx.js';
import { FONT } from '../encounters/kit.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    cq.scene = 'Title';
    document.body.classList.remove('playing', 'world');
    music(0);

    this.add.tileSprite(160, 90, 320, 180, 'grass');
    for (let x = 8; x < 320; x += 16) { this.add.image(x, 8, 'tree'); this.add.image(x, 172, 'tree'); }
    this.add.text(160, 46, 'CHANCE QUEST', { ...FONT, fontSize: '24px', color: '#ffec27' }).setOrigin(0.5).setShadow(2, 2, '#000000', 0);
    this.add.text(160, 68, 'a probability adventure', FONT).setOrigin(0.5);
    this.add.image(130, 92, 'hero_down_0');
    const owl = this.add.image(160, 90, 'owl');
    this.add.image(190, 92, 'npc_3');
    this.tweens.add({ targets: owl, y: 86, duration: 600, yoyo: true, repeat: -1 });

    const note = el('span', { className: 'dim' });
    const menu = mount(el('div', { className: 'title-menu' },
      el('button', { id: 'new-game', textContent: 'New Game', onclick: () => this.newGame(menu) }),
      hasSave() && el('button', { id: 'continue', textContent: 'Continue', onclick: () => this.enterWorld(state.where) }),
      el('div', { className: 'title-row' },
        el('button', { id: 'versus', textContent: 'Versus', onclick: () => this.scene.start('Versus') }),
        el('button', { id: 'import-title', textContent: 'Import Save', onclick: () => pickSave(message => { note.textContent = message; }) })),
      note));
    this.events.once('shutdown', () => menu.remove());
  }

  async newGame(menu) {
    if (hasSave()) {
      const pick = await choose('Hoot', 'Start over? Your saved journey will be replaced. (Menu → Export save keeps a copy.)', ['Start over', 'Keep my journey']);
      if (pick !== 0) return;
    }
    menu.remove();
    reset();
    await say('Hoot', 'Hoo! I am Hoot. The land of Chance is ruled by eight bosses, and every one of them can be beaten by counting carefully.');
    await say('Hoot', 'Play with things before you calculate. When you are ready, forge your answer at the Chance Forge. I will ask you questions if you get stuck — but I never hand out answers.');
    this.enterWorld({ scene: 'Overworld' });
  }

  enterWorld(where) {
    document.body.classList.add('playing');
    refreshHud();
    this.scene.start(where.scene, where);
  }
}
