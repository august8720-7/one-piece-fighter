import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Btn } from '../../src/core';
import { KeyboardInput } from '../../src/input/keyboard';
import { InputHub } from '../../src/input/InputHub';
import { GamepadInput } from '../../src/input/gamepad';
import { awakeningConflicts, loadAwakeningBindings, saveAwakeningBindings } from '../../src/input/awakening';
import { defaultKeyConfig } from '../../src/input/keymap';
import { captureTrainingInput } from '../../src/input/trainingBuffer';

vi.mock('../../src/audio/Sfx', () => ({ sfx: () => ({ unlock: vi.fn(), toggleMute: vi.fn() }) }));
let surface: EventTarget, saved: Map<string, string>;
function key(code: string, down: boolean, repeat = false) {
  const event = new Event(down ? 'keydown' : 'keyup', { cancelable: true }); Object.assign(event, { code, repeat }); surface.dispatchEvent(event);
}
beforeEach(() => {
  surface = new EventTarget(); saved = new Map(); vi.stubGlobal('window', surface);
  vi.stubGlobal('localStorage', { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v) });
});
afterEach(() => vi.unstubAllGlobals());

describe('independent awakening bindings', () => {
  it('latches a sub-tick tap; long hold/repeat never becomes a second edge', () => {
    const input = new KeyboardInput(defaultKeyConfig());
    key('KeyT', true); key('KeyT', false); expect(input.snapshot().p1).toBe(Btn.Awakening); expect(input.snapshot().p1).toBe(0);
    key('PageUp', true); expect(input.snapshot().p2).toBe(Btn.Awakening);
    key('PageUp', true, true); expect(input.snapshot().p2).toBe(Btn.Awakening);
    surface.dispatchEvent(new Event('blur')); expect(input.snapshot().p2).toBe(0); input.destroy();
  });
  it('leaves an occupied default unbound and preserves both old stores', () => {
    const config = defaultKeyConfig(['simple', 'simple']); config.p1.Skill1 = 'KeyT';
    saved.set('opf.keys.v1', 'old classic bytes'); saved.set('opf.keys.simple.v2', 'old simple bytes');
    expect(loadAwakeningBindings(config)).toEqual({ p1: null, p2: 'PageUp' });
    const result = saveAwakeningBindings({ p1: 'KeyT', p2: 'PageUp' }, config);
    expect(result.conflicts[0]).toContain('p1.Skill1'); expect(saved.has('opf.awakening.v1')).toBe(false);
    expect(saved.get('opf.keys.v1')).toBe('old classic bytes'); expect(saved.get('opf.keys.simple.v2')).toBe('old simple bytes');
    const input = new KeyboardInput(defaultKeyConfig());
    input.setConfig(config); key('KeyT', true); key('KeyT', false);
    expect(input.snapshot().p1).toBe(Btn.Skill1); input.destroy();
  });
  it('validates both sides and reserved/duplicate keys; successful save uses only the new schema', () => {
    const config = defaultKeyConfig();
    expect(awakeningConflicts({ p1: 'Numpad1', p2: 'KeyT' }, config)[0]).toContain('p2.A');
    expect(awakeningConflicts({ p1: 'Enter', p2: null }, config).length).toBeGreaterThan(0);
    expect(awakeningConflicts({ p1: 'KeyT', p2: 'KeyT' }, config).length).toBeGreaterThan(0);
    expect(saveAwakeningBindings({ p1: 'KeyY', p2: null }, config).saved).toBe(true);
    expect(loadAwakeningBindings(config)).toEqual({ p1: 'KeyY', p2: null });
    expect([...saved.keys()]).toEqual(['opf.awakening.v1']);
  });
  it('corrupt storage is not rewritten; denied storage still supports session remapping', () => {
    saved.set('opf.awakening.v1', 'broken');
    expect(loadAwakeningBindings(defaultKeyConfig())).toEqual({ p1: 'KeyT', p2: 'PageUp' }); expect(saved.get('opf.awakening.v1')).toBe('broken');
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    const hub = new InputHub(); expect(hub.setAwakeningBindings({ p1: 'KeyY', p2: null })).toEqual({ saved: false, conflicts: [] });
    key('KeyY', true); key('KeyY', false); expect(hub.snapshot().p1).toBe(Btn.Awakening); hub.keyboard.destroy();
  });
  it('maps standard left trigger without changing old shoulders and preserves a training tap', () => {
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: [4, 5, 6, 9].includes(i), touched: false, value: 0 }));
    vi.stubGlobal('navigator', { getGamepads: () => [{ connected: true, buttons, axes: [0, 0] }] });
    expect(new GamepadInput().snapshot().p1).toBe(Btn.A | Btn.B | Btn.C | Btn.D | Btn.Start | Btn.Awakening);
    const input = { p1: Btn.Awakening, p2: 0 }, none = { p1: 0, p2: 0 };
    expect(captureTrainingInput(input, input, none)).toEqual(input);
  });
  it('checks the settings draft mode during a paused match without overwriting old profiles', () => {
    const hub = new InputHub(); hub.useMatchControls(['classic', 'classic']);
    const simple = hub.keyConfigFor(['simple', 'simple']); simple.p1.Skill1 = 'KeyY';
    hub.setKeyConfig(simple, ['simple', 'simple']);
    const before = saved.get('opf.keys.v1');
    const rejected = hub.setAwakeningBindings({ p1: 'KeyY', p2: null }, ['simple', 'simple']);
    expect(rejected.conflicts[0]).toContain('p1.Skill1');
    expect(saved.get('opf.keys.v1')).toBe(before);
    expect(hub.setAwakeningBindings({ p1: 'KeyH', p2: null }, ['simple', 'simple']).conflicts).toEqual([]);
    hub.useMatchControls(null); expect(hub.awakeningBindings).toEqual({ p1: 'KeyH', p2: null });
    expect(hub.keyConfig.p1.Skill1).toBe('KeyY'); hub.keyboard.destroy();
  });
});
