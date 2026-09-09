import type { AnimTable } from '@render/animations';

/** 赤犬状态动画覆盖（未列出的用 DEFAULT_ANIMS）。 */
export const akainuAnims: AnimTable = {
  idle: { frames: 4, fps: 6, loop: true },
  walk_fwd: { frames: 4, fps: 8, loop: true },
  walk_back: { frames: 4, fps: 8, loop: true },
};
