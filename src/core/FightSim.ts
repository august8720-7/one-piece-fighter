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
import { has, horizontalRelative } from './input';
import { frameAt } from './moveBuilder';
import { Rng } from './Rng';
import {
  ATTACK_BUTTONS,
  Btn,
  type Box,
  type BoxPx,
  type FighterDef,
  type FighterState,
  type FrameData,
  type HitEvent,
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

const KNOCKDOWN_FRAMES = 36;
const GETUP_FRAMES = 14;
/** 地面受击时的击退摩擦（子像素 / 帧²） */
const GROUND_FRICTION = px(0.35);

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
  /** 本帧产生的命中事件（每帧清空） */
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

  /** 重开一局（保留 rng 序列，位置与血量复位）。 */
  resetRound(): void {
    this.fighters[0] = createFighter(this.opts.p1, 0, px(-90), 1);
    this.fighters[1] = createFighter(this.opts.p2, 1, px(90), -1);
    this.roundOver = false;
    this.winner = null;
  }

  step(input: InputFrame): void {
    this.hits.length = 0;
    const [f1, f2] = this.fighters;
    f1.justHit = false;
    f2.justHit = false;

    if (this.roundOver) {
      // KO 后只剩物理（让被击飞者落地），Start 重开
      if (has(input.p1, Btn.Start) || has(input.p2, Btn.Start)) {
        this.resetRound();
      } else {
        for (const f of this.fighters) if (f.state !== 'ko') this.advanceState(f);
        applyPhysics(f1);
        applyPhysics(f2);
      }
      this.frame++;
      return;
    }

    // 1. 输入 → 状态（hitstop 中冻结）
    this.updateFighter(f1, input.p1);
    this.updateFighter(f2, input.p2);

    // 2. 命中判定（基于本帧状态，双方同时判定以支持相杀）
    const hit1 = this.detectHit(f1, f2);
    const hit2 = this.detectHit(f2, f1);
    if (hit1) this.applyHit(f1, f2, hit1);
    if (hit2) this.applyHit(f2, f1, hit2);

    // 3. 物理与约束
    if (f1.hitstop === 0) applyPhysics(f1);
    if (f2.hitstop === 0) applyPhysics(f2);
    separatePushboxes(this, f1, f2);
    clampToStage(f1, f2);
    updateFacing(f1, f2);

    // 4. KO 判定：KO 一击必定击飞，落地后进入 ko
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
    if (f.state === 'crouch' || f.state === 'hit_crouch') return 'crouch';
    if (f.state === 'attack' && f.moveId) {
      const m = this.move(f);
      if (m?.input.stance === 'crouch') return 'crouch';
    }
    return 'stand';
  }

  pushbox(f: FighterState): Box {
    const s = this.stance(f);
    const def = s === 'air' ? f.def.pushboxAir : s === 'crouch' ? f.def.pushboxCrouch : f.def.pushboxStand;
    return toWorldBox(def, f.x, f.y, f.facing);
  }

  hurtboxes(f: FighterState): Box[] {
    if (f.state === 'getup' || f.state === 'knockdown' || f.state === 'ko') return [];
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
    return m && f.state === 'attack' ? frameAt(m, f.stateFrame) : null;
  }

  // ---------- 内部 ----------

  private updateFighter(f: FighterState, bits: number): void {
    const pressed = bits & ~f.prevBits;
    f.prevBits = bits;

    if (f.hitstop > 0) {
      f.hitstop--;
      return;
    }

    switch (f.state) {
      case 'hit_stand':
      case 'hit_crouch':
        f.stun--;
        if (f.stun <= 0) setState(f, f.state === 'hit_crouch' ? 'crouch' : 'idle');
        else f.stateFrame++;
        return;
      case 'hit_air':
        f.stateFrame++;
        return; // 落地时由 applyPhysics 处理
      case 'knockdown':
        f.stateFrame++;
        if (f.stateFrame >= KNOCKDOWN_FRAMES) setState(f, 'getup');
        return;
      case 'getup':
        f.stateFrame++;
        if (f.stateFrame >= GETUP_FRAMES) setState(f, 'idle');
        return;
      case 'ko':
        return;
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

    // 可操作状态：先看是否出招。姿态按"本帧输入"判断：同帧按下 ↓+按键 必须出蹲技。
    const stance: Stance = f.airborne ? 'air' : has(bits, Btn.Down) ? 'crouch' : 'stand';
    for (const b of ATTACK_BUTTONS) {
      if (pressed & b) {
        const m = f.def.moves.find((mv) => mv.input.stance === stance && mv.input.button === b);
        if (m) {
          this.startMove(f, m);
          return;
        }
      }
    }

    if (f.airborne) {
      f.stateFrame++;
      return;
    }

    const h = horizontalRelative(bits, f.facing);
    const up = has(bits, Btn.Up);
    const down = has(bits, Btn.Down);

    if (up && !down) {
      f.airborne = true;
      f.vy = f.def.jumpVelocityY;
      f.vx = h * f.def.jumpVelocityX * f.facing;
      setState(f, h === 1 ? 'jump_fwd' : h === -1 ? 'jump_back' : 'jump_neutral');
      return;
    }
    if (down) {
      f.vx = 0;
      setState(f, 'crouch');
      return;
    }
    if (h === 1) {
      f.vx = f.def.walkFwdSpeed * f.facing;
      setState(f, 'walk_fwd');
    } else if (h === -1) {
      f.vx = -f.def.walkBackSpeed * f.facing;
      setState(f, 'walk_back');
    } else {
      f.vx = 0;
      setState(f, 'idle');
    }
  }

  private startMove(f: FighterState, m: MoveData): void {
    f.moveId = m.id;
    f.hasHit = false;
    if (!f.airborne) f.vx = 0;
    setState(f, 'attack');
    const fd = frameAt(m, 0);
    if (fd?.velocity?.x) f.vx = px(fd.velocity.x) * f.facing;
  }

  /** KO 后继续推进非 ko 状态（只处理硬直计时，不接受输入）。 */
  private advanceState(f: FighterState): void {
    if (f.hitstop > 0) {
      f.hitstop--;
      return;
    }
    if (f.state === 'attack') {
      const m = this.move(f);
      f.stateFrame++;
      if (!m || !frameAt(m, f.stateFrame)) {
        f.moveId = null;
        setState(f, f.airborne ? 'jump_neutral' : 'idle');
      }
    } else if (f.state === 'knockdown' || f.state === 'getup') {
      f.stateFrame++;
    }
  }

  private detectHit(att: FighterState, def: FighterState): MoveData | null {
    if (att.state !== 'attack' || att.hasHit || att.hitstop > 0) return null;
    const m = this.move(att);
    if (!m) return null;
    const hbs = this.hitboxes(att);
    if (hbs.length === 0) return null;
    const hurts = this.hurtboxes(def);
    for (const hb of hbs) for (const hu of hurts) if (overlaps(hb, hu)) return m;
    return null;
  }

  private applyHit(att: FighterState, def: FighterState, m: MoveData): void {
    att.hasHit = true;
    att.hitstop = m.hitstop;
    def.hitstop = m.hitstop;
    def.hp -= m.damage;
    def.justHit = true;
    def.moveId = null;

    const dir = att.facing; // 远离攻击者
    const launch = m.knockback.y !== 0 || def.airborne;
    if (launch || m.knockdown) {
      def.airborne = true;
      def.vx = px(m.knockback.x) * dir;
      def.vy = m.knockback.y !== 0 ? px(m.knockback.y) : m.knockdown ? px(-4) : px(-3);
      def.stun = m.hitstun;
      setState(def, 'hit_air');
    } else {
      def.vx = px(m.knockback.x) * dir;
      def.stun = m.hitstun;
      setState(def, this.stance(def) === 'crouch' ? 'hit_crouch' : 'hit_stand');
    }

    const hb = this.hitboxes(att)[0];
    this.hits.push({
      frame: this.frame,
      attacker: att.player,
      defender: def.player,
      moveId: m.id,
      damage: m.damage,
      x: hb ? hb.x + (hb.w >> 1) : def.x,
      y: hb ? hb.y + (hb.h >> 1) : def.y - px(60),
    });
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
    prevBits: 0,
    justHit: false,
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

function applyPhysics(f: FighterState): void {
  f.x += f.vx;

  if (f.airborne) {
    f.vy = Math.min(f.vy + GRAVITY, MAX_FALL_SPEED);
    f.y += f.vy;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
      f.vx = 0;
      f.airborne = false;
      if (f.hp <= 0) setState(f, 'ko');
      else if (f.state === 'hit_air') setState(f, 'knockdown');
      else {
        // 落地硬直（不可出招）在 M2 加入防御系统时一并实现
        f.moveId = null;
        setState(f, 'idle');
      }
    }
    return;
  }

  // 地面受击滑行摩擦
  if (f.state === 'hit_stand' || f.state === 'hit_crouch' || f.state === 'ko') {
    if (f.vx > 0) f.vx = Math.max(0, f.vx - GROUND_FRICTION);
    else if (f.vx < 0) f.vx = Math.min(0, f.vx + GROUND_FRICTION);
  }
}

function separatePushboxes(sim: FightSim, a: FighterState, b: FighterState): void {
  const boxA = sim.pushbox(a);
  const boxB = sim.pushbox(b);
  if (!overlaps(boxA, boxB)) return;
  const ox = overlapX(boxA, boxB);
  // 空中一方压在地面一方头上：把空中的一方推开，地面不动
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

function clampToStage(a: FighterState, b: FighterState): void {
  for (const f of [a, b]) {
    const halfW = (f.def.pushboxStand[2] * SUBPIXEL) >> 1;
    if (f.x - halfW < STAGE_LEFT) f.x = STAGE_LEFT + halfW;
    if (f.x + halfW > STAGE_RIGHT) f.x = STAGE_RIGHT - halfW;
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

/** 地面可操作状态自动面向对手；空中、出招中、受击中保持面向。 */
function updateFacing(a: FighterState, b: FighterState): void {
  const canTurn = (f: FighterState) =>
    !f.airborne && (f.state === 'idle' || f.state === 'walk_fwd' || f.state === 'walk_back' || f.state === 'crouch');
  if (canTurn(a)) a.facing = a.x <= b.x ? 1 : -1;
  if (canTurn(b)) b.facing = b.x <= a.x ? 1 : -1;
}
