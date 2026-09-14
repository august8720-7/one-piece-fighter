import { describe, expect, it } from 'vitest';
import { totalFrames, type FighterDef } from '../../src/core';
import { akainuDef, luffyDef } from '../../src/characters';
import { DEFAULT_ANIMS, type AnimeRuntimeManifest } from '../../src/render/animations';
import type { AnimeCharacterAssets } from '../../src/render/assets';
import { evaluateAnimeEntry } from '../../src/render/anime/entryGate';

const profile = { art: 'anime', quality: 'high', scope: 'full' } as const;
function completeRuntime(def: FighterDef): AnimeRuntimeManifest {
  const runtime: AnimeRuntimeManifest = { schemaVersion: 1, characterId: def.id, style: 'anime', continuous: true, atlas: { image: 'atlas.png', data: 'atlas.json' }, anims: {}, attachments: {} };
  for (const name of [...Object.keys(DEFAULT_ANIMS), ...def.moves.map(move => move.id)]) {
    const move = def.moves.find(move => move.id === name);
    runtime.anims[name] = { frames: 1, fps: 60, loop: !move, pixelArt: false, exposures: [{ frame: 0, ticks: move ? totalFrames(move) : 8 }], ...(move?.throwData ? { throwExposures: [{ frame: 0, ticks: move.throwData.duration ?? totalFrames(move) }] } : {}) };
    runtime.attachments[`${def.id}/${name}/0`] = { size: { width: 80, height: 160 }, root: { x: 40, y: 160 }, sockets: {} };
  }
  return runtime;
}
const fixture = (): AnimeCharacterAssets => ({ luffy: { key: 'luffy-new', runtime: completeRuntime(luffyDef) }, akainu: { key: 'akainu-new', runtime: completeRuntime(akainuDef) } });

describe('anime entry before FightSim', () => {
  it('rejects missing assets and declared decode errors without selecting an old fighter', () => {
    const missing = evaluateAnimeEntry(profile, [luffyDef, akainuDef], {}, { luffy: 'decode failed' }, 'cpu');
    expect(missing.ok).toBe(false);
    expect(missing.kind).toBe('load-error');
    expect(missing.issues.join(' ')).toContain('decode failed');
    expect(missing.scope).toBe('full');
  });

  it('requires every move and KO/win/reaction state for complete matches', () => {
    const assets = fixture();
    expect(evaluateAnimeEntry(profile, [luffyDef, akainuDef], assets, {}, 'cpu').ok).toBe(true);
    delete assets.akainu!.runtime.anims.ko;
    delete assets.luffy!.runtime.anims.sp_gatling;
    const gate = evaluateAnimeEntry(profile, [luffyDef, akainuDef], assets, {}, 'cpu');
    expect(gate.kind).toBe('coverage-error');
    expect(gate.issues.join(' ')).toContain('ko');
    expect(gate.issues.join(' ')).toContain('sp_gatling');
    expect(gate.scope).toBe('full');
  });

  it('a sample request can never launch a normal CPU match', () => {
    const gate = evaluateAnimeEntry({ ...profile, scope: 'sample' }, [luffyDef, akainuDef], fixture(), {}, 'cpu');
    expect(gate.ok).toBe(false);
    expect(gate.issues.join(' ')).toContain('只开放训练');
  });

  it('checks throws against connected timelines and leaves combat definitions unchanged', () => {
    const before = JSON.stringify([luffyDef, akainuDef]);
    const assets = fixture();
    const throwMove = luffyDef.moves.find(move => move.throwData)!;
    delete assets.luffy!.runtime.anims[throwMove.id]!.throwExposures;
    expect(evaluateAnimeEntry(profile, [luffyDef, akainuDef], assets, {}, 'versus').ok).toBe(false);
    expect(JSON.stringify([luffyDef, akainuDef])).toBe(before);
  });
});
