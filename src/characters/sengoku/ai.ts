import type { AiProfile } from '../../ai/types';

/** 战国原型策略：只输出经典按键，招式冷却/位置选择不修改战斗状态。 */
export const sengokuAi: AiProfile = {
  closeRange: 75,
  midRange: 190,
  far: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 122 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 12 } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100, cooldown: 260 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'P', cooldown: 122 } },
    { weight: 3, action: { kind: 'special', motion: '22', button: 'K', cooldown: 145 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 10 } },
    { weight: 2, action: { kind: 'block', frames: 19, low: true } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 108 } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'P', cooldown: 150 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 2, action: { kind: 'block', frames: 18, low: true } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 112 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 2, action: { kind: 'block', frames: 19, low: false } },
  ],
  projectileAnswer: [
    { weight: 4, action: { kind: 'special', motion: '214', button: 'K', cooldown: 125 } },
    { weight: 4, action: { kind: 'block', frames: 25, low: false } },
    { weight: 1, action: { kind: 'roll', dir: 1 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 122 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 8 } },
    { weight: 1, action: { kind: 'wait', frames: 11 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '214', button: 'P' } },
    { weight: 3, action: { kind: 'special', motion: '22', button: 'K' } },
    { weight: 1, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
  ],
  followups: [
    { from: ['st_a', 'cr_a'], options: [{ weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } }, { weight: 1, action: { kind: 'normal', stance: 'crouch', button: 'D' } }] },
    { from: ['st_c', 'st_d', 'f_c'], options: [{ weight: 4, action: { kind: 'special', motion: '214', button: 'P' } }, { weight: 2, action: { kind: 'special', motion: '236', button: 'P' } }] },
    { from: ['sp_palm_press', 'sp_shoulder_charge'], options: [{ weight: 3, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } }, { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } }] },
  ],
};

