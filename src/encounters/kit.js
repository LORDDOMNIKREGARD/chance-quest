// A small toolbox every toy is built from. It remembers what it created, so
// an encounter can throw the whole toy away with kit.destroy() between phases.
//
// The toy area is the part of the screen above the question box:
// x 50–310, y 28–118. (The NPC stands at the left edge.)
import { sfx } from '../audio/sfx.js';

export const FONT = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fff1e8' };

/** A puff of square particles. */
export function burst(scene, x, y, tint) {
  const emitter = scene.add.particles(x, y, 'spark', {
    speed: { min: 30, max: 90 }, lifespan: 450, scale: { start: 1.5, end: 0 }, tint, emitting: false,
  }).setDepth(30);
  emitter.explode(16);
  scene.time.delayedCall(700, () => emitter.destroy());
}

export function kit(scene) {
  const made = [];
  const add = obj => { made.push(obj); return obj; };

  const k = {
    scene,
    add,
    text: (x, y, str, color) => add(scene.add.text(x, y, str, color ? { ...FONT, color } : FONT)),
    img: (x, y, key) => add(scene.add.image(x, y, key)),

    /** A clickable label. `onClick(button)` receives the text object so it can relabel itself. */
    button(x, y, label, onClick) {
      const b = k.text(x, y, label).setBackgroundColor('#5f574f').setPadding(3, 2, 3, 2).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => { sfx('blip'); onClick(b); });
      return b;
    },

    /** A short message under the toy that fades away. */
    note(message, color = '#ffec27') {
      scene.tweens.killTweensOf(noteText);
      noteText.setText(message).setColor(color).setAlpha(1);
      scene.tweens.add({ targets: noteText, alpha: 0, delay: 1500, duration: 400 });
    },

    /**
     * Counts *distinct* things the player has found. see(signature) returns
     * true the first time a signature shows up — the heart of every counting toy.
     */
    tally(label) {
      const seen = new Set();
      const view = k.text(56, 42, `${label}: 0`, '#ffec27');
      const show = () => view.setText(`${label}: ${seen.size}`);
      return {
        seen,
        reset() { seen.clear(); show(); },
        see(signature) {
          if (seen.has(signature)) return false;
          seen.add(signature); show(); sfx('tick');
          return true;
        },
      };
    },

    /** The forged object flies from the player to `target`; the world reacts. Resolves when done. */
    deliver(ok, iconKey, target) {
      return new Promise(resolve => {
        const item = k.img(40, 96, iconKey).setDepth(25).setScale(2);
        scene.tweens.add({
          targets: item, x: target.x, y: target.y, angle: 360, duration: 450, ease: 'Quad.easeIn',
          onComplete: () => {
            item.destroy();
            burst(scene, target.x, target.y, ok ? 0xffec27 : 0xff004d);
            scene.cameras.main.shake(ok ? 120 : 260, ok ? 0.004 : 0.012);
            sfx(ok ? 'ok' : 'bad');
            scene.time.delayedCall(450, resolve);
          },
        });
      });
    },

    destroy() { made.forEach(obj => obj.destroy()); },
  };

  const noteText = k.text(180, 114, '').setOrigin(0.5).setDepth(15);
  return k;
}
