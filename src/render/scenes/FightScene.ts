import Phaser from 'phaser';
import {
  FightSim,
  GROUND_Y,
  STAGE_LEFT,
  STAGE_RIGHT,
  SUBPIXEL,
  VIEW_H,
  VIEW_W,
  type FighterState,
  type WorldState,
} from '@core/index';
import { characters } from '@characters/index';
import { KeyboardInput } from '@input/keyboard';
import { FixedStep } from '../FixedStep';
import { DebugOverlay } from '../DebugOverlay';

interface FightSceneData {
  p1: string;
  p2: string;
}

/** 地面在屏幕中的 y（像素）。 */
const GROUND_SCREEN_Y = VIEW_H - 40;

export class FightScene extends Phaser.Scene {
  private sim!: FightSim;
  private input_!: KeyboardInput;
  private step = new FixedStep();
  private gfx!: Phaser.GameObjects.Graphics;
  private debug!: DebugOverlay;
  private lastInput = { p1: 0, p2: 0 };

  constructor() {
    super('Fight');
  }

  create(data: FightSceneData): void {
    const p1 = characters[data.p1];
    const p2 = characters[data.p2];
    if (!p1 || !p2) throw new Error(`Unknown character: ${data.p1} / ${data.p2}`);

    this.sim = new FightSim({ p1, p2, seed: 1 });
    this.input_ = new KeyboardInput();
    this.gfx = this.add.graphics();
    this.debug = new DebugOverlay(this);

    this.add
      .text(VIEW_W / 2, 8, 'M0 原型  P1: WASD + JKUI   P2: 方向键 + 小键盘 1245   F1 判定框 F2 帧数据', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#9fb3c8',
      })
      .setOrigin(0.5, 0);
  }

  override update(_time: number, deltaMs: number): void {
    const steps = this.step.advance(deltaMs);
    for (let i = 0; i < steps; i++) {
      this.lastInput = this.input_.snapshot();
      this.sim.step(this.lastInput);
    }
    this.draw(this.sim.state);
  }

  private worldToScreenX(x: number, cameraX: number): number {
    return VIEW_W / 2 + (x - cameraX) / SUBPIXEL;
  }

  private worldToScreenY(y: number): number {
    return GROUND_SCREEN_Y + (y - GROUND_Y) / SUBPIXEL;
  }

  private draw(w: WorldState): void {
    const g = this.gfx;
    g.clear();

    // 背景：天空渐变占位 + 地面
    g.fillStyle(0x14213d, 1).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x2b2d42, 1).fillRect(0, GROUND_SCREEN_Y, VIEW_W, VIEW_H - GROUND_SCREEN_Y);

    // 舞台边界墙
    g.lineStyle(1, 0x8d99ae, 0.6);
    const lx = this.worldToScreenX(STAGE_LEFT, w.cameraX);
    const rx = this.worldToScreenX(STAGE_RIGHT, w.cameraX);
    g.lineBetween(lx, 0, lx, GROUND_SCREEN_Y);
    g.lineBetween(rx, 0, rx, GROUND_SCREEN_Y);

    for (const f of w.fighters) this.drawFighter(f, w.cameraX);

    this.debug.draw(w, this.sim, this.lastInput, (x) => this.worldToScreenX(x, w.cameraX), (y) => this.worldToScreenY(y));
  }

  /** 占位角色：身体色块 + 头部小块 + 面向指示。 */
  private drawFighter(f: FighterState, cameraX: number): void {
    const g = this.gfx;
    const box = this.sim.pushbox(f);
    const sx = this.worldToScreenX(box.x, cameraX);
    const sy = this.worldToScreenY(box.y);
    const sw = box.w / SUBPIXEL;
    const sh = box.h / SUBPIXEL;

    g.fillStyle(f.def.color, 1).fillRect(sx, sy, sw, sh);
    // 头
    const headW = sw * 0.6;
    g.fillStyle(0xffe8d6, 1).fillRect(sx + (sw - headW) / 2, sy - 10, headW, 10);
    // 面向指示：眼睛在面朝的一侧
    const eyeX = f.facing === 1 ? sx + sw / 2 + headW * 0.15 : sx + sw / 2 - headW * 0.25;
    g.fillStyle(0x000000, 1).fillRect(eyeX, sy - 7, 2, 2);
  }
}
