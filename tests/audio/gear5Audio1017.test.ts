import { describe, expect, it } from 'vitest';
import { createCueCatalog, eventCues } from '../../src/audio/audioCues';
import type { CueCatalog, FightAudioEvent } from '../../src/audio/audioTypes';
import samples from '../../src/audio/sampleManifest.json';
import { victoryVoiceFrame } from '../../src/audio/voiceTiming';

const event = (patch: Partial<FightAudioEvent>): FightAudioEvent => ({
  phase: 'start', characterId: 'luffy', player: 0, ...patch,
});
const catalog = createCueCatalog(samples.cues as CueCatalog);

describe('五档实际声音事件1017', () => {
  it.each([
    ['g5_awakening', 'stretch'], ['g5_elastic_rush', 'gatling'],
    ['g5_bounce_slam', 'gigant'], ['g5_rising_whip', 'stretch'],
  ])('%s按实际起手、挥出、收招复用已采用橡胶音，不发虚构招名', (moveId, family) => {
    for (const [phase, stage] of [['start', 'start'], ['swing', 'release'], ['recover', 'end']] as const) {
      const cues = eventCues(event({ moveId, phase }), id => id in catalog);
      expect(cues).toEqual([
        { id: `sfx.luffy.${family}.${stage}`, player: 0 },
        ...(phase === 'start' ? [{ id: 'voice.luffy.effort', player: 0 as const }] : []),
      ]);
      expect(catalog[`sfx.luffy.${family}.${stage}`]?.files.length).toBeGreaterThan(0);
    }
  });

  it('五档退场只有真实退出事件收回橡胶，不借受击台词假装疲劳配音', () => {
    expect(eventCues(event({ phase: 'form_exit', moveId: 'g5_exit', player: 1 }), id => id in catalog))
      .toEqual([{ id: 'sfx.luffy.stretch.end', player: 1 }]);
    expect(eventCues(event({ phase: 'form_exit', moveId: 'g5_awakening' }), () => true)).toEqual([]);
    expect(eventCues(event({ phase: 'form_exit', moveId: 'g5_exit', characterId: 'akainu' }), () => true)).toEqual([]);
  });

  it('五档真实命中仍用伤害/反击与受击者决定接触声，不按招名预播命中', () => {
    expect(eventCues(event({ phase: 'hit', moveId: 'g5_bounce_slam', damage: 150,
      defenderId: 'shanks', defenderPlayer: 1 }), () => true))
      .toEqual([{ id: 'hit_heavy', player: 0 }, { id: 'voice.shanks.hurt', player: 1 }]);
    expect(eventCues(event({ phase: 'block', moveId: 'g5_bounce_slam' }), () => true))
      .toEqual([{ id: 'block', player: 0 }]);
  });

  it('复用不新建声音资源或修改已采用路飞短声/旧招映射', () => {
    expect(catalog['voice.luffy.effort']?.files).toEqual(samples.cues['voice.luffy.effort'].files);
    expect(Object.keys(catalog).filter(id => id.includes('.g5_'))).toEqual([]);
    expect(eventCues(event({ moveId: 'sp_gatling' }), id => id in catalog))
      .toEqual([{ id: 'sfx.luffy.gatling.start', player: 0 }, { id: 'voice.luffy.attack', player: 0 }]);
  });

  it('保留星星人1.944秒原胜利音频，提前触发让整句在清声前播完', () => {
    expect((150 - victoryVoiceFrame('twinkle')) / 60).toBeGreaterThanOrEqual(1.944);
    expect(victoryVoiceFrame('twinkle')).toBe(32);
    for (const id of ['luffy', 'akainu', 'labubu', 'aokiji', 'shanks']) expect(victoryVoiceFrame(id)).toBe(40);
  });
});
