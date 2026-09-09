import Phaser from 'phaser';
import { Btn, SUBPIXEL, VIEW_H, toNumpad, type FightSim, type WorldState } from '@core/index';

type Proj = (v: number) => number;

/** F1 判定框 · F2 帧数据面板 · F3 输入显示 */
export class DebugOverlay {
  private showBoxes = true;
  private showFrames = true;
  private showInputs = true;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(100);
    this.text = scene.add
      .text(4, VIEW_H - 4, '', { fontFamily: 'monospace', fontSize: '8px', color: '#e0fbfc' })
      .setOrigin(0, 1)
      .setDepth(101);

    const kb = scene.input.keyboard;
    kb?.on('keydown-F1', () => (this.showBoxes = !this.showBoxes));
    kb?.on('keydown-F2', () => (this.showFrames = !this.showFrames));
    kb?.on('keydown-F3', () => (this.showInputs = !this.showInputs));
  }

  draw(w: WorldState, sim: FightSim, input: { p1: number; p2: number }, toX: Proj, toY: Proj): void {
    const g = this.gfx;
    g.clear();

    if (this.showBoxes) {
      g.lineStyle(1, 0xffd60a, 1);
      for (const f of w.fighters) {
        const b = sim.pushbox(f);
        g.strokeRect(toX(b.x), toY(b.y), b.w / SUBPIXEL, b.h / SUBPIXEL);
        // 原点（脚下中心）
        g.fillStyle(0xffffff, 1).fillRect(toX(f.x) - 1, toY(f.y) - 1, 3, 3);
      }
    }

    const lines: string[] = [];
    if (this.showFrames) {
      lines.push(`frame ${w.frame}  cam ${(w.cameraX / SUBPIXEL).toFixed(0)}`);
      for (const f of w.fighters) {
        lines.push(
          `P${f.player + 1} ${f.def.id.padEnd(6)} ${f.state.padEnd(12)} sf ${String(f.stateFrame).padStart(3)}  ` +
            `x ${(f.x / SUBPIXEL).toFixed(1).padStart(7)} y ${(f.y / SUBPIXEL).toFixed(1).padStart(6)}  ` +
            `hp ${f.hp} ${f.facing === 1 ? '→' : '←'}`,
        );
      }
    }
    if (this.showInputs) {
      const f1 = w.fighters[0];
      const f2 = w.fighters[1];
      lines.push(`in  P1 ${toNumpad(input.p1, f1.facing)}${btns(input.p1)}   P2 ${toNumpad(input.p2, f2.facing)}${btns(input.p2)}`);
    }
    this.text.setText(lines.join('\n'));
    this.text.setVisible(lines.length > 0);
  }
}

function btns(bits: number): string {
  let s = '';
  if (bits & Btn.A) s += 'A';
  if (bits & Btn.B) s += 'B';
  if (bits & Btn.C) s += 'C';
  if (bits & Btn.D) s += 'D';
  return s ? ' ' + s : '';
}
