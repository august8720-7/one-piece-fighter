import { Btn, type Facing } from './types';

export const has = (bits: number, b: Btn): boolean => (bits & b) !== 0;

/**
 * 把绝对方向转成相对面向的方向：返回 -1（后）/ 0 / 1（前）。
 * 同时按左右视为 0。
 */
export function horizontalRelative(bits: number, facing: Facing): -1 | 0 | 1 {
  const left = has(bits, Btn.Left);
  const right = has(bits, Btn.Right);
  if (left === right) return 0;
  const abs: 1 | -1 = right ? 1 : -1;
  return abs === facing ? 1 : -1;
}

/** 摇杆数字记法（1-9，面朝右视角），供搓招识别使用。 */
export function toNumpad(bits: number, facing: Facing): number {
  const h = horizontalRelative(bits, facing);
  const up = has(bits, Btn.Up);
  const down = has(bits, Btn.Down);
  const v = up === down ? 0 : up ? 1 : -1;
  return 5 + h + v * 3;
}

/**
 * 双击检测（66 前冲 / 44 后撤步）。
 * history 末尾最新，元素为相对水平方向。
 * 条件：最新一帧刚变为 dir，且在 window 帧内此前出现过 "dir → 非 dir" 的松开。
 */
export function isDoubleTap(history: readonly number[], dir: -1 | 1, window = 10): boolean {
  const n = history.length;
  if (n < 3) return false;
  if (history[n - 1] !== dir || history[n - 2] === dir) return false;
  let sawRelease = false;
  for (let i = n - 2; i >= Math.max(0, n - 1 - window); i--) {
    const h = history[i];
    if (!sawRelease) {
      if (h !== dir) sawRelease = true;
    } else if (h === dir) {
      return true;
    }
  }
  return false;
}

/** 两键同按：两键都按住且至少一键是本帧刚按下。 */
export function pressedTogether(bits: number, pressed: number, a: Btn, b: Btn): boolean {
  return has(bits, a) && has(bits, b) && (has(pressed, a) || has(pressed, b));
}
