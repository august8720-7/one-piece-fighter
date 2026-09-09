import { Btn, normal, type MoveData } from '@core/index';

/**
 * 赤犬普通技（M1）。特点：启动慢、伤害高、击退大、射程中等。
 * 数值为初始值，M3 用训练模式实测后调整。
 */
export const akainuMoves: readonly MoveData[] = [
  // ---- 站立 ----
  normal({
    id: 'st_a', name: '轻拳', stance: 'stand', button: Btn.A,
    startup: 5, active: 3, recovery: 9,
    hitbox: [12, -86, 36, 16], damage: 38,
  }),
  normal({
    id: 'st_b', name: '轻脚', stance: 'stand', button: Btn.B,
    startup: 6, active: 3, recovery: 11,
    hitbox: [14, -48, 40, 18], damage: 42,
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
