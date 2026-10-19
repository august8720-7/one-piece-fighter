import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData, type ProjectileSpawn } from '@core/index';

const meteor = (frame: number, x: number, damage: number, giant = false): ProjectileSpawn => ({
  frame, kind: giant ? 'fujitora_giant_meteor' : 'fujitora_meteor', x, y: giant ? -220 : -178,
  vx: 0, vy: giant ? 4.8 : 5.2, gravity: 0.14, ttl: 58,
  box: giant ? [-62, -60, 124, 120] : [-19, -19, 38, 38],
  durability: 1, damage, hitstun: giant ? 38 : 27, blockstun: giant ? 28 : 18,
  knockback: { x: giant ? 11 : 4, y: giant ? -10 : -6 }, guard: 'high', dieOnGround: true,
});

/** 游戏暂名与原型数值；陨石按施放者根点定点生成，不追敌、不修改场地重力。 */
export const fujitoraMoves: readonly MoveData[] = [
  attack({ id: 'sp_gravity_edge', name: '杖刀·断空', stance: 'stand', button: P, motion: '236', segments: [{ startup: 13, active: 5, hitbox: [14, -78, 81, 44] }], recovery: 25, damage: 86, hitstun: 25, blockstun: 17, stepX: 0.6, knockback: { x: 7 } }),
  utility({
    id: 'sp_horizontal_gravity', name: '横向重压', button: P, motion: '214', startup: 19, cast: 14, recovery: 25,
    damage: 87, hitstun: 24, blockstun: 17, knockback: { x: 11 },
    projectiles: [{ frame: 14, kind: 'fujitora_gravity_wave', x: 36, y: -46, vx: 3.4, vy: 0, ttl: 100, box: [-11, -31, 40, 62], durability: 1 }],
  }),
  attack({ id: 'sp_rising_blade', name: '升刀', stance: 'stand', button: P, motion: '623', segments: [{ startup: 10, active: 6, hitbox: [8, -145, 49, 116] }], recovery: 29, damage: 94, hitstun: 25, blockstun: 17, knockback: { x: 3, y: -9 } }),
  utility({ id: 'sp_fixed_meteor', name: '定点陨石', button: P, motion: '22', startup: 27, cast: 20, recovery: 31, damage: 112, projectiles: [meteor(20, 110, 112)] }),
  attack({ id: 'sp_gravity_reflect', name: '重力·返照', stance: 'stand', button: K, motion: '214', reflect: true, segments: [{ startup: 9, active: 15, hitbox: [5, -104, 61, 100] }], recovery: 27, damage: 0, hitstun: 0, blockstun: 0, hitstop: 0, knockback: { x: 0 } }),
  attack({ id: 'sp_heavy_sweep', name: '低扫杖刀', stance: 'stand', button: K, motion: '22', segments: [{ startup: 16, active: 5, hitbox: [13, -27, 79, 26] }], recovery: 27, damage: 81, guard: 'low', knockdown: true, knockback: { x: 6 } }),
  attack({
    id: 'sp_crushing_gravity', name: '重压双震', type: 'super', stance: 'stand', button: P, motion: '214214',
    meterCost: balance.SUPER_COST, invuln: 8,
    segments: [{ startup: 19, active: 5, hitbox: [8, -110, 110, 108] }, { startup: 7, active: 6, hitbox: [10, -120, 138, 118] }],
    recovery: 38, damage: 96, hitstun: 29, blockstun: 21, hitstop: 11, knockback: { x: 3 },
  }),
  utility({ id: 'sp_meteor_line', name: '陨石列阵', type: 'super', button: P, motion: '236236', meterCost: balance.SUPER_COST, invuln: 7, startup: 37, cast: 17, recovery: 39, damage: 78, projectiles: [meteor(17, 58, 78), meteor(25, 112, 78), meteor(33, 166, 78)] }),
  utility({ id: 'ult_heavenfall', name: '天落巨岩', type: 'ultimate', button: K, motion: '236236', meterCost: balance.ULTIMATE_COST, invuln: 11, startup: 34, cast: 25, recovery: 49, damage: 306, hitstop: 17, projectiles: [meteor(25, 126, 306, true)] }),

  normal({ id: 'cd', name: '杖刀吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 19, active: 5, recovery: 29, hitbox: [12, -84, 74, 65], damage: 102, hitstun: 32, blockstun: 22, knockback: { x: 12, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空杖刀吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 13, active: 6, recovery: 18, hitbox: [10, -79, 70, 56], damage: 93, knockback: { x: 9, y: -5 } }),
  throwMove({ id: 'throw_fwd', name: '擒腕前摔', direction: 6, button: Btn.C, damage: 115, total: 47, throwData: { range: 47, techWindow: 8, releaseFrame: 23, holdOffset: 40 } }),
  throwMove({ id: 'throw_back', name: '擒腕后摔', direction: 4, button: Btn.C, damage: 115, total: 47, throwData: { range: 47, techWindow: 8, releaseFrame: 23, holdOffset: 40 } }),
  normal({ id: 'f_c', name: '杖刀顶劈', stance: 'stand', button: Btn.C, direction: 6, startup: 19, active: 4, recovery: 25, hitbox: [15, -99, 65, 83], damage: 87, guard: 'high', stepX: 0.5 }),
  // 1013: real sheathed cane spans grip(+35.59,-75.19) to tip(+75.19,-79.20); keep timing/damage.
  normal({ id: 'st_a', name: '刀鞘点突', stance: 'stand', button: Btn.A, startup: 6, active: 3, recovery: 11, hitbox: [34, -82, 43, 10], damage: 37, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '近身轻踢', stance: 'stand', button: Btn.B, startup: 7, active: 3, recovery: 13, hitbox: [15, -41, 37, 26], damage: 40, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '杖刀平斩', stance: 'stand', button: Btn.C, startup: 12, active: 4, recovery: 22, hitbox: [13, -78, 74, 37], damage: 81, knockback: { x: 6 } }),
  normal({ id: 'st_d', name: '重侧踢', stance: 'stand', button: Btn.D, startup: 14, active: 5, recovery: 24, hitbox: [12, -61, 49, 38], damage: 83, knockback: { x: 7 } }),
  normal({ id: 'cr_a', name: '蹲鞘点突', stance: 'crouch', button: Btn.A, startup: 6, active: 3, recovery: 10, hitbox: [17, -42, 35, 22], damage: 34, chain: ['st_c', 'cr_c', 'cr_d'] }),
  normal({ id: 'cr_b', name: '蹲轻踢', stance: 'crouch', button: Btn.B, startup: 7, active: 3, recovery: 12, hitbox: [14, -20, 36, 18], damage: 37, guard: 'low' }),
  normal({ id: 'cr_c', name: '杖刀挑斩', stance: 'crouch', button: Btn.C, startup: 11, active: 5, recovery: 24, hitbox: [7, -112, 43, 83], damage: 82, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '杖刀扫腿', stance: 'crouch', button: Btn.D, startup: 13, active: 4, recovery: 26, hitbox: [12, -27, 67, 26], damage: 77, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空刀鞘', stance: 'air', button: Btn.A, startup: 6, active: 6, recovery: 10, hitbox: [14, -72, 36, 26], damage: 37 }),
  normal({ id: 'j_b', name: '空轻踢', stance: 'air', button: Btn.B, startup: 7, active: 6, recovery: 11, hitbox: [13, -43, 39, 28], damage: 42 }),
  normal({ id: 'j_c', name: '空杖刀斩', stance: 'air', button: Btn.C, startup: 11, active: 5, recovery: 15, hitbox: [12, -85, 67, 46], damage: 79 }),
  normal({ id: 'j_d', name: '空重踢', stance: 'air', button: Btn.D, startup: 12, active: 6, recovery: 16, hitbox: [12, -57, 47, 37], damage: 82 }),
];
