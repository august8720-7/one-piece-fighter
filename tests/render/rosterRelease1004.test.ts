import { afterEach, describe, expect, it, vi } from 'vitest';
import releaseUi from '../../src/render/anime/uiArtManifest.json';
import candidateUi from '../../src/render/anime/rosterUiCandidates0929.json';

afterEach(() => {
  vi.doUnmock('../../src/render/anime/uiArtManifest.json');
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('PC roster acceptance joins registration and resource loading', () => {
  it('opens an explicitly accepted fighter without DEV and excludes an unfinished neighbour', async () => {
    // A schema fixture verifies the release gate, never the artwork or match itself.
    vi.stubEnv('DEV', false);
    vi.stubGlobal('window', { location: { search: '' } });
    vi.doMock('../../src/render/anime/uiArtManifest.json', () => ({ default: {
      ...releaseUi,
      characters: { ...releaseUi.characters,
        aokiji: { ...candidateUi.characters.aokiji, pcRosterAccepted: true },
        shanks: { ...candidateUi.characters.shanks, pcRosterAccepted: false },
      },
    } }));
    vi.resetModules();
    const [{ characters, characterAi, characterAnims }, resources, fx, candidates] = await Promise.all([
      import('../../src/characters'), import('../../src/render/resourcePlan'),
      import('../../src/render/fx/movePresentation'), import('../../src/render/fx/rosterFxCandidates1003'),
    ]);
    expect(characters.aokiji?.id).toBe('aokiji');
    expect(characterAi.aokiji).toBeDefined();
    expect(characterAnims.aokiji).toBeDefined();
    expect(characters.shanks).toBeUndefined();
    const plan = resources.presentationResources('fight', ['aokiji', 'aokiji']);
    expect(plan.unknownCharacterIds).toEqual([]);
    expect(plan.resources.filter(item => item.key === 'fx-aokiji')).toHaveLength(1);
    expect(plan.resources.some(item => item.key === 'fx-shanks')).toBe(false);
    expect(resources.presentationResources('menu', ['aokiji']).resources.some(item => item.key === 'fx-aokiji')).toBe(false);
    expect(fx.PROJECTILE_PRESENTATIONS.aokiji_ice_lance?.character).toBe('aokiji');
    expect(fx.PROJECTILE_PRESENTATIONS.shanks_haki_slash).toBeUndefined();
    expect(fx.MOVE_PRESENTATIONS.aokiji?.sp_ice_blade).toBeDefined();
    expect(candidates.rosterMoveFxIssues('aokiji', characters.aokiji!.moves.find(move => move.id === 'sp_ice_lance')!, () => false))
      .toContain('缺少实际特效 fx-aokiji/ice_lance');
    expect(resources.fightDownloadUrls({
      'assets/fx/aokiji/atlas-p1.png': {}, 'assets/fx/aokiji/fx-runtime.json': {},
      'assets/characters/aokiji/anime/runtime.json': {}, 'assets/audio/voice/aokiji/attack.ogg': {},
      'assets/fx/shanks/atlas.png': {}, 'assets/characters/shanks/anime/runtime.json': {},
    }, ['aokiji', 'aokiji'])).toEqual([
      'assets/fx/aokiji/atlas-p1.png', 'assets/fx/aokiji/fx-runtime.json',
      'assets/characters/aokiji/anime/runtime.json', 'assets/audio/voice/aokiji/attack.ogg',
    ]);
  });

  it('keeps the ordinary four-person production roster when none is accepted', async () => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal('window', { location: { search: '?rosterPreview=0929&p1=aokiji' } });
    vi.resetModules();
    const { characters } = await import('../../src/characters');
    const { presentationResources } = await import('../../src/render/resourcePlan');
    expect(Object.keys(characters)).toEqual(['luffy', 'akainu', 'labubu', 'twinkle']);
    expect(presentationResources('fight', ['aokiji']).unknownCharacterIds).toEqual(['aokiji']);
  });
});
