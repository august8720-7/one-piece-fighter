import { px, type FighterDef } from '@core/index';
import { garpMoves } from './moves';

/** 卡普的数据候选：竞技尺度与数值待真实素材接触/手感校准；尚无正式素材验收。 */
export const garpDef: FighterDef = {
  id: 'garp',
  name: '卡普',
  maxHp: 1070,
  movement: {
    walkFwdSpeed: px(1.9),
    walkBackSpeed: px(1.4),
    jumpVelocityY: px(-9),
    jumpVelocityX: px(2.2),
    hopVelocityY: px(-6.3),
    runSpeed: px(4.7),
    backdashSpeed: px(4.5),
    backdashFrames: 20,
    backdashInvuln: 5,
    rollSpeed: px(3.9),
    rollFrames: 29,
    rollInvuln: 20,
  },
  pushboxStand: [-19, -104, 38, 104],
  pushboxCrouch: [-20, -70, 40, 70],
  pushboxAir: [-18, -96, 36, 76],
  hurtboxStand: [[-20, -104, 40, 104]],
  hurtboxCrouch: [[-21, -70, 42, 70]],
  hurtboxAir: [[-19, -99, 38, 80]],
  moves: garpMoves,
  skillSlots: [
    'sp_iron_rush',
    'sp_iron_barrage',
    'sp_rising_fist',
    'sp_ground_crush',
    'sp_iron_grapple',
    'sp_braced_fist',
    'sp_galaxy_blow',
    'sp_cannonball',
    'ult_galaxy_impact',
  ],
  color: 0xa5b8cb,
  tagline: '铁拳近战 · 突进 · 摔投',
  // 本游戏原创演出文案，不声称原作台词或已有配音。
  quotes: ['拳头的分量，亲自接接看吧！'],
};

