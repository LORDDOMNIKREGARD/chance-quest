import Phaser from 'phaser';
import { bakeAll } from '../art/bake.js';
import { loadContent } from '../systems/content.js';
import { load } from '../systems/save.js';
import { initHud } from '../ui/hud.js';

/** Bakes the art, loads content.json and the font, then hands over to the title. */
export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    bakeAll(this);
    Promise.all([loadContent(), document.fonts.load('8px "Press Start 2P"')]).then(() => {
      load();
      initHud();
      this.scene.start('Title');
    });
  }
}
