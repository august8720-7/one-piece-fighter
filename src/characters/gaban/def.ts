import { px, type FighterDef } from '@core/index';
import { gabanMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const gabanDef: FighterDef = {
  "id": "gaban",
  "name": "贾巴",
  "maxHp": 1040,
  "movement": {
    "walkFwdSpeed": px(2),
    "walkBackSpeed": px(1.48),
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
    -20,
    -102,
    40,
    102
  ],
  "pushboxCrouch": [
    -20,
    -68,
    40,
    68
  ],
  "pushboxAir": [
    -19,
    -94,
    38,
    74
  ],
  "hurtboxStand": [
    [
      -21,
      -102,
      42,
      102
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
      -96,
      40,
      77
    ]
  ],
  "moves": gabanMoves,
  "skillSlots": [
    "sp_axe_advance",
    "sp_axe_barrage",
    "sp_rising_axe",
    "sp_ground_split",
    "sp_axe_hook",
    "sp_braced_axes",
    "sp_four_axes",
    "sp_mountain_split",
    "ult_twin_axe_finale"
  ],
  "color": 0xb17b37,
  "tagline": "双斧近战 · 多段重击",
  "quotes": []
};
