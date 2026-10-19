import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData } from '@core/index';

const { DODGE_COST, SUPER_COST, ULTIMATE_COST } = balance;
export const SHANKS_PROJECTILE_KINDS = ['shanks_haki_slash'] as const;

/** 0929 候选：单臂剑士。判定是制作目标，须随真实原画接触校准；没有持续强化。 */
export const shanksMoves: readonly MoveData[] = [
  utility({
    id: 'sp_haki_slash', name: '霸气斩波', button: P, motion: '236', startup: 17, cast: 12, recovery: 23,
    damage: 76, hitstun: 23, blockstun: 15, knockback: { x: 6 },
    projectiles: [{ frame: 12, kind: 'shanks_haki_slash', x: 36, y: -49, vx: 5.2, vy: 0, ttl: 54, box: [-10, -27, 20, 54] }],
  }),
  attack({
    id: 'sp_single_arm_cut', name: '单臂疾斩', stance: 'stand', button: P, motion: '214',
    // The second authored slash runs from grip (+15,-30) to tip (+59,-9).
    segments: [{ startup: 8, active: 3, hitbox: [12, -66, 54, 34] }, { startup: 4, active: 4, hitbox: [12, -34, 50, 29] }],
    recovery: 23, damage: 47, hitstun: 29, blockstun: 15, knockback: { x: 1.3 }, activeStepX: 1.2,
  }),
  attack({
    id: 'sp_rising_guard', name: '迎击上斩', stance: 'stand', button: P, motion: '623', invuln: 5,
    // Inspected R blade runs from (+30,-80) to (+65,-108).
    segments: [{ startup: 8, active: 6, hitbox: [25, -111, 43, 42] }],
    recovery: 31, damage: 100, hitstun: 26, blockstun: 16, knockback: { x: 4, y: -8 }, knockdown: true,
  }),
  attack({
    id: 'sp_step_thrust', name: '踏步突刺', stance: 'stand', button: K, motion: '236',
    // Inspected F thrust is horizontal near y=-60 and reaches x=104.
    segments: [{ startup: 10, active: 4, hitbox: [35, -64, 72, 15] }],
    recovery: 29, damage: 95, hitstun: 24, blockstun: 15, knockback: { x: 8 }, stepX: 2.1, activeStepX: 2.4,
  }),
  attack({
    id: 'sp_low_cut', name: '低身横斩', stance: 'stand', button: K, motion: '214',
    // Inspected low slash has grip (+51,-18) and tip (+105,-9).
    segments: [{ startup: 14, active: 5, hitbox: [43, -22, 65, 22] }],
    recovery: 30, damage: 92, guard: 'low', hitstun: 25, blockstun: 17,
    knockback: { x: 7 }, knockdown: true, hurtboxes: [[-17, -61, 34, 61]],
  }),
  utility({
    id: 'sp_sidestep', name: '侧身避锋', button: K, motion: '22', meterCost: DODGE_COST,
    startup: 14, recovery: 15, invuln: 14, dodge: true,
  }),
  attack({
    id: 'sp_divine_departure', name: '神避', type: 'super', stance: 'stand', button: P, motion: '236236',
    meterCost: SUPER_COST, invuln: 7, armorBreak: true,
    // Inspected X saber runs from (+36.81,-38.51) to (+94.94,-5.66).
    segments: [{ startup: 15, active: 5, hitbox: [28, -43, 70, 41] }],
    recovery: 38, damage: 210, hitstun: 33, blockstun: 22, hitstop: 16,
    knockback: { x: 13, y: -5 }, knockdown: true, stepX: 2.5, activeStepX: 1.4,
  }),
  attack({
    id: 'sp_emperor_cuts', name: '霸气连斩', type: 'super', stance: 'stand', button: P, motion: '214214',
    meterCost: SUPER_COST, invuln: 6,
    // C uses three actual horizontal/diagonal blades, each measured separately.
    segments: [{ startup: 11, active: 3, hitbox: [29, -63, 73, 20] }, { startup: 4, active: 3, hitbox: [27, -42, 69, 42] }, { startup: 5, active: 5, hitbox: [25, -44, 65, 44] }],
    recovery: 31, damage: 67, hitstun: 36, blockstun: 15, hitstop: 9, knockback: { x: 1.5 }, activeStepX: 1.5,
  }),
  attack({
    id: 'ult_red_hair_finale', name: '红发终式', type: 'ultimate', stance: 'stand', button: K, motion: '236236',
    meterCost: ULTIMATE_COST, invuln: 10, armorBreak: true,
    // V contact stays on the grounded diagonal saber (+38.20,-44.33) to (+98.15,-8.51).
    segments: [{ startup: 20, active: 7, hitbox: [31, -49, 71, 44] }],
    recovery: 46, damage: 330, hitstun: 42, blockstun: 27, hitstop: 19,
    knockback: { x: 15, y: -8 }, knockdown: true, wallBounce: true, stepX: 1.9,
  }),
  normal({ id: 'cd', name: '剑背吹飞', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 16, active: 5, recovery: 27, hitbox: [43, -70, 57, 24], damage: 96, hitstun: 30, blockstun: 21, knockback: { x: 12, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空中横斩', stance: 'air', button: Btn.C, plus: Btn.D, startup: 11, active: 6, recovery: 15, hitbox: [14, -67, 51, 14], damage: 90, hitstun: 28, knockback: { x: 9, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '单臂绊摔', direction: 6, button: Btn.C, damage: 114, total: 42, throwData: { range: 46, techWindow: 8, releaseFrame: 21, holdOffset: 30 } }),
  throwMove({ id: 'throw_back', name: '单臂反摔', direction: 4, button: Btn.C, damage: 114, total: 42, throwData: { range: 46, techWindow: 8, releaseFrame: 21, holdOffset: 30 } }),
  normal({ id: 'f_c', name: '踏步斜劈', stance: 'stand', button: Btn.C, direction: 6, startup: 17, active: 4, recovery: 23, hitbox: [9, -43, 57, 38], damage: 84, guard: 'high', stepX: 1.1 }),
  // 0929 real art is a short thrust: measured grip(29.9,-63.6) to tip(71.7,-54.4).
  normal({ id: 'st_a', name: '轻剑刺', stance: 'stand', button: Btn.A, startup: 5, active: 3, recovery: 10, hitbox: [27, -67, 45, 16], damage: 34, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  // Actual authored front-kick sole is near(+59,-59), not the old low paper target.
  normal({ id: 'st_b', name: '前踢', stance: 'stand', button: Btn.B, startup: 6, active: 3, recovery: 12, hitbox: [34, -64, 30, 24], damage: 39, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '单手横斩', stance: 'stand', button: Btn.C, startup: 10, active: 4, recovery: 23, hitbox: [24, -63, 52, 15], damage: 78, knockback: { x: 6 } }),
  normal({ id: 'st_d', name: '剑柄重击', stance: 'stand', button: Btn.D, startup: 12, active: 4, recovery: 21, hitbox: [30, -72, 17, 22], damage: 76, knockback: { x: 7 } }),
  // Authored crouch hand/foot/blade endpoints retain their actual height and range.
  normal({ id: 'cr_a', name: '蹲剑柄', stance: 'crouch', button: Btn.A, startup: 5, active: 3, recovery: 9, hitbox: [30, -52, 20, 19], damage: 31, chain: ['cr_c', 'cr_d', 'st_c'] }),
  normal({ id: 'cr_b', name: '蹲轻踢', stance: 'crouch', button: Btn.B, startup: 5, active: 3, recovery: 11, hitbox: [37, -37, 24, 20], damage: 34, guard: 'low' }),
  normal({ id: 'cr_c', name: '低身上斩', stance: 'crouch', button: Btn.C, startup: 9, active: 5, recovery: 22, hitbox: [36, -106, 51, 48], damage: 79, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '低身扫腿', stance: 'crouch', button: Btn.D, startup: 10, active: 4, recovery: 25, hitbox: [34, -33, 33, 23], damage: 70, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空剑柄', stance: 'air', button: Btn.A, startup: 5, active: 6, recovery: 8, hitbox: [25, -72, 18, 24], damage: 33 }),
  normal({ id: 'j_b', name: '空轻踢', stance: 'air', button: Btn.B, startup: 6, active: 6, recovery: 9, hitbox: [27, -59, 25, 23], damage: 38 }),
  normal({ id: 'j_c', name: '空单手斩', stance: 'air', button: Btn.C, startup: 9, active: 5, recovery: 12, hitbox: [27, -57, 48, 22], damage: 75 }),
  normal({ id: 'j_d', name: '空重踢', stance: 'air', button: Btn.D, startup: 10, active: 6, recovery: 13, hitbox: [34, -64, 26, 25], damage: 73 }),
];
