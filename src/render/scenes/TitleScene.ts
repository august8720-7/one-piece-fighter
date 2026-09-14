import Phaser from 'phaser';
import { Btn } from '@core/index';
import { sfx } from '../../audio/Sfx';
import { getInputHub } from '@input/InputHub';
import { interfaceFrame, spriteFrame } from '../assets';
import { FixedStep } from '../FixedStep';
import { SCREEN_H, SCREEN_W, font, ui } from '../screen';
import { UI, drawPanel } from '../ui/MenuList';
import { confirmHint } from '../ui/controlHint';
import { adoptPresentation, presentationLabel, readPresentation, type PresentationData } from '../presentation';
import { audioQuickControls } from '../ui/audioQuickControls';

export class TitleScene extends Phaser.Scene {
  private step = new FixedStep();
  private prompt!: Phaser.GameObjects.Text;
  private frame = 0;
  private leaving = false;

  constructor() {
    super('Title');
  }

  init(data: PresentationData = {}): void { adoptPresentation(this.registry, data); }

  create(): void {
    sfx().resume(); sfx().playMusic('menu');
    this.leaving = false;
    this.frame = 0;
    this.step = new FixedStep();
    drawPanel(this, '');
    const anime = readPresentation(this.registry).art === 'anime';
    const luffy = anime ? interfaceFrame(this, 'luffy', 'body') : spriteFrame(this, 'luffy', 'portrait');
    if (luffy) {
      const art = this.add.sprite(ui(190), SCREEN_H - ui(16), luffy.key, luffy.frame).setOrigin(0.5, 1).setDepth(1);
      art.setScale(ui(370) / art.height);
    }
    const akainu = anime ? interfaceFrame(this, 'akainu', 'body') : spriteFrame(this, 'akainu', 'portrait');
    if (akainu) {
      const art = this.add.sprite(SCREEN_W - ui(190), SCREEN_H - ui(16), akainu.key, akainu.frame).setOrigin(0.5, 1).setFlipX(true).setDepth(1);
      art.setScale(ui(390) / art.height);
    }
    if (anime && (!luffy || !akainu)) {
      this.add.text(SCREEN_W / 2, ui(410), '人物界面图未载入，请返回加载页重试', { fontFamily: UI.font, fontSize: font(14), color: UI.accent }).setOrigin(0.5).setDepth(3);
    }
    this.add.rectangle(SCREEN_W / 2, ui(196), ui(520), ui(210), 0x0b1220, 0.58).setDepth(2);
    this.add
      .text(SCREEN_W / 2, ui(132), 'ONE PIECE', { fontFamily: UI.font, fontSize: font(56), color: UI.p1, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(3)
      .setStroke('#2a1c12', ui(8));
    this.add
      .text(SCREEN_W / 2, ui(196), 'FIGHTER', { fontFamily: UI.font, fontSize: font(56), color: UI.title, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(3)
      .setStroke('#2a1c12', ui(8));
    this.add
      .text(SCREEN_W / 2, ui(250), '顶上战争 · 路飞 vs 赤犬', { fontFamily: UI.font, fontSize: font(18), color: UI.text })
      .setOrigin(0.5)
      .setDepth(3);
    this.prompt = this.add
      .text(SCREEN_W / 2, ui(360), confirmHint(), { fontFamily: UI.font, fontSize: font(22), color: UI.accent })
      .setOrigin(0.5)
      .setDepth(3);
    this.add
      .text(SCREEN_W / 2, SCREEN_H - ui(28), presentationLabel(readPresentation(this.registry)), {
        fontFamily: UI.font,
        fontSize: font(13),
        color: UI.dim,
      })
      .setOrigin(0.5)
      .setDepth(3);
    getInputHub().flush();
    this.prompt.setInteractive({ useHandCursor: true }).once('pointerdown', () => this.enterMenu());
    audioQuickControls(this, ui(435));
  }

  private enterMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    sfx().unlock();
    sfx().play('menu_confirm');
    this.scene.start('Menu', readPresentation(this.registry));
  }

  override update(_t: number, dt: number): void {
    const steps = this.step.advance(dt);
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      this.frame++;
      const e = hub.edges();
      if ((e.p1 | e.p2) & (Btn.Start | Btn.A | Btn.B | Btn.C | Btn.D)) {
        this.enterMenu();
        return;
      }
    }
    this.prompt.setVisible(this.frame % 60 < 40);
  }
}
