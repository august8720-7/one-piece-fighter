import type { AnimTable } from '@render/animations';

/** 路飞状态动画覆盖（未列出的用 DEFAULT_ANIMS）。招式动画帧数由招式数据的 sprite 索引决定。 */
export const luffyAnims: AnimTable = {
  idle: { frames: 4, fps: 8, loop: true },
  walk_fwd: { frames: 6, fps: 12, loop: true },
  walk_back: { frames: 6, fps: 12, loop: true },
};
