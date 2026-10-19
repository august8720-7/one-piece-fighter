import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData } from '@core/index';

const { SUPER_COST, ULTIMATE_COST } = balance;
export const ZORO_PROJECTILE_KINDS = ['zoro_pound_slash', 'zoro_great_pound_slash'] as const;

/** 0929 候选：近中距三刀连斩，长收招换多段；名称与帧数据均按游戏改编处理。 */
export const zoroMoves: readonly MoveData[] = [
  utility({ id: 'sp_pound_slash', name: '三十六烦恼凤', button: P, motion: '236', startup: 19, cast: 14, recovery: 27, damage: 84, hitstun: 24, blockstun: 16, knockback: { x: 7 }, projectiles: [{ frame: 14, kind: 'zoro_pound_slash', x: 37, y: -47, vx: 4.3, vy: 0, ttl: 68, box: [-14, -26, 28, 52] }] }),
  attack({ id: 'sp_oni_giri', name: '鬼斩', stance: 'stand', button: P, motion: '214', segments: [{ startup: 10, active: 3, hitbox: [10, -62, 60, 39] }, { startup: 3, active: 3, hitbox: [9, -51, 63, 37] }, { startup: 4, active: 4, hitbox: [9, -71, 72, 49] }], recovery: 26, damage: 34, hitstun: 31, blockstun: 13, hitstop: 7, knockback: { x: 1.1 }, stepX: 1.5, activeStepX: 1.5 }),
  attack({ id: 'sp_dragon_twister', name: '龙卷风', stance: 'stand', button: P, motion: '623', segments: [{ startup: 10, active: 7, hitbox: [-4, -128, 78, 105] }], recovery: 32, damage: 112, hitstun: 28, blockstun: 18, knockback: { x: 5, y: -9 }, knockdown: true }),
  attack({ id: 'sp_tiger_hunt', name: '虎狩', stance: 'stand', button: K, motion: '236', segments: [{ startup: 16, active: 5, hitbox: [8, -91, 73, 68] }], recovery: 30, damage: 105, guard: 'high', hitstun: 27, blockstun: 18, stepX: 1.5, knockback: { x: 7 } }),
  attack({ id: 'sp_rhino_cycle', name: '犀回', stance: 'stand', button: K, motion: '214', segments: [{ startup: 13, active: 3, hitbox: [7, -21, 60, 21] }, { startup: 4, active: 4, hitbox: [7, -23, 70, 23] }], recovery: 30, damage: 44, guard: 'low', hitstun: 29, blockstun: 15, knockback: { x: 1.7 }, hurtboxes: [[-19, -64, 38, 64]], activeStepX: 0.9 }),
  attack({ id: 'sp_lion_song', name: '狮子歌歌', stance: 'stand', button: K, motion: '22', armorBreak: true, segments: [{ startup: 22, active: 3, hitbox: [10, -63, 98, 37] }], recovery: 33, damage: 124, hitstun: 29, blockstun: 18, knockback: { x: 9 }, activeStepX: 4.0 }),
  attack({ id: 'sp_three_thousand_worlds', name: '三千世界', type: 'super', stance: 'stand', button: P, motion: '236236', meterCost: SUPER_COST, invuln: 7, segments: [{ startup: 13, active: 3, hitbox: [9, -76, 67, 49] }, { startup: 4, active: 3, hitbox: [9, -66, 75, 51] }, { startup: 4, active: 3, hitbox: [9, -77, 82, 57] }, { startup: 5, active: 5, hitbox: [9, -87, 88, 71] }], recovery: 33, damage: 51, hitstun: 39, blockstun: 15, hitstop: 8, knockback: { x: 1.4 }, stepX: 1.8, activeStepX: 1.8 }),
  utility({ id: 'sp_great_pound_slash', name: '千八十烦恼凤', type: 'super', button: P, motion: '214214', meterCost: SUPER_COST, invuln: 6, startup: 22, cast: 16, recovery: 38, damage: 198, hitstun: 34, blockstun: 23, hitstop: 14, knockback: { x: 11, y: -4 }, projectiles: [{ frame: 16, kind: 'zoro_great_pound_slash', x: 35, y: -51, vx: 4.7, vy: 0, ttl: 72, box: [-20, -44, 40, 88], durability: 1 }] }),
  attack({ id: 'ult_asura_finale', name: '阿修罗·终斩', type: 'ultimate', stance: 'stand', button: K, motion: '236236', meterCost: ULTIMATE_COST, invuln: 10, armorBreak: true, segments: [{ startup: 18, active: 3, hitbox: [8, -82, 73, 61] }, { startup: 4, active: 3, hitbox: [8, -67, 79, 48] }, { startup: 4, active: 3, hitbox: [8, -86, 85, 62] }, { startup: 4, active: 3, hitbox: [8, -70, 90, 54] }, { startup: 5, active: 6, hitbox: [8, -94, 101, 81] }], recovery: 43, damage: 74, hitstun: 49, blockstun: 19, hitstop: 10, knockback: { x: 1.7 }, stepX: 1.5, activeStepX: 2.1 }),
  normal({ id: 'cd', name: '三刀吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 18, active: 5, recovery: 29, hitbox: [9, -75, 78, 57], damage: 102, hitstun: 32, blockstun: 22, knockback: { x: 12, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空三刀吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 12, active: 6, recovery: 16, hitbox: [8, -65, 75, 55], damage: 93, hitstun: 28, knockback: { x: 9, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '刀柄绊摔', direction: 6, button: Btn.C, damage: 116, total: 44, throwData: { range: 48, techWindow: 8, releaseFrame: 22, holdOffset: 36 } }),
  throwMove({ id: 'throw_back', name: '刀柄反摔', direction: 4, button: Btn.C, damage: 116, total: 44, throwData: { range: 48, techWindow: 8, releaseFrame: 22, holdOffset: 36 } }),
  normal({ id: 'f_c', name: '三刀下劈', stance: 'stand', button: Btn.C, direction: 6, startup: 18, active: 5, recovery: 25, hitbox: [10, -94, 62, 78], damage: 88, guard: 'high', stepX: 0.8 }),
  normal({ id: 'st_a', name: '短刀点斩', stance: 'stand', button: Btn.A, startup: 5, active: 3, recovery: 11, hitbox: [28, -75, 51, 16], damage: 36, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '侧刀轻斩', stance: 'stand', button: Btn.B, startup: 7, active: 3, recovery: 13, hitbox: [10, -43, 44, 24], damage: 40, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '双刀横斩', stance: 'stand', button: Btn.C, startup: 11, active: 4, recovery: 24, hitbox: [8, -67, 74, 43], damage: 81, knockback: { x: 5 } }),
  normal({ id: 'st_d', name: '三刀回斩', stance: 'stand', button: Btn.D, startup: 13, active: 5, recovery: 25, hitbox: [7, -64, 77, 51], damage: 86, knockback: { x: 6 } }),
  normal({ id: 'cr_a', name: '蹲短刀', stance: 'crouch', button: Btn.A, startup: 5, active: 3, recovery: 10, hitbox: [8, -35, 34, 20], damage: 33, chain: ['cr_c', 'cr_d', 'st_c'] }),
  normal({ id: 'cr_b', name: '低刀点斩', stance: 'crouch', button: Btn.B, startup: 6, active: 3, recovery: 13, hitbox: [8, -19, 46, 19], damage: 36, guard: 'low' }),
  normal({ id: 'cr_c', name: '蹲上斩', stance: 'crouch', button: Btn.C, startup: 10, active: 5, recovery: 24, hitbox: [5, -105, 49, 82], damage: 84, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '低位扫斩', stance: 'crouch', button: Btn.D, startup: 12, active: 4, recovery: 28, hitbox: [7, -20, 71, 20], damage: 77, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空短刀', stance: 'air', button: Btn.A, startup: 5, active: 6, recovery: 9, hitbox: [8, -56, 35, 26], damage: 35 }),
  normal({ id: 'j_b', name: '空侧斩', stance: 'air', button: Btn.B, startup: 7, active: 6, recovery: 10, hitbox: [8, -40, 49, 30], damage: 40 }),
  normal({ id: 'j_c', name: '空双刀斩', stance: 'air', button: Btn.C, startup: 10, active: 5, recovery: 13, hitbox: [8, -66, 69, 47], damage: 78 }),
  normal({ id: 'j_d', name: '空三刀斩', stance: 'air', button: Btn.D, startup: 11, active: 6, recovery: 14, hitbox: [7, -54, 75, 47], damage: 83 }),
];
