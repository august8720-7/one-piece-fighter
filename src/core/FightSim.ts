import {
  GRAVITY,
  GROUND_Y,
  MAX_FALL_SPEED,
  MAX_SEPARATION,
  STAGE_LEFT,
  STAGE_RIGHT,
  SUBPIXEL,
  px,
} from './constants';
import { overlapX, overlaps, toWorldBox } from './collision';
import { has, horizontalRelative, isDoubleTap, pressedTogether } from './input';
import { frameAt } from './moveBuilder';
import { Rng } from './Rng';
import {
  ATTACK_BUTTONS,
  Btn,
  INPUT_HISTORY,
  type AttackButton,
  type Box,
  type BoxPx,
  type FighterDef,
  type FighterState,
  type FrameData,
  type HitEvent,
  type HitKind,
  type InputFrame,
  type MoveData,
  type PlayerIndex,
  type Stance,
  type StateId,
  type WorldState,
} from './types';

export interface FightSimOptions {
  p1: FighterDef;
  p2: FighterDef;
  seed?: number;
}

export const PREJUMP_FRAMES = 3;
export const LANDING_FRAMES = 3;
export const KNOCKDOWN_FRAMES = 36;
export const GETUP_FRAMES = 14;
export const THROW_TECH_FRAMES = 20;
/** 地面受击 / 防御时的击退摩擦（子像素 / 帧²） */
const GROUND_FRICTION = px(0.35);
/** 防御击退相对命中击退的比例（/8） */
const BLOCK_PUSHBACK_NUM = 5;
/** 撞墙反弹水平速度保留比例（/8） */
const WALL_BOUNCE_NUM = 5;

const OPERABLE: ReadonlySet<StateId> = new Set(['idle', 'walk_fwd', 'walk_back', 'crouch', 'dash']);
const GUARD_CAPABLE: ReadonlySet<StateId> = new Set([
  'idle', 'walk_back', 'crouch', 'landing', 'block_stand', 'block_crouch',
]);
const THROWABLE: ReadonlySet<StateId> = new Set([
  'idle', 'walk_fwd', 'walk_back', 'crouch', 'landing', 'dash', 'attack', 'roll_fwd', 'roll_back', 'backdash',
]);

/**
 * 格斗世界模拟器。固定步长、确定性、无渲染依赖。
 * 每次 step(input) 推进一帧。
 */
export class FightSim {
  readonly rng: Rng;
  private frame = 0;
  private readonly fighters: [FighterState, FighterState];
  private cameraX = 0;
  private roundOver = false;
  private winner: PlayerIndex | null = null;
  /** 本帧产生的事件（每帧清空） */
  readonly hits: HitEvent[] = [];

  constructor(private readonly opts: FightSimOptions) {
    this.rng = new Rng(opts.seed ?? 1);
    this.fighters = [createFighter(opts.p1, 0, px(-90), 1), createFighter(opts.p2, 1, px(90), -1)];
  }

  get state(): WorldState {
    return {
      frame: this.frame,
      fighters: this.fighters,
      cameraX: this.cameraX,
      roundOver: this.roundOver,
      winner: this.winner,
    };
  }

  resetRound(): void {
    this.fighters[0] = createFighter(this.opts.p1, 0, px(-90), 1);
    this.fighters[1] = createFighter(this.opts.p2, 1, px(90), -1);
    this.roundOver = false;
    this.winner = null;
  }

  step(input: InputFrame): void {
    this.hits.length = 0;
    const [f1, f2] = this.fighters;
    for (const f of this.fighters) {
      f.justHit = false;
      f.justBlocked = false;
    }

    if (this.roundOver) {
      if (has(input.p1, Btn.Start) || has(input.p2, Btn.Start)) {
        this.resetRound();
      } else {
        for (const f of this.fighters) if (f.state !== 'ko') this.advanceAfterKo(f);
        this.physics(f1);
        this.physics(f2);
      }
      this.frame++;
      return;
    }

    // 1. 输入 → 状态（hitstop 中冻结）
    this.updateFighter(f1, f2, input.p1);
    this.updateFighter(f2, f1, input.p2);

    // 2. 拆投（双方都已读入本帧输入后判定，保证 P1/P2 对称）与投技锁定位置
    this.checkThrowTech(f1, f2);
    this.checkThrowTech(f2, f1);
    this.holdThrown(f1, f2);
    this.holdThrown(f2, f1);

    // 3. 打击判定（同帧双向，支持相杀）
    const hit1 = this.detectStrike(f1, f2);
    const hit2 = this.detectStrike(f2, f1);
    if (hit1) this.resolveStrike(f1, f2, hit1);
    if (hit2) this.resolveStrike(f2, f1, hit2);

    // 4. 物理与约束
    if (f1.hitstop === 0) this.physics(f1);
    if (f2.hitstop === 0) this.physics(f2);
    this.separatePushboxes(f1, f2);
    this.clampToStage(f1, f2);
    updateFacing(f1, f2);

    // 5. KO：一击必定击飞，落地后进入 ko
    for (const f of this.fighters) {
      if (f.hp <= 0 && f.state !== 'ko') {
        f.hp = 0;
        this.roundOver = true;
        this.winner = f.player === 0 ? 1 : 0;
        if (!f.airborne) {
          const other = this.fighters[f.player === 0 ? 1 : 0];
          f.airborne = true;
          f.vx = px(5) * other.facing;
          f.vy = px(-6);
          setState(f, 'hit_air');
        }
        f.stun = 1 << 30;
      }
    }

    this.cameraX = (f1.x + f2.x) >> 1;
    this.frame++;
  }

  // ---------- 判定框查询（渲染 / 调试 / 碰撞共用） ----------

  stance(f: FighterState): Stance {
    if (f.airborne) return 'air';
    switch (f.state) {
      case 'crouch':
      case 'hit_crouch':
      case 'block_crouch':
        return 'crouch';
      case 'attack': {
        const m = this.move(f);
        return m?.input.stance === 'crouch' ? 'crouch' : 'stand';
      }
      case 'roll_fwd':
      case 'roll_back':
      case 'knockdown':
        return 'crouch';
      default:
        return 'stand';
    }
  }

  pushbox(f: FighterState): Box {
    const s = this.stance(f);
    const def = s === 'air' ? f.def.pushboxAir : s === 'crouch' ? f.def.pushboxCrouch : f.def.pushboxStand;
    return toWorldBox(def, f.x, f.y, f.facing);
  }

  /** 打击无敌：翻滚前段、后撤步前段、倒地、起身、投技演出中、KO */
  isStrikeInvulnerable(f: FighterState): boolean {
    switch (f.state) {
      case 'roll_fwd':
      case 'roll_back':
        return f.stateFrame < f.def.movement.rollInvuln;
      case 'backdash':
        return f.stateFrame < f.def.movement.backdashInvuln;
      case 'knockdown':
      case 'getup':
      case 'throw':
      case 'thrown':
      case 'throw_tech':
      case 'ko':
        return true;
      default:
        return false;
    }
  }

  isThrowable(f: FighterState): boolean {
    return !f.airborne && THROWABLE.has(f.state);
  }

  hurtboxes(f: FighterState): Box[] {
    if (this.isStrikeInvulnerable(f)) return [];
    const fd = this.currentFrame(f);
    let boxes: readonly BoxPx[];
    if (fd?.hurtboxes) boxes = fd.hurtboxes;
    else {
      const s = this.stance(f);
      boxes = s === 'air' ? f.def.hurtboxAir : s === 'crouch' ? f.def.hurtboxCrouch : f.def.hurtboxStand;
    }
    return boxes.map((b) => toWorldBox(b, f.x, f.y, f.facing));
  }

  hitboxes(f: FighterState): Box[] {
    if (f.state !== 'attack' || f.hasHit) return [];
    const fd = this.currentFrame(f);
    return (fd?.hitboxes ?? []).map((b) => toWorldBox(b, f.x, f.y, f.facing));
  }

  move(f: FighterState): MoveData | null {
    if (!f.moveId) return null;
    return f.def.moves.find((m) => m.id === f.moveId) ?? null;
  }

  currentFrame(f: FighterState): FrameData | null {
    const m = this.move(f);
    return m && (f.state === 'attack' || f.state === 'throw') ? frameAt(m, f.stateFrame) : null;
  }

  /** 是否正在防御（含防御硬直中） */
  isGuarding(f: FighterState): boolean {
    if (f.airborne || !GUARD_CAPABLE.has(f.state)) return false;
    return horizontalRelative(f.bits, f.facing) === -1;
  }

  // ---------- 每帧状态推进 ----------

  private updateFighter(f: FighterState, opp: FighterState, bits: number): void {
    const pressed = bits & ~f.bits;
    f.prevBits = f.bits;
    f.bits = bits;
    f.dirHistory.push(horizontalRelative(bits, f.facing));
    if (f.dirHistory.length > INPUT_HISTORY) f.dirHistory.shift();

    if (f.hitstop > 0) {
      f.hitstop--;
      return;
    }

    const mv = f.def.movement;

    switch (f.state) {
      case 'hit_stand':
      case 'hit_crouch':
        f.stun--;
        if (f.stun <= 0) setState(f, f.state === 'hit_crouch' ? 'crouch' : 'idle');
        else f.stateFrame++;
        return;
      case 'block_stand':
      case 'block_crouch': {
        f.stun--;
        // 防御硬直中可切换站 / 蹲防
        const crouch = has(bits, Btn.Down);
        if (f.stun <= 0) setState(f, crouch ? 'crouch' : 'idle');
        else {
          const want: StateId = crouch ? 'block_crouch' : 'block_stand';
          if (f.state !== want) f.state = want;
          f.stateFrame++;
        }
        return;
      }
      case 'hit_air':
        f.stateFrame++;
        return;
      case 'knockdown':
        f.stateFrame++;
        if (f.stateFrame >= KNOCKDOWN_FRAMES) setState(f, 'getup');
        return;
      case 'getup':
        f.stateFrame++;
        if (f.stateFrame >= GETUP_FRAMES) setState(f, 'idle');
        return;
      case 'ko':
      case 'thrown':
        return;
      case 'throw_tech':
        f.stateFrame++;
        if (f.stateFrame >= THROW_TECH_FRAMES) setState(f, 'idle');
        return;
      case 'throw':
        this.tickThrow(f, opp);
        return;
      case 'prejump': {
        f.stateFrame++;
        if (!has(bits, Btn.Up)) f.hopPending = true;
        if (f.stateFrame >= PREJUMP_FRAMES) {
          const h = horizontalRelative(bits, f.facing);
          f.airborne = true;
          f.vy = f.hopPending ? mv.hopVelocityY : mv.jumpVelocityY;
          f.vx = h * mv.jumpVelocityX * f.facing;
          setState(f, h === 1 ? 'jump_fwd' : h === -1 ? 'jump_back' : 'jump_neutral');
        }
        return;
      }
      case 'landing':
        f.stateFrame++;
        if (f.stateFrame >= LANDING_FRAMES) setState(f, 'idle');
        return;
      case 'backdash': {
        f.stateFrame++;
        // 速度线性衰减
        const remain = mv.backdashFrames - f.stateFrame;
        f.vx = -f.facing * Math.floor((mv.backdashSpeed * Math.max(remain, 0)) / mv.backdashFrames);
        if (f.stateFrame >= mv.backdashFrames) {
          f.vx = 0;
          setState(f, 'idle');
        }
        return;
      }
      case 'roll_fwd':
      case 'roll_back': {
        f.stateFrame++;
        const dir = f.state === 'roll_fwd' ? 1 : -1;
        // 前 3/4 移动，后 1/4 停下（收招硬直）
        f.vx = f.stateFrame < (mv.rollFrames * 3) >> 2 ? dir * f.facing * mv.rollSpeed : 0;
        if (f.stateFrame >= mv.rollFrames) {
          f.vx = 0;
          setState(f, 'idle');
        }
        return;
      }
      case 'attack': {
        const m = this.move(f);
        f.stateFrame++;
        const fd = m ? frameAt(m, f.stateFrame) : null;
        if (fd?.velocity?.x) f.vx = px(fd.velocity.x) * f.facing;
        else if (!f.airborne) f.vx = 0;
        if (!fd) {
          f.moveId = null;
          if (f.airborne) setState(f, 'jump_neutral');
          else setState(f, has(bits, Btn.Down) ? 'crouch' : 'idle');
        }
        return;
      }
      default:
        break;
    }

    // ---- 可操作状态（idle / walk / crouch / dash / 空中）----

    // 翻滚 A+B（地面）
    if (!f.airborne && pressedTogether(bits, pressed, Btn.A, Btn.B)) {
      const h = horizontalRelative(bits, f.facing);
      setState(f, h === -1 ? 'roll_back' : 'roll_fwd');
      return;
    }

    // 出招（含 C+D 吹飞、投技）
    if (this.tryAttack(f, opp, bits, pressed)) return;

    if (f.airborne) {
      f.stateFrame++;
      return;
    }

    const h = horizontalRelative(bits, f.facing);
    const up = has(bits, Btn.Up);
    const down = has(bits, Btn.Down);

    // 前冲（奔跑）：66 触发，按住前进持续
    if (f.state === 'dash') {
      if (h === 1 && !up && !down) {
        f.vx = f.facing * mv.runSpeed;
        f.stateFrame++;
        return;
      }
      // 松开 → 直接回到常规处理（下方）
    } else if (h === 1 && !up && !down && isDoubleTap(f.dirHistory, 1)) {
      f.vx = f.facing * mv.runSpeed;
      setState(f, 'dash');
      return;
    }
    // 后撤步：44
    if (h === -1 && !up && !down && isDoubleTap(f.dirHistory, -1)) {
      setState(f, 'backdash');
      f.vx = -f.facing * mv.backdashSpeed;
      return;
    }

    if (up && !down) {
      f.vx = 0;
      f.hopPending = false;
      setState(f, 'prejump');
      return;
    }
    if (down) {
      f.vx = 0;
      setState(f, 'crouch');
      return;
    }
    if (h === 1) {
      f.vx = mv.walkFwdSpeed * f.facing;
      setState(f, 'walk_fwd');
    } else if (h === -1) {
      f.vx = -mv.walkBackSpeed * f.facing;
      setState(f, 'walk_back');
    } else {
      f.vx = 0;
      setState(f, 'idle');
    }
  }

  /** 按键 → 选招。优先级：投技 > 双键 > 单键。返回是否出招。 */
  private tryAttack(f: FighterState, opp: FighterState, bits: number, pressed: number): boolean {
    const stance: Stance = f.airborne ? 'air' : has(bits, Btn.Down) ? 'crouch' : 'stand';
    const h = horizontalRelative(bits, f.facing);
    const dist = Math.abs(f.x - opp.x);

    // 投技：地面站立，按住 4/6，对手可抓且在距离内
    if (stance === 'stand' && h !== 0) {
      for (const m of f.def.moves) {
        if (m.type !== 'throw' || !m.throwData) continue;
        const wantDir = h === 1 ? 6 : 4;
        if (m.input.direction !== wantDir || !(pressed & m.input.button)) continue;
        if (dist <= px(m.throwData.range) && this.isThrowable(opp)) {
          this.startThrow(f, opp, m);
          return true;
        }
      }
    }

    // 双键
    for (const m of f.def.moves) {
      if (!m.input.plus || m.input.stance !== stance) continue;
      if (pressedTogether(bits, pressed, m.input.button, m.input.plus)) {
        this.startMove(f, m);
        return true;
      }
    }

    // 单键
    for (const b of ATTACK_BUTTONS) {
      if (!(pressed & b)) continue;
      const m = this.findNormal(f, stance, b);
      if (m) {
        this.startMove(f, m);
        return true;
      }
    }
    return false;
  }

  private findNormal(f: FighterState, stance: Stance, b: AttackButton): MoveData | null {
    return (
      f.def.moves.find(
        (m) => (m.type === 'normal' || m.type === 'command_normal') && m.input.stance === stance && m.input.button === b && !m.input.plus,
      ) ?? null
    );
  }

  private startMove(f: FighterState, m: MoveData): void {
    f.moveId = m.id;
    f.hasHit = false;
    if (!f.airborne) f.vx = 0;
    setState(f, 'attack');
    const fd = frameAt(m, 0);
    if (fd?.velocity?.x) f.vx = px(fd.velocity.x) * f.facing;
  }

  // ---------- 投技 ----------

  private startThrow(att: FighterState, def: FighterState, m: MoveData): void {
    att.moveId = m.id;
    att.hasHit = false;
    att.vx = 0;
    setState(att, 'throw');
    def.moveId = null;
    def.vx = 0;
    def.vy = 0;
    def.airborne = false;
    setState(def, 'thrown');
    this.holdThrown(att, def);
    this.pushEvent('throw', att, def, m, 0, def.x, def.y - px(60));
  }

  private holdThrown(att: FighterState, def: FighterState): void {
    if (att.state !== 'throw' || def.state !== 'thrown') return;
    const m = this.move(att);
    if (!m?.throwData) return;
    def.x = att.x + att.facing * px(m.throwData.holdOffset);
    def.y = GROUND_Y;
    def.facing = att.facing === 1 ? -1 : 1;
  }

  /** 拆投窗口内对手按下 C 或 D → 双方弹开，无伤害。 */
  private checkThrowTech(att: FighterState, def: FighterState): void {
    if (att.state !== 'throw' || def.state !== 'thrown') return;
    const m = this.move(att);
    if (!m?.throwData || att.stateFrame > m.throwData.techWindow) return;
    const defPressed = def.bits & ~def.prevBits;
    if (!(defPressed & (Btn.C | Btn.D))) return;
    att.moveId = null;
    setState(att, 'throw_tech');
    setState(def, 'throw_tech');
    att.vx = -att.facing * px(3);
    def.vx = att.facing * px(3);
    this.pushEvent('tech', att, def, m, 0, def.x, def.y - px(70));
  }

  private tickThrow(att: FighterState, def: FighterState): void {
    const m = this.move(att);
    if (!m?.throwData || def.state !== 'thrown') {
      att.moveId = null;
      setState(att, 'idle');
      return;
    }
    const td = m.throwData;
    att.stateFrame++;

    if (att.stateFrame === td.releaseFrame) {
      // 结算：换边（后投）+ 击飞倒地
      if (td.switchSides) {
        def.x = att.x - att.facing * px(td.holdOffset);
        att.facing = att.facing === 1 ? -1 : 1;
      }
      const dir = att.facing;
      def.hp -= m.damage;
      def.justHit = true;
      def.airborne = true;
      def.vx = px(m.knockback.x) * dir;
      def.vy = px(m.knockback.y);
      def.stun = 1;
      def.wallBounce = false;
      setState(def, 'hit_air');
      att.hasHit = true;
      this.pushEvent('hit', att, def, m, m.damage, def.x, def.y - px(60));
    }

    if (!frameAt(m, att.stateFrame)) {
      att.moveId = null;
      setState(att, 'idle');
    }
  }

  // ---------- 打击 ----------

  private detectStrike(att: FighterState, def: FighterState): MoveData | null {
    if (att.state !== 'attack' || att.hasHit || att.hitstop > 0) return null;
    const m = this.move(att);
    if (!m) return null;
    const hbs = this.hitboxes(att);
    if (hbs.length === 0) return null;
    const hurts = this.hurtboxes(def);
    for (const hb of hbs) for (const hu of hurts) if (overlaps(hb, hu)) return m;
    return null;
  }

  private canBlock(def: FighterState, m: MoveData): boolean {
    if (m.guard === 'unblockable' || !this.isGuarding(def)) return false;
    const crouching = has(def.bits, Btn.Down);
    switch (m.guard) {
      case 'mid':
        return true;
      case 'high':
        return !crouching;
      case 'low':
        return crouching;
    }
  }

  private resolveStrike(att: FighterState, def: FighterState, m: MoveData): void {
    att.hasHit = true;
    const hb = this.hitboxes(att)[0];
    const ex = hb ? hb.x + (hb.w >> 1) : def.x;
    const ey = hb ? hb.y + (hb.h >> 1) : def.y - px(60);
    const dir = att.facing;

    if (this.canBlock(def, m)) {
      att.hitstop = m.hitstop;
      def.hitstop = m.hitstop;
      def.justBlocked = true;
      def.stun = m.blockstun;
      def.vx = ((px(m.knockback.x) * BLOCK_PUSHBACK_NUM) >> 3) * dir;
      setState(def, has(def.bits, Btn.Down) ? 'block_crouch' : 'block_stand');
      this.pushEvent('block', att, def, m, 0, ex, ey);
      return;
    }

    att.hitstop = m.hitstop;
    def.hitstop = m.hitstop;
    def.hp -= m.damage;
    def.justHit = true;
    def.moveId = null;

    const launch = m.knockback.y !== 0 || def.airborne || m.knockdown;
    if (launch) {
      def.airborne = true;
      def.vx = px(m.knockback.x) * dir;
      def.vy = m.knockback.y !== 0 ? px(m.knockback.y) : m.knockdown ? px(-4) : px(-3);
      def.stun = m.hitstun;
      def.wallBounce = !!m.wallBounce;
      setState(def, 'hit_air');
    } else {
      def.vx = px(m.knockback.x) * dir;
      def.stun = m.hitstun;
      setState(def, this.stance(def) === 'crouch' ? 'hit_crouch' : 'hit_stand');
    }
    this.pushEvent('hit', att, def, m, m.damage, ex, ey);
  }

  private pushEvent(kind: HitKind, att: FighterState, def: FighterState, m: MoveData, damage: number, x: number, y: number): void {
    this.hits.push({ frame: this.frame, kind, attacker: att.player, defender: def.player, moveId: m.id, damage, x, y });
  }

  /** KO 后继续推进非 ko 状态（只处理计时，不接受输入）。 */
  private advanceAfterKo(f: FighterState): void {
    if (f.hitstop > 0) {
      f.hitstop--;
      return;
    }
    if (f.state === 'attack' || f.state === 'throw') {
      const m = this.move(f);
      f.stateFrame++;
      if (!m || !frameAt(m, f.stateFrame)) {
        f.moveId = null;
        setState(f, f.airborne ? 'jump_neutral' : 'idle');
      }
    } else if (f.state !== 'idle') {
      f.stateFrame++;
    }
  }

  // ---------- 物理 ----------

  private physics(f: FighterState): void {
    if (f.state === 'thrown') return;
    f.x += f.vx;

    if (f.airborne) {
      f.vy = Math.min(f.vy + GRAVITY, MAX_FALL_SPEED);
      f.y += f.vy;
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        f.vy = 0;
        f.vx = 0;
        f.airborne = false;
        f.wallBounce = false;
        if (f.hp <= 0) setState(f, 'ko');
        else if (f.state === 'hit_air') setState(f, 'knockdown');
        else {
          f.moveId = null;
          setState(f, 'landing');
        }
      }
      return;
    }

    // 地面受击 / 防御 / 拆投滑行摩擦
    switch (f.state) {
      case 'hit_stand':
      case 'hit_crouch':
      case 'block_stand':
      case 'block_crouch':
      case 'throw_tech':
      case 'ko':
        if (f.vx > 0) f.vx = Math.max(0, f.vx - GROUND_FRICTION);
        else if (f.vx < 0) f.vx = Math.min(0, f.vx + GROUND_FRICTION);
        break;
      default:
        break;
    }
  }

  private separatePushboxes(a: FighterState, b: FighterState): void {
    if (a.state === 'thrown' || b.state === 'thrown') return;
    const boxA = this.pushbox(a);
    const boxB = this.pushbox(b);
    if (!overlaps(boxA, boxB)) return;
    const ox = overlapX(boxA, boxB);
    // 翻滚穿越：翻滚中的一方不与对手推挤（可以滚到背后）
    if (isRolling(a) !== isRolling(b)) return;
    if (a.airborne !== b.airborne) {
      const air = a.airborne ? a : b;
      const ground = a.airborne ? b : a;
      air.x += air.x <= ground.x ? -ox : ox;
      return;
    }
    const half = ox >> 1;
    if (a.x <= b.x) {
      a.x -= half;
      b.x += ox - half;
    } else {
      a.x += half;
      b.x -= ox - half;
    }
  }

  private clampToStage(a: FighterState, b: FighterState): void {
    for (const f of [a, b]) {
      const halfW = (f.def.pushboxStand[2] * SUBPIXEL) >> 1;
      let wall = 0;
      if (f.x - halfW < STAGE_LEFT) {
        f.x = STAGE_LEFT + halfW;
        wall = -1;
      } else if (f.x + halfW > STAGE_RIGHT) {
        f.x = STAGE_RIGHT - halfW;
        wall = 1;
      }
      // 吹飞撞墙反弹（一次）
      if (wall !== 0 && f.state === 'hit_air' && f.wallBounce && Math.sign(f.vx) === wall) {
        f.wallBounce = false;
        f.vx = -((f.vx * WALL_BOUNCE_NUM) >> 3);
        f.vy = Math.min(f.vy, px(-5));
      } else if (wall !== 0 && f.airborne && Math.sign(f.vx) === wall) {
        f.vx = 0;
      }
    }
    const dist = Math.abs(a.x - b.x);
    if (dist > MAX_SEPARATION) {
      const over = dist - MAX_SEPARATION;
      if (a.x < b.x) {
        a.x += over >> 1;
        b.x -= over - (over >> 1);
      } else {
        a.x -= over >> 1;
        b.x += over - (over >> 1);
      }
    }
  }
}

// ---------- 纯函数 ----------

function createFighter(def: FighterDef, player: PlayerIndex, x: number, facing: 1 | -1): FighterState {
  return {
    def,
    player,
    x,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing,
    state: 'idle',
    stateFrame: 0,
    hp: def.maxHp,
    airborne: false,
    moveId: null,
    hasHit: false,
    hitstop: 0,
    stun: 0,
    bits: 0,
    prevBits: 0,
    dirHistory: [],
    justHit: false,
    justBlocked: false,
    wallBounce: false,
    hopPending: false,
  };
}

function setState(f: FighterState, s: StateId): void {
  if (f.state !== s) {
    f.state = s;
    f.stateFrame = 0;
  } else {
    f.stateFrame++;
  }
}

function isRolling(f: FighterState): boolean {
  return f.state === 'roll_fwd' || f.state === 'roll_back';
}

/** 地面可操作 / 防御状态自动面向对手；空中、出招中、受击中、翻滚中保持面向。 */
function updateFacing(a: FighterState, b: FighterState): void {
  const canTurn = (f: FighterState) => !f.airborne && (OPERABLE.has(f.state) || f.state === 'landing');
  if (canTurn(a)) a.facing = a.x <= b.x ? 1 : -1;
  if (canTurn(b)) b.facing = b.x <= a.x ? 1 : -1;
}
