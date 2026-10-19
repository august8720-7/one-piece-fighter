import { describe, expect, it } from 'vitest';
import { availablePcRosterIds, releasedPcRosterIds, withAvailableRosterAudio } from '../../src/characters/rosterAvailability1004';
import samples from '../../src/audio/sampleManifest.json';
import type { CueCatalog } from '../../src/audio/audioTypes';

describe('reviewed audio does not promote an incomplete character', () => {
  it('keeps the accepted voices out of the default four-role menu and its downloads', () => {
    const catalog = samples.cues as CueCatalog;
    expect(catalog['voice.aokiji.select']).toBeDefined();
    const active = withAvailableRosterAudio(catalog, []);
    expect(active['voice.aokiji.select']).toBeUndefined();
    expect(active['voice.shanks.select']).toBeUndefined();
    for (const id of ['voice.luffy.select', 'voice.akainu.select', 'voice.labubu.select', 'voice.twinkle.select']) {
      expect(active[id]).toBe(catalog[id]);
    }
  });
  it('allows explicit current participants without leaking another prepared character', () => {
    expect(availablePcRosterIds(true, '?rosterPreview=0929&p1=aokiji&p2=aokiji')).toEqual(['aokiji']);
    expect(availablePcRosterIds(false, '?rosterPreview=0929&p1=aokiji')).toEqual([]);
    const active = withAvailableRosterAudio(samples.cues as CueCatalog, ['aokiji']);
    expect(active['voice.aokiji.attack']).toBeDefined();
    expect(active['voice.shanks.attack']).toBeUndefined();
  });
  it('requires an explicit completed-PC marker rather than a UI image or a generic enabled flag', () => {
    expect(releasedPcRosterIds({ aokiji: { enabled: true }, shanks: { pcRosterAccepted: true, enabled: false },
      unknown: { pcRosterAccepted: true } })).toEqual([]);
    expect(releasedPcRosterIds({ aokiji: { pcRosterAccepted: true } })).toEqual(['aokiji']);
  });
});
