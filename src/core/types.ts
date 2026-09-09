/** 判定框 [x, y, w, h]，原点角色脚下中心，面朝右，单位像素（数据文件）。 */
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

/** 按键位图。方向按"已镜像为面朝右"之前的绝对方向存储，镜像由 core 处理。 */
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

/** 一帧两名玩家的输入。 */
export interface InputFrame {
  readonly p1: number;
  readonly p2: number;
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
  /** 站立 / 蹲下的 pushbox（像素） */
  pushboxStand: BoxPx;
  pushboxCrouch: BoxPx;
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
  | 'jump_back';

export interface FighterState {
  def: FighterDef;
  player: PlayerIndex;
  x: number; // 子像素
  y: number; // 子像素，0 为地面，向上为负
  vx: number;
  vy: number;
  facing: Facing;
  state: StateId;
  stateFrame: number; // 当前状态已持续帧数
  hp: number;
  airborne: boolean;
}

export interface WorldState {
  frame: number;
  fighters: readonly [FighterState, FighterState];
  cameraX: number; // 子像素，镜头中心
}
