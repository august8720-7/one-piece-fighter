import type { AiProfile } from '../../ai/types';

/** 香克斯：保持单剑中距，斩波迫近，再用突刺确反；闪避花气且不作为常驻状态。 */
export const shanksAi: AiProfile = {
  closeRange: 65,
  midRange: 175,
  far: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'P', cooldown: 110 } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 13 } },
    { weight: 1, action: { kind: 'run', frames: 12 } },
  ],
  mid: [
    { weight: 3, action: { kind: 'special', motion: '236', button: 'K', cooldown: 90 } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 8 } },
    { weight: 3, action: { kind: 'block', frames: 14, low: true } },
    { weight: 1, action: { kind: 'special', motion: '236', button: 'P', cooldown: 110 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P', cooldown: 80 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 2, action: { kind: 'backdash' } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 85 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 2, action: { kind: 'block', frames: 16, low: false } },
  ],
  projectileAnswer: [
    { weight: 3, action: { kind: 'roll', dir: 1 } },
    { weight: 4, action: { kind: 'block', frames: 22, low: false } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K', minMeter: 33, cooldown: 130 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '214', button: 'K', cooldown: 100 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 6 } },
    { weight: 2, action: { kind: 'wait', frames: 9 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'K' } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
  ],
  armorBreak: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 },
  followups: [
    {
      from: ['st_a', 'cr_a'],
      options: [
        { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } },
        { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'D' } },
      ],
    },
    {
      from: ['st_c', 'st_d', 'f_c'],
      options: [
        { weight: 4, action: { kind: 'special', motion: '214', button: 'P' } },
        { weight: 3, action: { kind: 'special', motion: '236', button: 'K' } },
      ],
    },
    {
      from: ['sp_single_arm_cut', 'sp_step_thrust'],
      options: [
        { weight: 3, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
        { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } },
      ],
    },
  ],
};
