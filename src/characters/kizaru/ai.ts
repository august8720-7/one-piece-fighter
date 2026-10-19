import type { AiProfile } from '../../ai/types';

/** 黄猿原型策略：只输出经典按键，招式冷却/位置选择不修改战斗状态。 */
export const kizaruAi: AiProfile = {
  closeRange: 69,
  midRange: 185,
  far: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 96 } },
    { weight: 3, action: { kind: 'run', frames: 14 } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100, cooldown: 220 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'special', motion: '214', button: 'P', cooldown: 90 } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 96 } },
    { weight: 2, action: { kind: 'jump', dir: 1, attack: 'D' } },
    { weight: 1, action: { kind: 'walk', dir: -1, frames: 8 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'B' } },
    { weight: 3, action: { kind: 'special', motion: '22', button: 'P', cooldown: 92 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 1, action: { kind: 'backdash' } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 90 } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'K', cooldown: 140 } },
    { weight: 2, action: { kind: 'block', frames: 15, low: false } },
  ],
  projectileAnswer: [
    { weight: 4, action: { kind: 'block', frames: 20, low: false } },
    { weight: 3, action: { kind: 'roll', dir: 1 } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K', minMeter: 33, cooldown: 155 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 96 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 8 } },
    { weight: 2, action: { kind: 'wait', frames: 8 } },
  ],
  punish: [
    { weight: 5, action: { kind: 'special', motion: '214', button: 'P' } },
    { weight: 2, action: { kind: 'normal', stance: 'stand', button: 'D' } },
    { weight: 1, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
  ],
  followups: [
    { from: ['st_a', 'st_b', 'cr_a'], options: [{ weight: 4, action: { kind: 'normal', stance: 'stand', button: 'D' } }, { weight: 2, action: { kind: 'normal', stance: 'stand', button: 'C' } }] },
    { from: ['st_c', 'st_d', 'f_c'], options: [{ weight: 4, action: { kind: 'special', motion: '22', button: 'P' } }, { weight: 2, action: { kind: 'special', motion: '214', button: 'P' } }] },
    { from: ['sp_light_blade', 'sp_flash_kick'], options: [{ weight: 3, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } }, { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } }] },
  ],
};

