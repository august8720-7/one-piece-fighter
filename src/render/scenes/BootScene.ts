import Phaser from 'phaser';

/** M0：无资源可加载，直接进入战斗场景。M4 起在此加载图集与音频。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Fight', { p1: 'luffy', p2: 'akainu' });
  }
}
