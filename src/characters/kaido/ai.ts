import type { AiProfile } from '../../ai/types';

/** 凯多：重棒确反和有限起手霸体接近；慢扫、重砸都留收招，不连续自动追敌。 */
export const kaidoAi: AiProfile = {
  closeRange: 75,
  midRange: 175,
  far: [
    { weight: 4, action: { kind: 'run', frames: 14 } },
    { weight: 3, action: { kind: 'special', motion: '214', button: 'P', cooldown: 160 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 14 } },
  ],
  mid: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'P', cooldown: 115 } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 3, action: { kind: 'block', frames: 16, low: true } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 10 } },
    { weight: 1, action: { kind: 'special', motion: '214', button: 'K', cooldown: 160 } },
  ],
  close: [
    { weight: 4, action: { kind: 'normal', stance: 'stand', button: 'A' } },
    { weight: 3, action: { kind: 'block', frames: 15, low: true } },
    { weight: 2, action: { kind: 'throw' } },
    { weight: 2, action: { kind: 'normal', stance: 'crouch', button: 'B' } },
    { weight: 1, action: { kind: 'special', motion: '236', button: 'P', cooldown: 115 } },
  ],
  antiAir: [
    { weight: 5, action: { kind: 'special', motion: '623', button: 'P', cooldown: 105 } },
    { weight: 3, action: { kind: 'normal', stance: 'crouch', button: 'C' } },
    { weight: 2, action: { kind: 'block', frames: 20, low: false } },
  ],
  projectileAnswer: [
    { weight: 5, action: { kind: 'block', frames: 24, low: false } },
    { weight: 3, action: { kind: 'roll', dir: 1 } },
    { weight: 1, action: { kind: 'jump', dir: 1 } },
  ],
  okizeme: [
    { weight: 3, action: { kind: 'special', motion: '236', button: 'K', cooldown: 135 } },
    { weight: 2, action: { kind: 'special', motion: '22', button: 'K', cooldown: 150 } },
    { weight: 2, action: { kind: 'walk', dir: 1, frames: 8 } },
  ],
  punish: [
    { weight: 4, action: { kind: 'special', motion: '236', button: 'P' } },
    { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
    { weight: 2, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
  ],
  armorBreak: { kind: 'special', motion: '22', button: 'K', cooldown: 150 },
  followups: [
    {
      from: ['st_a', 'cr_a'],
      options: [
        { weight: 3, action: { kind: 'normal', stance: 'stand', button: 'C' } },
        { weight: 2, action: { kind: 'special', motion: '236', button: 'P' } },
      ],
    },
    {
      from: ['st_c', 'st_d', 'f_c'],
      options: [
        { weight: 4, action: { kind: 'special', motion: '236', button: 'P' } },
        { weight: 2, action: { kind: 'special', motion: '236', button: 'K' } },
      ],
    },
    {
      from: ['sp_club_charge', 'sp_tyrant_charge'],
      options: [
        { weight: 4, action: { kind: 'special', motion: '236236', button: 'P', minMeter: 100 } },
        { weight: 1, action: { kind: 'special', motion: '236236', button: 'K', minMeter: 300 } },
      ],
    },
  ],
};
