import type { AiProfile } from '../../ai/types';

/** 藤虎原型策略：只输出经典按键，招式冷却/位置选择不修改战斗状态。 */
export const fujitoraAi: AiProfile = {
  closeRange: 84,
  midRange: 206,
  far: [
    { weight: 5, action: { kind: 'special', motion: '214', button: 'P', cooldown: 120 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 12 } },
    { weight: 1, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100, cooldown: 270 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'special', motion: '22', button: 'P', cooldown: 170 } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 100 } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P', cooldown: 120 } },
    { weight: 2, action: { kind: 'block', frames: 17, low: true } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 100 } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K', cooldown: 145 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 1, action: { kind: 'backdash' } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 106 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 2, action: { kind: 'block', frames: 18, low: false } },
  ],
  projectileAnswer: [
    { weight: 5, action: { kind: 'special', motion: '214', button: 'K', cooldown: 120 } },
    { weight: 4, action: { kind: 'block', frames: 24, low: false } },
  ],
  okizeme: [
    { weight: 5, action: { kind: 'special', motion: '22', button: 'P', cooldown: 170 } },
    { weight: 2, action: { kind: 'walk', dir: -1, frames: 8 } },
    { weight: 1, action: { kind: 'wait', frames: 10 } },
  ],
  punish: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P' } },
    { weight: 2, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
  ],
  followups: [
    { from: ['st_a', 'cr_a'], options: [{ weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } }, { weight: 1, action: { kind: 'normal', stance: 'crouch', button: 'D' } }] },
    { from: ['st_c', 'st_d', 'f_c'], options: [{ weight: 4, action: { kind: 'special', motion: '236', button: 'P' } }, { weight: 1, action: { kind: 'special', motion: '22', button: 'K' } }] },
    { from: ['sp_gravity_edge'], options: [{ weight: 3, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } }, { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } }] },
  ],
};

