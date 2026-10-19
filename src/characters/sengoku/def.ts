import { px, type FighterDef } from '@core/index';
import { sengokuMoves } from './moves';

/** 战国的数据候选：竞技尺度与数值待真实素材接触/手感校准；尚无正式素材验收。 */
export const sengokuDef: FighterDef = {
  id: 'sengoku',
  name: '战国',
  maxHp: 1080,
  movement: {
    walkFwdSpeed: px(1.6),
    walkBackSpeed: px(1.25),
    jumpVelocityY: px(-8.4),
    jumpVelocityX: px(1.8),
    hopVelocityY: px(-5.9),
    runSpeed: px(3.9),
    backdashSpeed: px(4.1),
    backdashFrames: 22,
    backdashInvuln: 5,
    rollSpeed: px(3.7),
    rollFrames: 31,
    rollInvuln: 20,
  },
  pushboxStand: [-20, -104, 40, 104],
  pushboxCrouch: [-21, -71, 42, 71],
  pushboxAir: [-19, -96, 38, 76],
  hurtboxStand: [[-21, -104, 42, 104]],
  hurtboxCrouch: [[-22, -71, 44, 71]],
  hurtboxAir: [[-20, -99, 40, 80]],
  moves: sengokuMoves,
  skillSlots: [
    'sp_palm_wave',
    'sp_palm_press',
    'sp_ascending_palm',
    'sp_tremor_stomp',
    'sp_repelling_palm',
    'sp_shoulder_charge',
    'sp_twin_shock',
    'sp_golden_palm',
    'ult_buddha_shock',
  ],
  color: 0xc6ab62,
  tagline: '重掌 · 冲击波 · 大佛终极',
  // 本游戏原创演出文案，不声称原作台词或已有配音。
  quotes: ['稳住阵脚，胜负还没有定。'],
};

