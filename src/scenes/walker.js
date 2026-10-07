// The hero sprite: moves with collision and picks the right walk frame.
// Its position is the point between the feet (origin bottom-centre).

const SPEED = 70; // pixels per second

export class Walker {
  constructor(scene, x, y) {
    this.sprite = scene.add.sprite(x, y, 'hero_down_0').setOrigin(0.5, 1).setDepth(10);
    this.face = 'down';
    this.walked = 0; // ms spent walking, drives the two-frame cycle
  }

  /**
   * @param {number} dt        ms since the last frame
   * @param {{x:number,y:number}} dir  each −1, 0 or 1
   * @param {(x:number, y:number) => boolean} canStand  is that feet position free?
   */
  update(dt, dir, canStand) {
    const s = this.sprite;
    const moving = dir.x !== 0 || dir.y !== 0;
    if (moving) {
      const dist = SPEED * dt / 1000 / (dir.x && dir.y ? Math.SQRT2 : 1); // same speed on diagonals
      // Try each axis on its own, so you slide along walls instead of sticking.
      if (canStand(s.x + dir.x * dist, s.y)) s.x += dir.x * dist;
      if (canStand(s.x, s.y + dir.y * dist)) s.y += dir.y * dist;
      this.face = dir.x ? 'side' : dir.y < 0 ? 'up' : 'down';
      s.setFlipX(dir.x > 0); // the side view is drawn facing left
      this.walked += dt;
    } else {
      this.walked = 0;
    }
    const frame = moving ? Math.floor(this.walked / 150) % 2 : 0;
    s.setTexture(`hero_${this.face}_${frame}`);
  }
}
