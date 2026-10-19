import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData } from '@core/index';

/** 游戏暂名与原型数值；近身拳斗为主，仅耗气投弹是飞行道具。 */
export const garpMoves: readonly MoveData[] = [
  attack({ id: 'sp_iron_rush', name: '铁拳·突进', stance: 'stand', button: P, motion: '236', segments: [{ startup: 9, active: 5, hitbox: [16, -77, 49, 39] }], recovery: 25, damage: 92, hitstun: 25, blockstun: 17, stepX: 1.2, activeStepX: 3.4, knockback: { x: 7 } }),
  attack({
    id: 'sp_iron_barrage', name: '铁拳·连打', stance: 'stand', button: P, motion: '214',
    segments: [{ startup: 7, active: 2, hitbox: [17, -80, 38, 31] }, { startup: 4, active: 2, hitbox: [17, -73, 45, 35] }, { startup: 4, active: 3, hitbox: [17, -84, 51, 38] }],
    recovery: 24, damage: 29, hitstun: 21, blockstun: 14, hitstop: 7, knockback: { x: 1.5 },
  }),
  attack({ id: 'sp_rising_fist', name: '铁拳·上勾', stance: 'stand', button: P, motion: '623', invuln: 3, segments: [{ startup: 8, active: 6, hitbox: [9, -140, 44, 110] }], recovery: 29, damage: 100, hitstun: 26, knockback: { x: 4, y: -10 } }),
  attack({ id: 'sp_ground_crush', name: '拳骨·震地', stance: 'stand', button: P, motion: '22', segments: [{ startup: 18, active: 6, hitbox: [9, -38, 81, 37] }], recovery: 31, damage: 95, guard: 'low', hitstun: 26, blockstun: 18, knockdown: true, knockback: { x: 8 } }),
  attack({
    id: 'sp_iron_grapple', name: '擒拿·摔投', stance: 'stand', button: K, motion: '214',
    segments: [{ startup: 8, active: 3, hitbox: [14, -81, 31, 79] }],
    recovery: 31, damage: 134, guard: 'unblockable', knockback: { x: 7, y: -9 },
    throwData: { techWindow: 0, releaseFrame: 20, duration: 44, holdOffset: 40 },
  }),
  attack({ id: 'sp_braced_fist', name: '铁骨·重拳', stance: 'stand', button: K, motion: '22', armor: true, armorFrames: 6, segments: [{ startup: 20, active: 5, hitbox: [16, -83, 55, 43] }], recovery: 33, damage: 117, hitstun: 28, blockstun: 20, hitstop: 13, knockback: { x: 9 }, armorBreak: true }),
  attack({ id: 'sp_galaxy_blow', name: '拳骨·震空', type: 'super', stance: 'stand', button: P, motion: '214214', meterCost: balance.SUPER_COST, invuln: 8, segments: [{ startup: 16, active: 7, hitbox: [13, -114, 111, 102] }], recovery: 39, damage: 207, hitstun: 33, blockstun: 24, hitstop: 15, stepX: 1.0, activeStepX: 1.8, knockback: { x: 11, y: -7 }, knockdown: true }),
  utility({
    id: 'sp_cannonball', name: '拳骨·投弹', type: 'super', button: P, motion: '236236', meterCost: balance.SUPER_COST, invuln: 6, startup: 24, cast: 17, recovery: 36,
    damage: 184, hitstun: 30, blockstun: 22, hitstop: 13, knockback: { x: 8, y: -7 },
    projectiles: [{ frame: 17, kind: 'garp_cannonball', x: 30, y: -68, vx: 4.5, vy: -3.3, gravity: 0.17, ttl: 100, box: [-15, -15, 30, 30], durability: 1, dieOnGround: true }],
  }),
  attack({ id: 'ult_galaxy_impact', name: '拳骨·崩山', type: 'ultimate', stance: 'stand', button: K, motion: '236236', meterCost: balance.ULTIMATE_COST, invuln: 11, segments: [{ startup: 25, active: 9, hitbox: [9, -146, 165, 141] }], recovery: 48, damage: 314, hitstun: 38, blockstun: 28, hitstop: 18, stepX: 0.8, knockback: { x: 12, y: -11 }, knockdown: true, armorBreak: true }),

  normal({ id: 'cd', name: '重拳吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 18, active: 5, recovery: 29, hitbox: [15, -89, 58, 65], damage: 108, hitstun: 33, blockstun: 23, knockback: { x: 12, y: -6 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空重拳吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 12, active: 6, recovery: 18, hitbox: [12, -85, 56, 60], damage: 98, knockback: { x: 10, y: -5 } }),
  throwMove({ id: 'throw_fwd', name: '铁腕前摔', direction: 6, button: Btn.C, damage: 124, total: 46, throwData: { range: 47, techWindow: 8, releaseFrame: 22, holdOffset: 41 } }),
  throwMove({ id: 'throw_back', name: '铁腕后摔', direction: 4, button: Btn.C, damage: 124, total: 46, throwData: { range: 47, techWindow: 8, releaseFrame: 22, holdOffset: 41 } }),
  normal({ id: 'f_c', name: '拳骨下砸', stance: 'stand', button: Btn.C, direction: 6, startup: 18, active: 4, recovery: 25, hitbox: [17, -104, 43, 88], damage: 91, guard: 'high', stepX: 0.9 }),
  normal({ id: 'st_a', name: '前手直拳', stance: 'stand', button: Btn.A, startup: 5, active: 3, recovery: 10, hitbox: [19, -77, 30, 26], damage: 40, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '近身膝击', stance: 'stand', button: Btn.B, startup: 7, active: 4, recovery: 13, hitbox: [17, -51, 33, 34], damage: 44, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '后手重拳', stance: 'stand', button: Btn.C, startup: 11, active: 4, recovery: 21, hitbox: [18, -84, 44, 36], damage: 87, knockback: { x: 6 } }),
  normal({ id: 'st_d', name: '重侧踢', stance: 'stand', button: Btn.D, startup: 13, active: 5, recovery: 24, hitbox: [16, -66, 47, 39], damage: 89, knockback: { x: 7 } }),
  normal({ id: 'cr_a', name: '蹲直拳', stance: 'crouch', button: Btn.A, startup: 5, active: 3, recovery: 9, hitbox: [19, -46, 29, 25], damage: 37, chain: ['st_c', 'cr_c', 'cr_d'] }),
  normal({ id: 'cr_b', name: '低踢', stance: 'crouch', button: Btn.B, startup: 6, active: 3, recovery: 11, hitbox: [16, -22, 34, 20], damage: 40, guard: 'low' }),
  normal({ id: 'cr_c', name: '蹲上勾拳', stance: 'crouch', button: Btn.C, startup: 10, active: 5, recovery: 23, hitbox: [10, -113, 36, 84], damage: 88, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '低身扫踢', stance: 'crouch', button: Btn.D, startup: 12, active: 4, recovery: 26, hitbox: [14, -27, 50, 26], damage: 82, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空直拳', stance: 'air', button: Btn.A, startup: 5, active: 6, recovery: 9, hitbox: [16, -78, 32, 27], damage: 40 }),
  normal({ id: 'j_b', name: '空膝击', stance: 'air', button: Btn.B, startup: 6, active: 6, recovery: 10, hitbox: [16, -48, 33, 32], damage: 45 }),
  normal({ id: 'j_c', name: '空重拳', stance: 'air', button: Btn.C, startup: 10, active: 5, recovery: 14, hitbox: [16, -85, 43, 39], damage: 85 }),
  normal({ id: 'j_d', name: '空重踢', stance: 'air', button: Btn.D, startup: 11, active: 6, recovery: 15, hitbox: [15, -59, 46, 39], damage: 88 }),
];
