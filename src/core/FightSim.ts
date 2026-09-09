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
import { Rng } from './Rng';
import {
  Btn,
  type Box,
  type FighterDef,
  type FighterState,
  type InputFrame,
  type PlayerIndex,
  type StateId,
  type WorldState,
} from './types';

export interface FightSimOptions {
  p1: FighterDef;
  p2: FighterDef;
  seed?: number;
}

/**
 * 格斗世界模拟器。固定步长、确定性、无渲染依赖。
 * 每次 step(input) 推进一帧。
 */
export class FightSim {
  readonly rng: Rng;
  private frame = 0;
  private readonly fighters: [FighterState, FighterState];
  private cameraX = 0;

  constructor(opts: FightSimOptions) {
    this.rng = new Rng(opts.seed ?? 1);
    this.fighters = [
      createFighter(opts.p1, 0, px(-90), 1),
      createFighter(opts.p2, 1, px(90), -1),
    ];
  }

  get state(): WorldState {
    return { frame: this.frame, fighters: this.fighters, cameraX: this.cameraX };
  }

  step(input: InputFrame): void {
    const [f1, f2] = this.fighters;
    updateFighter(f1, input.p1);
    updateFighter(f2, input.p2);
    applyPhysics(f1);
    applyPhysics(f2);
    separatePushboxes(f1, f2);
    clampToStage(f1, f2);
    updateFacing(f1, f2);
    this.cameraX = (f1.x + f2.x) >> 1;
    this.frame++;
  }

  pushbox(f: FighterState): Box {
    const def = f.state === 'crouch' ? f.def.pushboxCrouch : f.def.pushboxStand;
    return toWorldBox(def, f.x, f.y, f.facing);
  }
}

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

/** 地面可操作状态下的输入 → 状态/速度。空中不可改变轨迹（格斗游戏惯例）。 */
function updateFighter(f: FighterState, bits: number): void {
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
      setState(f, 'idle');
    }
  }
}

/** pushbox 互相推开，避免重叠。空中一方不推地面一方过多。 */
function separatePushboxes(a: FighterState, b: FighterState): void {
  const boxA = toWorldBox(a.state === 'crouch' ? a.def.pushboxCrouch : a.def.pushboxStand, a.x, a.y, a.facing);
  const boxB = toWorldBox(b.state === 'crouch' ? b.def.pushboxCrouch : b.def.pushboxStand, b.x, b.y, b.facing);
  if (!overlaps(boxA, boxB)) return;
  const ox = overlapX(boxA, boxB);
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
  // 最大间距约束：超出则把远离的一方拉回
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

/** 地面时自动面向对手；空中保持起跳时的面向。 */
function updateFacing(a: FighterState, b: FighterState): void {
  if (!a.airborne) a.facing = a.x <= b.x ? 1 : -1;
  if (!b.airborne) b.facing = b.x <= a.x ? 1 : -1;
}
