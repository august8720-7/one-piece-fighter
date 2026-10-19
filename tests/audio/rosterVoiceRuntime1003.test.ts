import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import candidate from '../../src/audio/rosterVoiceCandidates1003.json';
import samples from '../../src/audio/sampleManifest.json';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { eventCues } from '../../src/audio/audioCues';
import { rosterCandidateEventCues, rosterCandidateLine, rosterVoicePreviewCharacters, verifyRosterVoiceCandidate, withRosterVoiceCandidates } from '../../src/audio/rosterVoiceCandidates1003';
import type { CueCatalog, FightAudioEvent } from '../../src/audio/audioTypes';

describe('first-pair audible DEV candidates (technical, not listening acceptance)', () => {
  it('limits extra banks to explicit participants and keeps every prior cue intact', () => {
    const base = Object.fromEntries(Object.entries(samples.cues).filter(([id]) => !id.startsWith('voice.aokiji.') && !id.startsWith('voice.shanks.'))) as CueCatalog;
    const active = withRosterVoiceCandidates(base, true, ['aokiji']);
    for (const [id, cue] of Object.entries(base)) expect(active[id]).toBe(cue);
    expect(active['voice.aokiji.attack']?.files[0]).toContain('preview-attack');
    expect(active['voice.shanks.attack']).toBeUndefined();
    expect(active[candidate.cueId]).toBeUndefined();
    expect(rosterVoicePreviewCharacters(true, '?rosterPreview=0929&p1=aokiji&p2=aokiji')).toEqual(['aokiji']);
    expect(rosterVoicePreviewCharacters(false, '?rosterPreview=0929&p1=aokiji')).toEqual([]);
    const both = withRosterVoiceCandidates(base, true, ['aokiji', 'shanks']);
    expect(both[candidate.cueId]?.files).toEqual([candidate.file]);
    expect(both['voice.shanks.select.synthetic_candidate']?.files[0]).toContain('preview-select');
  });

  it('retains unreviewed labels and verifies every copied actual WAV without treating ASR as audio quality', async () => {
    expect(candidate.runtime.lines).toHaveLength(16);
    expect(candidate.runtime.lines.every(line => !line.transcriptVerified && !line.nativeAudioReviewed)).toBe(true);
    expect(candidate.runtime.formalAdoptedVoices).toBe(0);
    for (const [file, check] of Object.entries(candidate.runtime.fileChecks)) {
      const data = readFileSync(resolve('public', file));
      const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      await expect(verifyRosterVoiceCandidate(file, bytes)).resolves.toBeUndefined();
      await expect(verifyRosterVoiceCandidate(file, new Uint8Array([1, 2]).buffer)).rejects.toThrow('SHA256 mismatch');
      await expect(verifyRosterVoiceCandidate(file, new Uint8Array([1, 2]).buffer, check.sha256)).resolves.toBeUndefined();
    }
    const line = candidate.runtime.lines[0]!;
    expect(rosterCandidateLine(line.file, true)).toMatchObject({ label: expect.stringContaining('待听觉核验'), transcriptVerified: false });
  });

  it('maps every actual first-pair skill to three declared cues without dedicated original calls', () => {
    const catalog = withRosterVoiceCandidates(samples.cues as CueCatalog, true, ['aokiji', 'shanks']);
    const moves = candidate.runtime.moves as Record<string, Record<string, { dedicatedMoveVoice: boolean; stages: Record<string, string> }>>;
    for (const def of [aokijiDef, shanksDef]) {
      const skills = def.skillSlots!;
      expect(Object.keys(moves[def.id]!)).toEqual(skills);
      for (const id of skills) {
        const profile = moves[def.id]![id]!;
        expect(profile.dedicatedMoveVoice).toBe(false);
        expect(Object.keys(profile.stages)).toEqual(['start', 'release', 'end']);
        for (const cue of Object.values(profile.stages)) expect(catalog[cue]?.files).toHaveLength(1);
      }
    }
    expect(catalog['sfx.aokiji.glacier_line.release']?.files).toEqual(catalog['sfx.aokiji.ice_spike.release']?.files);
  });

  it('uses true spawn/end material after reflection and avoids caster swing or administrative duplicates', () => {
    const catalog = withRosterVoiceCandidates(samples.cues as CueCatalog, true, ['aokiji', 'shanks']);
    const has = (id: string) => !!catalog[id];
    const route = (event: FightAudioEvent) => rosterCandidateEventCues(event, eventCues(event, has), has, true, ['aokiji', 'shanks']).map(cue => cue.id);
    const event: FightAudioEvent = { phase: 'start', characterId: 'aokiji', moveId: 'sp_ice_lance', player: 0, moveInstance: 1 };
    expect(route(event)).toEqual(['voice.aokiji.attack', 'sfx.aokiji.ice_lance.start']);
    expect(route({ ...event, phase: 'swing' })).toEqual([]);
    expect(route({ ...event, phase: 'projectile_spawn', characterId: 'luffy', materialCharacterId: 'aokiji' })).toEqual(['sfx.aokiji.ice_lance.release']);
    expect(route({ ...event, phase: 'projectile_end', endReason: 'timeout' })).toEqual(['sfx.aokiji.ice_lance.end']);
    expect(route({ ...event, phase: 'projectile_end', endReason: 'round_reset' })).toEqual([]);
    expect(route({ ...event, phase: 'projectile_end', endReason: 'hit' })).toEqual([]);
    expect(route({ ...event, phase: 'swing', characterId: 'shanks', moveId: 'sp_single_arm_cut' })).toEqual(['sfx.shanks.single_arm_cut.release']);
    expect(route({ ...event, phase: 'recover', characterId: 'shanks', moveId: 'sp_single_arm_cut' })).toEqual(['sfx.shanks.single_arm_cut.end']);
    const old: FightAudioEvent = { ...event, characterId: 'luffy', moveId: 'sp_gatling' };
    const base = eventCues(old, has);
    expect(rosterCandidateEventCues(old, base, has, true, ['aokiji'])).toBe(base);
    expect(rosterCandidateEventCues(event, base, has, false, ['aokiji'])).toBe(base);
  });
});
