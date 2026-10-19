import { describe, expect, it } from 'vitest';
import { eventCues } from '../../src/audio/audioCues';
import { withSemanticDialogue, verifySemanticDialogue } from '../../src/audio/semanticDialogue1017';
import { voiceLine } from '../../src/audio/voiceLines';
import manifest from '../../src/audio/semanticDialogue1017.json';

describe('真实有意义台词1017', () => {
  it('六人的首局intro只用明确采用完整句，不借普通effort补空', () => {
    const catalog = withSemanticDialogue({});
    for (const characterId of ['luffy', 'akainu', 'labubu', 'twinkle', 'aokiji', 'shanks']) {
      const id = `voice.${characterId}.intro`;
      expect(catalog[id]?.preserveSentence).toBe(true);
      expect(catalog[id]?.files.every(file => voiceLine(file).transcriptVerified && voiceLine(file).text.length > 2)).toBe(true);
      expect(eventCues({ phase: 'intro', characterId, player: 0 }, cue => cue in catalog))
        .toEqual([{ id, player: 0 }]);
    }
    expect(eventCues({ phase: 'intro', characterId: 'luffy', player: 0 }, () => false)).toEqual([]);
  });

  it('真实盲听旧路飞原句覆盖原来未知字幕，源音不重配', () => {
    expect(voiceLine('assets/audio/voice/luffy/daily-idle-1-0914.wav'))
      .toEqual({ text: '好，开打吧！', transcriptVerified: true });
    expect(voiceLine('assets/audio/voice/luffy/candidate-review-win-0912.wav'))
      .toEqual({ text: '把你打飞了！', transcriptVerified: true });
  });

  it('普通招和五档启动都优先精确台词，退场句只在真实退出触发', () => {
    for (const moveId of ['st_c', 'g5_awakening', 'g5_elastic_rush']) {
      const id = `voice.luffy.${moveId}`;
      const cues = eventCues({ phase: 'start', characterId: 'luffy', player: 0, moveId }, cue => cue === id);
      expect(cues.filter(cue => cue.id.startsWith('voice.'))).toEqual([{ id, player: 0 }]);
    }
    expect(eventCues({ phase: 'form_exit', characterId: 'luffy', player: 1, moveId: 'g5_exit' }, cue => cue === 'voice.luffy.g5_exit'))
      .toContainEqual({ id: 'voice.luffy.g5_exit', player: 1 });
  });

  it('编码bank仍绑定精确已核原音身份，不接受错误SHA', async () => {
    const file = 'assets/audio/voice/luffy/daily-idle-1-0914.wav';
    const expected = manifest.fileChecks[file].sha256;
    await expect(verifySemanticDialogue(file, new ArrayBuffer(0), expected)).resolves.toBeUndefined();
    await expect(verifySemanticDialogue(file, new ArrayBuffer(0), '0'.repeat(64))).rejects.toThrow('source SHA256');
  });

  it('抓到你只在真实throw连接时说，起手/打空不冒称抓住', () => {
    const id = 'voice.labubu.sp_leg_flip_connected';
    expect(eventCues({ phase: 'start', characterId: 'labubu', player: 0, moveId: 'sp_leg_flip' }, cue => cue === id)
      .some(cue => cue.id === id)).toBe(false);
    expect(eventCues({ phase: 'throw', characterId: 'labubu', player: 0, moveId: 'sp_leg_flip' }, cue => cue === id))
      .toContainEqual({ id, player: 0 });
  });
});
