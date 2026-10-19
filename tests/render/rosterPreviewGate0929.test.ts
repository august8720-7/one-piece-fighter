import { describe, expect, it } from 'vitest';
import { totalFrames } from '../../src/core';
import { characters } from '../../src/characters';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { evaluateAnimeEntry } from '../../src/render/anime/entryGate';
import type { AnimeRuntimeManifest } from '../../src/render/animations';

// Schema-only fixtures do not supply or approve character artwork.
function sampleRuntime(): AnimeRuntimeManifest {
  const runtime: AnimeRuntimeManifest = {
    schemaVersion: 1, characterId: 'aokiji', style: 'anime', continuous: true,
    atlas: { image: 'atlas.png', data: 'atlas.json' }, anims: {}, attachments: {},
  };
  for (const name of ['idle', 'walk_fwd', 'walk_back', 'crouch', 'block_stand', 'block_crouch', 'hit_stand', 'hit_crouch', 'st_a']) {
    const move = aokijiDef.moves.find(item => item.id === name);
    runtime.anims[name] = { frames: 1, fps: 60, loop: !move, pixelArt: false, exposures: [{ frame: 0, ticks: move ? totalFrames(move) : 12 }] };
    runtime.attachments[`aokiji/${name}/0`] = { size: { width: 160, height: 400 }, root: { x: 80, y: 400 }, sockets: {} };
  }
  return runtime;
}

describe('explicit roster authoring still enforces coverage', () => {
  it('accepts a registered sample while rejecting incomplete reactions and full matches', () => {
    expect(characters.aokiji).toBeUndefined();
    const runtime = sampleRuntime();
    const assets = { aokiji: { key: 'fixture-only', runtime } };
    const sample = { art: 'anime', quality: 'high', scope: 'sample' } as const;
    const pair = [aokijiDef, aokijiDef] as const;
    expect(evaluateAnimeEntry(sample, pair, assets, {}, 'training').issues).toContain('青雉：unsupported sample character');
    characters.aokiji = aokijiDef;
    try {
      expect(evaluateAnimeEntry(sample, pair, assets, {}, 'training').ok).toBe(true);
      expect(evaluateAnimeEntry(sample, pair, assets, {}, 'cpu').ok).toBe(false);
      expect(evaluateAnimeEntry({ ...sample, scope: 'full' }, pair, assets, {}, 'training').ok).toBe(false);
      delete runtime.anims.block_crouch;
      expect(evaluateAnimeEntry(sample, pair, assets, {}, 'training').issues.join(' ')).toContain('block_crouch');
    } finally {
      delete characters.aokiji;
    }
  });
});
