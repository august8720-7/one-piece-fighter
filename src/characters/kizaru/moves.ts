import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData, type ProjectileSpawn } from '@core/index';

const beam = (frame: number, kind: string, y: number, damage: number, vy = 0): ProjectileSpawn => ({
  frame, kind, x: 31, y, vx: 6.6, vy, ttl: 75, box: [-18, -7, 36, 14], durability: 1, damage,
});

/** 游戏暂名与原型数值；光速表现不代表瞬移、自动追踪或真实无限速度。 */
export const kizaruMoves: readonly MoveData[] = [
  utility({ id: 'sp_finger_beam', name: '指尖光束', button: P, motion: '236', startup: 14, cast: 10, recovery: 21, damage: 59, hitstun: 19, blockstun: 13, hitstop: 8, knockback: { x: 5 }, projectiles: [beam(10, 'kizaru_finger_beam', -52, 59)] }),
  attack({ id: 'sp_flash_kick', name: '闪光踢', stance: 'stand', button: P, motion: '214', segments: [{ startup: 8, active: 5, hitbox: [12, -70, 52, 38] }], recovery: 26, damage: 82, hitstun: 22, blockstun: 15, stepX: 0.6, activeStepX: 4.4, knockback: { x: 7 } }),
  attack({ id: 'sp_rising_kick', name: '扬光踢', stance: 'stand', button: P, motion: '623', segments: [{ startup: 8, active: 5, hitbox: [10, -143, 41, 108] }], recovery: 28, damage: 85, invuln: 3, knockback: { x: 4, y: -9 } }),
  attack({ id: 'sp_light_blade', name: '光刃连斩', stance: 'stand', button: P, motion: '22', segments: [{ startup: 10, active: 3, hitbox: [13, -88, 66, 52] }, { startup: 4, active: 4, hitbox: [15, -75, 73, 48] }], recovery: 23, damage: 39, hitstun: 20, blockstun: 13, hitstop: 7, knockback: { x: 2 } }),
  utility({
    id: 'sp_light_scatter', name: '散射光点', button: K, motion: '214', startup: 19, cast: 13, recovery: 25,
    damage: 40, hitstun: 19, blockstun: 13, knockback: { x: 3, y: -3 },
    projectiles: [
      { frame: 13, kind: 'kizaru_light_scatter', x: 26, y: -51, vx: 4.3, vy: -3.1, ttl: 58, box: [-9, -9, 18, 18], durability: 1 },
      { frame: 16, kind: 'kizaru_light_scatter', x: 28, y: -42, vx: 4.8, vy: 0.55, ttl: 70, box: [-9, -9, 18, 18], durability: 1, dieOnGround: true },
    ],
  }),
  utility({ id: 'sp_light_body', name: '光躯·闪避', button: K, motion: '22', meterCost: balance.DODGE_COST, startup: 17, recovery: 15, invuln: 17, dodge: true }),
  utility({
    id: 'sp_beam_barrage', name: '光束连射', type: 'super', button: P, motion: '214214', meterCost: balance.SUPER_COST, invuln: 6, startup: 30, cast: 10, recovery: 33,
    damage: 48, hitstun: 22, blockstun: 14, hitstop: 7, knockback: { x: 2 },
    projectiles: [10, 16, 22, 28].map(frame => beam(frame, 'kizaru_beam_barrage', -50, 48)),
  }),
  attack({ id: 'sp_heaven_kick', name: '贯光重踢', type: 'super', stance: 'stand', button: P, motion: '236236', meterCost: balance.SUPER_COST, invuln: 7, segments: [{ startup: 12, active: 7, hitbox: [12, -95, 80, 63] }], recovery: 36, damage: 190, hitstun: 30, blockstun: 22, hitstop: 14, stepX: 1.2, activeStepX: 4.2, knockback: { x: 11, y: -7 }, knockdown: true }),
  utility({
    id: 'ult_radiant_finale', name: '极光终幕', type: 'ultimate', button: K, motion: '236236', meterCost: balance.ULTIMATE_COST, invuln: 11, startup: 42, cast: 13, recovery: 43,
    damage: 56, hitstun: 24, blockstun: 16, hitstop: 8, knockback: { x: 2 },
    projectiles: [13, 18, 23, 28, 33, 38].map(frame => beam(frame, 'kizaru_radiant_beam', -54, 56)),
  }),

  normal({ id: 'cd', name: '闪光横踢', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 16, active: 5, recovery: 27, hitbox: [12, -81, 67, 47], damage: 90, hitstun: 29, blockstun: 20, knockback: { x: 11, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空中闪踢', stance: 'air', button: Btn.C, plus: Btn.D, startup: 11, active: 6, recovery: 15, hitbox: [10, -69, 62, 49], damage: 83, knockback: { x: 9, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '擒肩前摔', direction: 6, button: Btn.C, damage: 105, total: 43, throwData: { range: 43, techWindow: 8, releaseFrame: 20, holdOffset: 37 } }),
  throwMove({ id: 'throw_back', name: '擒肩后摔', direction: 4, button: Btn.C, damage: 105, total: 43, throwData: { range: 43, techWindow: 8, releaseFrame: 20, holdOffset: 37 } }),
  normal({ id: 'f_c', name: '光刃下劈', stance: 'stand', button: Btn.C, direction: 6, startup: 16, active: 4, recovery: 23, hitbox: [16, -92, 49, 70], damage: 78, guard: 'high', stepX: 0.8 }),
  normal({ id: 'st_a', name: '掌指轻击', stance: 'stand', button: Btn.A, startup: 5, active: 3, recovery: 9, hitbox: [30, -89, 24, 15], damage: 32, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '轻踢', stance: 'stand', button: Btn.B, startup: 5, active: 3, recovery: 11, hitbox: [15, -49, 42, 26], damage: 36, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '光刃斩', stance: 'stand', button: Btn.C, startup: 10, active: 4, recovery: 19, hitbox: [13, -83, 56, 38], damage: 69 }),
  normal({ id: 'st_d', name: '高位重踢', stance: 'stand', button: Btn.D, startup: 11, active: 4, recovery: 21, hitbox: [13, -84, 59, 36], damage: 76, knockback: { x: 7 } }),
  normal({ id: 'cr_a', name: '蹲掌指', stance: 'crouch', button: Btn.A, startup: 5, active: 3, recovery: 8, hitbox: [16, -44, 30, 22], damage: 30, chain: ['st_c', 'cr_c', 'cr_d'] }),
  normal({ id: 'cr_b', name: '低位轻踢', stance: 'crouch', button: Btn.B, startup: 5, active: 3, recovery: 10, hitbox: [13, -20, 42, 18], damage: 33, guard: 'low' }),
  normal({ id: 'cr_c', name: '光刃上扬', stance: 'crouch', button: Btn.C, startup: 9, active: 5, recovery: 21, hitbox: [9, -108, 37, 77], damage: 72, knockback: { x: 3, y: -6 } }),
  normal({ id: 'cr_d', name: '旋身扫踢', stance: 'crouch', button: Btn.D, startup: 11, active: 4, recovery: 24, hitbox: [12, -25, 58, 24], damage: 68, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空掌指', stance: 'air', button: Btn.A, startup: 4, active: 6, recovery: 8, hitbox: [13, -77, 32, 25], damage: 32 }),
  normal({ id: 'j_b', name: '空轻踢', stance: 'air', button: Btn.B, startup: 5, active: 6, recovery: 9, hitbox: [13, -46, 45, 28], damage: 37 }),
  normal({ id: 'j_c', name: '空光刃', stance: 'air', button: Btn.C, startup: 8, active: 5, recovery: 12, hitbox: [14, -82, 52, 42], damage: 68 }),
  normal({ id: 'j_d', name: '空重踢', stance: 'air', button: Btn.D, startup: 9, active: 6, recovery: 13, hitbox: [12, -57, 57, 37], damage: 75 }),
];
