import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData, type ProjectileSpawn } from '@core/index';

const iceSpike = (frame: number, x: number, damage: number): ProjectileSpawn => ({
  frame, kind: 'aokiji_ice_spike', x, y: 0, vx: 0, vy: 0, ttl: 9,
  box: [-16, -82, 32, 82], durability: 1, damage, guard: 'mid',
  hitstun: 25, blockstun: 17, knockback: { x: 4, y: -5 },
});

/** 游戏暂名与原型数值；冰只产生已有硬直/击退，不新增冻结规则。 */
export const aokijiMoves: readonly MoveData[] = [
  utility({
    id: 'sp_ice_lance', name: '冰矛·直射', button: P, motion: '236', startup: 15, cast: 11, recovery: 22,
    damage: 72, hitstun: 23, blockstun: 15, knockback: { x: 5 },
    // Spawn center follows the inspected release palm (+49.65,-70.21).
    projectiles: [{ frame: 11, kind: 'aokiji_ice_lance', x: 50, y: -70, vx: 4.1, vy: 0, ttl: 106, box: [-18, -8, 36, 16], durability: 1 }],
  }),
  attack({
    id: 'sp_ice_blade', name: '冰刀·横断', stance: 'stand', button: P, motion: '214',
    segments: [{ startup: 11, active: 5, hitbox: [16, -69, 44, 16] }],
    recovery: 24, damage: 90, hitstun: 24, blockstun: 16, stepX: 0.5, knockback: { x: 7 },
  }),
  attack({
    id: 'sp_ice_uplift', name: '冰棘·上挑', stance: 'stand', button: P, motion: '623',
    // Actual active fist(+35.11,-97.82), ice tip(+42.13,-104.60), forearm(+30.02,-88.38).
    segments: [{ startup: 9, active: 6, hitbox: [27, -105, 22, 27] }],
    recovery: 27, damage: 87, hitstun: 25, blockstun: 17, knockback: { x: 3, y: -9 },
  }),
  utility({
    id: 'sp_ice_spike', name: '冰脊·突起', button: P, motion: '22', startup: 22, cast: 17, recovery: 27,
    damage: 99, projectiles: [iceSpike(17, 90, 99)],
  }),
  attack({
    id: 'sp_ice_mirror', name: '冰镜·折返', stance: 'stand', button: K, motion: '214', reflect: true,
    // Mirror stands on the real forward palm(+43.58,-73.61); its own inspected FX supplies the shield.
    segments: [{ startup: 7, active: 14, hitbox: [30, -100, 32, 90] }],
    recovery: 25, damage: 0, hitstun: 0, blockstun: 0, hitstop: 0, knockback: { x: 0 },
  }),
  utility({
    id: 'sp_ice_body', name: '冰躯·闪避', button: K, motion: '22', meterCost: balance.DODGE_COST,
    startup: 14, recovery: 18, invuln: 14, dodge: true,
  }),
  utility({
    id: 'sp_ice_pheasant', name: '冰雉·掠袭', type: 'super', button: P, motion: '214214',
    meterCost: balance.SUPER_COST, invuln: 7, startup: 20, cast: 15, recovery: 34,
    damage: 188, hitstun: 31, blockstun: 23, hitstop: 14, knockback: { x: 9, y: -5 },
    // Authored release palm(+56.08,-71.81) anchors the detached, genuinely flapping ice bird.
    projectiles: [{ frame: 15, kind: 'aokiji_ice_pheasant', x: 56, y: -72, vx: 4.7, vy: 0, ttl: 94, box: [-24, -30, 64, 60], durability: 1 }],
  }),
  utility({
    id: 'sp_glacier_line', name: '冰原·连脊', type: 'super', button: P, motion: '236236',
    meterCost: balance.SUPER_COST, invuln: 7, startup: 34, cast: 16, recovery: 32,
    damage: 75, projectiles: [iceSpike(16, 50, 75), iceSpike(23, 100, 75), iceSpike(30, 150, 75)],
  }),
  attack({
    id: 'ult_ice_age', name: '极寒·封界', type: 'ultimate', stance: 'stand', button: K, motion: '236236',
    meterCost: balance.ULTIMATE_COST, invuln: 11,
    segments: [{ startup: 23, active: 6, hitbox: [4, -104, 120, 102] }, { startup: 8, active: 7, hitbox: [8, -124, 170, 122] }],
    recovery: 45, damage: 155, hitstun: 30, blockstun: 22, hitstop: 13, knockback: { x: 4 },
  }),

  normal({ id: 'cd', name: '冰肩吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 18, active: 5, recovery: 27, hitbox: [12, -85, 27, 35], damage: 96, hitstun: 30, blockstun: 21, knockback: { x: 11, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空中冰肩', stance: 'air', button: Btn.C, plus: Btn.D, startup: 12, active: 6, recovery: 16, hitbox: [0, -91, 19, 30], damage: 89, knockback: { x: 9, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '冰腕摔', direction: 6, button: Btn.C, damage: 110, total: 45, throwData: { range: 45, techWindow: 8, releaseFrame: 22, holdOffset: 30 } }),
  throwMove({ id: 'throw_back', name: '冰腕后摔', direction: 4, button: Btn.C, damage: 110, total: 45, throwData: { range: 45, techWindow: 8, releaseFrame: 22, holdOffset: 30 } }),
  normal({ id: 'f_c', name: '冰刀下劈', stance: 'stand', button: Btn.C, direction: 6, startup: 17, active: 4, recovery: 23, hitbox: [14, -50, 50, 34], damage: 83, guard: 'high', stepX: 0.7 }),
  // 0929 real fist at world(50.6,-79.1); keep the active box on the forearm/fist, not below it.
  normal({ id: 'st_a', name: '冰拳轻击', stance: 'stand', button: Btn.A, startup: 5, active: 3, recovery: 10, hitbox: [30, -84, 24, 13], damage: 35, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  // Inspected standing sheet: B ankle/toe(45.66,-65.92)/(53.38,-79.42), C blade(27.97,-68.81)..(77.17,-68.81), D toe(79.74,-82.64).
  normal({ id: 'st_b', name: '前踢', stance: 'stand', button: Btn.B, startup: 7, active: 4, recovery: 12, hitbox: [27, -84, 31, 30], damage: 39, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '冰刀斩', stance: 'stand', button: Btn.C, startup: 11, active: 4, recovery: 19, hitbox: [24, -75, 57, 17], damage: 76, knockback: { x: 6 } }),
  normal({ id: 'st_d', name: '横踢', stance: 'stand', button: Btn.D, startup: 13, active: 5, recovery: 22, hitbox: [40, -89, 46, 31], damage: 80, knockback: { x: 7 } }),
  // Inspected crouch/air fists, soles and blade tips, with original timing/damage intact.
  normal({ id: 'cr_a', name: '蹲冰拳', stance: 'crouch', button: Btn.A, startup: 5, active: 3, recovery: 9, hitbox: [29, -56, 27, 23], damage: 33, chain: ['st_c', 'cr_c', 'cr_d'] }),
  normal({ id: 'cr_b', name: '蹲轻踢', stance: 'crouch', button: Btn.B, startup: 6, active: 3, recovery: 11, hitbox: [37, -19, 36, 19], damage: 35, guard: 'low' }),
  normal({ id: 'cr_c', name: '冰刀上斩', stance: 'crouch', button: Btn.C, startup: 10, active: 5, recovery: 22, hitbox: [28, -85, 46, 33], damage: 77, knockback: { x: 3, y: -6 } }),
  normal({ id: 'cr_d', name: '扫踢', stance: 'crouch', button: Btn.D, startup: 12, active: 4, recovery: 24, hitbox: [38, -17, 40, 17], damage: 72, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空轻拳', stance: 'air', button: Btn.A, startup: 5, active: 6, recovery: 9, hitbox: [33, -90, 30, 22], damage: 35 }),
  normal({ id: 'j_b', name: '空前踢', stance: 'air', button: Btn.B, startup: 6, active: 6, recovery: 10, hitbox: [30, -80, 42, 34], damage: 41 }),
  normal({ id: 'j_c', name: '空冰刀', stance: 'air', button: Btn.C, startup: 10, active: 5, recovery: 13, hitbox: [30, -86, 56, 17], damage: 74 }),
  normal({ id: 'j_d', name: '空横踢', stance: 'air', button: Btn.D, startup: 11, active: 6, recovery: 14, hitbox: [50, -84, 43, 29], damage: 79 }),
];
