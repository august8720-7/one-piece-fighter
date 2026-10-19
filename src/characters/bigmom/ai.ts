import type { AiProfile } from '../../ai/types';

/** 大妈：慢火球与固定位置雷击控制区域，近身用短掌/帽剑；不把霍米兹当独立角色。 */
export const bigmomAi: AiProfile = {
  closeRange: 82,
  midRange: 190,
  far: [
    { weight: 5, action: { kind: 'special', motion: '236', button: 'P', cooldown: 145 } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 165 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 16 } },
  ],
  mid: [
    { weight: 3, action: { kind: 'special', motion: '623', button: 'P', cooldown: 140 } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 145 } },
    { weight: 3, action: { kind: 'block', frames: 18, low: true } },
    { weight: 2, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'walk', dir: -1, frames: 10 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'block', frames: 18, low: true } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K', cooldown: 130 } },
    { weight: 1, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
  ],
  antiAir: [
    { weight: 4, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 3, action: { kind: 'block', frames: 22, low: false } },
    { weight: 2, action: { kind: 'special', motion: '623', button: 'P', cooldown: 140 } },
  ],
  projectileAnswer: [
    { weight: 5, action: { kind: 'block', frames: 25, low: false } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 165 } },
    { weight: 1, action: { kind: 'roll', dir: 1 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '623', button: 'P', cooldown: 140 } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'K', cooldown: 130 } },
    { weight: 2, action: { kind: 'wait', frames: 12 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'K' } },
    { weight: 1, action: { kind: 'special', motion: '214214', button: 'P', minMeter: 100 } },
  ],
  followups: [
    {
      from: ['st_a', 'cr_a'],
      options: [
        { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
        { weight: 2, action: { kind: 'special', motion: '236', button: 'K' } },
      ],
    },
    {
      from: ['st_c', 'st_d', 'f_c'],
      options: [
        { weight: 3, action: { kind: 'special', motion: '236', button: 'K' } },
        { weight: 2, action: { kind: 'special', motion: '214', button: 'K' } },
      ],
    },
    {
      from: ['sp_emperor_sword', 'sp_hat_sweep'],
      options: [
        { weight: 3, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
        { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } },
      ],
    },
  ],
};
