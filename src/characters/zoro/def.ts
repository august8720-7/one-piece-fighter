import { px, type FighterDef } from '@core/index';
import { zoroMoves } from './moves';

/** 三刀流候选；较慢接近与较长收招换近中距斩击，不提供持续阿修罗形态。 全部数值尚待原画接触与实机手感校准。 */
export const zoroDef: FighterDef = {
  id: 'zoro',
  name: '索隆',
  maxHp: 1050,
  movement: {
    walkFwdSpeed: px(2.1),
    walkBackSpeed: px(1.55),
    jumpVelocityY: px(-9),
    jumpVelocityX: px(2.2),
    hopVelocityY: px(-6.3),
    runSpeed: px(4.6),
    backdashSpeed: px(4.5),
    backdashFrames: 19,
    backdashInvuln: 5,
    rollSpeed: px(4.3),
    rollFrames: 29,
    rollInvuln: 19,
  },
  pushboxStand: [-17, -94, 34, 94],
  pushboxCrouch: [-19, -64, 38, 64],
  pushboxAir: [-16, -88, 32, 66],
  hurtboxStand: [[-18, -94, 36, 94]],
  hurtboxCrouch: [[-20, -64, 40, 64]],
  hurtboxAir: [[-17, -90, 34, 70]],
  moves: zoroMoves,
  skillSlots: [
    'sp_pound_slash',
    'sp_oni_giri',
    'sp_dragon_twister',
    'sp_tiger_hunt',
    'sp_rhino_cycle',
    'sp_lion_song',
    'sp_three_thousand_worlds',
    'sp_great_pound_slash',
    'ult_asura_finale',
  ],
  color: 0x4b9b62,
  tagline: '三刀 · 连段 · 中距斩波',
  // 本游戏原创字幕候选；不宣称原作台词或已存在对应角色语音。
  quotes: ['刀锋还没有停下。', '下一场，也要赢。'],
};

