import { px, type FighterDef } from '@core/index';
import { whitebeardMoves } from './moves';

/** 大体型长兵器候选；体型为竞技尺度，未按原作身高等比。 全部数值尚待原画接触与实机手感校准。 */
export const whitebeardDef: FighterDef = {
  id: 'whitebeard',
  name: '白胡子',
  maxHp: 1120,
  movement: {
    walkFwdSpeed: px(1.5),
    walkBackSpeed: px(1.1),
    jumpVelocityY: px(-8.35),
    jumpVelocityX: px(1.7),
    hopVelocityY: px(-5.9),
    runSpeed: px(3.6),
    backdashSpeed: px(3.7),
    backdashFrames: 22,
    backdashInvuln: 4,
    rollSpeed: px(3.4),
    rollFrames: 32,
    rollInvuln: 20,
  },
  pushboxStand: [-22, -114, 44, 114],
  pushboxCrouch: [-24, -76, 48, 76],
  pushboxAir: [-20, -105, 40, 78],
  hurtboxStand: [[-23, -114, 46, 114]],
  hurtboxCrouch: [[-25, -76, 50, 76]],
  hurtboxAir: [[-21, -108, 42, 82]],
  moves: whitebeardMoves,
  skillSlots: [
    'sp_quake_wave',
    'sp_naginata_cleave',
    'sp_sky_quake',
    'sp_naginata_thrust',
    'sp_ground_cleave',
    'sp_quake_crush',
    'sp_air_quake',
    'sp_quake_naginata_combo',
    'ult_world_quake',
  ],
  color: 0xe2dbc2,
  tagline: '长薙刀 · 震波 · 缓慢重击',
  // 本游戏原创字幕候选；不宣称原作台词或已存在对应角色语音。
  quotes: ['这一击，你接住了吗？', '大海还宽得很。'],
};

