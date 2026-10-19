import { px, type FighterDef } from '@core/index';
import { sanjiMoves } from './moves';

/** 腿技快攻候选；低血量换接近速度，没有投射物或持续飞行。 全部数值尚待原画接触与实机手感校准。 */
export const sanjiDef: FighterDef = {
  id: 'sanji',
  name: '山治',
  maxHp: 970,
  movement: {
    walkFwdSpeed: px(2.75),
    walkBackSpeed: px(2.05),
    jumpVelocityY: px(-9.7),
    jumpVelocityX: px(2.8),
    hopVelocityY: px(-6.8),
    runSpeed: px(5.5),
    backdashSpeed: px(5.2),
    backdashFrames: 17,
    backdashInvuln: 6,
    rollSpeed: px(4.9),
    rollFrames: 25,
    rollInvuln: 17,
  },
  pushboxStand: [-15, -95, 30, 95],
  pushboxCrouch: [-17, -62, 34, 62],
  pushboxAir: [-14, -87, 28, 64],
  hurtboxStand: [[-16, -95, 32, 95]],
  hurtboxCrouch: [[-18, -62, 36, 62]],
  hurtboxAir: [[-15, -90, 30, 70]],
  moves: sanjiMoves,
  skillSlots: [
    'sp_neck_kick',
    'sp_mutton_flurry',
    'sp_rising_kick',
    'sp_slide_kick',
    'sp_turn_sweep',
    'sp_flash_step',
    'sp_diable_combo',
    'sp_hell_spin',
    'ult_ifrit_finale',
  ],
  color: 0xdca952,
  tagline: '踢技 · 快步 · 火焰连击',
  // 本游戏原创字幕候选；不宣称原作台词或已存在对应角色语音。
  quotes: ['火候刚刚好。', '还要再来一脚吗？'],
};

