import { px, type FighterDef } from '@core/index';
import { kaidoMoves } from './moves';

/** 人形持棒候选；龙形仅为热息招式画面需求，未启用持续变身或飞行。 全部数值尚待原画接触与实机手感校准。 */
export const kaidoDef: FighterDef = {
  id: 'kaido',
  name: '凯多',
  maxHp: 1150,
  movement: {
    walkFwdSpeed: px(1.65),
    walkBackSpeed: px(1.15),
    jumpVelocityY: px(-8.55),
    jumpVelocityX: px(1.85),
    hopVelocityY: px(-6),
    runSpeed: px(3.9),
    backdashSpeed: px(3.9),
    backdashFrames: 21,
    backdashInvuln: 4,
    rollSpeed: px(3.6),
    rollFrames: 31,
    rollInvuln: 20,
  },
  pushboxStand: [-22, -112, 44, 112],
  pushboxCrouch: [-24, -75, 48, 75],
  pushboxAir: [-20, -104, 40, 78],
  hurtboxStand: [[-23, -112, 46, 112]],
  hurtboxCrouch: [[-25, -75, 50, 75]],
  hurtboxAir: [[-21, -107, 42, 82]],
  moves: kaidoMoves,
  skillSlots: [
    'sp_club_charge',
    'sp_vajra_arrow',
    'sp_rising_club',
    'sp_low_bagua',
    'sp_tyrant_charge',
    'sp_ground_club',
    'sp_thunder_bagua',
    'sp_ragnaraku',
    'ult_blast_breath',
  ],
  color: 0x65518f,
  tagline: '狼牙棒 · 霸体起手 · 重击',
  // 本游戏原创字幕候选；不宣称原作台词或已存在对应角色语音。
  quotes: ['拿出更强的一击！', '还没打够呢。'],
};

