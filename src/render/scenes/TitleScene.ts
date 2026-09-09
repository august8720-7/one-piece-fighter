import Phaser from 'phaser';
import { Btn, VIEW_H, VIEW_W } from '@core/index';
import { getInputHub } from '@input/InputHub';
import { FixedStep } from '../FixedStep';
import { UI, drawPanel } from '../ui/MenuList';

export class TitleScene extends Phaser.Scene {
  private step = new FixedStep();
  private prompt!: Phaser.GameObjects.Text;
  private frame = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    drawPanel(this, '');
    this.add
      .text(VIEW_W / 2, 70, 'ONE PIECE', { fontFamily: UI.font, fontSize: '34px', color: UI.p1, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 104, 'FIGHTER', { fontFamily: UI.font, fontSize: '34px', color: UI.title, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, 132, '顶上战争 · 路飞 vs 赤犬', { fontFamily: UI.font, fontSize: '10px', color: UI.text })
      .setOrigin(0.5);
    this.prompt = this.add
      .text(VIEW_W / 2, 190, 'PRESS ENTER / A', { fontFamily: UI.font, fontSize: '12px', color: UI.accent })
      .setOrigin(0.5);
    this.add
      .text(VIEW_W / 2, VIEW_H - 14, 'v0.7  |  键盘 P1 WASD+JKUI  P2 方向键+小键盘  |  手柄自动识别', {
        fontFamily: UI.font,
        fontSize: '7px',
        color: UI.dim,
      })
      .setOrigin(0.5);
    getInputHub().flush();
  }

  override update(_t: number, dt: number): void {
    const steps = this.step.advance(dt);
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      this.frame++;
      const e = hub.edges();
      if ((e.p1 | e.p2) & (Btn.Start | Btn.A | Btn.B | Btn.C | Btn.D)) {
        this.scene.start('Menu');
        return;
      }
    }
    this.prompt.setVisible(this.frame % 60 < 40);
  }
}
