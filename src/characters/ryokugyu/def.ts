import { px, type FighterDef } from '@core/index';
import { ryokugyuMoves } from './moves';

/** 绿牛的数据候选：竞技尺度与数值待真实素材接触/手感校准；尚无正式素材验收。 */
export const ryokugyuDef: FighterDef = {
  id: 'ryokugyu',
  name: '绿牛',
  maxHp: 1020,
  movement: {
    walkFwdSpeed: px(1.85),
    walkBackSpeed: px(1.45),
    jumpVelocityY: px(-8.9),
    jumpVelocityX: px(2.1),
    hopVelocityY: px(-6.2),
    runSpeed: px(4.3),
    backdashSpeed: px(4.6),
    backdashFrames: 21,
    backdashInvuln: 5,
    rollSpeed: px(3.9),
    rollFrames: 30,
    rollInvuln: 20,
  },
  pushboxStand: [-18, -106, 36, 106],
  pushboxCrouch: [-19, -70, 38, 70],
  pushboxAir: [-17, -98, 34, 78],
  hurtboxStand: [[-19, -106, 38, 106]],
  hurtboxCrouch: [[-20, -70, 40, 70]],
  hurtboxAir: [[-18, -101, 36, 82]],
  moves: ryokugyuMoves,
  skillSlots: [
    'sp_vine_thrust',
    'sp_root_sweep',
    'sp_thorn_upper',
    'sp_root_pillar',
    'sp_branch_bind',
    'sp_bark_palm',
    'sp_thicket_rush',
    'sp_forest_line',
    'ult_forest_crush',
  ],
  color: 0x70a34b,
  tagline: '长藤打击 · 根柱 · 近身擒拿',
  // 本游戏原创演出文案，不声称原作台词或已有配音。
  quotes: ['小心脚下，枝蔓可不会等你。'],
};

