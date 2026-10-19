import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData } from '@core/index';

const { BURN, SUPER_COST, ULTIMATE_COST } = balance;
export const KAIDO_PROJECTILE_KINDS = ['kaido_vajra_arrow', 'kaido_blast_breath'] as const;

/** 0929 候选：平时人形持棒，热息只有招式内龙形原画需求，不开启安装/飞行状态。 */
export const kaidoMoves: readonly MoveData[] = [
  attack({ id: 'sp_club_charge', name: '狼牙突击', stance: 'stand', button: P, motion: '236', segments: [{ startup: 15, active: 5, hitbox: [13, -79, 66, 53] }], recovery: 33, damage: 115, hitstun: 29, blockstun: 18, stepX: 1.8, activeStepX: 2.5, knockback: { x: 9 } }),
  utility({ id: 'sp_vajra_arrow', name: '金刚镝', button: P, motion: '214', startup: 27, cast: 20, recovery: 34, damage: 106, hitstun: 27, blockstun: 18, knockback: { x: 8 }, projectiles: [{ frame: 20, kind: 'kaido_vajra_arrow', x: 40, y: -48, vx: 3.8, vy: 0, ttl: 65, box: [-17, -30, 34, 60] }] }),
  attack({ id: 'sp_rising_club', name: '升龙棒', stance: 'stand', button: P, motion: '623', segments: [{ startup: 12, active: 7, hitbox: [6, -140, 63, 116] }], recovery: 35, damage: 126, hitstun: 30, blockstun: 19, knockback: { x: 5, y: -9 }, knockdown: true }),
  attack({ id: 'sp_low_bagua', name: '横扫八卦', stance: 'stand', button: K, motion: '236', segments: [{ startup: 19, active: 6, hitbox: [10, -29, 87, 29] }], recovery: 37, damage: 111, guard: 'low', hitstun: 29, blockstun: 19, knockback: { x: 9 }, knockdown: true }),
  attack({ id: 'sp_tyrant_charge', name: '暴君冲撞', stance: 'stand', button: K, motion: '214', armor: true, armorFrames: 9, segments: [{ startup: 20, active: 7, hitbox: [9, -90, 46, 82] }], recovery: 40, damage: 134, hitstun: 31, blockstun: 21, stepX: 1.6, activeStepX: 3.4, knockback: { x: 12, y: -3 }, knockdown: true }),
  attack({ id: 'sp_ground_club', name: '震地重棒', stance: 'stand', button: K, motion: '22', armorBreak: true, segments: [{ startup: 26, active: 6, hitbox: [10, -109, 72, 103] }], recovery: 43, damage: 155, guard: 'high', hitstun: 34, blockstun: 23, hitstop: 15, knockback: { x: 11, y: -4 }, knockdown: true }),
  attack({ id: 'sp_thunder_bagua', name: '雷鸣八卦', type: 'super', stance: 'stand', button: P, motion: '236236', meterCost: SUPER_COST, invuln: 8, armorBreak: true, segments: [{ startup: 15, active: 6, hitbox: [12, -89, 93, 71] }], recovery: 40, damage: 224, hitstun: 36, blockstun: 24, hitstop: 17, stepX: 2.4, activeStepX: 2.7, knockback: { x: 14, y: -6 }, wallBounce: true, knockdown: true }),
  attack({ id: 'sp_ragnaraku', name: '降三世·引奈落', type: 'super', stance: 'stand', button: P, motion: '214214', meterCost: SUPER_COST, armor: true, armorFrames: 10, segments: [{ startup: 23, active: 8, hitbox: [4, -142, 107, 137] }], recovery: 47, damage: 248, guard: 'high', hitstun: 38, blockstun: 25, hitstop: 18, knockback: { x: 12, y: -7 }, knockdown: true }),
  utility({ id: 'ult_blast_breath', name: '热息', type: 'ultimate', button: K, motion: '236236', meterCost: ULTIMATE_COST, invuln: 12, startup: 35, cast: 27, recovery: 51, damage: 328, hitstun: 44, blockstun: 29, hitstop: 19, burn: BURN, knockback: { x: 15, y: -6 }, projectiles: [{ frame: 27, kind: 'kaido_blast_breath', x: 43, y: -54, vx: 4.6, vy: 0, ttl: 78, box: [-22, -47, 44, 94] }] }),
  normal({ id: 'cd', name: '狼牙吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 20, active: 6, recovery: 32, hitbox: [10, -92, 85, 77], damage: 114, hitstun: 34, blockstun: 23, knockback: { x: 13, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空狼牙吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 13, active: 6, recovery: 18, hitbox: [9, -83, 79, 69], damage: 105, hitstun: 30, knockback: { x: 10, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '巨掌摔', direction: 6, button: Btn.C, damage: 137, total: 49, throwData: { range: 54, techWindow: 8, releaseFrame: 25, holdOffset: 42 } }),
  throwMove({ id: 'throw_back', name: '巨掌反摔', direction: 4, button: Btn.C, damage: 137, total: 49, throwData: { range: 54, techWindow: 8, releaseFrame: 25, holdOffset: 42 } }),
  normal({ id: 'f_c', name: '狼牙劈落', stance: 'stand', button: Btn.C, direction: 6, startup: 21, active: 5, recovery: 29, hitbox: [11, -124, 65, 112], damage: 102, guard: 'high', stepX: 0.6 }),
  normal({ id: 'st_a', name: '棒柄轻击', stance: 'stand', button: Btn.A, startup: 6, active: 3, recovery: 13, hitbox: [11, -67, 39, 25], damage: 43, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '重膝', stance: 'stand', button: Btn.B, startup: 8, active: 4, recovery: 15, hitbox: [12, -52, 35, 33], damage: 46, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '狼牙横砸', stance: 'stand', button: Btn.C, startup: 13, active: 5, recovery: 28, hitbox: [10, -83, 84, 60], damage: 96, knockback: { x: 8 } }),
  normal({ id: 'st_d', name: '重脚踢', stance: 'stand', button: Btn.D, startup: 15, active: 5, recovery: 29, hitbox: [11, -56, 58, 45], damage: 90, knockback: { x: 9 } }),
  normal({ id: 'cr_a', name: '蹲棒柄', stance: 'crouch', button: Btn.A, startup: 6, active: 3, recovery: 12, hitbox: [10, -41, 39, 25], damage: 39, chain: ['cr_c', 'cr_d', 'st_c'] }),
  normal({ id: 'cr_b', name: '蹲脚尖', stance: 'crouch', button: Btn.B, startup: 7, active: 3, recovery: 14, hitbox: [10, -21, 46, 21], damage: 42, guard: 'low' }),
  normal({ id: 'cr_c', name: '狼牙上挑', stance: 'crouch', button: Btn.C, startup: 11, active: 6, recovery: 28, hitbox: [6, -127, 57, 105], damage: 94, knockback: { x: 4, y: -8 } }),
  normal({ id: 'cr_d', name: '狼牙扫地', stance: 'crouch', button: Btn.D, startup: 14, active: 5, recovery: 32, hitbox: [10, -24, 83, 24], damage: 87, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空棒柄', stance: 'air', button: Btn.A, startup: 6, active: 6, recovery: 10, hitbox: [10, -64, 40, 29], damage: 41 }),
  normal({ id: 'j_b', name: '空膝撞', stance: 'air', button: Btn.B, startup: 8, active: 6, recovery: 11, hitbox: [10, -44, 37, 32], damage: 44 }),
  normal({ id: 'j_c', name: '空狼牙砸', stance: 'air', button: Btn.C, startup: 11, active: 6, recovery: 15, hitbox: [9, -86, 77, 67], damage: 91 }),
  normal({ id: 'j_d', name: '空重踢', stance: 'air', button: Btn.D, startup: 13, active: 6, recovery: 16, hitbox: [10, -54, 60, 49], damage: 84 }),
];
