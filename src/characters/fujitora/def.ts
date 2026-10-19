import { px, type FighterDef } from '@core/index';
import { fujitoraMoves } from './moves';

/** 藤虎的数据候选：竞技尺度与数值待真实素材接触/手感校准；尚无正式素材验收。 */
export const fujitoraDef: FighterDef = {
  id: 'fujitora',
  name: '藤虎',
  maxHp: 1030,
  movement: {
    walkFwdSpeed: px(1.65),
    walkBackSpeed: px(1.3),
    jumpVelocityY: px(-8.5),
    jumpVelocityX: px(1.9),
    hopVelocityY: px(-6),
    runSpeed: px(4),
    backdashSpeed: px(4.3),
    backdashFrames: 21,
    backdashInvuln: 5,
    rollSpeed: px(3.8),
    rollFrames: 30,
    rollInvuln: 20,
  },
  pushboxStand: [-18, -98, 36, 98],
  pushboxCrouch: [-19, -67, 38, 67],
  pushboxAir: [-17, -90, 34, 70],
  hurtboxStand: [[-19, -98, 38, 98]],
  hurtboxCrouch: [[-20, -67, 40, 67]],
  hurtboxAir: [[-18, -93, 36, 74]],
  moves: fujitoraMoves,
  skillSlots: [
    'sp_gravity_edge',
    'sp_horizontal_gravity',
    'sp_rising_blade',
    'sp_fixed_meteor',
    'sp_gravity_reflect',
    'sp_heavy_sweep',
    'sp_crushing_gravity',
    'sp_meteor_line',
    'ult_heavenfall',
  ],
  color: 0x9170bd,
  tagline: '杖刀 · 定点陨石 · 慢启动',
  // 本游戏原创演出文案，不声称原作台词或已有配音。
  quotes: ['脚下的位置，可要站稳了。'],
};

