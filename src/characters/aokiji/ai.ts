import type { AiProfile } from '../../ai/types';

/** 青雉原型策略：只输出经典按键，招式冷却/位置选择不修改战斗状态。 */
export const aokijiAi: AiProfile = {
  closeRange: 70,
  midRange: 205,
  far: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 100 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 12 } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100, cooldown: 240 } },
  ],
  mid: [
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 100 } },
    { weight: 3, action: { kind: 'special', motion: '22', button: 'P', cooldown: 140 } },
    { weight: 2, action: { kind: 'walk', dir: -1, frames: 9 } },
    { weight: 2, action: { kind: 'block', frames: 16, low: true } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 80 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 1, action: { kind: 'special', motion: '22', button: 'K', minMeter: 33, cooldown: 170 } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 95 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 1, action: { kind: 'block', frames: 17, low: false } },
  ],
  projectileAnswer: [
    { weight: 5, action: { kind: 'special', motion: '214', button: 'K', cooldown: 105 } },
    { weight: 3, action: { kind: 'block', frames: 22, low: false } },
    { weight: 1, action: { kind: 'jump', dir: 1, attack: 'D' } },
  ],
  okizeme: [
    { weight: 4, action: { kind: 'special', motion: '22', button: 'P', cooldown: 140 } },
    { weight: 2, action: { kind: 'walk', dir: -1, frames: 8 } },
    { weight: 1, action: { kind: 'wait', frames: 10 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '214', button: 'P' } },
    { weight: 2, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
  ],
  followups: [
    { from: ['st_a', 'cr_a'], options: [{ weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } }, { weight: 1, action: { kind: 'normal', stance: 'crouch', button: 'D' } }] },
    { from: ['st_c', 'st_d', 'f_c'], options: [{ weight: 3, action: { kind: 'special', motion: '214', button: 'P' } }, { weight: 2, action: { kind: 'special', motion: '236', button: 'P' } }] },
    { from: ['sp_ice_blade'], options: [{ weight: 2, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } }, { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } }] },
  ],
};

