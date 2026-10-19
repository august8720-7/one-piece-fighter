import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData, type ProjectileSpawn } from '@core/index';

const root = (frame: number, x: number, damage: number): ProjectileSpawn => ({
  frame, kind: 'ryokugyu_root_pillar', x, y: 0, vx: 0, vy: 0, ttl: 10,
  box: [-17, -101, 34, 101], durability: 1, damage, hitstun: 25, blockstun: 18,
  knockback: { x: 4, y: -6 },
});

/** 游戏暂名与原型数值；藤蔓是定时攻击/道具，不是独立召唤物，擒拿不吸血。 */
export const ryokugyuMoves: readonly MoveData[] = [
  attack({ id: 'sp_vine_thrust', name: '藤蔓·直刺', stance: 'stand', button: P, motion: '236', segments: [{ startup: 13, active: 5, hitbox: [16, -75, 92, 29] }], recovery: 26, damage: 85, hitstun: 25, blockstun: 17, knockback: { x: 6 } }),
  attack({ id: 'sp_root_sweep', name: '根须·横扫', stance: 'stand', button: P, motion: '214', segments: [{ startup: 16, active: 5, hitbox: [12, -22, 99, 21] }], recovery: 29, damage: 77, guard: 'low', knockdown: true, knockback: { x: 7 } }),
  attack({ id: 'sp_thorn_upper', name: '荆棘·上扬', stance: 'stand', button: P, motion: '623', segments: [{ startup: 11, active: 6, hitbox: [8, -148, 54, 113] }], recovery: 28, damage: 89, hitstun: 26, knockback: { x: 3, y: -9 } }),
  utility({ id: 'sp_root_pillar', name: '根柱·突生', button: P, motion: '22', startup: 25, cast: 20, recovery: 30, damage: 103, projectiles: [root(20, 88, 103)] }),
  attack({
    id: 'sp_branch_bind', name: '枝蔓·擒拿', stance: 'stand', button: K, motion: '214',
    segments: [{ startup: 11, active: 3, hitbox: [14, -73, 30, 71] }],
    recovery: 30, damage: 118, guard: 'unblockable', knockback: { x: 7, y: -8 },
    throwData: { techWindow: 0, releaseFrame: 21, duration: 44, holdOffset: 40 },
  }),
  attack({ id: 'sp_bark_palm', name: '树皮·推掌', stance: 'stand', button: K, motion: '22', segments: [{ startup: 18, active: 5, hitbox: [14, -80, 60, 54] }], recovery: 31, damage: 99, armor: true, armorFrames: 7, knockback: { x: 10 }, hitstun: 27, blockstun: 19 }),
  attack({
    id: 'sp_thicket_rush', name: '荆林·突进', type: 'super', stance: 'stand', button: P, motion: '214214', meterCost: balance.SUPER_COST, invuln: 7,
    segments: [{ startup: 13, active: 4, hitbox: [13, -85, 66, 70] }, { startup: 5, active: 4, hitbox: [14, -93, 78, 78] }, { startup: 6, active: 5, hitbox: [15, -101, 90, 86] }],
    recovery: 36, damage: 69, hitstun: 25, blockstun: 18, hitstop: 8, stepX: 0.9, activeStepX: 2.3, knockback: { x: 2 },
  }),
  utility({ id: 'sp_forest_line', name: '森罗·根列', type: 'super', button: P, motion: '236236', meterCost: balance.SUPER_COST, invuln: 7, startup: 38, cast: 17, recovery: 36, damage: 77, projectiles: [root(17, 48, 77), root(25, 98, 77), root(33, 148, 77)] }),
  attack({
    id: 'ult_forest_crush', name: '巨木·镇压', type: 'ultimate', stance: 'stand', button: K, motion: '236236', meterCost: balance.ULTIMATE_COST, invuln: 11,
    segments: [{ startup: 24, active: 6, hitbox: [8, -125, 119, 123] }, { startup: 8, active: 7, hitbox: [10, -141, 168, 139] }],
    recovery: 46, damage: 158, hitstun: 31, blockstun: 23, hitstop: 13, knockback: { x: 4 },
  }),

  normal({ id: 'cd', name: '树臂吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 19, active: 5, recovery: 28, hitbox: [13, -91, 72, 69], damage: 100, hitstun: 31, blockstun: 22, knockback: { x: 12, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空树臂吹飞', stance: 'air', button: Btn.C, plus: Btn.D, startup: 13, active: 6, recovery: 17, hitbox: [10, -87, 65, 62], damage: 92, knockback: { x: 9, y: -5 } }),
  throwMove({ id: 'throw_fwd', name: '擒肩摔', direction: 6, button: Btn.C, damage: 114, total: 46, throwData: { range: 47, techWindow: 8, releaseFrame: 23, holdOffset: 40 } }),
  throwMove({ id: 'throw_back', name: '擒肩后摔', direction: 4, button: Btn.C, damage: 114, total: 46, throwData: { range: 47, techWindow: 8, releaseFrame: 23, holdOffset: 40 } }),
  normal({ id: 'f_c', name: '枝臂下劈', stance: 'stand', button: Btn.C, direction: 6, startup: 19, active: 4, recovery: 25, hitbox: [15, -108, 58, 89], damage: 85, guard: 'high', stepX: 0.5 }),
  normal({ id: 'st_a', name: '枝拳轻击', stance: 'stand', button: Btn.A, startup: 6, active: 3, recovery: 11, hitbox: [29, -93, 27, 17], damage: 37, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '抬膝轻踢', stance: 'stand', button: Btn.B, startup: 7, active: 4, recovery: 13, hitbox: [16, -48, 40, 31], damage: 41, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '树臂重拳', stance: 'stand', button: Btn.C, startup: 12, active: 4, recovery: 23, hitbox: [16, -85, 62, 37], damage: 81, knockback: { x: 6 } }),
  normal({ id: 'st_d', name: '藤腿重踢', stance: 'stand', button: Btn.D, startup: 14, active: 5, recovery: 25, hitbox: [14, -72, 66, 38], damage: 84, knockback: { x: 7 } }),
  normal({ id: 'cr_a', name: '蹲枝拳', stance: 'crouch', button: Btn.A, startup: 6, active: 3, recovery: 10, hitbox: [19, -47, 30, 24], damage: 35, chain: ['st_c', 'cr_c', 'cr_d'] }),
  normal({ id: 'cr_b', name: '低踢', stance: 'crouch', button: Btn.B, startup: 7, active: 3, recovery: 12, hitbox: [16, -21, 39, 19], damage: 38, guard: 'low' }),
  normal({ id: 'cr_c', name: '枝拳上挑', stance: 'crouch', button: Btn.C, startup: 11, active: 5, recovery: 24, hitbox: [8, -114, 43, 83], damage: 82, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '藤腿扫击', stance: 'crouch', button: Btn.D, startup: 13, active: 5, recovery: 27, hitbox: [13, -25, 67, 24], damage: 77, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空枝拳', stance: 'air', button: Btn.A, startup: 6, active: 6, recovery: 10, hitbox: [15, -79, 35, 27], damage: 37 }),
  normal({ id: 'j_b', name: '空轻踢', stance: 'air', button: Btn.B, startup: 7, active: 6, recovery: 11, hitbox: [14, -46, 43, 31], damage: 42 }),
  normal({ id: 'j_c', name: '空树拳', stance: 'air', button: Btn.C, startup: 11, active: 5, recovery: 15, hitbox: [14, -87, 57, 43], damage: 79 }),
  normal({ id: 'j_d', name: '空藤腿', stance: 'air', button: Btn.D, startup: 12, active: 6, recovery: 16, hitbox: [13, -58, 60, 39], damage: 83 }),
];
