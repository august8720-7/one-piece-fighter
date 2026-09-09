import { Btn, normal, throwMove, type MoveData } from '@core/index';

/**
 * 路飞普通技 / 吹飞 / 投技。特点：伸长手脚 → 射程长、伤害偏低、启动快。
 * 数值为初始值，M3 用训练模式实测后调整。
 */
export const luffyMoves: readonly MoveData[] = [
  // ---- 吹飞 C+D：橡胶镰刀 ----
  normal({
    id: 'cd', name: '橡胶镰刀', stance: 'stand', button: Btn.C, plus: Btn.D,
    startup: 16, active: 5, recovery: 24,
    hitbox: [12, -84, 80, 30], damage: 90,
    hitstun: 30, blockstun: 20, hitstop: 14,
    knockback: { x: 11, y: -5 }, wallBounce: true,
  }),
  normal({
    id: 'j_cd', name: '橡胶镰刀（空）', stance: 'air', button: Btn.C, plus: Btn.D,
    startup: 10, active: 6, recovery: 12,
    hitbox: [10, -70, 60, 34], damage: 80,
    hitstun: 26, blockstun: 16, hitstop: 12,
    knockback: { x: 9, y: -4 },
  }),
  // ---- 投技：橡胶大槌 ----
  throwMove({
    id: 'throw_fwd', name: '橡胶大槌', direction: 6, button: Btn.C, damage: 110, total: 44,
    knockback: { x: 6, y: -8 },
    throwData: { range: 46, techWindow: 8, releaseFrame: 22, holdOffset: 34 },
  }),
  throwMove({
    id: 'throw_back', name: '橡胶大槌（后）', direction: 4, button: Btn.C, damage: 110, total: 44,
    knockback: { x: 6, y: -8 },
    throwData: { range: 46, techWindow: 8, releaseFrame: 22, holdOffset: 34 },
  }),
  // ---- 站立 ----
  normal({
    id: 'st_a', name: '轻拳', stance: 'stand', button: Btn.A,
    startup: 4, active: 3, recovery: 7,
    hitbox: [10, -78, 34, 14], damage: 30,
  }),
  normal({
    id: 'st_b', name: '轻脚', stance: 'stand', button: Btn.B,
    startup: 5, active: 3, recovery: 9,
    hitbox: [12, -44, 38, 16], damage: 35,
  }),
  normal({
    id: 'st_c', name: '橡胶手枪', stance: 'stand', button: Btn.C,
    startup: 9, active: 4, recovery: 16,
    hitbox: [14, -82, 96, 18], damage: 70,
    hurtboxes: [[-14, -88, 28, 88], [14, -84, 60, 22]], // 伸出去的手臂也能被打
    knockback: { x: 6 },
  }),
  normal({
    id: 'st_d', name: '橡胶印章', stance: 'stand', button: Btn.D,
    startup: 10, active: 4, recovery: 18,
    hitbox: [14, -60, 90, 22], damage: 80,
    knockback: { x: 7 },
  }),
  // ---- 蹲 ----
  normal({
    id: 'cr_a', name: '蹲轻拳', stance: 'crouch', button: Btn.A,
    startup: 4, active: 3, recovery: 6,
    hitbox: [10, -50, 32, 14], damage: 28,
  }),
  normal({
    id: 'cr_b', name: '蹲轻脚', stance: 'crouch', button: Btn.B,
    startup: 5, active: 3, recovery: 9,
    hitbox: [10, -14, 40, 14], damage: 30, guard: 'low',
  }),
  normal({
    id: 'cr_c', name: '蹲重拳', stance: 'crouch', button: Btn.C,
    startup: 7, active: 4, recovery: 15,
    hitbox: [6, -110, 30, 60], damage: 70,
    knockback: { x: 3, y: -7 }, // 对空浮空
  }),
  normal({
    id: 'cr_d', name: '橡胶鞭', stance: 'crouch', button: Btn.D,
    startup: 9, active: 4, recovery: 20,
    hitbox: [10, -16, 100, 16], damage: 70, guard: 'low',
    knockdown: true, knockback: { x: 5 },
  }),
  // ---- 空中 ----
  normal({
    id: 'j_a', name: '空轻拳', stance: 'air', button: Btn.A,
    startup: 4, active: 6, recovery: 8,
    hitbox: [8, -70, 30, 16], damage: 30,
  }),
  normal({
    id: 'j_b', name: '空轻脚', stance: 'air', button: Btn.B,
    startup: 5, active: 6, recovery: 8,
    hitbox: [10, -50, 36, 18], damage: 35,
  }),
  normal({
    id: 'j_c', name: '空重拳', stance: 'air', button: Btn.C,
    startup: 7, active: 5, recovery: 10,
    hitbox: [8, -76, 60, 20], damage: 65,
    knockback: { x: 5 },
  }),
  normal({
    id: 'j_d', name: '橡胶印章（空）', stance: 'air', button: Btn.D,
    startup: 8, active: 5, recovery: 10,
    hitbox: [10, -40, 60, 30], damage: 75,
    knockback: { x: 6 },
  }),
];
