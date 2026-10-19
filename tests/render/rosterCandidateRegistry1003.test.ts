import { describe, expect, it } from 'vitest';
import { characters } from '../../src/characters';
import { rosterCandidates0929 } from '../../src/characters/rosterCandidates0929';
import uiCandidates from '../../src/render/anime/rosterUiCandidates0929.json';

describe('local roster candidate registration', () => {
  it('registers all nineteen unique authoring definitions without changing the default four', () => {
    const ids = rosterCandidates0929.map(({ def }) => def.id);
    expect(ids).toHaveLength(19);
    expect(new Set(ids).size).toBe(19);
    expect(ids.slice(-7)).toEqual(['blackbeard', 'roger', 'rocks', 'shiki', 'rayleigh', 'gaban', 'beckman']);
    expect(Object.keys(characters)).toEqual(['luffy', 'akainu', 'labubu', 'twinkle']);
    for (const { def, ai, anims } of rosterCandidates0929) {
      expect(ai).toBeDefined();
      expect(anims).toBeDefined();
      expect(def.skillSlots).toHaveLength(9);
      for (const moveId of def.skillSlots!) expect(def.moves.some(move => move.id === moveId)).toBe(true);
    }
  });

  it('stores nine static UI candidates with normalized URLs and bounded body/portrait frames', () => {
    expect(uiCandidates.status).toBe('local-authoring-only');
    expect(Object.keys(uiCandidates.characters)).toEqual([
      'aokiji', 'shanks', 'kizaru', 'fujitora', 'ryokugyu', 'garp', 'sengoku', 'zoro', 'sanji',
    ]);
    for (const [id, entry] of Object.entries(uiCandidates.characters)) {
      expect(entry.image.startsWith(`assets/characters/${id}/anime/`)).toBe(true);
      expect(entry.image).not.toContain('\\');
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      for (const frame of [entry.frames.body, entry.frames.portrait]) {
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.w).toBeGreaterThan(0);
        expect(frame.h).toBeGreaterThan(0);
        expect(frame.x + frame.w).toBeLessThanOrEqual(entry.width);
        expect(frame.y + frame.h).toBeLessThanOrEqual(entry.height);
      }
    }
    expect(uiCandidates.characters.aokiji.sha256).toBe('90326357e840d0e00de749198a870157b39bd557a10a8653d88194e0bc0a075c');
    expect(uiCandidates.characters.shanks.sha256).toBe('021cf353c989b42c08136ad2c72a606025d8ba69b1e7a404a8b7a053b71ffe41');
  });
});
