import type Phaser from 'phaser';
import type { FightSim } from '@core/index';
import { keyLabel } from '@input/keymap';
import type { AwakeningBindings } from '@input/awakening';
import { font, SCREEN_W, ui } from '../screen';
import { UI } from '../ui/MenuList';
import { gear5Status } from './gear5Status';

/** Both classic and one-button controls share the same awakening feedback. */
export class Gear5Hud {
  private readonly labels: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  constructor(scene: Phaser.Scene) {
    this.labels = [0, 1].map(side => scene.add.text(side ? SCREEN_W - ui(14) : ui(14), ui(95), '', {
      fontFamily: UI.font, fontSize: font(11), color: '#b8cbd4', backgroundColor: '#101b24',
      padding: { x: ui(4), y: ui(2) }, wordWrap: { width: ui(310) }, align: side ? 'right' : 'left',
    }).setOrigin(side ? 1 : 0, 0).setDepth(58)) as [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  }
  draw(sim: FightSim, bindings: AwakeningBindings): void {
    for (const side of [0, 1] as const) {
      const code = bindings[side ? 'p2' : 'p1'];
      const status = gear5Status(sim, side, code ? keyLabel(code) : '未绑定/手柄LT');
      const label = this.labels[side];
      label.setVisible(!!status);
      if (!status) continue;
      if (label.text !== status.text) label.setText(status.text);
      if (label.style.color !== status.color) label.setColor(status.color);
    }
  }
}
