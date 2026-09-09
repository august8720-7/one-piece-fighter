import Phaser from 'phaser';
import { VIEW_W, type WorldState } from '@core/index';

const BAR_W = 180;
const BAR_H = 10;
const BAR_Y = 14;
const MARGIN = 12;

/** M1 HUD：双层血条（白色即时 + 红色延迟消退）、名字、KO 横幅。 */
export class Hud {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  /** 延迟血条当前值（像素比例 0..1） */
  private lag: [number, number] = [1, 1];

  constructor(scene: Phaser.Scene, names: [string, string]) {
    this.gfx = scene.add.graphics().setDepth(50);
    const style = { fontFamily: 'monospace', fontSize: '9px', color: '#ffffff' };
    scene.add.text(MARGIN, BAR_Y + BAR_H + 2, names[0], style).setDepth(51);
    scene.add.text(VIEW_W - MARGIN, BAR_Y + BAR_H + 2, names[1], style).setOrigin(1, 0).setDepth(51);

    this.banner = scene.add
      .text(VIEW_W / 2, 100, '', { fontFamily: 'monospace', fontSize: '36px', color: '#ffd60a', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(60)
      .setVisible(false);
    this.hint = scene.add
      .text(VIEW_W / 2, 140, '', { fontFamily: 'monospace', fontSize: '9px', color: '#e0fbfc' })
      .setOrigin(0.5)
      .setDepth(60)
      .setVisible(false);
  }

  draw(w: WorldState): void {
    const g = this.gfx;
    g.clear();
    for (let i = 0; i < 2; i++) {
      const f = w.fighters[i]!;
      const ratio = Math.max(0, f.hp / f.def.maxHp);
      // 延迟条向即时值缓慢追
      const lag = this.lag[i]!;
      this.lag[i] = lag > ratio ? Math.max(ratio, lag - 0.006) : ratio;

      const x0 = i === 0 ? MARGIN : VIEW_W - MARGIN - BAR_W;
      g.fillStyle(0x1b1b2f, 1).fillRect(x0 - 1, BAR_Y - 1, BAR_W + 2, BAR_H + 2);
      const drawBar = (r: number, color: number) => {
        const wpx = Math.round(BAR_W * r);
        const x = i === 0 ? x0 + BAR_W - wpx : x0;
        g.fillStyle(color, 1).fillRect(x, BAR_Y, wpx, BAR_H);
      };
      drawBar(this.lag[i]!, 0xd62828);
      drawBar(ratio, 0xf1faee);
    }

    if (w.roundOver) {
      this.banner.setText('K.O.').setVisible(true);
      this.hint.setText(`P${(w.winner ?? 0) + 1} WIN   Enter / NumEnter to restart`).setVisible(true);
    } else {
      this.banner.setVisible(false);
      this.hint.setVisible(false);
    }
  }

  reset(): void {
    this.lag = [1, 1];
  }
}
