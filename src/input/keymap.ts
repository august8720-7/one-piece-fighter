import { Btn } from '@core/index';

/** 可重绑的动作（Start 固定为 Enter / NumpadEnter / 手柄 Start） */
export const ACTIONS = ['Up', 'Down', 'Left', 'Right', 'A', 'B', 'C', 'D', 'Roll', 'Blowback'] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABEL: Record<Action, string> = {
  Up: '上 / 跳',
  Down: '下 / 蹲',
  Left: '左',
  Right: '右',
  A: 'A 轻拳',
  B: 'B 轻脚',
  C: 'C 重拳',
  D: 'D 重脚',
  Roll: '翻滚 (A+B)',
  Blowback: '吹飞 (C+D)',
};

/** 动作 → 位图（Roll / Blowback 是宏） */
export const ACTION_BITS: Record<Action, number> = {
  Up: Btn.Up,
  Down: Btn.Down,
  Left: Btn.Left,
  Right: Btn.Right,
  A: Btn.A,
  B: Btn.B,
  C: Btn.C,
  D: Btn.D,
  Roll: Btn.A | Btn.B,
  Blowback: Btn.C | Btn.D,
};

/** 动作 → KeyboardEvent.code */
export type KeyBinding = Record<Action, string>;

export const DEFAULT_P1: KeyBinding = {
  Up: 'KeyW',
  Down: 'KeyS',
  Left: 'KeyA',
  Right: 'KeyD',
  A: 'KeyJ',
  B: 'KeyK',
  C: 'KeyU',
  D: 'KeyI',
  Roll: 'KeyL',
  Blowback: 'KeyO',
};

export const DEFAULT_P2: KeyBinding = {
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  A: 'Numpad1',
  B: 'Numpad2',
  C: 'Numpad4',
  D: 'Numpad5',
  Roll: 'Numpad3',
  Blowback: 'Numpad6',
};

/** 无小键盘时的 P2：方向键 + N/M , . / */
export const P2_NO_NUMPAD: KeyBinding = {
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  A: 'KeyN',
  B: 'KeyM',
  C: 'Comma',
  D: 'Period',
  Roll: 'Slash',
  Blowback: 'ShiftRight',
};

const STORAGE_KEY = 'opf.keys.v1';

export interface KeyConfig {
  p1: KeyBinding;
  p2: KeyBinding;
}

export function defaultKeyConfig(): KeyConfig {
  return { p1: { ...DEFAULT_P1 }, p2: { ...DEFAULT_P2 } };
}

/** 动作优先：M 被玩家绑定时，静音改在设置页操作。 */
export function muteShortcutAvailable(cfg: KeyConfig): boolean {
  return ![...Object.values(cfg.p1), ...Object.values(cfg.p2)].includes('KeyM');
}

/** 读取本地保存的键位；损坏或缺失时用默认值补齐。 */
export function loadKeyConfig(): KeyConfig {
  const cfg = defaultKeyConfig();
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return cfg;
    const parsed = JSON.parse(raw) as Partial<Record<'p1' | 'p2', Partial<Record<string, unknown>>>>;
    for (const side of ['p1', 'p2'] as const) {
      const src = parsed[side];
      if (!src) continue;
      for (const a of ACTIONS) {
        const v = src[a];
        if (typeof v === 'string' && v.length > 0) cfg[side][a] = v;
      }
    }
  } catch {
    // 忽略损坏的存档
  }
  return cfg;
}

export function saveKeyConfig(cfg: KeyConfig): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // 隐私模式等场景下写入失败不影响游戏
  }
}

/** 键位表 → code → 位图（同一个键可同时属于两个玩家，位图分开） */
export function toKeyMap(b: KeyBinding): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of ACTIONS) out[b[a]] = (out[b[a]] ?? 0) | ACTION_BITS[a];
  return out;
}

/** 同一物理键被两侧或多个动作占用时返回说明，供设置页提示 */
export function keyConflicts(cfg: KeyConfig): string[] {
  const map = new Map<string, string[]>();
  for (const side of ['p1', 'p2'] as const) {
    for (const a of ACTIONS) {
      const code = cfg[side][a];
      const arr = map.get(code) ?? [];
      arr.push(`${side.toUpperCase()} ${ACTION_LABEL[a]}`);
      map.set(code, arr);
    }
  }
  const out: string[] = [];
  for (const [code, owners] of map) {
    if (owners.length > 1) out.push(`${keyLabel(code)} → ${owners.join(' / ')}`);
  }
  return out;
}

/** 给人看的键名 */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] ?? code;
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  const extra: Record<string, string> = { Comma: ',', Period: '.', Slash: '/', ShiftRight: 'RShift', Quote: "'", Semicolon: ';' };
  return extra[code] ?? code;
}
