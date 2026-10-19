import { describe, expect, it } from 'vitest';
import sampleManifest from '../../src/audio/sampleManifest.json';
import candidate from '../../src/audio/rosterVoiceCandidates1003.json';
import { rosterCandidateLine, rosterVoicePreviewEnabled, verifyRosterVoiceCandidate, withRosterVoiceCandidates } from '../../src/audio/rosterVoiceCandidates1003';
import type { CueCatalog } from '../../src/audio/audioTypes';

describe('reviewed roster voice development boundary', () => {
  it('requires DEV, the explicit preview and Shanks as an actual requested participant', () => {
    const preview = '?rosterPreview=0929&p1=shanks&p2=luffy';
    expect(rosterVoicePreviewEnabled(true, preview)).toBe(true);
    expect(rosterVoicePreviewEnabled(false, preview)).toBe(false);
    expect(rosterVoicePreviewEnabled(true, '?p1=shanks')).toBe(false);
    expect(rosterVoicePreviewEnabled(true, '?rosterPreview=0929&p1=aokiji')).toBe(true);
    expect(rosterVoicePreviewEnabled(true, '?rosterPreview=0929&p2=shanks')).toBe(true);
  });

  it('keeps every old cue unchanged and only adds the reviewed select file when enabled', () => {
    // Historical preview boundary fixture: this exact select is now reviewed
    // and staged in the main catalog, so it is absent only from this fixture.
    const base = Object.fromEntries(Object.entries(sampleManifest.cues).filter(([id]) => id !== candidate.cueId)) as CueCatalog;
    expect(withRosterVoiceCandidates(base, false)).toBe(base);
    const active = withRosterVoiceCandidates(base, true);
    expect(Object.keys(active)).toHaveLength(Object.keys(base).length + 1);
    for (const [id, cue] of Object.entries(base)) expect(active[id]).toBe(cue);
    expect(base[candidate.cueId]).toBeUndefined();
    expect(active[candidate.cueId]).toMatchObject({ files: [candidate.file], group: 'voice', characterId: 'shanks' });
    expect(rosterCandidateLine(candidate.file, false)).toBeUndefined();
    expect(rosterCandidateLine(candidate.file, true)).toMatchObject({
      original: '上がってこい', translation: '上来吧。', transcriptVerified: true,
      sha256: candidate.sha256, nativeReview: { inputAudioAttached: true, humanListened: false },
    });
    expect(rosterCandidateLine('assets/audio/voice/shanks/other.wav', true)).toBeUndefined();
  });

  it('never replaces formally reviewed wording/files with an older unreviewed DEV candidate', () => {
    const formal = sampleManifest.cues as CueCatalog;
    const active = withRosterVoiceCandidates(formal, true, ['aokiji', 'shanks']);
    for (const id of ['voice.aokiji.attack', 'voice.aokiji.effort', 'voice.shanks.attack', candidate.cueId]) {
      expect(active[id]).toBe(formal[id]);
    }
  });

  it('rejects changed candidate bytes without imposing a new hash rule on old audio', async () => {
    await expect(verifyRosterVoiceCandidate(candidate.file, new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow('SHA256 mismatch');
    await expect(verifyRosterVoiceCandidate('assets/audio/voice/luffy/existing.wav', new ArrayBuffer(0))).resolves.toBeUndefined();
  });
});
