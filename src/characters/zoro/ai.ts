import type { AiProfile } from '../../ai/types';

/** 索隆：主动把距离收进三刀连段区；远处斩波辅助接近，短打命中后衔接鬼斩。 */
export const zoroAi: AiProfile = {
  closeRange: 72,
  midRange: 175,
  far: [
    { weight: 4, action: { kind: 'run', frames: 15 } },
    { weight: 3, action: { kind: 'special', motion: '236', button: 'P', cooldown: 125 } },
    { weight: 2, action: { kind: 'jump', dir: 1, attack: 'D', delay: 14 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'walk', dir: 1, frames: 10 } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'special', motion: '214', button: 'P', cooldown: 90 } },
    { weight: 2, action: { kind: 'block', frames: 14, low: true } },
    { weight: 1, action: { kind: 'special', motion: '22', button: 'K', cooldown: 125 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 85 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 1, action: { kind: 'block', frames: 12, low: true } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 90 } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 2, action: { kind: 'block', frames: 18, low: false } },
  ],
  projectileAnswer: [
    { weight: 4, action: { kind: 'block', frames: 23, low: false } },
    { weight: 3, action: { kind: 'roll', dir: 1 } },
    { weight: 2, action: { kind: 'jump', dir: 1 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '214', button: 'K', cooldown: 110 } },
    { weight: 2, action: { kind: 'special', motion: '236', button: 'K', cooldown: 120 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 7 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P' } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K' } },
    { weight: 1, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
  ],
  armorBreak: { kind: 'special', motion: '22', button: 'K', cooldown: 125 },
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
        { weight: 5, action: { kind: 'special', motion: '214', button: 'P' } },
        { weight: 2, action: { kind: 'special', motion: '236', button: 'K' } },
      ],
    },
    {
      from: ['sp_oni_giri', 'sp_rhino_cycle'],
      options: [
        { weight: 4, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
        { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } },
      ],
    },
  ],
};
