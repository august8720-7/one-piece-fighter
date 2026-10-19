import { afterEach, describe, expect, it, vi } from 'vitest';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { akainuDef } from '../../src/characters/akainu/def';
import { ROSTER_FX_CANDIDATES, rosterFxPreviewEnabled, rosterMoveFxIssues, rosterMoveFxReferences } from '../../src/render/fx/rosterFxCandidates1003';
import { presentationResources } from '../../src/render/resourcePlan';
import { createSampleFighter, sampleMoveIssues } from '../../src/render/anime/sampleMode';
import type { AnimeRuntimeManifest } from '../../src/render/animations';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('explicit candidate projectile FX', () => {
  it('connects preview kinds to existing projectile rendering and reflected contact materials', async () => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { search: '?rosterPreview=0929' } });
    vi.resetModules();
    const presentation = await import('../../src/render/fx/movePresentation');
    expect(presentation.PROJECTILE_PRESENTATIONS.aokiji_ice_lance).toMatchObject({ character: 'aokiji', frame: 'ice_lance', contactBody: true });
    expect(presentation.PROJECTILE_PRESENTATIONS.shanks_haki_slash).toMatchObject({ character: 'shanks', frame: 'haki_wave', contactBody: true });
    expect(presentation.projectileMoveMaterial('sp_ice_lance')).toBe('aokiji');
    expect(presentation.projectileMoveMaterial('sp_haki_slash')).toBe('shanks');
    expect(presentation.MOVE_PRESENTATIONS.shanks?.sp_haki_slash?.impact).toBe('haki_impact');
    expect(presentation.PROJECTILE_PRESENTATIONS.dog?.character).toBe('akainu');
  });

  it('matches the real move kinds and leaves release/menu plans isolated', () => {
    for (const [def, moveId, kind] of [[aokijiDef, 'sp_ice_lance', 'aokiji_ice_lance'], [shanksDef, 'sp_haki_slash', 'shanks_haki_slash']] as const) {
      const move = def.moves.find(item => item.id === moveId)!;
      expect(move.projectiles!.map(item => item.kind)).toEqual([kind]);
      expect(ROSTER_FX_CANDIDATES[def.id]!.projectiles[kind]?.character).toBe(def.id);
    }
    expect(rosterFxPreviewEnabled(false, '?rosterPreview=0929')).toBe(false);
    expect(rosterFxPreviewEnabled(true, '')).toBe(false);
    expect(presentationResources('fight', ['aokiji']).unknownCharacterIds).toEqual(['aokiji']);
    expect(presentationResources('menu', ['aokiji'], true).resources.some(item => item.key === 'fx-aokiji')).toBe(false);
    const plan = presentationResources('fight', ['aokiji', 'aokiji'], true);
    expect(plan.unknownCharacterIds).toEqual([]);
    expect(plan.resources.filter(item => item.key === 'fx-aokiji')).toHaveLength(1);
    expect(plan.resources.some(item => item.key === 'fx-shanks')).toBe(false);
  });

  it.each([[aokijiDef, 'sp_ice_lance'], [shanksDef, 'sp_haki_slash']] as const)('keeps $0.id projectile closed until both body and impact textures exist', (def, moveId) => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { search: '?rosterPreview=0929' } });
    const move = def.moves.find(item => item.id === moveId)!;
    // Schema fixture tests the filter only; it is not actual artwork acceptance.
    const runtime = { characterId: def.id, anims: Object.fromEntries(
      [moveId, 'hit_air', 'knockdown', 'getup'].map(id => [id, { frames: 1, fps: 60, loop: false }]),
    ), attachments: {} } as unknown as AnimeRuntimeManifest;
    const entry = ROSTER_FX_CANDIDATES[def.id]!;
    expect(sampleMoveIssues(move, runtime, runtime).join(' ')).toContain('缺少实际特效');
    expect(createSampleFighter(def, runtime, { opponentRuntime: runtime }).moves).not.toContain(move);
    for (const absent of rosterMoveFxReferences(def.id, move)) {
      const hasFxFrame = (key: string, frame: string) => key === `fx-${def.id}` && entry.frames.includes(frame) && frame !== absent;
      expect(sampleMoveIssues(move, runtime, runtime, hasFxFrame).join(' ')).toContain(absent);
    }
    const hasFxFrame = (key: string, frame: string) => key === `fx-${def.id}` && entry.frames.includes(frame);
    expect(sampleMoveIssues(move, runtime, runtime, hasFxFrame)).toEqual([]);
    expect(createSampleFighter(def, runtime, { opponentRuntime: runtime, hasFxFrame }).moves).toContain(move);
    expect(rosterMoveFxIssues(def.id, { ...move, projectiles: [{ ...move.projectiles![0]!, kind: 'unmapped' }] }, hasFxFrame).join(' ')).toContain('unmapped');
    expect(rosterMoveFxIssues(def.id, { ...move, id: 'not_declared' }, hasFxFrame).join(' ')).toContain('未声明');
  });

  it('does not impose the candidate filter on existing released projectile rules', () => {
    const move = akainuDef.moves.find(item => item.projectiles?.length)!;
    expect(rosterMoveFxIssues('akainu', move)).toEqual([]);
  });

  it('blocks actual spike clips until the animation and dissolution are both loaded', () => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { search: '?rosterPreview=0929' } });
    const move = aokijiDef.moves.find(item => item.id === 'sp_ice_spike')!;
    expect(rosterMoveFxReferences('aokiji', move)).toEqual(['ice_spike', 'ice_impact', 'ice_spike_fade']);
    expect(rosterMoveFxIssues('aokiji', move, (_key, ref) => ref !== 'ice_spike_fade')).toEqual(['缺少实际特效 fx-aokiji/ice_spike_fade']);
    expect(rosterMoveFxIssues('aokiji', move, () => true)).toEqual([]);
    expect(ROSTER_FX_CANDIDATES.aokiji?.runtime).toBe('assets/fx/aokiji/fx-runtime.json');
  });

  it('also guards explicitly detached mirror and vapor bodies with no projectiles', () => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { search: '?rosterPreview=0929' } });
    for (const id of ['sp_ice_mirror', 'sp_ice_body']) {
      const move = aokijiDef.moves.find(item => item.id === id)!;
      const refs = rosterMoveFxReferences('aokiji', move);
      expect(refs.length).toBeGreaterThan(0);
      expect(rosterMoveFxIssues('aokiji', move, () => false)).toHaveLength(refs.length);
    }
  });
});
