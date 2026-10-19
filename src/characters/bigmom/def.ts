import { px, type FighterDef } from '@core/index';
import { bigmomMoves } from './moves';

/** 宽体型远程候选；火雷均是有限寿命飞行道具，不创建独立霍米兹 AI。 全部数值尚待原画接触与实机手感校准。 */
export const bigmomDef: FighterDef = {
  id: 'bigmom',
  name: '大妈',
  maxHp: 1130,
  movement: {
    walkFwdSpeed: px(1.35),
    walkBackSpeed: px(1),
    jumpVelocityY: px(-8.05),
    jumpVelocityX: px(1.5),
    hopVelocityY: px(-5.6),
    runSpeed: px(3.35),
    backdashSpeed: px(3.5),
    backdashFrames: 23,
    backdashInvuln: 4,
    rollSpeed: px(3.2),
    rollFrames: 34,
    rollInvuln: 20,
  },
  pushboxStand: [-26, -108, 52, 108],
  pushboxCrouch: [-28, -75, 56, 75],
  pushboxAir: [-24, -100, 48, 74],
  hurtboxStand: [[-28, -108, 56, 108]],
  hurtboxCrouch: [[-29, -75, 58, 75]],
  hurtboxAir: [[-25, -102, 50, 80]],
  moves: bigmomMoves,
  skillSlots: [
    'sp_heavenly_fire',
    'sp_ikoku',
    'sp_thunder',
    'sp_emperor_sword',
    'sp_hat_sweep',
    'sp_anger_burst',
    'sp_fire_thunder',
    'sp_maser_sword',
    'ult_final_feast',
  ],
  color: 0xe884ab,
  tagline: '帽剑 · 火雷 · 区域压制',
  // 本游戏原创字幕候选；不宣称原作台词或已存在对应角色语音。
  quotes: ['还没到散场的时候！', '下一道，轮到谁？'],
};

