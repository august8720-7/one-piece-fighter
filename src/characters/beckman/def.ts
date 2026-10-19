import { px, type FighterDef } from '@core/index';
import { beckmanMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const beckmanDef: FighterDef = {
  "id": "beckman",
  "name": "贝克曼",
  "maxHp": 960,
  "movement": {
    "walkFwdSpeed": px(2.1),
    "walkBackSpeed": px(1.55),
    "jumpVelocityY": px(-9),
    "jumpVelocityX": px(2.2),
    "hopVelocityY": px(-6.3),
    "runSpeed": px(4.9),
    "backdashSpeed": px(4.6),
    "backdashFrames": 20,
    "backdashInvuln": 5,
    "rollSpeed": px(4),
    "rollFrames": 29,
    "rollInvuln": 20
  },
  "pushboxStand": [
    -18,
    -103,
    36,
    103
  ],
  "pushboxCrouch": [
    -18,
    -68,
    36,
    68
  ],
  "pushboxAir": [
    -17,
    -95,
    34,
    75
  ],
  "hurtboxStand": [
    [
      -19,
      -103,
      38,
      103
    ]
  ],
  "hurtboxCrouch": [
    [
      -19,
      -68,
      38,
      68
    ]
  ],
  "hurtboxAir": [
    [
      -18,
      -97,
      36,
      78
    ]
  ],
  "moves": beckmanMoves,
  "skillSlots": [
    "sp_level_shot",
    "sp_stock_push",
    "sp_upward_shot",
    "sp_low_shot",
    "sp_stock_combo",
    "sp_measured_step",
    "sp_three_shots",
    "sp_heavy_shot",
    "ult_covering_fire"
  ],
  "color": 0x7b8391,
  "tagline": "单枪控距 · 有限射角",
  "quotes": []
};
