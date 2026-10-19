import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData, type ProjectileSpawn } from '@core/index';

const { BURN, SUPER_COST, ULTIMATE_COST } = balance;
export const BIGMOM_PROJECTILE_KINDS = ['bigmom_heavenly_fire', 'bigmom_ikoku', 'bigmom_thunder', 'bigmom_fire_thunder', 'bigmom_maser', 'bigmom_final_feast'] as const;

/** 固定在施放者前方，绝不跟随对手。霍米兹仅是有寿命的画面/飞行道具。 */
const thunder = (frame: number, x: number, kind: string, damage: number): ProjectileSpawn => ({
  frame, kind, x, y: -170, vx: 0, vy: 7, ttl: 30, box: [-18, -28, 36, 56], damage, dieOnGround: true,
});

export const bigmomMoves: readonly MoveData[] = [
  utility({ id: 'sp_heavenly_fire', name: '天上之火', button: P, motion: '236', startup: 23, cast: 17, recovery: 30, damage: 87, hitstun: 24, blockstun: 16, burn: BURN, knockback: { x: 6 }, projectiles: [{ frame: 17, kind: 'bigmom_heavenly_fire', x: 42, y: -48, vx: 3.0, vy: 0, ttl: 96, box: [-17, -17, 34, 34] }] }),
  utility({ id: 'sp_ikoku', name: '威国', button: P, motion: '214', startup: 28, cast: 21, recovery: 35, damage: 119, hitstun: 29, blockstun: 19, knockback: { x: 9 }, projectiles: [{ frame: 21, kind: 'bigmom_ikoku', x: 44, y: -48, vx: 5.1, vy: 0, ttl: 60, box: [-15, -35, 30, 70] }] }),
  utility({ id: 'sp_thunder', name: '雷霆', button: P, motion: '623', startup: 25, cast: 16, recovery: 31, damage: 105, hitstun: 28, blockstun: 18, knockback: { x: 4, y: -6 }, projectiles: [thunder(16, 100, 'bigmom_thunder', 105)] }),
  attack({ id: 'sp_emperor_sword', name: '皇帝剑', stance: 'stand', button: K, motion: '236', segments: [{ startup: 17, active: 6, hitbox: [15, -100, 79, 88] }], recovery: 34, damage: 123, guard: 'high', burn: BURN, hitstun: 31, blockstun: 20, knockback: { x: 9 } }),
  attack({ id: 'sp_hat_sweep', name: '帽剑扫地', stance: 'stand', button: K, motion: '214', segments: [{ startup: 19, active: 6, hitbox: [13, -30, 88, 30] }], recovery: 36, damage: 106, guard: 'low', hitstun: 28, blockstun: 19, knockback: { x: 8 }, knockdown: true }),
  attack({ id: 'sp_anger_burst', name: '怒声震退', stance: 'stand', button: K, motion: '22', segments: [{ startup: 14, active: 7, hitbox: [-5, -97, 84, 88] }], recovery: 33, damage: 91, hitstun: 26, blockstun: 18, knockback: { x: 14 }, armor: true, armorFrames: 6 }),
  utility({ id: 'sp_fire_thunder', name: '火雷交响', type: 'super', button: P, motion: '236236', meterCost: SUPER_COST, invuln: 8, startup: 33, cast: 13, recovery: 42, damage: 89, hitstun: 29, blockstun: 18, hitstop: 10, knockback: { x: 3 }, projectiles: [{ frame: 13, kind: 'bigmom_fire_thunder', x: 40, y: -44, vx: 3.1, vy: 0, ttl: 74, box: [-18, -18, 36, 36] }, thunder(21, 106, 'bigmom_fire_thunder', 89), { frame: 30, kind: 'bigmom_fire_thunder', x: 40, y: -42, vx: 4.1, vy: 0, ttl: 70, box: [-20, -20, 40, 40] }] }),
  utility({ id: 'sp_maser_sword', name: '鸣光剑', type: 'super', button: P, motion: '214214', meterCost: SUPER_COST, invuln: 7, startup: 29, cast: 20, recovery: 42, damage: 215, hitstun: 34, blockstun: 24, hitstop: 15, knockback: { x: 12, y: -4 }, projectiles: [{ frame: 20, kind: 'bigmom_maser', x: 44, y: -54, vx: 4.7, vy: 0, ttl: 70, box: [-20, -35, 40, 70] }] }),
  utility({ id: 'ult_final_feast', name: '母皇终宴', type: 'ultimate', button: K, motion: '236236', meterCost: ULTIMATE_COST, invuln: 12, startup: 43, cast: 15, recovery: 48, damage: 122, hitstun: 35, blockstun: 21, hitstop: 12, knockback: { x: 3 }, projectiles: [{ frame: 15, kind: 'bigmom_final_feast', x: 42, y: -43, vx: 3.5, vy: 0, ttl: 78, box: [-22, -22, 44, 44] }, thunder(26, 118, 'bigmom_final_feast', 122), { frame: 38, kind: 'bigmom_final_feast', x: 45, y: -52, vx: 4.3, vy: 0, ttl: 76, box: [-23, -40, 46, 80] }] }),
  normal({ id: 'cd', name: '帽剑吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 22, active: 6, recovery: 33, hitbox: [12, -87, 81, 70], damage: 110, hitstun: 33, blockstun: 23, knockback: { x: 13, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空帽剑吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 14, active: 6, recovery: 18, hitbox: [11, -77, 77, 66], damage: 102, hitstun: 29, knockback: { x: 10, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '大力抱摔', direction: 6, button: Btn.C, damage: 134, total: 52, throwData: { range: 58, techWindow: 8, releaseFrame: 26, holdOffset: 46 } }),
  throwMove({ id: 'throw_back', name: '大力反摔', direction: 4, button: Btn.C, damage: 134, total: 52, throwData: { range: 58, techWindow: 8, releaseFrame: 26, holdOffset: 46 } }),
  normal({ id: 'f_c', name: '帽剑砸落', stance: 'stand', button: Btn.C, direction: 6, startup: 22, active: 5, recovery: 31, hitbox: [15, -113, 64, 102], damage: 100, guard: 'high' }),
  normal({ id: 'st_a', name: '轻掌', stance: 'stand', button: Btn.A, startup: 7, active: 3, recovery: 14, hitbox: [14, -60, 43, 28], damage: 42, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '裙下踢', stance: 'stand', button: Btn.B, startup: 9, active: 4, recovery: 16, hitbox: [15, -34, 40, 25], damage: 44, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '帽剑横斩', stance: 'stand', button: Btn.C, startup: 14, active: 5, recovery: 29, hitbox: [14, -74, 81, 51], damage: 94, knockback: { x: 8 } }),
  normal({ id: 'st_d', name: '重掌横扫', stance: 'stand', button: Btn.D, startup: 16, active: 5, recovery: 29, hitbox: [13, -75, 60, 59], damage: 90, knockback: { x: 9 } }),
  normal({ id: 'cr_a', name: '蹲轻掌', stance: 'crouch', button: Btn.A, startup: 7, active: 3, recovery: 13, hitbox: [14, -40, 42, 26], damage: 39, chain: ['cr_c', 'cr_d', 'st_c'] }),
  normal({ id: 'cr_b', name: '蹲脚尖', stance: 'crouch', button: Btn.B, startup: 8, active: 3, recovery: 15, hitbox: [14, -20, 45, 20], damage: 40, guard: 'low' }),
  normal({ id: 'cr_c', name: '帽剑上挑', stance: 'crouch', button: Btn.C, startup: 12, active: 6, recovery: 28, hitbox: [9, -121, 59, 102], damage: 91, knockback: { x: 4, y: -8 } }),
  normal({ id: 'cr_d', name: '帽剑低扫', stance: 'crouch', button: Btn.D, startup: 15, active: 5, recovery: 32, hitbox: [13, -25, 81, 25], damage: 86, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空轻掌', stance: 'air', button: Btn.A, startup: 7, active: 6, recovery: 10, hitbox: [13, -61, 44, 29], damage: 40 }),
  normal({ id: 'j_b', name: '空前踢', stance: 'air', button: Btn.B, startup: 8, active: 6, recovery: 11, hitbox: [14, -35, 43, 33], damage: 43 }),
  normal({ id: 'j_c', name: '空帽剑斩', stance: 'air', button: Btn.C, startup: 12, active: 6, recovery: 16, hitbox: [12, -77, 79, 61], damage: 89 }),
  normal({ id: 'j_d', name: '空重掌', stance: 'air', button: Btn.D, startup: 13, active: 6, recovery: 16, hitbox: [11, -61, 63, 52], damage: 84 }),
];
