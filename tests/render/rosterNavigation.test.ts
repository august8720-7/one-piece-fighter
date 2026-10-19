import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Btn, type InputFrame } from '../../src/core';
import { defaultKeyConfig } from '../../src/input/keymap';
import { moveRosterCursor, rosterDifficultyDirection } from '../../src/render/ui/rosterNavigation';

const mocks = vi.hoisted(() => ({
  input: { controlModes: ['simple', 'simple'], setControlModes: vi.fn(), edges: vi.fn(), keyConfig: {} },
  audio: { play: vi.fn(), playPresentation: vi.fn() },
  downloads: {}, warm: vi.fn(async (_downloads: object, _ids: readonly string[]) => undefined),
}));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/input/InputHub', () => ({ getInputHub: () => mocks.input }));
vi.mock('../../src/audio/Sfx', () => ({ sfx: () => mocks.audio }));
vi.mock('../../src/render/assetDownloads', () => ({ sharedDownloads: () => mocks.downloads, warmFightDownloads: mocks.warm }));
vi.mock('../../src/render/assets', () => ({ areAnimeInterfacesReady: vi.fn(), interfaceFrame: vi.fn(), spriteFrame: vi.fn() }));
import { CharacterSelectScene } from '../../src/render/scenes/CharacterSelectScene';

describe('roster grid navigation', () => {
  it('preserves single-row wrap for the current four fighters', () => {
    expect(moveRosterCursor(0, Btn.Left, 4, 4)).toBe(3);
    expect(moveRosterCursor(3, Btn.Right, 4, 4)).toBe(0);
    expect(moveRosterCursor(2, Btn.Up, 4, 4)).toBe(2);
    expect(moveRosterCursor(0, Btn.Right | Btn.Down, 1, 1)).toBe(0);
  });

  it('moves vertically by column and wraps horizontally inside the visible row for sixteen', () => {
    expect(moveRosterCursor(3, Btn.Down, 16, 8)).toBe(11);
    expect(moveRosterCursor(11, Btn.Up, 16, 8)).toBe(3);
    expect(moveRosterCursor(11, Btn.Down, 16, 8)).toBe(3);
    expect(moveRosterCursor(3, Btn.Up, 16, 8)).toBe(11);
    expect(moveRosterCursor(7, Btn.Right, 16, 8)).toBe(0);
    expect(moveRosterCursor(8, Btn.Left, 16, 8)).toBe(15);
  });

  it('never selects an empty cell in a partial row', () => {
    expect(moveRosterCursor(7, Btn.Down, 10, 8)).toBe(9);
    expect(moveRosterCursor(9, Btn.Up, 10, 8)).toBe(1);
    expect(moveRosterCursor(9, Btn.Right, 10, 8)).toBe(8);
    expect(moveRosterCursor(8, Btn.Left, 10, 8)).toBe(9);
    expect(moveRosterCursor(7, Btn.Down, 9, 8)).toBe(8);
  });

  it('navigates the seven-card third row without selecting the empty twenty-fourth slot', () => {
    expect(moveRosterCursor(15, Btn.Down, 23, 8)).toBe(22);
    expect(moveRosterCursor(7, Btn.Up, 23, 8)).toBe(22);
    expect(moveRosterCursor(22, Btn.Up, 23, 8)).toBe(14);
    expect(moveRosterCursor(22, Btn.Down, 23, 8)).toBe(6);
    expect(moveRosterCursor(22, Btn.Right, 23, 8)).toBe(16);
    expect(moveRosterCursor(16, Btn.Left, 23, 8)).toBe(22);
    for (let index = 0; index < 23; index++) {
      for (const direction of [Btn.Up, Btn.Down, Btn.Left, Btn.Right]) {
        const next = moveRosterCursor(index, direction, 23, 8);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(23);
      }
    }
    expect(rosterDifficultyDirection(Btn.Down, 3)).toBe(0);
    expect(rosterDifficultyDirection(Btn.D, 3)).toBe(1);
  });

  it('cancels opposite directions and makes one move for a diagonal', () => {
    expect(moveRosterCursor(3, Btn.Left | Btn.Right, 16, 8)).toBe(3);
    expect(moveRosterCursor(3, Btn.Up | Btn.Down, 16, 8)).toBe(3);
    expect(moveRosterCursor(3, Btn.Down | Btn.Right, 16, 8)).toBe(11);
    expect(moveRosterCursor(3, 0, 16, 8)).toBe(3);
  });

  it('reserves vertical directions for row navigation while keeping difficulty available', () => {
    expect(rosterDifficultyDirection(Btn.Up, 1)).toBe(-1);
    expect(rosterDifficultyDirection(Btn.Down, 1)).toBe(1);
    expect(rosterDifficultyDirection(Btn.Up | Btn.Down, 1)).toBe(0);
    expect(rosterDifficultyDirection(Btn.Up, 2)).toBe(0);
    expect(rosterDifficultyDirection(Btn.Down, 2)).toBe(0);
    expect(rosterDifficultyDirection(Btn.D, 2)).toBe(1);
  });
});

function mount(mode: 'versus' | 'cpu' | 'training', picks: { p1?: string; p2?: string } = {}) {
  const scene = new CharacterSelectScene();
  const values = new Map<string, unknown>();
  const start = vi.fn();
  Object.assign(scene, {
    registry: { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) },
    scene: { start }, game: {},
  });
  scene.init({ mode, ...picks, art: 'anime', quality: 'high', scope: 'full' });
  // These checks exercise real selection input/routing only, without pretending to validate art.
  Object.assign(scene, { ready: true, step: { advance: () => 1 }, draw: vi.fn() });
  const tick = (p1 = 0, p2 = 0) => {
    mocks.input.edges.mockReturnValue({ p1, p2 } satisfies InputFrame);
    scene.update(0, 1000 / 60);
  };
  return { scene, tick, start, field: (key: string) => Reflect.get(scene, key) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.input.keyConfig = defaultKeyConfig(['simple', 'simple']);
});

describe('character selection confirmation and download boundaries', () => {
  it('allows both players to mirror, confirm, and undo their own lock during the countdown', () => {
    const current = mount('versus');
    current.tick(Btn.Right, 0);
    expect(current.field('cursor')).toEqual([1, 1]);
    expect(mocks.warm).not.toHaveBeenCalled();
    current.tick(Btn.A, Btn.Start);
    expect(current.field('locked')).toEqual([true, true]);
    expect(current.field('countdown')).toBe(45);
    expect(mocks.warm.mock.calls.map(call => call[1])).toEqual([['akainu'], ['akainu']]);
    current.tick(0, Btn.B);
    expect(current.field('locked')).toEqual([true, false]);
    expect(current.field('countdown')).toBe(-1);
    current.tick(Btn.Left, Btn.Right);
    expect(current.field('cursor')).toEqual([1, 2]);
    expect(mocks.warm).toHaveBeenCalledTimes(2);
    current.tick(0, Btn.A);
    current.tick(Btn.B, 0);
    expect(current.field('locked')).toEqual([false, true]);
    expect(current.start).not.toHaveBeenCalled();
  });

  it.each(['cpu', 'training'] as const)('%s lets P1 select both sides and cancel back one step at a time', mode => {
    const current = mount(mode);
    current.tick(0, Btn.Right | Btn.A);
    expect(current.field('locked')).toEqual([false, false]);
    expect(current.field('cursor')).toEqual([0, 1]);
    current.tick(Btn.A);
    current.tick(Btn.Right);
    expect(current.field('cursor')).toEqual([0, 2]);
    expect(mocks.warm).toHaveBeenCalledTimes(1);
    current.tick(Btn.A);
    expect(current.field('locked')).toEqual([true, true]);
    current.tick(Btn.B);
    expect(current.field('locked')).toEqual([true, false]);
    current.tick(Btn.B);
    expect(current.field('locked')).toEqual([false, false]);
    current.tick(Btn.B);
    expect(current.start).toHaveBeenCalledWith('Menu', expect.objectContaining({ art: 'anime', scope: 'full' }));
  });

  it('retains known previous picks and safely falls back for unknown ids', () => {
    expect(mount('versus', { p1: 'twinkle', p2: 'labubu' }).field('cursor')).toEqual([3, 2]);
    expect(mount('versus', { p1: 'unknown', p2: 'unknown' }).field('cursor')).toEqual([0, 1]);
  });

  it('changes CPU difficulty through its separate action without moving or prefetching a pick', () => {
    const current = mount('cpu');
    current.tick(Btn.D);
    expect(current.field('difficulty')).toBe('hard');
    current.tick(Btn.D);
    expect(current.field('difficulty')).toBe('easy');
    expect(current.field('cursor')).toEqual([0, 1]);
    expect(mocks.warm).not.toHaveBeenCalled();
  });

  it('loads only the two confirmed picks after the countdown, preserving CPU settings', () => {
    const current = mount('cpu', { p1: 'twinkle', p2: 'labubu' });
    current.tick(Btn.D);
    current.tick(Btn.A);
    current.tick(Btn.A);
    for (let tick = 0; tick < 45; tick++) current.tick();
    expect(current.start).toHaveBeenCalledOnce();
    expect(current.start).toHaveBeenCalledWith('Preload', expect.objectContaining({
      p1: 'twinkle', p2: 'labubu', mode: 'cpu', difficulty: 'hard', art: 'anime',
      controlModes: ['simple', 'classic'],
    }));
    expect(mocks.warm.mock.calls.map(call => call[1])).toEqual([['twinkle'], ['labubu']]);
  });
});
