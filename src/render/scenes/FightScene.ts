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
import { Hud } from '../hud/Hud';

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
  private hud!: Hud;
  private lastInput = { p1: 0, p2: 0 };
  private shake = 0;
  private wasRoundOver = false;

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
    this.hud = new Hud(this, [p1.name, p2.name]);
    this.debug = new DebugOverlay(this);

    this.add
      .text(VIEW_W / 2, VIEW_H - 12, 'P1: WASD + J K U I    P2: Arrows + Num 1 2 4 5    F1 boxes  F2 frames  F3 input', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#6c7a89',
      })
      .setOrigin(0.5, 0);
  }

  override update(_time: number, deltaMs: number): void {
    const steps = this.step.advance(deltaMs);
    for (let i = 0; i < steps; i++) {
      this.lastInput = this.input_.snapshot();
      this.sim.step(this.lastInput);
      for (const h of this.sim.hits) this.shake = Math.max(this.shake, Math.min(4, 1 + h.damage / 30));
    }
    const w = this.sim.state;
    if (this.wasRoundOver && !w.roundOver) this.hud.reset();
    this.wasRoundOver = w.roundOver;
    this.draw(w);
    this.hud.draw(w);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.4);
  }

  private worldToScreenX(x: number, cameraX: number): number {
    return VIEW_W / 2 + (x - cameraX) / SUBPIXEL + this.shakeOffset();
  }

  private worldToScreenY(y: number): number {
    return GROUND_SCREEN_Y + (y - GROUND_Y) / SUBPIXEL;
  }

  private shakeOffset(): number {
    if (this.shake <= 0) return 0;
    return (this.sim.state.frame & 1 ? 1 : -1) * this.shake;
  }

  private draw(w: WorldState): void {
    const g = this.gfx;
    g.clear();

    g.fillStyle(0x14213d, 1).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x2b2d42, 1).fillRect(0, GROUND_SCREEN_Y, VIEW_W, VIEW_H - GROUND_SCREEN_Y);

    g.lineStyle(1, 0x8d99ae, 0.6);
    const lx = this.worldToScreenX(STAGE_LEFT, w.cameraX);
    const rx = this.worldToScreenX(STAGE_RIGHT, w.cameraX);
    g.lineBetween(lx, 0, lx, GROUND_SCREEN_Y);
    g.lineBetween(rx, 0, rx, GROUND_SCREEN_Y);

    for (const f of w.fighters) this.drawFighter(f, w.cameraX);

    this.debug.draw(
      w,
      this.sim,
      this.lastInput,
      (x) => this.worldToScreenX(x, w.cameraX),
      (y) => this.worldToScreenY(y),
    );
  }

  /** 占位角色：身体色块 + 头 + 眼睛；出招 active 帧把攻击框画成"伸出的肢体"；受击闪白；倒地横躺。 */
  private drawFighter(f: FighterState, cameraX: number): void {
    const g = this.gfx;
    const box = this.sim.pushbox(f);
    const sx = this.worldToScreenX(box.x, cameraX);
    const sy = this.worldToScreenY(box.y);
    const sw = box.w / SUBPIXEL;
    const sh = box.h / SUBPIXEL;

    const lying = f.state === 'knockdown' || f.state === 'ko';
    const flash = f.justHit || f.hitstop > 0 && (f.state === 'hit_stand' || f.state === 'hit_crouch' || f.state === 'hit_air');
    const bodyColor = flash ? 0xffffff : f.state === 'getup' ? 0x9d9d9d : f.def.color;

    if (lying) {
      const lw = sh * 0.9;
      const lx = f.facing === 1 ? sx + sw - lw : sx;
      g.fillStyle(bodyColor, 1).fillRect(lx, this.worldToScreenY(f.y) - 14, lw, 14);
      return;
    }

    g.fillStyle(bodyColor, 1).fillRect(sx, sy, sw, sh);
    const headW = sw * 0.6;
    g.fillStyle(0xffe8d6, 1).fillRect(sx + (sw - headW) / 2, sy - 10, headW, 10);
    const eyeX = f.facing === 1 ? sx + sw / 2 + headW * 0.15 : sx + sw / 2 - headW * 0.25;
    g.fillStyle(0x000000, 1).fillRect(eyeX, sy - 7, 2, 2);

    // 伸出的肢体：用当前帧的攻击框（无论是否已命中）表现
    const fd = this.sim.currentFrame(f);
    if (fd?.hitboxes) {
      for (const hb of fd.hitboxes) {
        const [x, y, w, h] = hb;
        const wx = f.facing === 1 ? x : -x - w;
        g.fillStyle(f.def.color, 0.85).fillRect(
          this.worldToScreenX(f.x + wx * SUBPIXEL, cameraX),
          this.worldToScreenY(f.y + y * SUBPIXEL),
          w,
          h,
        );
      }
    } else if (f.state === 'attack') {
      // 启动 / 收招：画一段短肢体表示"正在出招"
      const armY = sy + sh * 0.3;
      const armX = f.facing === 1 ? sx + sw : sx - 8;
      g.fillStyle(f.def.color, 0.6).fillRect(armX, armY, 8, 6);
    }
  }
}
