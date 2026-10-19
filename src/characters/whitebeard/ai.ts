import type { AiProfile } from '../../ai/types';

/** 白胡子：靠长柄维持中距，慢震波逼近；对手贴身时优先短柄和防守，不连发慢重招。 */
export const whitebeardAi: AiProfile = {
  closeRange: 80,
  midRange: 205,
  far: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 150 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 17 } },
    { weight: 1, action: { kind: 'run', frames: 12 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'K', cooldown: 120 } },
    { weight: 3, action: { kind: 'block', frames: 17, low: true } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 9 } },
    { weight: 1, action: { kind: 'special', motion: '236', button: 'P', cooldown: 150 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'block', frames: 16, low: true } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
    { weight: 1, action: { kind: 'backdash' } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 105 } },
    { weight: 3, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 2, action: { kind: 'block', frames: 22, low: false } },
  ],
  projectileAnswer: [
    { weight: 5, action: { kind: 'block', frames: 25, low: false } },
    { weight: 2, action: { kind: 'roll', dir: 1 } },
    { weight: 1, action: { kind: 'jump', dir: 1 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '214', button: 'K', cooldown: 135 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 9 } },
    { weight: 2, action: { kind: 'wait', frames: 12 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'K' } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P' } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
  ],
  armorBreak: { kind: 'special', motion: '22', button: 'K', cooldown: 140 },
  followups: [
    {
      from: ['st_a', 'cr_a'],
      options: [
        { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
        { weight: 2, action: { kind: 'special', motion: '214', button: 'P' } },
      ],
    },
    {
      from: ['st_c', 'st_d', 'f_c'],
      options: [
        { weight: 4, action: { kind: 'special', motion: '236', button: 'K' } },
        { weight: 2, action: { kind: 'special', motion: '214', button: 'P' } },
      ],
    },
    {
      from: ['sp_naginata_cleave', 'sp_naginata_thrust'],
      options: [
        { weight: 3, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
        { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } },
      ],
    },
  ],
};
