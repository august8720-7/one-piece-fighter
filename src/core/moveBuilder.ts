import {
  Btn,
  type AttackButton,
  type BoxPx,
  type FrameData,
  type GuardType,
  type Knockback,
  type MotionId,
  type MoveData,
  type MoveType,
  type Stance,
  type ThrowData,
} from './types';

/** 一段攻击：启动若干帧后进入 active 帧 */
export interface Segment {
  startup: number;
  active: number;
  hitbox: BoxPx;
}

export interface AttackSpec {
  id: string;
  name: string;
  type?: MoveType;
  stance: Stance;
  /** 单键或 P / K 掩码 */
  button: number;
  plus?: AttackButton;
  motion?: MotionId;
  meterCost?: number;
  invuln?: number;
  /** 多段：依次 startup → active；最后跟 recovery */
  segments: readonly Segment[];
  recovery: number;
  /** 每段伤害 */
  damage: number;
  guard?: GuardType;
  hitstun?: number;
  blockstun?: number;
  hitstop?: number;
  knockback?: Partial<Knockback>;
  knockdown?: boolean;
  wallBounce?: boolean;
  cancelWindow?: number;
  chain?: readonly string[];
  /** 出招期间受击框（可选，默认姿态框） */
  hurtboxes?: readonly BoxPx[];
  /** 启动期水平位移（像素 / 帧） */
  stepX?: number;
}

/** 通用攻击构造：按段生成 startup / active 帧，最后追加 recovery。 */
export function attack(s: AttackSpec): MoveData {
  const base: Pick<FrameData, 'hurtboxes'> = s.hurtboxes ? { hurtboxes: s.hurtboxes } : {};
  const frames: FrameData[] = [];
  s.segments.forEach((seg, i) => {
    frames.push({
      sprite: i * 2,
      duration: seg.startup,
      ...base,
      ...(i === 0 && s.stepX ? { velocity: { x: s.stepX } } : {}),
    });
    frames.push({ sprite: i * 2 + 1, duration: seg.active, ...base, hitboxes: [seg.hitbox], hitId: i + 1 });
  });
  frames.push({ sprite: s.segments.length * 2, duration: s.recovery, ...base });

  const type: MoveType = s.type ?? (s.plus ? 'blowback' : s.motion ? 'special' : 'normal');
  const light = s.button === Btn.A || s.button === Btn.B;
  return {
    id: s.id,
    name: s.name,
    type,
    input: {
      stance: s.stance,
      button: s.button,
      ...(s.plus ? { plus: s.plus } : {}),
      ...(s.motion ? { motion: s.motion } : {}),
    },
    damage: s.damage,
    guard: s.guard ?? (s.stance === 'air' ? 'high' : 'mid'),
    hitstun: s.hitstun ?? (light ? 14 : 20),
    blockstun: s.blockstun ?? (light ? 10 : 15),
    hitstop: s.hitstop ?? (light ? 7 : 11),
    knockback: { x: s.knockback?.x ?? (light ? 3 : 5), y: s.knockback?.y ?? 0 },
    ...(s.knockdown ? { knockdown: true } : {}),
    ...(s.wallBounce ? { wallBounce: true } : {}),
    ...(s.meterCost !== undefined ? { meterCost: s.meterCost } : {}),
    ...(s.invuln !== undefined ? { invuln: s.invuln } : {}),
    ...(s.cancelWindow !== undefined ? { cancelWindow: s.cancelWindow } : {}),
    ...(s.chain ? { chain: s.chain } : {}),
    frames,
  };
}

export interface NormalSpec extends Omit<AttackSpec, 'segments' | 'button' | 'type' | 'motion' | 'meterCost' | 'invuln'> {
  button: AttackButton;
  startup: number;
  active: number;
  hitbox: BoxPx;
}

/** 单段普通技 / 吹飞的简写。 */
export function normal(s: NormalSpec): MoveData {
  const { startup, active, hitbox, ...rest } = s;
  return attack({ ...rest, segments: [{ startup, active, hitbox }] });
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

/** 是否仍处于启动或 active 阶段（之后还有攻击帧）——反击判定用。 */
export function inStartupOrActive(m: MoveData, stateFrame: number): boolean {
  let acc = 0;
  let lastActiveEnd = 0;
  for (const f of m.frames) {
    acc += f.duration;
    if (f.hitboxes) lastActiveEnd = acc;
  }
  return stateFrame < lastActiveEnd;
}
