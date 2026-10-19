import { Btn, K, P, attack, balance, normal, throwMove, utility, type MoveData } from '@core/index';

const { BURN, DODGE_COST, SUPER_COST, ULTIMATE_COST } = balance;

/** 0929 候选：所有按键均是踢技；P/K 只表示输入分组，不生成拳击或持续飞行。 */
export const sanjiMoves: readonly MoveData[] = [
  attack({ id: 'sp_neck_kick', name: '首肉踢', stance: 'stand', button: P, motion: '236', segments: [{ startup: 7, active: 4, hitbox: [9, -78, 52, 56] }], recovery: 21, damage: 73, hitstun: 23, blockstun: 14, stepX: 1.5, activeStepX: 1.0, knockback: { x: 6 } }),
  attack({ id: 'sp_mutton_flurry', name: '羊肉连踢', stance: 'stand', button: P, motion: '214', segments: [{ startup: 8, active: 3, hitbox: [9, -62, 44, 32] }, { startup: 3, active: 3, hitbox: [9, -42, 49, 26] }, { startup: 4, active: 4, hitbox: [9, -71, 56, 49] }], recovery: 23, damage: 30, hitstun: 29, blockstun: 12, hitstop: 7, knockback: { x: 1 }, activeStepX: 1.3 }),
  attack({ id: 'sp_rising_kick', name: '升空踢', stance: 'stand', button: P, motion: '623', invuln: 5, segments: [{ startup: 7, active: 6, hitbox: [3, -122, 43, 100] }], recovery: 30, damage: 94, hitstun: 27, blockstun: 16, knockback: { x: 4, y: -9 }, knockdown: true }),
  attack({ id: 'sp_slide_kick', name: '低空滑踢', stance: 'stand', button: K, motion: '236', segments: [{ startup: 10, active: 6, hitbox: [9, -24, 50, 24] }], recovery: 28, damage: 83, guard: 'low', hitstun: 23, blockstun: 14, stepX: 2.4, activeStepX: 3, knockback: { x: 7 }, hurtboxes: [[-17, -51, 34, 51]] }),
  attack({ id: 'sp_turn_sweep', name: '旋身扫踢', stance: 'stand', button: K, motion: '214', segments: [{ startup: 14, active: 5, hitbox: [4, -36, 67, 33] }], recovery: 27, damage: 90, hitstun: 26, blockstun: 16, knockback: { x: 8 }, knockdown: true }),
  utility({ id: 'sp_flash_step', name: '闪步', button: K, motion: '22', meterCost: DODGE_COST, startup: 13, recovery: 14, invuln: 13, dodge: true }),
  attack({ id: 'sp_diable_combo', name: '恶魔风脚·连踢', type: 'super', stance: 'stand', button: P, motion: '236236', meterCost: SUPER_COST, invuln: 7, burn: BURN, segments: [{ startup: 10, active: 3, hitbox: [7, -58, 47, 36] }, { startup: 3, active: 3, hitbox: [8, -43, 50, 30] }, { startup: 3, active: 3, hitbox: [7, -74, 52, 54] }, { startup: 4, active: 5, hitbox: [8, -69, 62, 53] }], recovery: 30, damage: 46, hitstun: 35, blockstun: 13, hitstop: 7, knockback: { x: 1.2 }, stepX: 1.8, activeStepX: 1.8 }),
  attack({ id: 'sp_hell_spin', name: '地狱回旋', type: 'super', stance: 'stand', button: P, motion: '214214', meterCost: SUPER_COST, invuln: 8, burn: BURN, segments: [{ startup: 14, active: 7, hitbox: [-4, -111, 90, 97] }], recovery: 36, damage: 192, hitstun: 34, blockstun: 22, hitstop: 14, knockback: { x: 9, y: -8 }, knockdown: true }),
  attack({ id: 'ult_ifrit_finale', name: '魔神风脚·终踢', type: 'ultimate', stance: 'stand', button: K, motion: '236236', meterCost: ULTIMATE_COST, invuln: 10, armorBreak: true, burn: BURN, segments: [{ startup: 13, active: 3, hitbox: [8, -59, 49, 35] }, { startup: 4, active: 3, hitbox: [8, -43, 52, 28] }, { startup: 4, active: 3, hitbox: [8, -71, 57, 50] }, { startup: 4, active: 3, hitbox: [8, -52, 62, 36] }, { startup: 5, active: 6, hitbox: [8, -77, 76, 63] }], recovery: 40, damage: 66, hitstun: 46, blockstun: 17, hitstop: 9, knockback: { x: 1.4 }, stepX: 2.3, activeStepX: 1.9 }),
  normal({ id: 'cd', name: '回身重踢', stance: 'stand', button: Btn.C, plus: Btn.D, startup: 15, active: 5, recovery: 25, hitbox: [7, -62, 61, 47], damage: 91, hitstun: 30, blockstun: 20, knockback: { x: 12, y: -5 }, wallBounce: true }),
  normal({ id: 'j_cd', name: '空回身重踢', stance: 'air', button: Btn.C, plus: Btn.D, startup: 10, active: 6, recovery: 14, hitbox: [6, -53, 63, 44], damage: 85, hitstun: 27, knockback: { x: 9, y: -4 } }),
  throwMove({ id: 'throw_fwd', name: '勾腿摔', direction: 6, button: Btn.C, damage: 108, total: 40, throwData: { range: 45, techWindow: 8, releaseFrame: 20, holdOffset: 33 } }),
  throwMove({ id: 'throw_back', name: '反勾腿摔', direction: 4, button: Btn.C, damage: 108, total: 40, throwData: { range: 45, techWindow: 8, releaseFrame: 20, holdOffset: 33 } }),
  normal({ id: 'f_c', name: '踵落', stance: 'stand', button: Btn.C, direction: 6, startup: 16, active: 4, recovery: 22, hitbox: [10, -103, 43, 89], damage: 80, guard: 'high', stepX: 0.8 }),
  normal({ id: 'st_a', name: '膝点', stance: 'stand', button: Btn.A, startup: 4, active: 3, recovery: 8, hitbox: [8, -49, 29, 24], damage: 31, chain: ['st_c', 'st_d', 'cr_d', 'f_c'] }),
  normal({ id: 'st_b', name: '脚尖踢', stance: 'stand', button: Btn.B, startup: 5, active: 3, recovery: 10, hitbox: [9, -34, 39, 23], damage: 35, chain: ['st_c', 'st_d'] }),
  normal({ id: 'st_c', name: '高位踢', stance: 'stand', button: Btn.C, startup: 8, active: 4, recovery: 18, hitbox: [7, -88, 48, 64], damage: 68, knockback: { x: 5 } }),
  normal({ id: 'st_d', name: '回旋踢', stance: 'stand', button: Btn.D, startup: 10, active: 5, recovery: 21, hitbox: [8, -62, 59, 45], damage: 75, knockback: { x: 6 } }),
  normal({ id: 'cr_a', name: '蹲膝点', stance: 'crouch', button: Btn.A, startup: 4, active: 3, recovery: 8, hitbox: [8, -31, 28, 22], damage: 29, chain: ['cr_c', 'cr_d', 'st_c'] }),
  normal({ id: 'cr_b', name: '蹲轻踢', stance: 'crouch', button: Btn.B, startup: 5, active: 3, recovery: 9, hitbox: [7, -17, 42, 17], damage: 32, guard: 'low' }),
  normal({ id: 'cr_c', name: '倒立上踢', stance: 'crouch', button: Btn.C, startup: 8, active: 5, recovery: 21, hitbox: [3, -111, 39, 90], damage: 73, knockback: { x: 3, y: -7 } }),
  normal({ id: 'cr_d', name: '扫堂腿', stance: 'crouch', button: Btn.D, startup: 9, active: 4, recovery: 24, hitbox: [7, -18, 59, 18], damage: 66, guard: 'low', knockdown: true }),
  normal({ id: 'j_a', name: '空膝击', stance: 'air', button: Btn.A, startup: 4, active: 6, recovery: 8, hitbox: [7, -42, 29, 24], damage: 31 }),
  normal({ id: 'j_b', name: '空脚尖', stance: 'air', button: Btn.B, startup: 5, active: 6, recovery: 8, hitbox: [8, -29, 43, 28], damage: 35 }),
  normal({ id: 'j_c', name: '空斜踢', stance: 'air', button: Btn.C, startup: 7, active: 5, recovery: 11, hitbox: [7, -57, 48, 43], damage: 66 }),
  normal({ id: 'j_d', name: '空回旋踢', stance: 'air', button: Btn.D, startup: 9, active: 6, recovery: 12, hitbox: [6, -48, 59, 43], damage: 72 }),
];
