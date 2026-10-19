import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { DebugOverlay } from '../../src/render/DebugOverlay';

function fixture() {
  const handlers = new Map<string, (event: Partial<KeyboardEvent>) => void>();
  const graphics = { setDepth() { return this; } };
  const text = { setOrigin() { return this; }, setDepth() { return this; } };
  const scene = { add: { graphics: () => graphics, text: () => text }, input: { keyboard: { on: (key: string, handler: (event: Partial<KeyboardEvent>) => void) => { handlers.set(key, handler); } } } };
  const overlay = new DebugOverlay(scene as unknown as Phaser.Scene);
  const press = (event: Partial<KeyboardEvent>) => handlers.get('keydown-F2')!({ shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...event });
  return { overlay, press, handlers };
}

describe('F2 practice and intentional debug shortcuts stay separate', () => {
  it('plain F2 never opens the technical frame panel', () => {
    const f = fixture(); f.press({}); f.press({});
    expect(Reflect.get(f.overlay, 'showFrames')).toBe(false);
  });
  it('Shift+F2 toggles the retained developer frame panel', () => {
    const f = fixture(); f.press({ shiftKey: true });
    expect(Reflect.get(f.overlay, 'showFrames')).toBe(true);
    f.press({}); expect(Reflect.get(f.overlay, 'showFrames')).toBe(true);
    f.press({ shiftKey: true }); expect(Reflect.get(f.overlay, 'showFrames')).toBe(false);
  });
  it('other modifier chords do not accidentally open it, and F1/F3 remain registered', () => {
    const f = fixture();
    for (const event of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true, ctrlKey: true }]) f.press(event);
    expect(Reflect.get(f.overlay, 'showFrames')).toBe(false);
    expect(f.handlers.has('keydown-F1')).toBe(true); expect(f.handlers.has('keydown-F3')).toBe(true);
  });
});
