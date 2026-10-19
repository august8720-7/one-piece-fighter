import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { FightSim, totalFrames } from '../../src/core';
import { akainuDef, luffyDef } from '../../src/characters';
import { luffyGear5 } from '../../src/characters/luffy/gear5';
import { DEFAULT_ANIMS, HELD_REACTION_ANIMS, type AnimeRuntimeManifest, type CharacterPresentation } from '../../src/render/animations';
import { validateGear5Runtime } from '../../src/render/anime/formAssets';
import { FighterView } from '../../src/render/FighterView';
import { ANIME_CHARACTERS, animeCharacterPresentation, gear5AssetIssues, isGear5AssetReady, loadAnimeCharacterForms, type AnimeCharacterAsset } from '../../src/render/assets';
import { DELIVERY_VERSION } from '../../src/render/assetDownloads';
import type { AssetDownloads } from '../../src/render/assetDownloads';
import { fightDownloadUrls, gear5DownloadUrls } from '../../src/render/resourcePlan';

vi.mock('phaser', () => ({ default: { Textures: { FilterMode: { LINEAR: 0, NEAREST: 1 } } } }));

// Synthetic metadata only. No artwork, authoring records or runtime files are generated.
function formRuntime(): AnimeRuntimeManifest {
  const moves = [...luffyDef.moves.filter(move => move.id !== 'sp_gear2' && !Object.hasOwn(luffyGear5.replacements, move.id)), ...luffyGear5.moves, luffyGear5.awakening];
  const anims: AnimeRuntimeManifest['anims'] = {};
  const names = [...Object.keys(DEFAULT_ANIMS).filter(id => id !== 'portrait'), ...HELD_REACTION_ANIMS, ...moves.map(move => move.id)];
  for (const id of names) {
    const move = moves.find(move => move.id === id);
    anims[id] = { frames: 1, fps: 60, loop: false, pixelArt: false, exposures: [{ frame: 0, ticks: move ? totalFrames(move) : 8 }],
      ...(move?.throwData ? { throwExposures: [{ frame: 0, ticks: move.throwData.duration }] } : {}) };
  }
  const attachments = Object.fromEntries(names.map(id => [`luffy/${id}/0`, { size: { width: 40, height: 80 }, root: { x: 20, y: 80 }, sockets: { grip: { x: 30, y: 70 } } }]));
  return { schemaVersion: 2, characterId: 'luffy', formId: 'gear5', style: 'anime', continuous: true, textureDensity: 2,
    atlas: { image: 'atlas.png', data: 'atlas.json' }, pages: [{ id: 'p0', image: 'atlas.png', data: 'atlas.json', width: 512, height: 512 }],
    anims, attachments, framePages: Object.fromEntries(Object.keys(attachments).map(name => [name, 'p0'])),
    formEvidence: { review: 'full-coverage-accepted', authorManifestSha256: 'a'.repeat(64), sourceHashes: { synthetic_test: 'b'.repeat(64) },
      frameSources: Object.fromEntries(Object.keys(attachments).map(name => [name, 'synthetic_test'])),
      atlasHashes: { 'atlas.png': 'c'.repeat(64), 'atlas.json': 'd'.repeat(64) } } };
}

describe('independent Gear5 contract', () => {
  it('requires every retained move, the three real form moves, awakening and conditional reactions', () => {
    expect(validateGear5Runtime(formRuntime(), luffyDef)).toEqual([]);
    for (const id of ['idle', 'j_d', 'g5_bounce_slam', 'g5_awakening', 'held_twinkle_throw']) {
      const runtime = formRuntime(); delete runtime.anims[id];
      expect(validateGear5Runtime(runtime, luffyDef).some(issue => issue.includes(id))).toBe(true);
    }
  });

  it('rejects base identity, absent or mismatched provenance, bad grip and wrong move clocks', () => {
    for (const mutate of [
      (r: AnimeRuntimeManifest) => { delete r.formId; },
      (r: AnimeRuntimeManifest) => { delete r.formEvidence; },
      (r: AnimeRuntimeManifest) => { r.formEvidence!.sourceHashes.synthetic_test = 'invalid'; },
      (r: AnimeRuntimeManifest) => { delete r.formEvidence!.frameSources['luffy/idle/0']; },
      (r: AnimeRuntimeManifest) => { r.attachments['luffy/held_leg_flip/0']!.sockets.grip!.x = 99; },
      (r: AnimeRuntimeManifest) => { r.anims.g5_elastic_rush!.exposures = [{ frame: 0, ticks: 1 }]; },
    ]) { const runtime = formRuntime(); mutate(runtime); expect(validateGear5Runtime(runtime, luffyDef).length).toBeGreaterThan(0); }
  });

  it('checks installed immutable frame namespaces and does not accept a base texture alias', () => {
    const runtime = formRuntime();
    const form: AnimeCharacterAsset = { key: 'gear5-real-identity', runtime, deliveryVersion: DELIVERY_VERSION };
    const base: AnimeCharacterAsset = { key: 'base-real-identity', runtime: { ...runtime }, deliveryVersion: DELIVERY_VERSION, forms: { gear5: form } };
    delete base.runtime.formId;
    let missing = '';
    const scene = { textures: { exists: () => true, get: () => ({ has: (name: string) => name !== missing }) } } as unknown as Phaser.Scene;
    expect(isGear5AssetReady(scene, base)).toBe(true);
    missing = 'luffy/g5_rising_whip/0'; expect(isGear5AssetReady(scene, base)).toBe(false);
    missing = ''; form.key = base.key; expect(isGear5AssetReady(scene, base)).toBe(false);
    expect(animeCharacterPresentation(base).forms?.gear5?.anims).toBe(runtime.anims);
  });

  it('reports an old base missing awakening independently from a valid full Gear5 form', () => {
    const form: AnimeCharacterAsset = { key: 'form', runtime: formRuntime(), deliveryVersion: DELIVERY_VERSION };
    const runtime = formRuntime(); delete runtime.formId; delete runtime.anims.g5_awakening;
    const base: AnimeCharacterAsset = { key: 'base', runtime, deliveryVersion: DELIVERY_VERSION, forms: { gear5: form } };
    const scene = { textures: { exists: () => true, get: () => ({ has: () => true }) } } as unknown as Phaser.Scene;
    expect(validateGear5Runtime(form.runtime, luffyDef)).toEqual([]);
    expect(gear5AssetIssues(scene, base)).toContain('常态路飞：常态路飞缺少独立觉醒启动动作');
    expect(isGear5AssetReady(scene, base)).toBe(false);
  });

  it('refuses output into base/other assets, ambiguous base form configs and C-drive candidates before assembling sources', () => {
    const result = JSON.parse(execFileSync('python', ['-c', `
import importlib.util,json,sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('builder',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
errors=[]
for destination in [m.ROOT/'public/assets/characters/luffy/anime',m.ROOT/'public/assets/characters/akainu/anime',m.Path('C:/temp/gear5')]:
    try:m.candidate_destination('luffy','gear5',destination)
    except ValueError as error:errors.append(str(error))
try:m.build_character('luffy',{'formId':'gear5'},'a'*64)
except ValueError as error:errors.append(str(error))
print(json.dumps({'errors':errors,'canonical':str(m.candidate_destination('luffy','gear5'))}))
`, resolve('scripts/build_anime_atlas.py')], { encoding: 'utf8' }));
    expect(result.errors).toHaveLength(4);
    expect(result.canonical.replaceAll('\\', '/')).toContain('luffy/forms/gear5');
  });

  it('keeps form downloads opt-in and fails an incomplete refresh without mutating the base or an already running presentation', async () => {
    const runtime = formRuntime(); delete runtime.formId;
    const oldForm: AnimeCharacterAsset = { key: 'old-form', runtime: formRuntime() };
    const base: AnimeCharacterAsset = { key: 'base', runtime, forms: { gear5: oldForm } };
    const values = new Map<string, unknown>([[ANIME_CHARACTERS, { luffy: base }]]);
    const scene = { registry: { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) }, textures: {} } as unknown as Phaser.Scene;
    const requested: string[] = [];
    const downloads = { read: async (url: string, consume: (response: Response) => Promise<unknown>) => {
      requested.push(url); return consume(new Response(JSON.stringify({ characterId: 'luffy' })));
    } } as unknown as AssetDownloads;
    const records = { 'assets/characters/luffy/anime/runtime.json': {}, 'assets/characters/luffy/forms/gear5/runtime.json': {} };
    expect(fightDownloadUrls(records, ['luffy'])).toEqual(['assets/characters/luffy/anime/runtime.json']);
    expect(gear5DownloadUrls(records, ['akainu'])).toEqual([]);
    expect(gear5DownloadUrls(records, ['luffy'])).toEqual(['assets/characters/luffy/forms/gear5/runtime.json']);
    const result = await loadAnimeCharacterForms(scene, ['luffy', 'akainu'], downloads);
    expect(result.ok).toBe(false); expect(result.failures[0]!.characterId).toBe('luffy:gear5');
    expect(requested).toEqual(['assets/characters/luffy/forms/gear5/runtime.json']);
    expect(result.assets.luffy!.key).toBe('base'); expect(result.assets.luffy!.forms?.gear5).toBeUndefined();
    expect(base.forms!.gear5).toBe(oldForm);
  });

  it('builds only explicitly declared form crops and retains each original source receipt', () => {
    const result = JSON.parse(execFileSync('python', ['-c', `
import importlib.util,json,sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('builder',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from PIL import Image
im=Image.new('RGBA',(8,8),(0,0,0,0));im.paste((80,100,120,255),(2,2,6,6))
m.load_sources=lambda sources:{'synthetic_test':im}
config={'formId':'gear5','scale':1,'textureDensity':1,'maxTextureSize':64,'sources':{'synthetic_test':{'formId':'gear5','sha256':'b'*64}},'frames':{'pose':{'source':'synthetic_test','crop':[0,0,8,8],'root':[4,8],'sockets':{},'transparency':{'mode':'source-alpha'}}},'anims':{'idle':{'frames':['pose'],'loop':True,'exposures':[{'frame':0,'ticks':8}]}}}
outputs,report=m.build_character('luffy',config,'a'*64,'gear5')
print(json.dumps(json.loads(outputs['runtime.json'])))
`, resolve('scripts/build_anime_atlas.py')], { encoding: 'utf8' }));
    expect(result.formId).toBe('gear5');
    expect(result.formEvidence).toMatchObject({ review: 'candidate-not-accepted', authorManifestSha256: 'a'.repeat(64), frameSources: { 'luffy/idle/0': 'synthetic_test' } });
    expect(validateGear5Runtime(result, luffyDef).length).toBeGreaterThan(0);
  });

  it('loads into an independent immutable texture and rejects changed atlas bytes on refresh', async () => {
    const runtime = formRuntime(), imageBytes = 'synthetic-image-bytes-not-real-art';
    const atlas = { frames: Object.fromEntries(Object.keys(runtime.attachments).map(name => [name, { frame: { x: 0, y: 0, w: 40, h: 80 } }])) };
    const atlasBytes = JSON.stringify(atlas);
    runtime.formEvidence!.atlasHashes = { 'atlas.png': createHash('sha256').update(imageBytes).digest('hex'), 'atlas.json': createHash('sha256').update(atlasBytes).digest('hex') };
    const baseRuntime = formRuntime(); delete baseRuntime.formId;
    const base: AnimeCharacterAsset = { key: 'base', runtime: baseRuntime, deliveryVersion: DELIVERY_VERSION };
    const values = new Map<string, unknown>([[ANIME_CHARACTERS, { luffy: base }]]), textures = new Map<string, Set<string>>([['base', new Set(Object.keys(baseRuntime.attachments))]]);
    const scene = { registry: { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) },
      textures: { exists: (key: string) => textures.has(key), get: (key: string) => ({ has: (name: string) => textures.get(key)?.has(name) }),
        addAtlas: (key: string, _image: unknown, data: typeof atlas) => { textures.set(key, new Set(Object.keys(data.frames))); return { setFilter: vi.fn() }; } } } as unknown as Phaser.Scene;
    let corrupt = false;
    const downloads = { read: async (url: string, consume: (response: Response) => Promise<unknown>) => consume(new Response(
      url.endsWith('runtime.json') ? JSON.stringify(runtime) : url.endsWith('atlas.json') ? atlasBytes + (corrupt ? ' ' : '') : imageBytes,
    )) } as unknown as AssetDownloads;
    vi.stubGlobal('Image', class {
      naturalWidth = 512; naturalHeight = 512; onload: (() => void) | null = null; onerror: (() => void) | null = null;
      set src(_url: string) { queueMicrotask(() => this.onload?.()); }
    });
    const pixels = new Uint8ClampedArray(512 * 512 * 4); pixels[3] = 255;
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: vi.fn(), getImageData: () => ({ data: pixels }) }) }) });
    try {
      const result = await loadAnimeCharacterForms(scene, ['luffy'], downloads);
      expect(result.ok).toBe(true); expect(isGear5AssetReady(scene, result.assets.luffy)).toBe(true);
      expect(result.assets.luffy!.key).toBe('base'); expect(result.assets.luffy!.forms!.gear5!.key).toMatch(/^luffy-anime-gear5-/);
      corrupt = true;
      const failed = await loadAnimeCharacterForms(scene, ['luffy'], downloads);
      expect(failed.ok).toBe(false); expect(failed.failures[0]!.code).toBe('integrity');
      expect(failed.assets.luffy!.key).toBe('base'); expect(isGear5AssetReady(scene, failed.assets.luffy)).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
});

class Sprite {
  x = 0; y = 0; scaleX = 1; scaleY = 1; flipX = false; visible = false; originX = 0; originY = 1; name = '';
  frame = { customPivot: false, pivotX: 0.5, pivotY: 1 };
  constructor(public key: string) {}
  get texture() { return { customData: { meta: { style: 'anime' } }, has: () => true, setFilter: vi.fn() }; }
  setOrigin(x: number, y: number) { this.originX = x; this.originY = y; return this; }
  setDepth(_n: number) { return this; }
  setVisible(n: boolean) { this.visible = n; return this; }
  setFrame(n: string) { this.name = n; return this; }
  setTexture(n: string) { this.key = n; return this; }
  setScale(n: number) { this.scaleX = this.scaleY = n; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setFlipX(n: boolean) { this.flipX = n; return this; }
  setAlpha(_n: number) { return this; }
  clearTint() { return this; }
  setTint(_n: number) { return this; }
}

it('switches body, root, sockets, foreground, bounds and return-to-base using the actual fighter form', () => {
  const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0 });
  const f = sim.state.fighters[0], sprites: Sprite[] = [];
  const scene = { add: { sprite: (_x: number, _y: number, key: string) => { const sprite = new Sprite(key); sprites.push(sprite); return sprite; } } } as unknown as Phaser.Scene;
  const base = formRuntime(), form = formRuntime();
  const name = 'luffy/idle/0', foreground = `${name}/foreground`;
  form.attachments[name]!.root = { x: 10, y: 60 };
  form.attachments[name]!.sockets.palm = { x: 30, y: 40 };
  form.attachments[foreground] = form.attachments[name]!;
  form.foregroundFrames = { [name]: foreground };
  const presentation: CharacterPresentation = { ...base, forms: { gear5: { ...form, key: 'gear5', anims: form.anims } } };
  const view = new FighterView(scene, 'base', 'luffy', base.anims, presentation);
  expect(view.update(sim, f, 200, 300, null, 1)).toBe(true);
  expect(view.key).toBe('base'); const oldBounds = view.cameraBounds();
  f.form = 'gear5'; f.facing = -1;
  expect(view.update(sim, f, 200, 300, null, 1)).toBe(true);
  expect(view.key).toBe('gear5'); expect(sprites[0]!.originX).toBe(0.25);
  expect(view.socket('palm')).toEqual({ x: 190, y: 290 });
  expect(sprites[1]!.key).toBe('gear5'); expect(sprites[1]!.flipX).toBe(true);
  expect(view.cameraBounds()).not.toEqual(oldBounds);
  f.form = null; expect(view.update(sim, f, 200, 300, null, 1)).toBe(true);
  expect(view.key).toBe('base'); expect(sprites[1]!.visible).toBe(false);
  f.form = 'gear5'; delete presentation.forms!.gear5;
  expect(view.update(sim, f, 200, 300, null, 1)).toBe(false);
  expect(sprites[0]!.visible).toBe(false);
});
