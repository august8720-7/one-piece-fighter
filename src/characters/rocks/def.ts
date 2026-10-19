import { px, type FighterDef } from '@core/index';
import { rocksMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const rocksDef: FighterDef = {
  "id": "rocks",
  "name": "洛克斯",
  "maxHp": 1060,
  "movement": {
    "walkFwdSpeed": px(1.9),
    "walkBackSpeed": px(1.41),
    "jumpVelocityY": px(-9),
    "jumpVelocityX": px(2.2),
    "hopVelocityY": px(-6.3),
    "runSpeed": px(5.1),
    "backdashSpeed": px(4.6),
    "backdashFrames": 20,
    "backdashInvuln": 5,
    "rollSpeed": px(4),
    "rollFrames": 29,
    "rollInvuln": 20
  },
  "pushboxStand": [
    -20,
    -108,
    40,
    108
  ],
  "pushboxCrouch": [
    -20,
    -68,
    40,
    68
  ],
  "pushboxAir": [
    -19,
    -100,
    38,
    80
  ],
  "hurtboxStand": [
    [
      -21,
      -108,
      42,
      108
    ]
  ],
  "hurtboxCrouch": [
    [
      -21,
      -68,
      42,
      68
    ]
  ],
  "hurtboxAir": [
    [
      -20,
      -102,
      40,
      83
    ]
  ],
  "moves": rocksMoves,
  "skillSlots": [
    "sp_ravaging_edges",
    "sp_crushing_edge",
    "sp_sky_rend",
    "sp_split_wave",
    "sp_hilt_capture",
    "sp_headlong_cut",
    "sp_sunder_combo",
    "sp_dominating_cut",
    "ult_ruin_edge"
  ],
  "color": 0x76436f,
  "tagline": "分段强攻 · 收招破绽",
  "quotes": []
};
