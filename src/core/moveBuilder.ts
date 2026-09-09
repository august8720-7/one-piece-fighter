import { Btn, type AttackButton, type BoxPx, type FrameData, type GuardType, type Knockback, type MoveData, type Stance, type ThrowData } from './types';

export interface NormalSpec {
  id: string;
  name: string;
  stance: Stance;
  button: AttackButton;
  /** 双键同按（吹飞 C+D） */
  plus?: AttackButton;
  /** 启动 / 持续 / 收招 帧数 */
  startup: number;
  active: number;
  recovery: number;
  hitbox: BoxPx;
  damage: number;
  guard?: GuardType;
  hitstun?: number;
  blockstun?: number;
  hitstop?: number;
  knockback?: Partial<Knockback>;
  knockdown?: boolean;
  wallBounce?: boolean;
  /** 出招期间受击框（可选，默认姿态框） */
  hurtboxes?: readonly BoxPx[];
  /** 启动期水平位移（像素 / 帧） */
  stepX?: number;
}

/**
 * 用 startup / active / recovery 三段快速生成普通技帧数据。
 * 精灵索引按 0 / 1 / 2 占位。
 */
export function normal(s: NormalSpec): MoveData {
  const base: Pick<FrameData, 'hurtboxes'> = s.hurtboxes ? { hurtboxes: s.hurtboxes } : {};
  const frames: FrameData[] = [
    { sprite: 0, duration: s.startup, ...base, ...(s.stepX ? { velocity: { x: s.stepX } } : {}) },
    { sprite: 1, duration: s.active, ...base, hitboxes: [s.hitbox] },
    { sprite: 2, duration: s.recovery, ...base },
  ];
  const light = s.button === Btn.A || s.button === Btn.B;
  return {
    id: s.id,
    name: s.name,
    type: s.plus ? 'blowback' : 'normal',
    input: { stance: s.stance, button: s.button, ...(s.plus ? { plus: s.plus } : {}) },
    damage: s.damage,
    guard: s.guard ?? (s.stance === 'air' ? 'high' : 'mid'),
    hitstun: s.hitstun ?? (light ? 14 : 20),
    blockstun: s.blockstun ?? (light ? 10 : 15),
    hitstop: s.hitstop ?? (light ? 7 : 11),
    knockback: { x: s.knockback?.x ?? (light ? 3 : 5), y: s.knockback?.y ?? 0 },
    ...(s.knockdown ? { knockdown: true } : {}),
    ...(s.wallBounce ? { wallBounce: true } : {}),
    frames,
  };
}

export interface ThrowSpec {
  id: string;
  name: string;
  /** 4 后投 / 6 前投 */
  direction: 4 | 6;
  button: AttackButton;
  damage: number;
  /** 整个投技演出总帧数 */
  total: number;
  knockback?: Partial<Knockback>;
  throwData: Omit<ThrowData, 'switchSides'>;
}

/** 生成投技。抓住后对手被锁定，releaseFrame 时结算伤害并击飞。 */
export function throwMove(s: ThrowSpec): MoveData {
  return {
    id: s.id,
    name: s.name,
    type: 'throw',
    input: { stance: 'stand', button: s.button, direction: s.direction },
    damage: s.damage,
    guard: 'unblockable',
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    knockback: { x: s.knockback?.x ?? 6, y: s.knockback?.y ?? -7 },
    knockdown: true,
    throwData: { ...s.throwData, switchSides: s.direction === 4 },
    frames: [{ sprite: 0, duration: s.total }],
  };
}

export function totalFrames(m: MoveData): number {
  return m.frames.reduce((n, f) => n + f.duration, 0);
}

/** 根据已持续帧数定位当前 FrameData；越界返回 null（招式结束）。 */
export function frameAt(m: MoveData, stateFrame: number): FrameData | null {
  let acc = 0;
  for (const f of m.frames) {
    if (stateFrame < acc + f.duration) return f;
    acc += f.duration;
  }
  return null;
}
