import { px, type FighterDef } from '@core/index';
import { rogerMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const rogerDef: FighterDef = {
  "id": "roger",
  "name": "罗杰",
  "maxHp": 1020,
  "movement": {
    "walkFwdSpeed": px(2.15),
    "walkBackSpeed": px(1.59),
    "jumpVelocityY": px(-9),
    "jumpVelocityX": px(2.2),
    "hopVelocityY": px(-6.3),
    "runSpeed": px(5.2),
    "backdashSpeed": px(4.6),
    "backdashFrames": 20,
    "backdashInvuln": 5,
    "rollSpeed": px(4),
    "rollFrames": 29,
    "rollInvuln": 20
  },
  "pushboxStand": [
    -19,
    -104,
    38,
    104
  ],
  "pushboxCrouch": [
    -19,
    -68,
    38,
    68
  ],
  "pushboxAir": [
    -18,
    -96,
    36,
    76
  ],
  "hurtboxStand": [
    [
      -20,
      -104,
      40,
      104
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
      -98,
      38,
      79
    ]
  ],
  "moves": rogerMoves,
  "skillSlots": [
    "sp_captain_thrust",
    "sp_overhead_cut",
    "sp_rising_blade",
    "sp_low_arc",
    "sp_cross_cut",
    "sp_resolute_edge",
    "sp_divine_departure",
    "sp_captain_duel",
    "ult_king_edge"
  ],
  "color": 0xb83331,
  "tagline": "中距剑压 · 高风险重斩",
  "quotes": []
};
