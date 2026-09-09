import Phaser from 'phaser';
import {
  FightSim,
  GROUND_Y,
  SUBPIXEL,
  VIEW_H,
  VIEW_W,
  type FighterState,
  type ProjectileState,
  type WorldState,
} from '@core/index';
import { characterAnims, characters } from '@characters/index';
import { getInputHub } from '@input/InputHub';
import { Btn } from '@core/index';
import { Cpu } from '../../ai/cpu';
import { Dummy } from '../../ai/dummy';
import type { Difficulty } from '../../ai/types';
import { characterAi } from '@characters/index';
import { FixedStep } from '../FixedStep';
import { DebugOverlay } from '../DebugOverlay';
import { FighterView } from '../FighterView';
import { Hud } from '../hud/Hud';
import { Marineford } from '../stage/Marineford';
import { MenuList, UI } from '../ui/MenuList';
import { SPRITE_KEYS, type SpriteKeys } from './PreloadScene';
import type { ResultData } from './ResultScene';

export type GameMode = 'versus' | 'cpu' | 'training';

export interface FightSceneData {
  p1: string;
  p2: string;
  mode: GameMode;
  /** 人机模式难度 */
  difficulty?: Difficulty;
}

/** 地面在屏幕中的 y（像素）。 */
const GROUND_SCREEN_Y = VIEW_H - 40;

export class FightScene extends Phaser.Scene {
  private sim!: FightSim;
  private step = new FixedStep();
  private gfx!: Phaser.GameObjects.Graphics;
  private stage!: Marineford;
  private debug!: DebugOverlay;
  private hud!: Hud;
  private views: [FighterView | null, FighterView | null] = [null, null];
  private useSprites = true;
  private mode: GameMode = 'versus';
  private data_!: FightSceneData;
  private dummy = new Dummy();
  private cpu: Cpu | null = null;
  private trainingText!: Phaser.GameObjects.Text;
  private lastInput = { p1: 0, p2: 0 };
  private shake = 0;
  private wasRoundOver = false;
  private popups: { text: Phaser.GameObjects.Text; ttl: number }[] = [];
  private paused = false;
  private pauseUi: { bg: Phaser.GameObjects.Rectangle; title: Phaser.GameObjects.Text; menu: MenuList } | null = null;

  constructor() {
    super('Fight');
  }

  create(data: FightSceneData): void {
    const p1 = characters[data.p1];
    const p2 = characters[data.p2];
    if (!p1 || !p2) throw new Error(`Unknown character: ${data.p1} / ${data.p2}`);
    this.data_ = data;
    this.mode = data.mode ?? 'versus';
    this.paused = false;
    this.pauseUi = null;
    this.popups = [];
    this.shake = 0;
    this.wasRoundOver = false;
    this.dummy = new Dummy();
    this.cpu =
      this.mode === 'cpu'
        ? new Cpu(1, characterAi[data.p2] ?? characterAi['akainu']!, data.difficulty ?? 'normal', (Date.now() & 0xffff) | 1)
        : null;

    this.sim = new FightSim(
      this.mode === 'training' ? { p1, p2, seed: 1, introFrames: 0, roundTime: -1 } : { p1, p2, seed: 1 },
    );
    if (this.mode === 'training') this.sim.training = { infiniteHp: true, infiniteMeter: true };
    getInputHub().flush();
    this.stage = new Marineford(this, GROUND_SCREEN_Y);
    this.gfx = this.add.graphics();
    this.hud = new Hud(this, [p1.name, p2.name]);
    this.debug = new DebugOverlay(this, this.mode === 'training');

    // 精灵视图：Preload 决定了每个角色可用的图集 key
    const keys = (this.registry.get(SPRITE_KEYS) as SpriteKeys | undefined) ?? {};
    const mk = (id: string) => {
      const key = keys[id];
      return key ? new FighterView(this, key, id, characterAnims[id] ?? {}) : null;
    };
    this.views = [mk(data.p1), mk(data.p2)];

    this.add
      .text(VIEW_W / 2, VIEW_H - 12, 'Esc / Start 暂停  |  back=guard  4/6+C=throw  A+B=roll  C+D=blowback  66/44 dash  |  236/214/623/22 +P/K   236236/214214 super   236236K ultimate', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#6c7a89',
      })
      .setOrigin(0.5, 0)
      .setDepth(52);
    this.trainingText = this.add
      .text(VIEW_W / 2, 44, '', { fontFamily: 'monospace', fontSize: '8px', color: '#ffd60a' })
      .setOrigin(0.5, 0)
      .setDepth(52)
      .setVisible(this.mode === 'training');

    const kb = this.input.keyboard;
    kb?.on('keydown-F4', () => (this.useSprites = !this.useSprites));
    kb?.on('keydown-ESC', () => this.togglePause());
    if (this.mode === 'training') {
      kb?.on('keydown-F5', () => this.dummy.next());
      kb?.on('keydown-F6', () => this.sim.resetPositions());
      kb?.on('keydown-F7', () => (this.sim.training.infiniteMeter = !this.sim.training.infiniteMeter));
      kb?.on('keydown-F8', () => (this.sim.training.infiniteHp = !this.sim.training.infiniteHp));
    }
  }

  // ---------- 暂停 ----------

  private togglePause(): void {
    const phase = this.sim.state.phase;
    if (!this.paused && phase !== 'fight' && phase !== 'intro') return;
    this.paused = !this.paused;
    if (this.paused) {
      const bg = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.6).setOrigin(0).setDepth(200);
      const title = this.add
        .text(VIEW_W / 2, 70, 'PAUSE', { fontFamily: UI.font, fontSize: '22px', color: UI.title, fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(201);
      const items = [{ label: '继续  RESUME' }, { label: '键位设置  KEY CONFIG' }, { label: '重新选人  CHARACTER SELECT' }, { label: '回标题  TITLE' }];
      const menu = new MenuList(this, VIEW_W / 2 - 70, 104, items, 20, '11px', 202);
      this.pauseUi = { bg, title, menu };
    } else {
      this.pauseUi?.bg.destroy();
      this.pauseUi?.title.destroy();
      this.pauseUi?.menu.destroy();
      this.pauseUi = null;
    }
    getInputHub().flush();
  }

  private updatePaused(): void {
    const menu = this.pauseUi?.menu;
    if (!menu) return;
    const action = menu.update(getInputHub().edges());
    if (action === 'back') {
      this.togglePause();
      return;
    }
    if (action !== 'select') return;
    switch (menu.index) {
      case 0:
        this.togglePause();
        break;
      case 1:
        this.togglePause();
        this.scene.start('Settings', { back: 'Preload', backData: this.data_ });
        break;
      case 2:
        this.togglePause();
        this.scene.start('CharacterSelect', { mode: this.mode });
        break;
      default:
        this.togglePause();
        this.scene.start('Title');
    }
  }

  override update(_time: number, deltaMs: number): void {
    const steps = this.step.advance(deltaMs);
    if (this.paused) {
      for (let i = 0; i < steps; i++) this.updatePaused();
      return;
    }
    const hub = getInputHub();
    for (let i = 0; i < steps; i++) {
      const raw = hub.snapshot();
      const pressedStart = (raw.p1 | raw.p2) & Btn.Start & ~(this.lastInput.p1 | this.lastInput.p2);
      const phase = this.sim.state.phase;
      if (pressedStart && (phase === 'fight' || phase === 'intro')) {
        this.lastInput = raw;
        this.togglePause();
        return;
      }
      if (phase === 'match_end' && pressedStart) {
        const w = this.sim.state;
        const winner: 0 | 1 = w.wins[0] > w.wins[1] ? 0 : 1;
        const result: ResultData = { ...this.data_, winner, wins: w.wins };
        this.scene.start('Result', result);
        return;
      }
      // 比赛结束阶段不把 Start 传给 sim（由 Result 场景接管重开）
      this.lastInput = phase === 'match_end' ? { p1: raw.p1 & ~Btn.Start, p2: raw.p2 & ~Btn.Start } : raw;
      if (this.cpu) {
        this.lastInput = { p1: this.lastInput.p1, p2: this.cpu.input(this.sim) };
      } else if (this.mode === 'training') {
        const d = this.dummy.input(this.sim, 1);
        if (d !== null) this.lastInput = { p1: this.lastInput.p1, p2: d };
      }
      this.sim.step(this.lastInput);
      for (const h of this.sim.hits) {
        if (h.kind === 'hit') this.shake = Math.max(this.shake, Math.min(4, 1 + h.damage / 30));
        else if (h.kind === 'block') this.shake = Math.max(this.shake, 1);
        if (h.kind === 'block') this.popup('BLOCK', h.x, h.y, '#48cae4');
        else if (h.kind === 'tech') this.popup('TECH!', h.x, h.y, '#ffd60a');
        else if (h.kind === 'throw') this.popup('THROW', h.x, h.y, '#ff9f1c');
        else if (h.kind === 'armor') this.popup('ARMOR', h.x, h.y, '#ffd60a');
        else if (h.kind === 'reflect') this.popup('REFLECT!', h.x, h.y, '#48cae4');
        else if (h.kind === 'clash') this.popup('CLASH', h.x, h.y, '#e0fbfc');
        else if (h.counter) this.popup('COUNTER!', h.x, h.y, '#ff3860');
      }
      this.hud.onEvents(this.sim.hits, 1);
    }
    const w = this.sim.state;
    const roundActive = w.phase === 'fight' || w.phase === 'intro';
    if (!this.wasRoundOver && !roundActive) this.wasRoundOver = true;
    if (this.wasRoundOver && roundActive) {
      this.hud.reset();
      this.wasRoundOver = false;
    }
    this.draw(w);
    this.hud.draw(w);
    if (this.mode === 'training') {
      const t = this.sim.training;
      this.trainingText.setText(
        `TRAINING  F5 dummy: ${this.dummy.mode}   F6 reset   F7 meter: ${t.infiniteMeter ? 'inf' : 'normal'}   F8 hp: ${t.infiniteHp ? 'inf' : 'normal'}   F4 sprites: ${this.useSprites ? 'on' : 'off'}`,
      );
    }
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
    this.stage.draw(w.cameraX + this.shakeOffset() * SUBPIXEL, w.frame);

    for (const f of w.fighters) {
      const view = this.views[f.player];
      if (this.useSprites && view && this.drawSprite(view, f, w.cameraX)) continue;
      view?.hide();
      this.drawFighter(f, w.cameraX);
    }
    for (const p of w.projectiles) this.drawProjectile(p, w.cameraX);

    this.debug.draw(
      w,
      this.sim,
      this.lastInput,
      (x) => this.worldToScreenX(x, w.cameraX),
      (y) => this.worldToScreenY(y),
    );
  }

  /** 精灵渲染：状态色调（受击白 / 防御蓝 / 二档粉 / 灼烧橙）与闪避半透明由 tint / alpha 表现。 */
  private drawSprite(view: FighterView, f: FighterState, cameraX: number): boolean {
    const hitState = f.state === 'hit_stand' || f.state === 'hit_crouch' || f.state === 'hit_air';
    const move = this.sim.move(f);
    let tint: number | null = null;
    if (f.justHit || (f.hitstop > 0 && hitState)) tint = 0xffffff;
    else if (f.state === 'block_stand' || f.state === 'block_crouch') tint = 0x9fd8ff;
    else if (f.install) tint = 0xffc8dd;
    else if (f.burnFrames > 0 && this.sim.state.frame % 8 < 4) tint = 0xff9f1c;
    else if (this.sim.hasArmor(f)) tint = 0xffe066;
    const dodging = !!move?.dodge && this.sim.isStrikeInvulnerable(f);
    const alpha = dodging ? 0.45 : this.sim.isStrikeInvulnerable(f) && (f.state === 'roll_fwd' || f.state === 'roll_back' || f.state === 'backdash') ? 0.7 : 1;
    return view.update(this.sim, f, this.worldToScreenX(f.x, cameraX), this.worldToScreenY(f.y), tint, alpha);
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
    const move = this.sim.move(f);
    const frameNo = this.sim.state.frame;
    let bodyColor = f.def.color;
    if (flash) bodyColor = 0xffffff;
    else if (f.state === 'getup' || f.state === 'throw_tech') bodyColor = 0x9d9d9d;
    else if (blocking) bodyColor = Phaser.Display.Color.IntegerToColor(f.def.color).darken(25).color;
    else if (f.install) bodyColor = Phaser.Display.Color.IntegerToColor(f.def.color).lighten(18).color;
    else if (f.fatigueFrames > 0) bodyColor = Phaser.Display.Color.IntegerToColor(f.def.color).desaturate(40).color;

    // 灼烧：身上冒橙色火点
    if (f.burnFrames > 0 && !lying) {
      for (let i = 0; i < 3; i++) {
        const px_ = sx + ((frameNo * 7 + i * 13) % Math.max(1, sw));
        const py_ = sy + ((frameNo * 5 + i * 29) % Math.max(1, sh));
        g.fillStyle(i % 2 ? 0xff9f1c : 0xff3860, 0.9).fillRect(px_, py_, 3, 3);
      }
    }
    // 二档：身后蒸汽
    if (f.install && !lying) {
      for (let i = 0; i < 4; i++) {
        const t = (frameNo * 3 + i * 17) % 40;
        const px_ = sx + sw / 2 - f.facing * (6 + t * 0.4) + ((i * 7) % 5) - 2;
        g.fillStyle(0xffc8dd, 0.35 + 0.3 * (1 - t / 40)).fillCircle(px_, sy + 10 + i * 12 - t * 0.3, 3 - t / 20);
      }
    }
    // 熔岩化闪避：半透明橙红
    if (move?.dodge && invuln) {
      g.fillStyle(0xff6b35, 0.45).fillRect(sx, sy, sw, sh);
      g.lineStyle(1, 0xffd60a, 0.8).strokeRect(sx, sy, sw, sh);
      return;
    }
    // 橡胶气球：大圆
    if (move?.reflect && f.state === 'attack') {
      const cx = this.worldToScreenX(f.x, cameraX);
      const r = sh * 0.6;
      g.fillStyle(f.def.color, 1).fillCircle(cx, groundY - r, r);
      g.lineStyle(1, 0xffffff, 0.7).strokeCircle(cx, groundY - r, r);
      const headW = sw * 0.6;
      g.fillStyle(0xffe8d6, 1).fillRect(cx - headW / 2, groundY - r * 2 - 8, headW, 10);
      return;
    }

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
    // 霸体：金色描边
    if (this.sim.hasArmor(f)) g.lineStyle(2, 0xffd60a, 0.9).strokeRect(sx - 1, sy - 1, sw + 2, sh + 2);
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

    // 伸出的肢体：用当前帧的攻击框（无论是否已命中）表现；指令投的抓取框画成手
    const fd = this.sim.currentFrame(f);
    if (fd?.hitboxes && move?.throwData) {
      const [x, y, w, h] = fd.hitboxes[0]!;
      const wx = f.facing === 1 ? x : -x - w;
      g.fillStyle(0xffd60a, 0.5).fillRect(
        this.worldToScreenX(f.x + wx * SUBPIXEL, cameraX),
        this.worldToScreenY(f.y + y * SUBPIXEL),
        w,
        h,
      );
    } else if (fd?.hitboxes) {
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

  /** 飞行道具占位：犬头 = 橙圆 + 眼；熔岩流星 = 红橙方块带尾迹。被弹反后变蓝。 */
  private drawProjectile(p: ProjectileState, cameraX: number): void {
    const g = this.gfx;
    const b = this.sim.projectileBox(p);
    const sx = this.worldToScreenX(b.x, cameraX);
    const sy = this.worldToScreenY(b.y);
    const sw = b.w / SUBPIXEL;
    const sh = b.h / SUBPIXEL;
    const main = p.reflected ? 0x48cae4 : 0xff6b35;
    const accent = p.reflected ? 0xcaf0f8 : 0xffd60a;
    if (p.kind === 'dog') {
      const cx = sx + sw / 2;
      const cy = sy + sh / 2;
      g.fillStyle(main, 1).fillCircle(cx, cy, sw / 2);
      const dir = p.vx >= 0 ? 1 : -1;
      g.fillStyle(accent, 1).fillRect(cx + dir * sw * 0.15, cy - sh * 0.25, 4, 4);
      // 尾迹
      for (let i = 1; i <= 3; i++) g.fillStyle(main, 0.35 - i * 0.1).fillCircle(cx - dir * i * 8, cy, sw / 2 - i * 2);
    } else {
      g.fillStyle(main, 1).fillRect(sx, sy, sw, sh);
      g.fillStyle(accent, 0.9).fillRect(sx + 4, sy + 4, sw - 8, sh - 8);
      for (let i = 1; i <= 3; i++) g.fillStyle(main, 0.3 - i * 0.08).fillRect(sx + 4, sy - i * 10, sw - 8, 8);
    }
  }
}
