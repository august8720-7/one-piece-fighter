import Phaser from 'phaser';
import { Btn, SUBPIXEL, VIEW_H, toNumpad, type Box, type FightSim, type WorldState } from '@core/index';

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
      .text(4, VIEW_H - 22, '', { fontFamily: 'monospace', fontSize: '8px', color: '#e0fbfc' })
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
      const rect = (b: Box) => g.strokeRect(toX(b.x), toY(b.y), b.w / SUBPIXEL, b.h / SUBPIXEL);
      for (const f of w.fighters) {
        g.lineStyle(1, 0xffd60a, 0.9);
        rect(sim.pushbox(f));
        g.lineStyle(1, 0x48cae4, 1);
        for (const b of sim.hurtboxes(f)) rect(b);
        g.lineStyle(1, 0xff3860, 1);
        for (const b of sim.hitboxes(f)) rect(b);
        g.fillStyle(0xffffff, 1).fillRect(toX(f.x) - 1, toY(f.y) - 1, 3, 3);
      }
    }

    const lines: string[] = [];
    if (this.showFrames) {
      lines.push(`frame ${w.frame}  cam ${(w.cameraX / SUBPIXEL).toFixed(0)}`);
      for (const f of w.fighters) {
        const st = (f.state === 'attack' || f.state === 'throw') && f.moveId ? `${f.moveId}` : f.state;
        const flags = `${sim.isGuarding(f) ? 'G' : '-'}${sim.isStrikeInvulnerable(f) ? 'I' : '-'}${sim.isThrowable(f) ? 'T' : '-'}`;
        lines.push(
          `P${f.player + 1} ${f.def.id.padEnd(6)} ${st.padEnd(12)} sf ${String(f.stateFrame).padStart(3)} ` +
            `hs ${String(f.hitstop).padStart(2)} st ${String(Math.min(f.stun, 99)).padStart(2)} ${flags} ` +
            `x ${(f.x / SUBPIXEL).toFixed(1).padStart(7)} y ${(f.y / SUBPIXEL).toFixed(1).padStart(6)}  ` +
            `hp ${String(f.hp).padStart(4)} ${f.facing === 1 ? '>' : '<'}`,
        );
      }
    }
    if (this.showInputs) {
      const [f1, f2] = w.fighters;
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
