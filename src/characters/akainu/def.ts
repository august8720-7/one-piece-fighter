import { px, type FighterDef } from '@core/index';
import { akainuMoves } from './moves';

/** 赤犬：重型压制型。血量高、移速慢。数值为初始值，M3 实测后调整。 */
export const akainuDef: FighterDef = {
  id: 'akainu',
  name: '赤犬',
  maxHp: 1100,
  walkFwdSpeed: px(1.7),
  walkBackSpeed: px(1.3),
  jumpVelocityY: px(-8.8),
  jumpVelocityX: px(2.0),
  pushboxStand: [-17, -100, 34, 100],
  pushboxCrouch: [-19, -68, 38, 68],
  pushboxAir: [-15, -92, 30, 68],
  hurtboxStand: [[-17, -100, 34, 100]],
  hurtboxCrouch: [[-19, -68, 38, 68]],
  hurtboxAir: [[-16, -96, 32, 74]],
  moves: akainuMoves,
  color: 0xf4a261,
};
