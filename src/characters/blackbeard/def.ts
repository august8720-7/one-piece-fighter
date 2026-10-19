import { px, type FighterDef } from '@core/index';
import { blackbeardMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const blackbeardDef: FighterDef = {
  "id": "blackbeard",
  "name": "黑胡子",
  "maxHp": 1100,
  "movement": {
    "walkFwdSpeed": px(1.65),
    "walkBackSpeed": px(1.22),
    "jumpVelocityY": px(-9),
    "jumpVelocityX": px(2.2),
    "hopVelocityY": px(-6.3),
    "runSpeed": px(4.1),
    "backdashSpeed": px(4.6),
    "backdashFrames": 20,
    "backdashInvuln": 5,
    "rollSpeed": px(4),
    "rollFrames": 29,
    "rollInvuln": 20
  },
  "pushboxStand": [
    -22,
    -110,
    44,
    110
  ],
  "pushboxCrouch": [
    -22,
    -68,
    44,
    68
  ],
  "pushboxAir": [
    -21,
    -102,
    42,
    82
  ],
  "hurtboxStand": [
    [
      -23,
      -110,
      46,
      110
    ]
  ],
  "hurtboxCrouch": [
    [
      -23,
      -68,
      46,
      68
    ]
  ],
  "hurtboxAir": [
    [
      -22,
      -104,
      44,
      85
    ]
  ],
  "moves": blackbeardMoves,
  "skillSlots": [
    "sp_dark_wave",
    "sp_quake_fist",
    "sp_dark_upper",
    "sp_ground_quake",
    "sp_dark_grasp",
    "sp_brutal_lunge",
    "sp_quake_front",
    "sp_dark_impact",
    "ult_dark_quake"
  ],
  "color": 0x57305b,
  "tagline": "暗影近抓 · 慢震波",
  "quotes": []
};
