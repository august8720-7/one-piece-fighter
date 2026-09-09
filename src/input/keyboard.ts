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
 */
export class KeyboardInput {
  private bits: [number, number] = [0, 0];
  private readonly maps: [KeyMap, KeyMap];

  constructor(p1 = P1_KEYS, p2 = P2_KEYS) {
    this.maps = [p1, p2];
    window.addEventListener('keydown', this.onKey(true));
    window.addEventListener('keyup', this.onKey(false));
    window.addEventListener('blur', () => {
      this.bits = [0, 0];
    });
  }

  private onKey(down: boolean) {
    return (e: KeyboardEvent): void => {
      const b1 = this.maps[0][e.code];
      const b2 = this.maps[1][e.code];
      if (b1 !== undefined) this.bits[0] = down ? this.bits[0] | b1 : this.bits[0] & ~b1;
      if (b2 !== undefined) this.bits[1] = down ? this.bits[1] | b2 : this.bits[1] & ~b2;
      if (b1 !== undefined || b2 !== undefined) e.preventDefault();
    };
  }

  snapshot(): { p1: number; p2: number } {
    return { p1: this.bits[0], p2: this.bits[1] };
  }
}
