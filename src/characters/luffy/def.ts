import { px, type FighterDef } from '@core/index';

/** 路飞：速攻连段型。血量中、移速快。数值为初始值，M3 实测后调整。 */
export const luffyDef: FighterDef = {
  id: 'luffy',
  name: '路飞',
  maxHp: 1000,
  walkFwdSpeed: px(2.4),
  walkBackSpeed: px(1.8),
  jumpVelocityY: px(-9.5),
  jumpVelocityX: px(2.6),
  pushboxStand: [-14, -88, 28, 88],
  pushboxCrouch: [-16, -60, 32, 60],
  color: 0xe63946,
};
