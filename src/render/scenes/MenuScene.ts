import Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '@core/index';
import { getInputHub } from '@input/InputHub';
import { FixedStep } from '../FixedStep';
import { MenuList, UI, drawPanel } from '../ui/MenuList';
import type { GameMode } from './FightScene';

const ITEMS: { label: string; mode?: GameMode; scene?: string }[] = [
  { label: '双人对战  VERSUS', mode: 'versus' },
  { label: '人机对战  VS CPU', mode: 'cpu' },
  { label: '训练模式  TRAINING', mode: 'training' },
  { label: '键位设置  KEY CONFIG', scene: 'Settings' },
];

export class MenuScene extends Phaser.Scene {
  private step = new FixedStep();
  private menu!: MenuList;

  constructor() {
    super('Menu');
  }

  create(): void {
    drawPanel(this, 'MODE SELECT', '↑↓ 选择   A / Enter 确认   B 返回');
    this.menu = new MenuList(this, VIEW_W / 2 - 80, 96, ITEMS.map((i) => ({ label: i.label })), 22, '12px');
    this.add
      .text(VIEW_W / 2, VIEW_H - 16, '双人：同一键盘或两个手柄   人机：P1 操作，P2 电脑   训练：无限血气 + 木桩', {
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
      const action = this.menu.update(hub.edges());
      if (action === 'select') {
        const it = ITEMS[this.menu.index]!;
        if (it.scene) this.scene.start(it.scene, { back: 'Menu' });
        else this.scene.start('CharacterSelect', { mode: it.mode });
        return;
      }
      if (action === 'back') {
        this.scene.start('Title');
        return;
      }
    }
  }
}
