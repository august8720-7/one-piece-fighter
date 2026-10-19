import { px, type FighterDef } from '@core/index';
import { shanksMoves } from './moves';

/** 单臂剑士候选；双朝向原画须独立检查左臂缺失，不靠数据宣称已验收。 全部数值尚待原画接触与实机手感校准。 */
export const shanksDef: FighterDef = {
  id: 'shanks',
  name: '香克斯',
  maxHp: 1000,
  movement: {
    walkFwdSpeed: px(2.45),
    walkBackSpeed: px(1.9),
    jumpVelocityY: px(-9.1),
    jumpVelocityX: px(2.45),
    hopVelocityY: px(-6.4),
    runSpeed: px(5),
    backdashSpeed: px(4.9),
    backdashFrames: 18,
    backdashInvuln: 6,
    rollSpeed: px(4.6),
    rollFrames: 27,
    rollInvuln: 18,
  },
  pushboxStand: [-16, -94, 32, 94],
  pushboxCrouch: [-18, -63, 36, 63],
  pushboxAir: [-15, -87, 30, 66],
  hurtboxStand: [[-17, -94, 34, 94]],
  hurtboxCrouch: [[-19, -63, 38, 63]],
  hurtboxAir: [[-16, -89, 32, 70]],
  moves: shanksMoves,
  skillSlots: [
    'sp_haki_slash',
    'sp_single_arm_cut',
    'sp_rising_guard',
    'sp_step_thrust',
    'sp_low_cut',
    'sp_sidestep',
    'sp_divine_departure',
    'sp_emperor_cuts',
    'ult_red_hair_finale',
  ],
  color: 0xb7444d,
  tagline: '剑斩 · 破绽确反 · 灵活',
  // 本游戏原创字幕候选；不宣称原作台词或已存在对应角色语音。
  quotes: ['下一剑，分胜负。', '到此为止吧。'],
};

