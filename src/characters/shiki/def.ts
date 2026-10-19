import { px, type FighterDef } from '@core/index';
import { shikiMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const shikiDef: FighterDef = {
  "id": "shiki",
  "name": "金狮子",
  "maxHp": 990,
  "movement": {
    "walkFwdSpeed": px(1.85),
    "walkBackSpeed": px(1.37),
    "jumpVelocityY": px(-9),
    "jumpVelocityX": px(2.2),
    "hopVelocityY": px(-6.3),
    "runSpeed": px(4.7),
    "backdashSpeed": px(4.6),
    "backdashFrames": 20,
    "backdashInvuln": 5,
    "rollSpeed": px(4),
    "rollFrames": 29,
    "rollInvuln": 20
  },
  "pushboxStand": [
    -19,
    -109,
    38,
    109
  ],
  "pushboxCrouch": [
    -19,
    -68,
    38,
    68
  ],
  "pushboxAir": [
    -18,
    -101,
    36,
    81
  ],
  "hurtboxStand": [
    [
      -20,
      -109,
      40,
      109
    ]
  ],
  "hurtboxCrouch": [
    [
      -20,
      -68,
      40,
      68
    ]
  ],
  "hurtboxAir": [
    [
      -19,
      -103,
      38,
      84
    ]
  ],
  "moves": shikiMoves,
  "skillSlots": [
    "sp_sword_wave",
    "sp_cross_swords",
    "sp_sky_scissor",
    "sp_falling_rock",
    "sp_low_scissor",
    "sp_evasive_step",
    "sp_twin_waves",
    "sp_lion_edges",
    "ult_rock_formation"
  ],
  "color": 0xd8ad37,
  "tagline": "剑腿牵制 · 定点落石",
  "quotes": []
};
