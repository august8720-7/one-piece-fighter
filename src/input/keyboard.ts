import { Btn } from '@core/index';

export type KeyMap = Record<string, Btn>;

/** 默认键位，见 docs/PLAN.md 4.2。key 为 KeyboardEvent.code。 */
export const P1_KEYS: KeyMap = {
  KeyW: Btn.Up,
  KeyS: Btn.Down,
  KeyA: Btn.Left,
  KeyD: Btn.Right,
  KeyJ: Btn.A,
  KeyK: Btn.B,
  KeyU: Btn.C,
  KeyI: Btn.D,
  Enter: Btn.Start,
};

export const P2_KEYS: KeyMap = {
  ArrowUp: Btn.Up,
  ArrowDown: Btn.Down,
  ArrowLeft: Btn.Left,
  ArrowRight: Btn.Right,
  Numpad1: Btn.A,
  Numpad2: Btn.B,
  Numpad4: Btn.C,
  Numpad5: Btn.D,
  NumpadEnter: Btn.Start,
};

/**
 * 监听 window 键盘事件，维护两名玩家当前按下的位图。
 * 渲染层每逻辑帧调用 snapshot() 取一次。
 *
 * 锁存（latch）：一次按下-松开若发生在两次 snapshot 之间（短于一逻辑帧），
 * 仍必须在下一次 snapshot 中出现一帧，否则轻点会被吞。
 */
export class KeyboardInput {
  private held: [number, number] = [0, 0];
  private latched: [number, number] = [0, 0];
  private readonly maps: [KeyMap, KeyMap];

  constructor(p1 = P1_KEYS, p2 = P2_KEYS) {
    this.maps = [p1, p2];
    window.addEventListener('keydown', this.onKey(true));
    window.addEventListener('keyup', this.onKey(false));
    window.addEventListener('blur', () => {
      this.held = [0, 0];
      this.latched = [0, 0];
    });
  }

  private onKey(down: boolean) {
    return (e: KeyboardEvent): void => {
      const b1 = this.maps[0][e.code];
      const b2 = this.maps[1][e.code];
      if (b1 !== undefined) this.apply(0, b1, down);
      if (b2 !== undefined) this.apply(1, b2, down);
      if (b1 !== undefined || b2 !== undefined) e.preventDefault();
    };
  }

  private apply(i: 0 | 1, b: Btn, down: boolean): void {
    if (down) {
      this.held[i] |= b;
      this.latched[i] |= b;
    } else {
      this.held[i] &= ~b;
    }
  }

  snapshot(): { p1: number; p2: number } {
    const p1 = this.held[0] | this.latched[0];
    const p2 = this.held[1] | this.latched[1];
    this.latched = [0, 0];
    return { p1, p2 };
  }
}
