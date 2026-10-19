import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FightOpeningSpeech, type OpeningSpeaker, type OpeningSpeechAudio } from '../../src/render/ui/fightOpeningSpeech1017';
import type { VoicePlayback } from '../../src/audio/audioTypes';
import { Btn, FightSim } from '../../src/core';
import { luffyDef, akainuDef } from '../../src/characters';

const shared = vi.hoisted(() => ({
  input: { snapshot: vi.fn(() => ({ p1: 0, p2: 0 })), edges: vi.fn(() => ({ p1: 0, p2: 0 })), flush: vi.fn() },
  audio: { voicePlaying: vi.fn(() => false), clearFightSounds: vi.fn(), playCue: vi.fn(), playPresentation: vi.fn() },
}));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/input/InputHub', () => ({ getInputHub: () => shared.input }));
vi.mock('../../src/audio/Sfx', () => ({ sfx: () => shared.audio }));
import { FightScene } from '../../src/render/scenes/FightScene';
import { CharacterSelectScene } from '../../src/render/scenes/CharacterSelectScene';

const speakers: OpeningSpeaker[] = [{ characterId: 'luffy', player: 0 }, { characterId: 'akainu', player: 1 }];
function rig(options: { audible?: boolean; missing?: number[]; duration?: number } = {}) {
  let listener: (line: VoicePlayback | null) => void = () => {};
  let audible = options.audible ?? true;
  const played: OpeningSpeaker[] = [];
  const unsubscribe = vi.fn();
  const line = (speaker: OpeningSpeaker): VoicePlayback => ({
    cueId: `voice.${speaker.characterId}.intro`, player: speaker.player, file: '/fixture.wav',
    text: 'fixture wording', transcriptVerified: true, durationMs: options.duration ?? 1400,
  });
  const audio: OpeningSpeechAudio = {
    audible: () => audible,
    onVoice: callback => { listener = callback; return unsubscribe; },
    playIntro: speaker => { played.push(speaker); if (!options.missing?.includes(speaker.player)) listener(line(speaker)); },
  };
  return { opening: new FightOpeningSpeech(speakers, audio), played, unsubscribe,
    end: () => listener(null), emit: (speaker: OpeningSpeaker) => listener(line(speaker)), mute: () => { audible = false; } };
}
beforeEach(() => {
  vi.clearAllMocks(); shared.input.snapshot.mockReturnValue({ p1: 0, p2: 0 }); shared.input.edges.mockReturnValue({ p1: 0, p2: 0 });
  shared.audio.voicePlaying.mockReturnValue(false);
});
describe('first-round meaningful speech prelude', () => {
  it('starts P2 only after actual P1 completion, then finishes before normal round cue', () => {
    const r = rig(); r.opening.tick(0);
    expect(r.played.map(speaker => speaker.player)).toEqual([0]);
    r.opening.tick(1000); expect(r.played).toHaveLength(1);
    r.end(); r.opening.tick(17); expect(r.played.map(speaker => speaker.player)).toEqual([0, 1]);
    r.end(); r.opening.tick(17); expect(r.opening.active).toBe(false); expect(r.unsubscribe).toHaveBeenCalledOnce();
  });
  it('missing/inaudible lines do not add a silent wait; mute and skip are immediate', () => {
    const missing = rig({ missing: [0, 1] }); missing.opening.tick(0); expect(missing.opening.active).toBe(false);
    const muted = rig({ audible: false }); muted.opening.tick(0); expect(muted.opening.active).toBe(false); expect(muted.played).toHaveLength(0);
    const skipping = rig(); skipping.opening.tick(0); skipping.opening.tick(1, true);
    expect(skipping.opening.active).toBe(false); expect(skipping.played).toHaveLength(1);
    const muting = rig(); muting.opening.tick(0); muting.mute(); muting.opening.tick(1); expect(muting.opening.active).toBe(false);
  });
  it('guards a missing end notification with actual duration and a bounded total', () => {
    const r = rig({ duration: 1400 }); r.opening.tick(0); r.opening.tick(1549); expect(r.played).toHaveLength(1);
    r.opening.tick(1); expect(r.played).toHaveLength(2);
    r.opening.tick(1550); expect(r.opening.active).toBe(false);
    const long = rig({ duration: 10000 }); long.opening.tick(0); long.opening.tick(long.opening.maxMs); expect(long.opening.active).toBe(false);
  });

  it.each([1700, 4000])('lets a complete %ims mirror pair finish, rather than clearing the second sentence at3400ms', duration => {
    const r = rig({ duration }); r.opening.tick(0);
    r.opening.tick(duration); r.end(); r.opening.tick(17);
    expect(r.played).toHaveLength(2);
    r.opening.tick(duration);
    expect(r.opening.active).toBe(true);
    r.end(); r.opening.tick(17);
    expect(r.opening.active).toBe(false);
    expect(r.unsubscribe).toHaveBeenCalledOnce();
  });
  it('real Akainu1700ms pair without end callbacks advances at1850ms each and remains bounded', () => {
    const r = rig({ duration: 1700 }); r.opening.tick(0); r.opening.tick(1850);
    expect(r.played).toHaveLength(2); expect(r.opening.active).toBe(true); expect(r.opening.maxMs).toBe(3950);
    r.opening.tick(1849); expect(r.opening.active).toBe(true);
    r.opening.tick(1); expect(r.opening.active).toBe(false);
  });
  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1_000_000])('abnormal duration%s cannot create an infinite prelude', duration => {
    const r = rig({ duration }); r.opening.tick(0);
    expect(Number.isFinite(r.opening.maxMs)).toBe(true);
    expect(r.opening.maxMs).toBeLessThanOrEqual(20550);
    r.opening.tick(30000); expect(r.opening.active).toBe(false);
  });
  it('FightScene holds the untouched core at frame0/intro0; Start exits without also pausing', () => {
    const scene = new FightScene(), r = rig(), sim = new FightSim({ p1: luffyDef, p2: akainuDef });
    const draw = vi.fn(), discard = vi.fn(), round = vi.fn();
    r.opening.tick(0);
    Object.assign(scene, { ready: true, diagnostics: null, step: { advance: () => 1 }, sim,
      settingsOverlay: false, paused: false, moveList: null, checkGamepadDisconnect: vi.fn(),
      openingSpeech: r.opening, drawWorld: draw, discardPendingInput: discard, playRoundAnnouncement: round });
    scene.update(0, 17); expect(sim.state).toMatchObject({ frame: 0, phase: 'intro', phaseFrame: 0 }); expect(round).not.toHaveBeenCalled();
    shared.input.snapshot.mockReturnValue({ p1: Btn.Start, p2: 0 }); scene.update(17, 17);
    expect(Reflect.get(scene, 'openingSpeech')).toBeNull(); expect(Reflect.get(scene, 'paused')).toBe(false);
    expect(sim.state).toMatchObject({ frame: 0, phaseFrame: 0 }); expect(round).toHaveBeenCalledOnce(); expect(discard).toHaveBeenCalledOnce();
    expect(shared.audio.clearFightSounds).toHaveBeenCalledOnce();
  });
  it('select countdown waits only for a truly playing confirmation and allows Start at any point', () => {
    const scene = new CharacterSelectScene(), start = vi.fn();
    Object.assign(scene, { ready: true, step: { advance: () => 1 }, countdown: 1, locked: [true, true], start, draw: vi.fn() });
    shared.audio.voicePlaying.mockReturnValue(true); scene.update(0, 17);
    expect(start).not.toHaveBeenCalled(); expect(Reflect.get(scene, 'countdown')).toBe(1);
    shared.audio.voicePlaying.mockReturnValue(false); scene.update(17, 17); expect(start).toHaveBeenCalledOnce();
    start.mockClear(); Object.assign(scene, { countdown: 35 });
    shared.input.edges.mockReturnValue({ p1: Btn.Start, p2: 0 }); scene.update(34, 17); expect(start).toHaveBeenCalledOnce();
  });
  it('muted/missing selection proceeds on the original45tick deadline and a stuck voice has a cap', () => {
    const scene = new CharacterSelectScene(), start = vi.fn();
    Object.assign(scene, { ready: true, step: { advance: () => 1 }, countdown: 1, locked: [true, true], start, draw: vi.fn() });
    scene.update(0, 17); expect(start).toHaveBeenCalledOnce();
    start.mockClear(); Object.assign(scene, { countdown: 1, selectionWait: 180 });
    shared.audio.voicePlaying.mockReturnValue(true); scene.update(17, 17); expect(start).toHaveBeenCalledOnce();
  });
});
