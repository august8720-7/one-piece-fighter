/** 判定框 [x, y, w, h]，原点角色脚下中心，面朝右，单位像素（数据文件）。y 向上为负。 */
export type BoxPx = readonly [x: number, y: number, w: number, h: number];

/** 运行时判定框，单位子像素，已镜像与平移到世界坐标。 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Facing = 1 | -1;
export type PlayerIndex = 0 | 1;

/** 按键位图。方向按绝对方向存储，镜像由 core 处理。 */
export enum Btn {
  Up = 1 << 0,
  Down = 1 << 1,
  Left = 1 << 2,
  Right = 1 << 3,
  A = 1 << 4, // 轻拳
  B = 1 << 5, // 轻脚
  C = 1 << 6, // 重拳
  D = 1 << 7, // 重脚
  Start = 1 << 8,
}

export const ATTACK_BUTTONS = [Btn.A, Btn.B, Btn.C, Btn.D] as const;
export type AttackButton = (typeof ATTACK_BUTTONS)[number];

/** 一帧两名玩家的输入。 */
export interface InputFrame {
  readonly p1: number;
  readonly p2: number;
}

/** 姿态：决定默认受击框与可用招式。 */
export type Stance = 'stand' | 'crouch' | 'air';

export type GuardType = 'high' | 'mid' | 'low' | 'unblockable';

/** 单帧数据。 */
export interface FrameData {
  /** 精灵帧索引（M0～M2 占位渲染不用） */
  sprite: number;
  /** 持续逻辑帧数 */
  duration: number;
  /** 受击框；省略则用姿态默认框 */
  hurtboxes?: readonly BoxPx[];
  /** 攻击框；有则为 active 帧 */
  hitboxes?: readonly BoxPx[];
  /** 本帧位移（像素 / 帧），面朝右为正 */
  velocity?: { x?: number; y?: number };
}

export interface Knockback {
  /** 地面击退水平速度（像素 / 帧），远离攻击者为正 */
  x: number;
  /** 空中命中 / 浮空的竖直速度（像素 / 帧），负为向上；0 表示不浮空 */
  y: number;
}

/** 招式定义。M1 只用普通技；special / super 字段留给 M2～M3。 */
export interface MoveData {
  id: string;
  name: string;
  type: 'normal' | 'command_normal' | 'special' | 'super' | 'ultimate' | 'throw';
  /** 触发姿态 + 按键（普通技） */
  input: { stance: Stance; button: AttackButton };
  damage: number;
  guard: GuardType;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  knockback: Knockback;
  /** 命中后是否直接击倒（硬倒） */
  knockdown?: boolean;
  frames: readonly FrameData[];
}

/** 角色基础参数（每角色一份，来自 characters/<id>/）。 */
export interface FighterDef {
  id: string;
  name: string;
  maxHp: number;
  walkFwdSpeed: number; // 子像素 / 帧
  walkBackSpeed: number;
  jumpVelocityY: number; // 负数向上
  jumpVelocityX: number;
  pushboxStand: BoxPx;
  pushboxCrouch: BoxPx;
  pushboxAir: BoxPx;
  hurtboxStand: readonly BoxPx[];
  hurtboxCrouch: readonly BoxPx[];
  hurtboxAir: readonly BoxPx[];
  moves: readonly MoveData[];
  /** 占位渲染颜色 */
  color: number;
}

export type StateId =
  | 'idle'
  | 'walk_fwd'
  | 'walk_back'
  | 'crouch'
  | 'jump_neutral'
  | 'jump_fwd'
  | 'jump_back'
  | 'attack'
  | 'hit_stand'
  | 'hit_crouch'
  | 'hit_air'
  | 'knockdown'
  | 'getup'
  | 'ko';

export interface FighterState {
  def: FighterDef;
  player: PlayerIndex;
  x: number; // 子像素
  y: number; // 子像素，0 为地面，向上为负
  vx: number;
  vy: number;
  facing: Facing;
  state: StateId;
  stateFrame: number;
  hp: number;
  airborne: boolean;
  /** 当前招式（state === 'attack' 时有效） */
  moveId: string | null;
  /** 本次出招是否已命中（每招只判一次） */
  hasHit: boolean;
  /** 打击定格剩余帧 */
  hitstop: number;
  /** 受击硬直剩余帧 */
  stun: number;
  /** 上一帧输入位图（边沿检测） */
  prevBits: number;
  /** 上一帧被击中（渲染闪白用） */
  justHit: boolean;
}

export interface WorldState {
  frame: number;
  fighters: readonly [FighterState, FighterState];
  cameraX: number;
  roundOver: boolean;
  winner: PlayerIndex | null;
}

/** 一次命中事件，供渲染层做特效 / 音效。 */
export interface HitEvent {
  frame: number;
  attacker: PlayerIndex;
  defender: PlayerIndex;
  moveId: string;
  damage: number;
  x: number; // 子像素，命中点近似
  y: number;
}
