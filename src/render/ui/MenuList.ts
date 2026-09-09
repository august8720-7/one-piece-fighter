import Phaser from 'phaser';
import { Btn, type InputFrame } from '@core/index';

export interface MenuItem {
  label: string;
  /** 灰显不可选 */
  disabled?: boolean;
}

export type MenuAction = 'select' | 'back' | 'left' | 'right' | null;

export const UI = {
  font: 'monospace',
  title: '#ffd60a',
  text: '#e0fbfc',
  dim: '#6c7a89',
  accent: '#ff9f1c',
  p1: '#e63946',
  p2: '#f4a261',
  panel: 0x0b1220,
};

/**
 * 纵向菜单：上下移动光标，A / Start 确认，B 返回，左右交给调用方处理。
 * 两名玩家的输入都能操作（谁按都行）。
 */
export class MenuList {
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Phaser.GameObjects.Text;
  index = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    private readonly y: number,
    private items: MenuItem[],
    private readonly lineH = 16,
    fontSize = '11px',
    depth = 5,
  ) {
    this.cursor = scene.add.text(x - 14, y, '▶', { fontFamily: UI.font, fontSize, color: UI.accent }).setDepth(depth);
    items.forEach((it, i) => {
      this.texts.push(
        scene.add
          .text(x, y + i * lineH, it.label, { fontFamily: UI.font, fontSize, color: it.disabled ? UI.dim : UI.text })
          .setDepth(depth),
      );
    });
    this.refresh();
  }

  setItems(items: MenuItem[]): void {
    this.items = items;
    items.forEach((it, i) => this.texts[i]?.setText(it.label).setColor(it.disabled ? UI.dim : UI.text));
    this.refresh();
  }

  setLabel(i: number, label: string): void {
    this.items[i]!.label = label;
    this.texts[i]?.setText(label);
  }

  /** 每逻辑帧调用；返回动作 */
  update(edges: InputFrame): MenuAction {
    const e = edges.p1 | edges.p2;
    if (e & Btn.Up) this.move(-1);
    if (e & Btn.Down) this.move(1);
    this.refresh();
    if (e & (Btn.A | Btn.Start)) return 'select';
    if (e & Btn.B) return 'back';
    if (e & Btn.Left) return 'left';
    if (e & Btn.Right) return 'right';
    return null;
  }

  private move(dir: number): void {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      this.index = (this.index + dir + n) % n;
      if (!this.items[this.index]!.disabled) break;
    }
  }

  private refresh(): void {
    this.cursor.setY(this.y + this.index * this.lineH);
    this.texts.forEach((t, i) => {
      const it = this.items[i]!;
      t.setColor(it.disabled ? UI.dim : i === this.index ? UI.title : UI.text);
    });
  }

  destroy(): void {
    this.cursor.destroy();
    for (const t of this.texts) t.destroy();
  }
}

/** 通用背景板 + 标题 */
export function drawPanel(scene: Phaser.Scene, title: string, subtitle = ''): void {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, UI.panel).setOrigin(0);
  scene.add.rectangle(0, 0, width, 3, 0xe63946).setOrigin(0);
  scene.add.rectangle(0, height - 3, width, 3, 0xf4a261).setOrigin(0);
  scene.add.text(width / 2, 22, title, { fontFamily: UI.font, fontSize: '20px', color: UI.title, fontStyle: 'bold' }).setOrigin(0.5, 0);
  if (subtitle) scene.add.text(width / 2, 46, subtitle, { fontFamily: UI.font, fontSize: '8px', color: UI.dim }).setOrigin(0.5, 0);
}
