import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FightSim } from '../../src/core';
import { luffyDef } from '../../src/characters/luffy/def';
import { akainuDef } from '../../src/characters/akainu/def';
import { defaultKeyConfig } from '../../src/input/keymap';

const shared = vi.hoisted(() => ({ input: { controlModes: ['simple', 'simple'], keyConfig: {}, edges: vi.fn(() => ({ p1: 0, p2: 0 })), flush: vi.fn() } }));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/input/InputHub', () => ({ getInputHub: () => shared.input }));
vi.mock('../../src/audio/Sfx', () => ({ sfx: () => ({ pause: vi.fn(), resume: vi.fn() }) }));
import { FightScene, type FightSceneData } from '../../src/render/scenes/FightScene';
import { RolePracticeSession, ROLE_PRACTICES } from '../../src/render/ui/rolePractice';

function fixture() {
  const scene = new FightScene(), start = vi.fn(), reset = vi.fn(), discard = vi.fn(), sync = vi.fn();
  const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0, roundTime: -1, controlModes: ['simple', 'classic'] });
  const coach = { showSession: vi.fn(), showDirectory: vi.fn(), free: vi.fn(), refresh: vi.fn(), closeMenu: vi.fn(), updateMenu: vi.fn(), blocksSimulation: false };
  const data: FightSceneData = { p1: 'luffy', p2: 'akainu', mode: 'training', controlModes: ['simple', 'classic'], art: 'anime', scope: 'full', quality: 'high', rolePractice: 'luffy.long_punch', tutorial: true };
  Object.assign(scene, { mode: 'training', data_: data, sim, roleCoach: coach, roleSession: new RolePracticeSession(ROLE_PRACTICES[0]!), sample: null,
    scene: { start }, resetTraining: reset, discardPendingInput: discard, syncAudioPause: sync });
  const action = (value: object) => Reflect.apply(Reflect.get(scene, 'handleRolePractice'), scene, [value]);
  return { scene, start, reset, discard, sync, sim, coach, data, action };
}
beforeEach(() => { vi.clearAllMocks(); shared.input.keyConfig = defaultKeyConfig(['simple', 'simple']); });

describe('tactical scene routing', () => {
  it('changing to a required opponent returns through real preload with the stable id', () => {
    const f = fixture();
    f.action({ kind: 'choose', id: 'luffy.rocket_entry' });
    expect(f.reset).toHaveBeenCalledOnce();
    expect((Reflect.get(f.scene, 'roleSession') as RolePracticeSession).practice.id).toBe('luffy.rocket_entry');
    f.data.p2 = 'twinkle';
    f.action({ kind: 'choose', id: 'luffy.balloon_reflect' });
    expect(f.start).toHaveBeenCalledWith('Preload', expect.objectContaining({ p1: 'luffy', p2: 'akainu', mode: 'training', rolePractice: 'luffy.balloon_reflect', tutorial: false, art: 'anime' }));
  });
  it('optional CPU starts a new ordinary match without either tutorial flag', () => {
    const f = fixture(); f.sim.training = { infiniteHp: true, infiniteMeter: true };
    f.action({ kind: 'cpu' });
    const next = f.start.mock.calls[0]![1] as FightSceneData;
    expect(next.mode).toBe('cpu'); expect(next.difficulty).toBe('easy');
    expect(next.rolePractice).toBeUndefined(); expect(next.tutorial).toBeUndefined();
    expect(next.p1).toBe('luffy'); expect(next.art).toBe('anime');
    expect(Reflect.get(next, 'training')).toBeUndefined(); expect(Reflect.get(next, 'sim')).toBeUndefined();
  });
  it('entering the directory suspends basic coaching without marking it skipped or complete', () => {
    const f = fixture(), suspend = vi.fn(), skip = vi.fn();
    Object.assign(f.scene, { tutorial: { suspend, skip } });
    f.action({ kind: 'directory' });
    expect(suspend).toHaveBeenCalledOnce(); expect(skip).not.toHaveBeenCalled();
    expect(f.coach.showDirectory).toHaveBeenCalledOnce();
  });
  it('leaving for free practice clears the controlled attempt and restores ordinary training', () => {
    const f = fixture(); f.action({ kind: 'free' });
    expect(Reflect.get(f.scene, 'roleSession')).toBeNull(); expect(f.data.rolePractice).toBeUndefined();
    expect(f.coach.free).toHaveBeenCalledOnce(); expect(f.reset).toHaveBeenCalledOnce();
    expect(f.sim.training).toEqual({ infiniteHp: true, infiniteMeter: true });
  });
  it('a practice menu consumes UI input while combat stays at the same frame', () => {
    const f = fixture(), draw = vi.fn(), frame = f.sim.state.frame;
    f.coach.blocksSimulation = true;
    Object.assign(f.scene, { ready: true, diagnostics: null, step: { advance: () => 1 }, settingsOverlay: false, paused: false, moveList: null, checkGamepadDisconnect: vi.fn(), drawWorld: draw });
    f.scene.update(0, 17);
    expect(f.coach.updateMenu).toHaveBeenCalledOnce(); expect(f.sim.state.frame).toBe(frame); expect(draw).toHaveBeenCalledOnce();
  });
});
