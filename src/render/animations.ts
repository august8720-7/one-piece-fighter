import { LOGIC_FPS, type FightSim, type FighterState } from '@core/index';

/** 非招式状态的动画声明 */
export interface AnimDef {
  frames: number;
  fps: number;
  loop: boolean;
}

export type AnimTable = Record<string, AnimDef>;

/** 所有角色共用的默认状态动画表；角色可在自己的 animations.ts 覆盖 */
export const DEFAULT_ANIMS: AnimTable = {
  idle: { frames: 4, fps: 8, loop: true },
  walk_fwd: { frames: 4, fps: 10, loop: true },
  walk_back: { frames: 4, fps: 10, loop: true },
  crouch: { frames: 1, fps: 1, loop: false },
  prejump: { frames: 1, fps: 1, loop: false },
  jump_neutral: { frames: 2, fps: 6, loop: false },
  jump_fwd: { frames: 2, fps: 6, loop: false },
  jump_back: { frames: 2, fps: 6, loop: false },
  landing: { frames: 1, fps: 1, loop: false },
  dash: { frames: 2, fps: 12, loop: true },
  backdash: { frames: 2, fps: 6, loop: false },
  roll_fwd: { frames: 4, fps: 12, loop: true },
  roll_back: { frames: 4, fps: 12, loop: true },
  block_stand: { frames: 1, fps: 1, loop: false },
  block_crouch: { frames: 1, fps: 1, loop: false },
  hit_stand: { frames: 1, fps: 1, loop: false },
  hit_crouch: { frames: 1, fps: 1, loop: false },
  hit_air: { frames: 1, fps: 1, loop: false },
  knockdown: { frames: 1, fps: 1, loop: false },
  getup: { frames: 2, fps: 8, loop: false },
  throw: { frames: 2, fps: 4, loop: false },
  thrown: { frames: 1, fps: 1, loop: false },
  throw_tech: { frames: 1, fps: 1, loop: false },
  ko: { frames: 1, fps: 1, loop: false },
};

export const frameName = (charId: string, anim: string, index: number): string => `${charId}/${anim}/${index}`;

/** 当前应显示的动画名与帧号（确定性：由逻辑状态直接推导，不用 Phaser 的计时动画）。 */
export function currentAnimation(sim: FightSim, f: FighterState, table: AnimTable): { anim: string; index: number } {
  if ((f.state === 'attack' || f.state === 'throw') && f.moveId) {
    if (f.state === 'throw') {
      const def = table['throw'] ?? DEFAULT_ANIMS['throw']!;
      return { anim: 'throw', index: animIndex(def, f.stateFrame) };
    }
    const fd = sim.currentFrame(f);
    return { anim: f.moveId, index: fd?.sprite ?? 0 };
  }
  const def = table[f.state] ?? DEFAULT_ANIMS[f.state] ?? { frames: 1, fps: 1, loop: false };
  return { anim: f.state, index: animIndex(def, f.stateFrame) };
}

function animIndex(def: AnimDef, stateFrame: number): number {
  if (def.frames <= 1) return 0;
  const framesPer = Math.max(1, Math.round(LOGIC_FPS / def.fps));
  const i = Math.floor(stateFrame / framesPer);
  return def.loop ? i % def.frames : Math.min(i, def.frames - 1);
}

/** 图集需要包含的全部帧名（生成占位图集 / 校验素材完整性用）。 */
export function requiredFrames(charId: string, table: AnimTable, moveFrameCounts: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [anim, def] of Object.entries({ ...DEFAULT_ANIMS, ...table })) {
    for (let i = 0; i < def.frames; i++) out.push(frameName(charId, anim, i));
  }
  for (const [moveId, n] of Object.entries(moveFrameCounts)) {
    for (let i = 0; i < n; i++) out.push(frameName(charId, moveId, i));
  }
  return out;
}
