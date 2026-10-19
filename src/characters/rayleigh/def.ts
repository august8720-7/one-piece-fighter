import { px, type FighterDef } from '@core/index';
import { rayleighMoves } from './moves';

/** 数据候选，待真实素材接触校准；不注册公开阵容。 */
export const rayleighDef: FighterDef = {
  "id": "rayleigh",
  "name": "雷利",
  "maxHp": 980,
  "movement": {
    "walkFwdSpeed": px(2.3),
    "walkBackSpeed": px(1.7),
    "jumpVelocityY": px(-9),
    "jumpVelocityX": px(2.2),
    "hopVelocityY": px(-6.3),
    "runSpeed": px(5.3),
    "backdashSpeed": px(4.6),
    "backdashFrames": 20,
    "backdashInvuln": 5,
    "rollSpeed": px(4),
    "rollFrames": 29,
    "rollInvuln": 20
  },
  "pushboxStand": [
    -18,
    -100,
    36,
    100
  ],
  "pushboxCrouch": [
    -18,
    -68,
    36,
    68
  ],
  "pushboxAir": [
    -17,
    -92,
    34,
    72
  ],
  "hurtboxStand": [
    [
      -19,
      -100,
      38,
      100
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
      -94,
      36,
      75
    ]
  ],
  "moves": rayleighMoves,
  "skillSlots": [
    "sp_precise_thrust",
    "sp_double_edge",
    "sp_upward_edge",
    "sp_timed_riposte",
    "sp_blade_parry",
    "sp_quiet_step",
    "sp_master_sequence",
    "sp_silver_wave",
    "ult_dark_king_edge"
  ],
  "color": 0xa9b5ba,
  "tagline": "剑术迎击 · 有限闪避",
  "quotes": []
};
