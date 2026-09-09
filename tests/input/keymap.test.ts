import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Btn } from '../../src/core';
import { DEFAULT_P1, defaultKeyConfig, keyLabel, loadKeyConfig, saveKeyConfig, toKeyMap } from '../../src/input/keymap';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

describe('keymap', () => {
  let saved: unknown;
  let store: MemoryStorage;
  beforeEach(() => {
    saved = (globalThis as { localStorage?: unknown }).localStorage;
    store = new MemoryStorage();
    (globalThis as { localStorage?: unknown }).localStorage = store;
  });
  afterEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = saved;
  });

  it('toKeyMap：动作位图合并，宏键映射双位', () => {
    const map = toKeyMap(DEFAULT_P1);
    expect(map['KeyJ']).toBe(Btn.A);
    expect(map['KeyL']).toBe(Btn.A | Btn.B);
    expect(map['KeyO']).toBe(Btn.C | Btn.D);
  });

  it('保存后可读回；损坏数据回退默认并补齐缺失项', () => {
    const cfg = defaultKeyConfig();
    cfg.p1.A = 'KeyZ';
    saveKeyConfig(cfg);
    expect(loadKeyConfig().p1.A).toBe('KeyZ');
    expect(loadKeyConfig().p1.B).toBe('KeyK');

    store.setItem('opf.keys.v1', '{not json');
    expect(loadKeyConfig()).toEqual(defaultKeyConfig());

    store.setItem('opf.keys.v1', JSON.stringify({ p1: { A: 42, C: 'KeyX' } }));
    const partial = loadKeyConfig();
    expect(partial.p1.A).toBe('KeyJ');
    expect(partial.p1.C).toBe('KeyX');
  });

  it('keyLabel 可读', () => {
    expect(keyLabel('KeyJ')).toBe('J');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Numpad1')).toBe('Num1');
    expect(keyLabel('Space')).toBe('Space');
  });
});
