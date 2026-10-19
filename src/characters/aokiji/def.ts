import { px, type FighterDef } from '@core/index';
import { aokijiMoves } from './moves';

/** 青雉的数据候选：竞技尺度与数值待真实素材接触/手感校准；尚无正式素材验收。 */
export const aokijiDef: FighterDef = {
  id: 'aokiji',
  name: '青雉',
  maxHp: 1000,
  movement: {
    walkFwdSpeed: px(1.9),
    walkBackSpeed: px(1.5),
    jumpVelocityY: px(-9),
    jumpVelocityX: px(2.1),
    hopVelocityY: px(-6.3),
    runSpeed: px(4.4),
    backdashSpeed: px(4.8),
    backdashFrames: 20,
    backdashInvuln: 6,
    rollSpeed: px(4),
    rollFrames: 29,
    rollInvuln: 20,
  },
  pushboxStand: [-16, -100, 32, 100],
  pushboxCrouch: [-17, -66, 34, 66],
  pushboxAir: [-15, -92, 30, 72],
  hurtboxStand: [[-17, -100, 34, 100]],
  hurtboxCrouch: [[-18, -66, 36, 66]],
  hurtboxAir: [[-16, -95, 32, 76]],
  moves: aokijiMoves,
  skillSlots: [
    'sp_ice_lance',
    'sp_ice_blade',
    'sp_ice_uplift',
    'sp_ice_spike',
    'sp_ice_mirror',
    'sp_ice_body',
    'sp_ice_pheasant',
    'sp_glacier_line',
    'ult_ice_age',
  ],
  color: 0x79c8e8,
  tagline: '冰矛牵制 · 定点冰脊 · 反射',
  // 本游戏原创演出文案，不声称原作台词或已有配音。
  quotes: ['冷静一点，看清距离。'],
};

