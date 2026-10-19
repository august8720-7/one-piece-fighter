import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData, type ProjectileSpawn } from '@core/index';

const wave = (frame: number, kind: string, damage: number): ProjectileSpawn => ({
  frame, kind, x: 34, y: -48, vx: 3.7, vy: 0, ttl: 109, box: [-13, -33, 45, 66], durability: 1, damage,
});

/** 游戏暂名与原型数值；金身/大佛只在对应动作原画内演出，无 install 或常驻形态。 */
export const sengokuMoves: readonly MoveData[] = [
  utility({ id: 'sp_palm_wave', name: '掌风·冲击', button: P, motion: '236', startup: 18, cast: 13, recovery: 25, damage: 83, hitstun: 24, blockstun: 17, knockback: { x: 7 }, projectiles: [wave(13, 'sengoku_palm_wave', 83)] }),
  attack({ id: 'sp_palm_press', name: '重掌·压进', stance: 'stand', button: P, motion: '214', segments: [{ startup: 13, active: 5, hitbox: [17, -88, 53, 60] }], recovery: 28, damage: 104, hitstun: 27, blockstun: 19, stepX: 0.7, activeStepX: 1.2, knockback: { x: 9 } }),
  attack({ id: 'sp_ascending_palm', name: '托天掌', stance: 'stand', button: P, motion: '623', invuln: 2, segments: [{ startup: 10, active: 6, hitbox: [9, -148, 48, 116] }], recovery: 30, damage: 98, hitstun: 26, knockback: { x: 4, y: -9 } }),
  attack({ id: 'sp_tremor_stomp', name: '踏地·震荡', stance: 'stand', button: P, motion: '22', segments: [{ startup: 19, active: 6, hitbox: [9, -34, 96, 33] }], recovery: 32, damage: 92, guard: 'low', hitstun: 26, blockstun: 18, knockback: { x: 8 }, knockdown: true }),
  attack({ id: 'sp_repelling_palm', name: '斥力·返掌', stance: 'stand', button: K, motion: '214', reflect: true, segments: [{ startup: 10, active: 15, hitbox: [5, -107, 67, 102] }], recovery: 28, damage: 0, hitstun: 0, blockstun: 0, hitstop: 0, knockback: { x: 0 } }),
  attack({ id: 'sp_shoulder_charge', name: '铁肩·冲阵', stance: 'stand', button: K, motion: '22', armor: true, armorFrames: 5, segments: [{ startup: 14, active: 6, hitbox: [10, -92, 57, 75] }], recovery: 29, damage: 101, hitstun: 27, blockstun: 19, stepX: 1.1, activeStepX: 2.3, knockback: { x: 9 } }),
  utility({ id: 'sp_twin_shock', name: '双重冲击', type: 'super', button: P, motion: '214214', meterCost: balance.SUPER_COST, invuln: 8, startup: 31, cast: 13, recovery: 37, damage: 101, hitstun: 27, blockstun: 19, hitstop: 10, knockback: { x: 3 }, projectiles: [wave(13, 'sengoku_twin_shock', 101), wave(25, 'sengoku_twin_shock', 101)] }),
  attack({ id: 'sp_golden_palm', name: '金身·巨掌', type: 'super', stance: 'stand', button: P, motion: '236236', meterCost: balance.SUPER_COST, armor: true, armorFrames: 7, segments: [{ startup: 18, active: 7, hitbox: [12, -128, 114, 115] }], recovery: 40, damage: 202, hitstun: 33, blockstun: 24, hitstop: 15, knockback: { x: 11, y: -7 }, knockdown: true }),
  attack({
    id: 'ult_buddha_shock', name: '大佛·震世', type: 'ultimate', stance: 'stand', button: K, motion: '236236', meterCost: balance.ULTIMATE_COST, invuln: 12,
    segments: [{ startup: 23, active: 6, hitbox: [5, -148, 139, 144] }, { startup: 8, active: 7, hitbox: [7, -158, 181, 154] }],
    recovery: 49, damage: 158, hitstun: 32, blockstun: 24, hitstop: 14, knockback: { x: 4 },
  }),

  normal({ id: 'cd', name: '重掌吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 20, active: 5, recovery: 30, hitbox: [14, -96, 67, 72], damage: 106, hitstun: 33, blockstun: 23, knockback: { x: 12, y: -6 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空重掌吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 14, active: 6, recovery: 19, hitbox: [12, -89, 62, 64], damage: 96, knockback: { x: 10, y: -5 } }),
  throwMove({ id: 'throw_fwd', name: '擒臂前摔', direction: 6, button: Btn.C, damage: 122, total: 48, throwData: { range: 48, techWindow: 8, releaseFrame: 24, holdOffset: 42 } }),
  throwMove({ id: 'throw_back', name: '擒臂后摔', direction: 4, button: Btn.C, damage: 122, total: 48, throwData: { range: 48, techWindow: 8, releaseFrame: 24, holdOffset: 42 } }),
  normal({ id: 'f_c', name: '重掌下劈', stance: 'stand', button: Btn.C, direction: 6, startup: 20, active: 4, recovery: 26, hitbox: [18, -111, 47, 94], damage: 90, guard: 'high', stepX: 0.6 }),
  normal({ id: 'st_a', name: '前掌轻击', stance: 'stand', button: Btn.A, startup: 6, active: 3, recovery: 11, hitbox: [20, -77, 33, 27], damage: 39, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '前膝轻击', stance: 'stand', button: Btn.B, startup: 8, active: 4, recovery: 14, hitbox: [17, -50, 35, 34], damage: 43, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '后掌重击', stance: 'stand', button: Btn.C, startup: 12, active: 4, recovery: 23, hitbox: [18, -88, 49, 41], damage: 85, knockback: { x: 7 } }),
  normal({ id: 'st_d', name: '重侧踢', stance: 'stand', button: Btn.D, startup: 15, active: 5, recovery: 26, hitbox: [15, -68, 51, 42], damage: 89, knockback: { x: 8 } }),
  normal({ id: 'cr_a', name: '蹲轻掌', stance: 'crouch', button: Btn.A, startup: 6, active: 3, recovery: 10, hitbox: [20, -47, 31, 25], damage: 36, chain: ['st_c', 'cr_c', 'cr_d'] }),
  normal({ id: 'cr_b', name: '蹲轻踢', stance: 'crouch', button: Btn.B, startup: 7, active: 3, recovery: 12, hitbox: [17, -22, 36, 20], damage: 39, guard: 'low' }),
  normal({ id: 'cr_c', name: '蹲挑掌', stance: 'crouch', button: Btn.C, startup: 11, active: 5, recovery: 25, hitbox: [9, -116, 40, 86], damage: 85, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '低位扫踢', stance: 'crouch', button: Btn.D, startup: 14, active: 4, recovery: 27, hitbox: [14, -27, 54, 26], damage: 80, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空轻掌', stance: 'air', button: Btn.A, startup: 6, active: 6, recovery: 10, hitbox: [16, -80, 36, 28], damage: 39 }),
  normal({ id: 'j_b', name: '空膝击', stance: 'air', button: Btn.B, startup: 7, active: 6, recovery: 11, hitbox: [16, -49, 37, 33], damage: 44 }),
  normal({ id: 'j_c', name: '空重掌', stance: 'air', button: Btn.C, startup: 11, active: 5, recovery: 15, hitbox: [16, -89, 48, 43], damage: 83 }),
  normal({ id: 'j_d', name: '空重踢', stance: 'air', button: Btn.D, startup: 13, active: 6, recovery: 17, hitbox: [14, -61, 49, 40], damage: 87 }),
];
