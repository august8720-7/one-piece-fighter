import type { AiProfile } from '../../ai/types';

/** 绿牛原型策略：只输出经典按键，招式冷却/位置选择不修改战斗状态。 */
export const ryokugyuAi: AiProfile = {
  closeRange: 78,
  midRange: 186,
  far: [
    { weight: 4, action: { kind: 'run', frames: 15 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 15 } },
    { weight: 1, action: { kind: 'block', frames: 14, low: false } },
  ],
  mid: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 110 } },
    { weight: 3, action: { kind: 'special', motion: '22', button: 'P', cooldown: 165 } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P', cooldown: 125 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 9 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'K', cooldown: 125 } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K', cooldown: 150 } },
    { weight: 2, action: { kind: 'block', frames: 18, low: true } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 108 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 1, action: { kind: 'block', frames: 18, low: false } },
  ],
  projectileAnswer: [
    { weight: 4, action: { kind: 'block', frames: 23, low: false } },
    { weight: 3, action: { kind: 'roll', dir: 1 } },
    { weight: 2, action: { kind: 'jump', dir: 1, attack: 'D' } },
  ],
  okizeme: [
    { weight: 4, action: { kind: 'special', motion: '22', button: 'P', cooldown: 165 } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P', cooldown: 125 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 8 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'P' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'K' } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
  ],
  followups: [
    { from: ['st_a', 'cr_a'], options: [{ weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } }, { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'D' } }] },
    { from: ['st_c', 'st_d', 'f_c'], options: [{ weight: 4, action: { kind: 'special', motion: '236', button: 'P' } }, { weight: 2, action: { kind: 'special', motion: '214', button: 'P' } }] },
    { from: ['sp_vine_thrust', 'sp_bark_palm'], options: [{ weight: 3, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } }, { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } }] },
  ],
};

