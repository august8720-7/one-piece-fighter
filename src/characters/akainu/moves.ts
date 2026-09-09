import { Btn, K, P, attack, normal, throwMove, type MoveData } from '@core/index';

/**
 * 赤犬招式表。特点：启动慢、伤害高、击退大、射程中等、连段少。
 * 数值为初始值，M3 用训练模式实测后调整。
 */
export const akainuMoves: readonly MoveData[] = [
  // ---- 超必杀（1 气）：大喷火·连 ----
  attack({
    id: 'sp_daifunka_ren', name: '大喷火·连', type: 'super', stance: 'stand', button: P, motion: '236236',
    meterCost: 100, invuln: 10,
    segments: [
      { startup: 14, active: 5, hitbox: [20, -110, 110, 70] },
      { startup: 10, active: 5, hitbox: [24, -100, 120, 70] },
      { startup: 10, active: 6, hitbox: [28, -120, 140, 90] },
    ],
    recovery: 34, damage: 105,
    hitstun: 30, blockstun: 22, hitstop: 14,
    knockback: { x: 6, y: -5 }, stepX: 1.5,
  }),
  // ---- 特殊技 ----
  attack({
    id: 'sp_daifunka', name: '大喷火', stance: 'stand', button: P, motion: '236',
    segments: [{ startup: 18, active: 5, hitbox: [20, -110, 110, 70] }],
    recovery: 26, damage: 160,
    hitstun: 30, blockstun: 22, hitstop: 14,
    knockback: { x: 13, y: -6 }, wallBounce: true, stepX: 1,
  }),
  attack({
    id: 'sp_ground_split', name: '熔岩地裂', stance: 'stand', button: K, motion: '22',
    segments: [{ startup: 16, active: 6, hitbox: [40, -70, 60, 70] }],
    recovery: 24, damage: 100, guard: 'low',
    hitstun: 26, blockstun: 18, hitstop: 12,
    knockback: { x: 4, y: -9 },
  }),
  // ---- 吹飞 C+D：熔岩双掌 ----
  normal({
    id: 'cd', name: '熔岩双掌', stance: 'stand', button: Btn.C, plus: Btn.D,
    startup: 18, active: 5, recovery: 26,
    hitbox: [14, -90, 64, 40], damage: 100,
    hitstun: 32, blockstun: 22, hitstop: 15,
    knockback: { x: 12, y: -5 }, wallBounce: true, stepX: 1.2,
  }),
  normal({
    id: 'j_cd', name: '熔岩双掌（空）', stance: 'air', button: Btn.C, plus: Btn.D,
    startup: 12, active: 6, recovery: 14,
    hitbox: [10, -76, 52, 40], damage: 90,
    hitstun: 28, blockstun: 18, hitstop: 13,
    knockback: { x: 10, y: -4 },
  }),
  // ---- 投技：熔岩抓摔 ----
  throwMove({
    id: 'throw_fwd', name: '熔岩抓摔', direction: 6, button: Btn.C, damage: 120, total: 48,
    knockback: { x: 5, y: -7 },
    throwData: { range: 50, techWindow: 8, releaseFrame: 24, holdOffset: 38 },
  }),
  throwMove({
    id: 'throw_back', name: '熔岩抓摔（后）', direction: 4, button: Btn.C, damage: 120, total: 48,
    knockback: { x: 5, y: -7 },
    throwData: { range: 50, techWindow: 8, releaseFrame: 24, holdOffset: 38 },
  }),
  // ---- 站立 ----
  normal({
    id: 'st_a', name: '轻拳', stance: 'stand', button: Btn.A,
    startup: 5, active: 3, recovery: 9,
    hitbox: [12, -86, 36, 16], damage: 38,
    chain: ['st_c', 'st_d', 'cr_d'],
  }),
  normal({
    id: 'st_b', name: '轻脚', stance: 'stand', button: Btn.B,
    startup: 6, active: 3, recovery: 11,
    hitbox: [14, -48, 40, 18], damage: 42,
    chain: ['st_c', 'st_d'],
  }),
  normal({
    id: 'st_c', name: '熔岩拳', stance: 'stand', button: Btn.C,
    startup: 12, active: 4, recovery: 20,
    hitbox: [16, -92, 56, 30], damage: 90,
    knockback: { x: 9 }, stepX: 1.5,
  }),
  normal({
    id: 'st_d', name: '熔岩踢', stance: 'stand', button: Btn.D,
    startup: 13, active: 5, recovery: 22,
    hitbox: [16, -70, 66, 34], damage: 85,
    knockback: { x: 8 },
  }),
  // ---- 蹲 ----
  normal({
    id: 'cr_a', name: '蹲轻拳', stance: 'crouch', button: Btn.A,
    startup: 5, active: 3, recovery: 8,
    hitbox: [12, -56, 34, 16], damage: 35,
    chain: ['cr_c', 'cr_d', 'st_c'],
  }),
  normal({
    id: 'cr_b', name: '蹲轻脚', stance: 'crouch', button: Btn.B,
    startup: 6, active: 3, recovery: 11,
    hitbox: [12, -16, 42, 16], damage: 38, guard: 'low',
  }),
  normal({
    id: 'cr_c', name: '熔岩上勾', stance: 'crouch', button: Btn.C,
    startup: 9, active: 5, recovery: 18,
    hitbox: [8, -120, 36, 70], damage: 85,
    knockback: { x: 3, y: -8 }, // 对空浮空
  }),
  normal({
    id: 'cr_d', name: '熔岩下扫', stance: 'crouch', button: Btn.D,
    startup: 11, active: 4, recovery: 24,
    hitbox: [12, -18, 80, 18], damage: 80, guard: 'low',
    knockdown: true, knockback: { x: 6 },
  }),
  // ---- 空中 ----
  normal({
    id: 'j_a', name: '空轻拳', stance: 'air', button: Btn.A,
    startup: 5, active: 6, recovery: 9,
    hitbox: [10, -80, 32, 18], damage: 38,
  }),
  normal({
    id: 'j_b', name: '空轻脚', stance: 'air', button: Btn.B,
    startup: 6, active: 6, recovery: 9,
    hitbox: [12, -56, 38, 20], damage: 42,
  }),
  normal({
    id: 'j_c', name: '空熔岩拳', stance: 'air', button: Btn.C,
    startup: 9, active: 5, recovery: 12,
    hitbox: [10, -84, 46, 28], damage: 80,
    knockback: { x: 7 },
  }),
  normal({
    id: 'j_d', name: '空熔岩踢', stance: 'air', button: Btn.D,
    startup: 10, active: 6, recovery: 12,
    hitbox: [10, -44, 50, 34], damage: 85,
    knockback: { x: 7 },
  }),
];
