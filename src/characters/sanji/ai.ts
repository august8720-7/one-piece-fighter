import type { AiProfile } from '../../ai/types';

/** 山治：跑跳接近，快腿与低段混合；没有远程发射物，所有普通输入实际对应踢技。 */
export const sanjiAi: AiProfile = {
  closeRange: 59,
  midRange: 140,
  far: [
    { weight: 5, action: { kind: 'run', frames: 17 } },
    { weight: 3, action: { kind: 'jump', dir: 1, attack: 'D', delay: 13 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 15 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'K', cooldown: 105 } },
    { weight: 3, action: { kind: 'run', frames: 9 } },
    { weight: 2, action: { kind: 'special', motion: '236', button: 'P', cooldown: 75 } },
    { weight: 2, action: { kind: 'block', frames: 12, low: true } },
    { weight: 1, action: { kind: 'jump', dir: 1, attack: 'C', delay: 12 } },
  ],
  close: [
    { weight: 5, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 4, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P', cooldown: 85 } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 1, action: { kind: 'backdash' } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 85 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 1, action: { kind: 'block', frames: 16, low: false } },
  ],
  projectileAnswer: [
    { weight: 4, action: { kind: 'roll', dir: 1 } },
    { weight: 3, action: { kind: 'jump', dir: 1 } },
    { weight: 2, action: { kind: 'block', frames: 19, low: false } },
    { weight: 1, action: { kind: 'special', motion: '22', button: 'K', minMeter: 33, cooldown: 130 } },
  ],
  okizeme: [
    { weight: 4, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
    { weight: 3, action: { kind: 'walk', dir: 1, frames: 6 } },
    { weight: 1, action: { kind: 'special', motion: '214', button: 'K', cooldown: 110 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'P' } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P' } },
    { weight: 1, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
  ],
  armorBreak: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 },
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
        { weight: 3, action: { kind: 'special', motion: '236', button: 'P' } },
      ],
    },
    {
      from: ['sp_mutton_flurry', 'sp_neck_kick'],
      options: [
        { weight: 4, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
        { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } },
      ],
    },
  ],
};
