import { px, type FighterDef } from '@core/index';
import { kizaruMoves } from './moves';

/** 黄猿的数据候选：竞技尺度与数值待真实素材接触/手感校准；尚无正式素材验收。 */
export const kizaruDef: FighterDef = {
  id: 'kizaru',
  name: '黄猿',
  maxHp: 950,
  movement: {
    walkFwdSpeed: px(2.2),
    walkBackSpeed: px(1.9),
    jumpVelocityY: px(-9.2),
    jumpVelocityX: px(2.7),
    hopVelocityY: px(-6.6),
    runSpeed: px(5.3),
    backdashSpeed: px(5.5),
    backdashFrames: 18,
    backdashInvuln: 7,
    rollSpeed: px(4.6),
    rollFrames: 27,
    rollInvuln: 19,
  },
  pushboxStand: [-16, -102, 32, 102],
  pushboxCrouch: [-17, -67, 34, 67],
  pushboxAir: [-15, -94, 30, 74],
  hurtboxStand: [[-17, -102, 34, 102]],
  hurtboxCrouch: [[-18, -67, 36, 67]],
  hurtboxAir: [[-16, -97, 32, 78]],
  moves: kizaruMoves,
  skillSlots: [
    'sp_finger_beam',
    'sp_flash_kick',
    'sp_rising_kick',
    'sp_light_blade',
    'sp_light_scatter',
    'sp_light_body',
    'sp_beam_barrage',
    'sp_heaven_kick',
    'ult_radiant_finale',
  ],
  color: 0xe7c85a,
  tagline: '快速光束 · 突进踢 · 收招风险',
  // 本游戏原创演出文案，不声称原作台词或已有配音。
  quotes: ['光闪过来的时候，要留神哦。'],
};

