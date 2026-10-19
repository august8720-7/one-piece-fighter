import type { AiProfile } from '../../ai/types';

/** 卡普原型策略：只输出经典按键，招式冷却/位置选择不修改战斗状态。 */
export const garpAi: AiProfile = {
  closeRange: 66,
  midRange: 158,
  far: [
    { weight: 5, action: { kind: 'run', frames: 19 } },
    { weight: 3, action: { kind: 'jump', dir: 1, attack: 'D' } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 16 } },
    { weight: 1, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100, cooldown: 260 } },
  ],
  mid: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 98 } },
    { weight: 3, action: { kind: 'run', frames: 10 } },
    { weight: 2, action: { kind: 'jump', dir: 1, attack: 'C' } },
    { weight: 1, action: { kind: 'block', frames: 14, low: true } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 90 } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'K', cooldown: 128 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 2, action: { kind: 'block', frames: 15, low: true } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 94 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 1, action: { kind: 'block', frames: 18, low: false } },
  ],
  projectileAnswer: [
    { weight: 4, action: { kind: 'jump', dir: 1, attack: 'D' } },
    { weight: 3, action: { kind: 'roll', dir: 1 } },
    { weight: 3, action: { kind: 'block', frames: 21, low: false } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 9 } },
    { weight: 3, action: { kind: 'special', motion: '22', button: 'P', cooldown: 150 } },
    { weight: 2, action: { kind: 'wait', frames: 8 } },
  ],
  punish: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P' } },
    { weight: 2, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'K' } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
  ],
  armorBreak: { kind: 'special', motion: '22', button: 'K', cooldown: 160 },
  followups: [
    { from: ['st_a', 'cr_a'], options: [{ weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } }, { weight: 1, action: { kind: 'normal', stance: 'crouch', button: 'D' } }] },
    { from: ['st_c', 'st_d', 'f_c'], options: [{ weight: 4, action: { kind: 'special', motion: '214', button: 'P' } }, { weight: 2, action: { kind: 'special', motion: '236', button: 'P' } }] },
    { from: ['sp_iron_barrage', 'sp_iron_rush'], options: [{ weight: 3, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } }, { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } }] },
  ],
};

