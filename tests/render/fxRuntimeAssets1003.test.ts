import type Phaser from 'phaser';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RosterFxCandidate } from '../../src/render/fx/rosterFxCandidates1003';
import { loadPresentationAssets, releaseUnusedFightAssets } from '../../src/render/assets';
import { adoptPresentation } from '../../src/render/presentation';
import { hasPresentationFrame, PRESENTATION_FX_ASSETS, resolvePresentationFrame, type FxRuntimeManifest, type PresentationFxAssets } from '../../src/render/fx/fxRuntime';

const { candidate } = vi.hoisted(() => ({ candidate: {
  image: 'assets/fx/kizaru/atlas.png', atlas: 'assets/fx/kizaru/atlas.json', frames: ['beam', 'impact'],
  runtime: 'assets/fx/kizaru/fx-runtime.json', moves: {}, projectiles: {},
} as RosterFxCandidate }));
vi.mock('../../src/render/fx/rosterFxCandidates1003', () => ({ ROSTER_FX_CANDIDATES: { kizaru: candidate }, rosterFxPreviewEnabled: () => true }));
vi.mock('../../src/render/deliveryManifest.json', () => ({ default: { version: 'synthetic-fx-contract', records: {} } }));
vi.mock('phaser', () => ({ default: { Textures: { FilterMode: { LINEAR: 0 } } } }));

interface Atlas { frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>; meta: { image?: string; size: { w: number; h: number }; manifestSha256?: string } }
const contract = (): FxRuntimeManifest => ({ schemaVersion: 1, characterId: 'kizaru', manifestSha256: 'a'.repeat(64),
  pages: [{ id: 'p0', image: 'atlas.png', data: 'atlas.json', width: 64, height: 64 }, { id: 'p1', image: 'atlas-p1.png', data: 'atlas-p1.json', width: 64, height: 64 }],
  framePages: { beam_0: 'p0', beam_1: 'p1', impact_0: 'p1' },
  anims: { beam: { frames: ['beam_0', 'beam_1'], ticks: [2, 3], loop: true }, impact: { frames: ['impact_0'], ticks: [4], loop: false } } });
const pageAtlas = (runtime: FxRuntimeManifest, index: number): Atlas => {
  const page = runtime.pages[index]!;
  return { frames: Object.fromEntries(Object.entries(runtime.framePages).filter(([, assigned]) => assigned === page.id)
    .map(([name], frame) => [name, { frame: { x: frame * 20, y: 0, w: 16, h: 16 } }])),
    meta: { image: page.image, size: { w: page.width, h: page.height }, manifestSha256: runtime.manifestSha256 } };
};
interface FakeTexture { image: HTMLImageElement; atlas: Atlas | null; getSourceImage(): HTMLImageElement; has(frame: string): boolean;
  get(frame: string): { cutX: number; cutY: number; cutWidth: number; cutHeight: number }; setFilter(filter: number): void }
function sceneFixture() {
  const values = new Map<string, unknown>(), textures = new Map<string, FakeTexture>();
  let failPage = false;
  const add = (key: string, image: HTMLImageElement, atlas: Atlas | null) => {
    if (failPage && key.startsWith('fx-kizaru-') && key.endsWith('-p1')) return null;
    const texture: FakeTexture = { image, atlas, getSourceImage: () => image, has: frame => !!atlas && Object.hasOwn(atlas.frames, frame),
      get: frame => { const f = atlas!.frames[frame]!.frame; return { cutX: f.x, cutY: f.y, cutWidth: f.w, cutHeight: f.h }; }, setFilter: () => {} };
    textures.set(key, texture); return texture;
  };
  const manager = { exists: (key: string) => textures.has(key), get: (key: string) => textures.get(key),
    addAtlas: vi.fn((key: string, image: HTMLImageElement, atlas: Atlas) => add(key, image, atlas)),
    addImage: vi.fn((key: string, image: HTMLImageElement) => add(key, image, null)), remove: vi.fn((key: string) => textures.delete(key)) };
  const registry = { get: (key: string) => values.get(key), set: (key: string, value: unknown) => values.set(key, value) };
  adoptPresentation(registry, { art: 'anime', scope: 'sample' });
  return { scene: { registry, textures: manager } as unknown as Phaser.Scene, values, textures, manager, failPage: () => { failPage = true; } };
}

let runtime: FxRuntimeManifest, pages: Atlas[], extraFetchWait: (() => Promise<void>) | null;
beforeEach(() => {
  runtime = contract(); pages = [pageAtlas(runtime, 0), pageAtlas(runtime, 1)]; extraFetchWait = null;
  candidate.runtime = 'assets/fx/kizaru/fx-runtime.json';
  vi.stubGlobal('crypto', webcrypto);
  const bytesForBlobs = new WeakMap<Blob, string>(), sources = new Map<string, string>();
  const NativeBlob = Blob;
  vi.stubGlobal('Blob', class extends NativeBlob { constructor(parts: BlobPart[], options?: BlobPropertyBag) {
    super(parts, options); if (parts[0] instanceof ArrayBuffer) bytesForBlobs.set(this, new TextDecoder().decode(parts[0]));
  } });
  let counter = 0;
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { const url = `blob:fx-runtime-${++counter}`; sources.set(url, bytesForBlobs.get(blob as Blob)!); return url; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.stubGlobal('Image', class {
    width = 512; height = 512; naturalWidth = 512; naturalHeight = 512;
    onload: (() => void) | null = null; onerror: (() => void) | null = null;
    set src(url: string) {
      if (!url) return;
      if (sources.get(url)?.startsWith('assets/fx/kizaru/')) this.width = this.height = this.naturalWidth = this.naturalHeight = 64;
      queueMicrotask(() => this.onload?.());
    }
  });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === candidate.runtime) {
      await extraFetchWait?.();
      return new Response(JSON.stringify(runtime));
    }
    if (url === 'assets/fx/kizaru/atlas.json') return new Response(JSON.stringify(pages[0]));
    if (url === 'assets/fx/kizaru/atlas-p1.json') return new Response(JSON.stringify(pages[1]));
    if (url === 'assets/fx/common/atlas.json') return new Response(JSON.stringify({
      frames: Object.fromEntries(['impact', 'rebound', 'smoke'].map((frame, i) => [frame, { frame: { x: i * 20, y: 0, w: 16, h: 16 } }])), meta: { size: { w: 512, h: 512 } } }));
    return new Response(url);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('explicit runtime FX assets (synthetic mechanics)', () => {
  it('loads only named pages of a selected mirrored character and resolves animations across actual textures', async () => {
    const current = sceneFixture();
    const result = await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru', 'kizaru']);
    expect(result).toMatchObject({ ok: true, loaded: expect.arrayContaining(['fx-kizaru']) });
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url)).filter(url => url.includes('/fx/kizaru/'));
    expect(urls).toHaveLength(5); expect(urls.filter(url => url.endsWith('fx-runtime.json'))).toHaveLength(1);
    expect(hasPresentationFrame(current.scene, 'fx-kizaru', 'beam')).toBe(true);
    const resolved = resolvePresentationFrame(current.scene, 'fx-kizaru', 'beam', 2)!;
    expect(resolved.frame).toBe('beam_1'); expect(resolved.key).toMatch(/^fx-kizaru-[a-f0-9]{64}-p1$/);
    const before = current.textures.size;
    expect(await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: true });
    expect(current.textures.size).toBe(before);
    const removed = releaseUnusedFightAssets(current.scene, ['luffy']);
    expect(removed.filter(key => key.startsWith('fx-kizaru-'))).toHaveLength(2);
    expect(hasPresentationFrame(current.scene, 'fx-kizaru', 'beam')).toBe(false);
    expect(current.values.get(PRESENTATION_FX_ASSETS)).toEqual({});
  });

  it('does not discover an undeclared runtime or promote a preview to full mode', async () => {
    delete candidate.runtime;
    const current = sceneFixture();
    await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru']);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).not.toContain('assets/fx/kizaru/fx-runtime.json');
    adoptPresentation(current.scene.registry, { art: 'anime', scope: 'full' });
    expect(await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: false, required: true });
  });

  it('honors an explicit rollback to single-atlas frames and releases old page registrations', async () => {
    const current = sceneFixture();
    expect(await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: true });
    delete candidate.runtime;
    pages[0]!.frames = { beam: { frame: { x: 0, y: 0, w: 16, h: 16 } }, impact: { frame: { x: 20, y: 0, w: 16, h: 16 } } };
    expect(await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: true });
    expect(resolvePresentationFrame(current.scene, 'fx-kizaru', 'beam', 7)).toEqual({ key: 'fx-kizaru', frame: 'beam' });
    expect([...current.textures.keys()].some(key => key.startsWith('fx-kizaru-'))).toBe(false);
    expect(current.values.get(PRESENTATION_FX_ASSETS)).toEqual({});
  });

  it.each(['bad-ticks', 'foreign-page', 'missing-frame', 'bad-atlas-sha', 'outside-frame'] as const)('rejects %s before any fighter page is installed', async issue => {
    if (issue === 'bad-ticks') runtime.anims.beam!.ticks[0] = 0;
    if (issue === 'foreign-page') runtime.pages[1]!.image = '../shanks/atlas.png';
    if (issue === 'missing-frame') delete pages[1]!.frames.beam_1;
    if (issue === 'bad-atlas-sha') pages[1]!.meta.manifestSha256 = 'b'.repeat(64);
    if (issue === 'outside-frame') pages[1]!.frames.beam_1!.frame.w = 100;
    const current = sceneFixture();
    expect(await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: false, failures: [{ key: 'fx-kizaru', code: 'invalid' }] });
    expect(current.manager.addAtlas.mock.calls.some(([key]) => key.startsWith('fx-kizaru-'))).toBe(false);
    expect([...current.textures.keys()].some(key => key.startsWith('fx-kizaru-'))).toBe(false);
  });

  it('removes the whole partial bundle on registration failure and later retries cleanly', async () => {
    const current = sceneFixture(); current.failPage();
    expect(await loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: false, failures: [{ key: 'fx-kizaru', code: 'texture' }] });
    expect([...current.textures.keys()].some(key => key.startsWith('fx-kizaru-'))).toBe(false);
    const clean = sceneFixture();
    expect(await loadPresentationAssets(clean.scene, undefined, 'fight', ['kizaru'])).toMatchObject({ ok: true });
  });

  it('prevents a late pending load from reinstalling pages after changing fighters', async () => {
    let resume!: () => void;
    const pending = new Promise<void>(resolve => { resume = resolve; }); extraFetchWait = () => pending;
    const current = sceneFixture(), loading = loadPresentationAssets(current.scene, undefined, 'fight', ['kizaru']);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('assets/fx/kizaru/fx-runtime.json', expect.anything()));
    releaseUnusedFightAssets(current.scene, ['luffy']); resume();
    expect(await loading).toMatchObject({ ok: false, failures: [{ key: 'fx-kizaru', message: expect.stringContaining('已换角') }] });
    expect([...current.textures.keys()].some(key => key.startsWith('fx-kizaru-'))).toBe(false);
    expect((current.values.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined)?.['fx-kizaru']).toBeUndefined();
  });
});
