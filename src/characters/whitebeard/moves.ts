import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData } from '@core/index';

const { SUPER_COST, ULTIMATE_COST } = balance;
export const WHITEBEARD_PROJECTILE_KINDS = ['whitebeard_quake_wave', 'whitebeard_air_quake', 'whitebeard_world_quake'] as const;

/** 0929 候选：长薙刀与缓慢震波；武器延伸不增加身体受击范围。 */
export const whitebeardMoves: readonly MoveData[] = [
  utility({ id: 'sp_quake_wave', name: '震波', button: P, motion: '236', startup: 25, cast: 19, recovery: 32, damage: 103, hitstun: 27, blockstun: 18, knockback: { x: 8 }, projectiles: [{ frame: 19, kind: 'whitebeard_quake_wave', x: 37, y: -26, vx: 3.4, vy: 0, ttl: 76, box: [-16, -26, 32, 52] }] }),
  attack({ id: 'sp_naginata_cleave', name: '薙刀重劈', stance: 'stand', button: P, motion: '214', segments: [{ startup: 19, active: 6, hitbox: [13, -102, 100, 88] }], recovery: 36, damage: 134, hitstun: 31, blockstun: 20, knockback: { x: 10 }, hitstop: 14 }),
  attack({ id: 'sp_sky_quake', name: '震空拳', stance: 'stand', button: P, motion: '623', segments: [{ startup: 13, active: 7, hitbox: [8, -139, 63, 113] }], recovery: 35, damage: 126, hitstun: 30, blockstun: 19, knockback: { x: 5, y: -9 }, knockdown: true }),
  attack({ id: 'sp_naginata_thrust', name: '薙刀前突', stance: 'stand', button: K, motion: '236', segments: [{ startup: 17, active: 4, hitbox: [17, -70, 114, 25] }], recovery: 35, damage: 116, hitstun: 28, blockstun: 18, stepX: 0.7, knockback: { x: 8 } }),
  attack({ id: 'sp_ground_cleave', name: '裂地斩', stance: 'stand', button: K, motion: '214', segments: [{ startup: 22, active: 6, hitbox: [12, -28, 105, 28] }], recovery: 40, damage: 118, guard: 'low', hitstun: 30, blockstun: 20, knockback: { x: 9 }, knockdown: true }),
  attack({ id: 'sp_quake_crush', name: '震拳重压', stance: 'stand', button: K, motion: '22', armor: true, armorFrames: 10, armorBreak: true, segments: [{ startup: 24, active: 5, hitbox: [12, -86, 57, 69] }], recovery: 39, damage: 150, hitstun: 34, blockstun: 22, knockback: { x: 11, y: -4 }, knockdown: true }),
  utility({ id: 'sp_air_quake', name: '空震', type: 'super', button: P, motion: '236236', meterCost: SUPER_COST, invuln: 8, startup: 28, cast: 21, recovery: 43, damage: 221, hitstun: 35, blockstun: 25, hitstop: 16, knockback: { x: 12, y: -5 }, projectiles: [{ frame: 21, kind: 'whitebeard_air_quake', x: 38, y: -52, vx: 3.5, vy: 0, ttl: 85, box: [-18, -49, 36, 98] }] }),
  attack({ id: 'sp_quake_naginata_combo', name: '薙刀震荡连击', type: 'super', stance: 'stand', button: P, motion: '214214', meterCost: SUPER_COST, armor: true, armorFrames: 8, segments: [{ startup: 17, active: 4, hitbox: [12, -77, 88, 55] }, { startup: 5, active: 4, hitbox: [12, -60, 98, 47] }, { startup: 6, active: 6, hitbox: [12, -99, 110, 84] }], recovery: 39, damage: 79, hitstun: 45, blockstun: 19, hitstop: 11, knockback: { x: 1.4 }, activeStepX: 1.5 }),
  utility({ id: 'ult_world_quake', name: '世界震荡', type: 'ultimate', button: K, motion: '236236', meterCost: ULTIMATE_COST, invuln: 12, startup: 33, cast: 25, recovery: 50, damage: 340, hitstun: 45, blockstun: 29, hitstop: 20, knockback: { x: 15, y: -8 }, projectiles: [{ frame: 25, kind: 'whitebeard_world_quake', x: 40, y: -57, vx: 4.0, vy: 0, ttl: 88, box: [-24, -55, 48, 110] }] }),
  normal({ id: 'cd', name: '薙刀吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 21, active: 6, recovery: 33, hitbox: [10, -92, 95, 74], damage: 112, hitstun: 33, blockstun: 23, knockback: { x: 13, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空薙刀吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 14, active: 6, recovery: 18, hitbox: [9, -83, 90, 68], damage: 103, hitstun: 30, knockback: { x: 10, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '巨腕摔', direction: 6, button: Btn.C, damage: 132, total: 50, throwData: { range: 54, techWindow: 8, releaseFrame: 25, holdOffset: 42 } }),
  throwMove({ id: 'throw_back', name: '巨腕反摔', direction: 4, button: Btn.C, damage: 132, total: 50, throwData: { range: 54, techWindow: 8, releaseFrame: 25, holdOffset: 42 } }),
  normal({ id: 'f_c', name: '薙刀断头劈', stance: 'stand', button: Btn.C, direction: 6, startup: 22, active: 5, recovery: 30, hitbox: [11, -120, 77, 106], damage: 101, guard: 'high', stepX: 0.5 }),
  normal({ id: 'st_a', name: '柄端轻打', stance: 'stand', button: Btn.A, startup: 7, active: 3, recovery: 13, hitbox: [10, -67, 49, 25], damage: 42, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '重靴前踢', stance: 'stand', button: Btn.B, startup: 8, active: 4, recovery: 15, hitbox: [12, -40, 43, 29], damage: 45, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '薙刀横斩', stance: 'stand', button: Btn.C, startup: 14, active: 5, recovery: 29, hitbox: [11, -78, 100, 47], damage: 96, knockback: { x: 8 } }),
  normal({ id: 'st_d', name: '长柄扫击', stance: 'stand', button: Btn.D, startup: 16, active: 5, recovery: 31, hitbox: [10, -58, 92, 46], damage: 93, knockback: { x: 9 } }),
  normal({ id: 'cr_a', name: '蹲柄端', stance: 'crouch', button: Btn.A, startup: 7, active: 3, recovery: 12, hitbox: [10, -43, 46, 25], damage: 38, chain: ['cr_c', 'cr_d', 'st_c'] }),
  normal({ id: 'cr_b', name: '蹲靴踢', stance: 'crouch', button: Btn.B, startup: 8, active: 3, recovery: 14, hitbox: [10, -21, 47, 21], damage: 42, guard: 'low' }),
  normal({ id: 'cr_c', name: '薙刀上挑', stance: 'crouch', button: Btn.C, startup: 12, active: 6, recovery: 29, hitbox: [6, -128, 60, 105], damage: 96, knockback: { x: 4, y: -8 } }),
  normal({ id: 'cr_d', name: '薙刀扫地', stance: 'crouch', button: Btn.D, startup: 15, active: 5, recovery: 33, hitbox: [9, -24, 93, 24], damage: 88, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空柄端', stance: 'air', button: Btn.A, startup: 7, active: 6, recovery: 10, hitbox: [10, -65, 45, 29], damage: 40 }),
  normal({ id: 'j_b', name: '空重靴', stance: 'air', button: Btn.B, startup: 8, active: 6, recovery: 11, hitbox: [11, -37, 45, 33], damage: 44 }),
  normal({ id: 'j_c', name: '空薙刀斩', stance: 'air', button: Btn.C, startup: 12, active: 6, recovery: 16, hitbox: [10, -84, 92, 66], damage: 90 }),
  normal({ id: 'j_d', name: '空长柄扫', stance: 'air', button: Btn.D, startup: 14, active: 6, recovery: 17, hitbox: [10, -62, 87, 53], damage: 87 }),
];
