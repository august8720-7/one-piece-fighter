import { isReservedKey, type KeyConfig } from './keymap';

export interface AwakeningBindings { p1: string | null; p2: string | null }
const KEY = 'opf.awakening.v1';
const defaults: AwakeningBindings = { p1: 'KeyT', p2: 'PageUp' };
const sides = ['p1', 'p2'] as const;
const validCode = (code: unknown): code is string | null => code === null
  || (typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Numpad[A-Za-z0-9]+|Arrow(Up|Down|Left|Right)|PageUp|PageDown|Home|End|Insert|Delete|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote)$/.test(code) && !isReservedKey(code));

/** Only the supplied current mixed keyboard profile matters; never rewrite old key stores. */
export function awakeningConflicts(bindings: AwakeningBindings, config: KeyConfig): string[] {
  const issues: string[] = [];
  for (const side of sides) {
    const code = bindings[side];
    if (!validCode(code)) { issues.push(`${side}：觉醒键无效或被保留`); continue; }
    if (code === null) continue;
    for (const other of sides) for (const [action, key] of Object.entries(config[other])) {
      if (key === code) issues.push(`${code} 已用于 ${other}.${action}`);
    }
  }
  if (bindings.p1 && bindings.p1 === bindings.p2) issues.push(`${bindings.p1} 被双方觉醒同时占用`);
  return issues;
}

export function availableAwakeningBindings(bindings: AwakeningBindings, config: KeyConfig): AwakeningBindings {
  const out = { ...bindings };
  for (const side of sides) {
    const code = bindings[side];
    if (!validCode(code) || (code && (Object.values(config.p1).includes(code) || Object.values(config.p2).includes(code)))) out[side] = null;
  }
  if (out.p1 && out.p1 === out.p2) { out.p1 = null; out.p2 = null; }
  return out;
}

export function loadAwakeningBindings(config: KeyConfig): AwakeningBindings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (data && typeof data === 'object' && 'version' in data && data.version === 1 && 'bindings' in data) {
        const value = data.bindings;
        if (value && typeof value === 'object' && 'p1' in value && 'p2' in value && validCode(value.p1) && validCode(value.p2)) {
          return availableAwakeningBindings({ p1: value.p1, p2: value.p2 }, config);
        }
      }
    }
  } catch { /* Corrupt/disabled storage only changes this session's fallback. */ }
  return availableAwakeningBindings(defaults, config);
}

export function saveAwakeningBindings(bindings: AwakeningBindings, config: KeyConfig): { saved: boolean; conflicts: string[] } {
  const conflicts = awakeningConflicts(bindings, config);
  if (conflicts.length) return { saved: false, conflicts };
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify({ version: 1, bindings })); return { saved: !!globalThis.localStorage, conflicts }; }
  catch { return { saved: false, conflicts }; }
}
