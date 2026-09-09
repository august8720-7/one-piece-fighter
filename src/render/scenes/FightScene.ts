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
  private popups: { text: Phaser.GameObjects.Text; ttl: number }[] = [];

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
      .text(VIEW_W / 2, VIEW_H - 12, 'P1 WASD+JKUI  P2 Arrows+Num1245 | hold back=guard  4/6+C=throw  A+B=roll  C+D=blowback  66 run  44 backdash', {
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
      for (const h of this.sim.hits) {
        if (h.kind === 'hit') this.shake = Math.max(this.shake, Math.min(4, 1 + h.damage / 30));
        else if (h.kind === 'block') this.shake = Math.max(this.shake, 1);
        if (h.kind === 'block') this.popup('BLOCK', h.x, h.y, '#48cae4');
        else if (h.kind === 'tech') this.popup('TECH!', h.x, h.y, '#ffd60a');
        else if (h.kind === 'throw') this.popup('THROW', h.x, h.y, '#ff9f1c');
      }
    }
    const w = this.sim.state;
    if (this.wasRoundOver && !w.roundOver) this.hud.reset();
    this.wasRoundOver = w.roundOver;
    this.draw(w);
    this.hud.draw(w);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.4);
    this.tickPopups(steps);
  }

  private popup(msg: string, wx: number, wy: number, color: string): void {
    const t = this.add
      .text(this.worldToScreenX(wx, this.sim.state.cameraX), this.worldToScreenY(wy) - 20, msg, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(70);
    this.popups.push({ text: t, ttl: 40 });
  }

  private tickPopups(steps: number): void {
    for (const p of this.popups) {
      p.ttl -= steps;
      p.text.y -= 0.4 * steps;
      p.text.setAlpha(Math.min(1, p.ttl / 15));
    }
    this.popups = this.popups.filter((p) => {
      if (p.ttl <= 0) p.text.destroy();
      return p.ttl > 0;
    });
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

  /**
   * 占位角色：身体色块 + 头 + 眼睛；出招 active 帧把攻击框画成"伸出的肢体"；
   * 受击闪白；防御蓝边；翻滚画成球；倒地横躺。
   */
  private drawFighter(f: FighterState, cameraX: number): void {
    const g = this.gfx;
    const box = this.sim.pushbox(f);
    const sx = this.worldToScreenX(box.x, cameraX);
    const sy = this.worldToScreenY(box.y);
    const sw = box.w / SUBPIXEL;
    const sh = box.h / SUBPIXEL;
    const groundY = this.worldToScreenY(f.y);

    const lying = f.state === 'knockdown' || f.state === 'ko';
    const hitState = f.state === 'hit_stand' || f.state === 'hit_crouch' || f.state === 'hit_air';
    const blocking = f.state === 'block_stand' || f.state === 'block_crouch';
    const flash = f.justHit || (f.hitstop > 0 && hitState);
    const invuln = this.sim.isStrikeInvulnerable(f);
    let bodyColor = f.def.color;
    if (flash) bodyColor = 0xffffff;
    else if (f.state === 'getup' || f.state === 'throw_tech') bodyColor = 0x9d9d9d;
    else if (blocking) bodyColor = Phaser.Display.Color.IntegerToColor(f.def.color).darken(25).color;

    if (lying) {
      const lw = sh * 0.9;
      const lx = f.facing === 1 ? sx + sw - lw : sx;
      g.fillStyle(bodyColor, 1).fillRect(lx, groundY - 14, lw, 14);
      return;
    }

    // 翻滚：一个球，无敌期间描白边
    if (f.state === 'roll_fwd' || f.state === 'roll_back') {
      const r = sw * 0.55;
      const cx = this.worldToScreenX(f.x, cameraX);
      g.fillStyle(bodyColor, 1).fillCircle(cx, groundY - r, r);
      if (invuln) g.lineStyle(1, 0xffffff, 0.9).strokeCircle(cx, groundY - r, r);
      return;
    }

    // 后撤步：向后倾斜的平行四边形（用两块矩形近似）
    if (f.state === 'backdash') {
      const lean = -f.facing * 6;
      g.fillStyle(bodyColor, invuln ? 0.55 : 1).fillRect(sx + lean, sy, sw, sh / 2);
      g.fillStyle(bodyColor, invuln ? 0.55 : 1).fillRect(sx, sy + sh / 2, sw, sh / 2);
      return;
    }

    g.fillStyle(bodyColor, 1).fillRect(sx, sy, sw, sh);
    // 前冲：身后拖影
    if (f.state === 'dash') {
      g.fillStyle(bodyColor, 0.3).fillRect(sx - f.facing * 6, sy + 4, sw, sh - 4);
    }
    // 防御：面朝侧一道蓝色护盾线
    if (blocking) {
      const shieldX = f.facing === 1 ? sx + sw + 2 : sx - 4;
      g.fillStyle(0x48cae4, 1).fillRect(shieldX, sy + 4, 2, sh - 8);
    }
    // 投技：攻击方伸手抓
    if (f.state === 'throw') {
      const armX = f.facing === 1 ? sx + sw : sx - 20;
      g.fillStyle(f.def.color, 0.9).fillRect(armX, sy + sh * 0.25, 20, 8);
    }
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
