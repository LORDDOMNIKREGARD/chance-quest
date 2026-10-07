// A phase with `choices` is never a list of buttons: the options stand on
// pedestals in the room, and you walk to the one you want and take it.
import { Walker } from '../scenes/walker.js';
import { input } from '../systems/input.js';
import { ui } from '../ui/dom.js';
import { cq } from '../systems/save.js';
import { burst } from './kit.js';

/**
 * Put one pedestal per label in the room and let the hero walk between them.
 * Resolves to the index of the pedestal chosen with E / Space.
 * While this runs, the scene's update() must call scene.walk(dt).
 */
export function walkToChoice(scene, k, labels) {
  return new Promise(resolve => {
    const gap = labels.length === 2 ? 120 : 76;
    const spots = labels.map((label, i) => {
      const x = 180 + (i - (labels.length - 1) / 2) * gap;
      k.img(x, 64, 'chest');
      k.text(x, 46, label).setOrigin(0.5);
      return { x, i };
    });
    const hero = new Walker(scene, 180, 102);
    k.add(hero.sprite);
    const hint = k.text(180, 30, 'Walk to your choice and take it').setOrigin(0.5);
    let near = null;

    document.body.classList.add('world'); // shows the d-pad on phones
    scene.walk = dt => {
      if (ui.busy) return; // a dialogue is open
      hero.update(dt, input.dir(), (x, y) => x > 54 && x < 310 && y > 78 && y < 106); // stay above the question box
      near = spots.find(spot => Math.abs(spot.x - hero.sprite.x) < 16 && hero.sprite.y < 92) ?? null;
      cq.near = near ? labels[near.i] : null;
      hint.setText(near ? `E: take "${labels[near.i]}"` : 'Walk to your choice and take it');
    };
    scene.take = () => {
      if (!near) return;
      burst(scene, near.x, 64, 0xffec27);
      scene.walk = null;
      scene.take = null;
      document.body.classList.remove('world');
      resolve(near.i);
    };
  });
}
