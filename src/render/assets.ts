import Phaser from 'phaser';
import { animeAtlasPages, isAnimeRuntimeManifest, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from './animations';
import { GEAR5_ASSET_BASE, gear5ResourceKey, validateGear5BaseRuntime, validateGear5Runtime } from './anime/formAssets';
import { characters } from '@characters/index';
import { readPresentation } from './presentation';
import uiArtManifest from './anime/uiArtManifest.json';
import rosterUiCandidates from './anime/rosterUiCandidates0929.json';
import { AssetDownloadError, AssetDownloads, DELIVERY_VERSION, deliveryRecord, sharedDownloads } from './assetDownloads';
import { CHARACTER_RESOURCE_PLANS, presentationResources, type PresentationResource } from './resourcePlan';
import { ROSTER_FX_CANDIDATES, rosterFxPreviewEnabled } from './fx/rosterFxCandidates1003';
import { fxReferenceFrames, fxRuntimeBase, isFxRuntime, PRESENTATION_FX_ASSETS, validateFxRuntime,
  validateFxRuntimeAtlas, type PresentationFxAsset, type PresentationFxAssets } from './fx/fxRuntime';

export { REQUIRED_FX_FRAMES } from './resourcePlan';
export { hasPresentationFrame, resolvePresentationFrame } from './fx/fxRuntime';

// Authoring copies cannot override an accepted release identity or its review.
const uiSources = { ...(import.meta.env.DEV ? rosterUiCandidates.characters : {}), ...uiArtManifest.characters };

export const SPRITE_KEYS = 'spriteKeys';
export type SpriteKeys = Record<string, string | null>;
export const SPRITE_SOURCES = 'spriteSources';
export type SpriteSources = Record<string, 'atlas' | 'placeholder' | null>;
export const ANIME_CHARACTERS = 'animeCharacters';
export const ANIME_ERRORS = 'animeErrors';
export interface AnimeCharacterAsset { key: string; runtime: AnimeRuntimeManifest; frameTextures?: Record<string, string>; uiKey?: string; deliveryVersion?: string; forms?: Partial<Record<'gear5', AnimeCharacterAsset>> }
export type AnimeCharacterAssets = Record<string, AnimeCharacterAsset>;
export const ANIME_LOAD_RESULT = 'animeLoadResult';
export type AssetErrorCode = 'unavailable' | 'timeout' | 'invalid' | 'decode' | 'integrity' | 'texture';
export interface AssetFailure { characterId: string; code: AssetErrorCode; message: string }
export interface AnimeLoadResult {
  ok: boolean;
  requested: string[];
  assets: AnimeCharacterAssets;
  errors: Record<string, string>;
  failures: AssetFailure[];
}
export const ANIME_INTERFACES = 'animeInterfaces';
interface InterfaceAsset { key: string; version: string; sourceIdentity: string }
type InterfaceAssets = Record<string, InterfaceAsset>;
const characterWork = new WeakMap<object, Map<string, Promise<AnimeCharacterAsset>>>();
const interfaceWork = new WeakMap<object, Map<string, Promise<string>>>();
const presentationWork = new WeakMap<object, Map<string, Promise<void>>>();
const presentationGenerations = new WeakMap<object, Map<string, number>>();

function presentationGeneration(scene: Phaser.Scene, key: string, advance = false): number {
  let generations = presentationGenerations.get(scene.textures);
  if (!generations) { generations = new Map(); presentationGenerations.set(scene.textures, generations); }
  const generation = (generations.get(key) ?? 0) + (advance ? 1 : 0);
  generations.set(key, generation);
  return generation;
}

function releaseFxBundle(scene: Phaser.Scene, key: string, remove: (key: string) => void): void {
  const assets = { ...((scene.registry.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined) ?? {}) };
  const asset = assets[key];
  if (!asset) return;
  for (const texture of new Set(Object.values(asset.frameTextures))) remove(texture);
  delete assets[key];
  scene.registry.set(PRESENTATION_FX_ASSETS, assets);
}

function interfaceSourceIdentity(id: string): string {
  const source = uiSources[id as keyof typeof uiSources];
  return JSON.stringify(source ? [source.sha256, source.width, source.height, source.frames] : null);
}

/** Every menu entry uses the same validated version and complete-frame check. */
export function areAnimeInterfacesReady(scene: Phaser.Scene, ids: readonly string[]): boolean {
  const loaded = (scene.registry.get(ANIME_INTERFACES) as InterfaceAssets | undefined) ?? {};
  return ids.every(id => {
    const source = uiSources[id as keyof typeof uiSources], asset = loaded[id];
    return !!source && !('enabled' in source && source.enabled === false)
      && asset?.version === DELIVERY_VERSION && asset.sourceIdentity === interfaceSourceIdentity(id)
      && scene.textures.exists(asset.key)
      && ['body', 'portrait'].every(kind => scene.textures.get(asset.key).has(`${id}/ui/${kind}`));
  });
}

function workMap<T>(owner: object, store: WeakMap<object, Map<string, Promise<T>>>): Map<string, Promise<T>> {
  let map = store.get(owner);
  if (!map) { map = new Map(); store.set(owner, map); }
  return map;
}

/** Menus only need these independent high-resolution crops, never the combat atlas. */
export async function loadAnimeInterfaces(scene: Phaser.Scene, ids: readonly string[], downloads = sharedDownloads(scene.game ?? scene.registry)): Promise<{ ok: boolean; failures: AssetFailure[] }> {
  const failures: AssetFailure[] = [];
  await Promise.all([...new Set(ids)].map(async id => {
    try { await loadInterface(scene, id, downloads); }
    catch (error) { failures.push(assetFailure(id, error)); }
  }));
  return { ok: failures.length === 0, failures };
}

async function loadInterface(scene: Phaser.Scene, id: string, downloads: AssetDownloads, canonical = false): Promise<string> {
  const records = (): InterfaceAssets => (scene.registry.get(ANIME_INTERFACES) as InterfaceAssets | undefined) ?? {};
  const previous = records()[id];
  const source = uiSources[id as keyof typeof uiSources];
  if (source && 'enabled' in source && source.enabled === false) {
    throw new AssetLoadError('invalid', `角色 ${id} 的界面原画正在造型复核，暂不采用`);
  }
  if (!canonical && source && deliveryRecord(source.image) && previous && areAnimeInterfacesReady(scene, [id])) return previous.key;
  const tasks = workMap(scene.textures, interfaceWork);
  const taskKey = canonical ? `${id}:canonical-full` : id;
  let work = tasks.get(taskKey);
  if (!work) {
    work = (async () => {
      const art = await fetchAnimeInterface(id, downloads, canonical);
      const key = `${id}-anime-ui-${art.identity}`;
      const texture = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.addAtlas(key, art.image, art.atlas);
      if (!texture) throw new AssetLoadError('texture', '人物界面纹理注册失败');
      if (!['body', 'portrait'].every(kind => texture.has(`${id}/ui/${kind}`))) throw new AssetLoadError('invalid', '人物界面缺少全身或头像帧');
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      scene.registry.set(ANIME_INTERFACES, { ...records(), [id]: { key, version: DELIVERY_VERSION, sourceIdentity: interfaceSourceIdentity(id) } });
      return key;
    })().catch(error => {
      const current = { ...records() };
      delete current[id];
      scene.registry.set(ANIME_INTERFACES, current);
      throw error;
    }).finally(() => { tasks.delete(taskKey); });
    tasks.set(taskKey, work);
  }
  return work;
}
export const PRESENTATION_ASSET_LOAD_RESULT = 'presentationAssetLoadResult';
export interface PresentationAssetFailure { key: string; code: AssetErrorCode; message: string }
export interface PresentationAssetLoadResult {
  ok: boolean;
  required: boolean;
  requested: string[];
  loaded: string[];
  failures: PresentationAssetFailure[];
}
const VARIANTS = ['atlas', 'placeholder'] as const;
const REQUEST_TIMEOUT = 8000;

interface AtlasData {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
}

/** 每名角色独立尝试正式图集与占位图；一张坏图不会中断其他角色。 */
export async function loadCharacterAtlases(scene: Phaser.Scene, ids: readonly string[]): Promise<SpriteKeys> {
  const keys: SpriteKeys = { ...((scene.registry.get(SPRITE_KEYS) as SpriteKeys | undefined) ?? {}) };
  const sources: SpriteSources = { ...((scene.registry.get(SPRITE_SOURCES) as SpriteSources | undefined) ?? {}) };
  await Promise.all([...new Set(ids)].map(async (id) => {
    if (id in keys && (!keys[id] || scene.textures.exists(keys[id]!))) return;
    keys[id] = null;
    sources[id] = null;
    for (const variant of VARIANTS) {
      const key = `${id}-${variant}`;
      if (!scene.textures.exists(key)) {
        const base = `assets/characters/${id}/${variant}`;
        try {
          // 每份文件只取一次，等图片真正解码后再注册纹理。
          const [data, image] = await Promise.all([fetchAtlas(`${base}.json`, id), fetchImage(`${base}.png`)]);
          for (const { frame } of Object.values(data.frames)) {
            if (frame.x + frame.w > image.naturalWidth || frame.y + frame.h > image.naturalHeight) throw new Error('Atlas frame outside image');
          }
          scene.textures.addAtlas(key, image, data);
        } catch {
          continue;
        }
      }
      const texture = scene.textures.get(key);
      if (!texture.has(`${id}/idle/0`)) continue;
      if (variant === 'placeholder') texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      keys[id] = key;
      sources[id] = variant;
      break;
    }
  }));
  scene.registry.set(SPRITE_KEYS, keys);
  scene.registry.set(SPRITE_SOURCES, sources);
  return keys;
}

/** Candidate artwork lives beside the complete legacy character, never replacing its registry key. */
export async function loadAnimeCharacters(scene: Phaser.Scene, ids: readonly string[], downloads = sharedDownloads(scene.game ?? scene.registry), fullPreview = false): Promise<AnimeLoadResult> {
  const previousAssets = (scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined) ?? {};
  const assets: AnimeCharacterAssets = { ...previousAssets };
  const errors: Record<string, string> = { ...((scene.registry.get(ANIME_ERRORS) as Record<string, string> | undefined) ?? {}) };
  const failures: AssetFailure[] = [];
  const requested = [...new Set(ids)];
  for (const id of requested) {
    // A failed refresh must never silently reuse this fighter's previous bundle.
    delete assets[id];
    delete errors[id];
  }
  await Promise.all(requested.map(async id => {
    try {
      // A DEV full-form preview must use the matching canonical base namespace,
      // not a frozen delivery runtime that predates the awakening aliases.
      const canonical = canonicalAnimePreview(fullPreview);
      const previous = previousAssets[id];
      if (!canonical && deliveryRecord(`assets/characters/${id}/anime/runtime.json`) && previous?.deliveryVersion === DELIVERY_VERSION
        && Object.keys(previous.runtime.attachments).every(name => {
          const key = previous.frameTextures?.[name] ?? previous.key;
          return scene.textures.exists(key) && scene.textures.get(key).has(name);
        })) {
        await loadInterface(scene, id, downloads);
        assets[id] = previous;
        return;
      }
      const tasks = workMap(scene.textures, characterWork);
      const taskKey = canonical ? `${id}:canonical-full-form` : id;
      let work = tasks.get(taskKey);
      if (!work) {
        work = (async (): Promise<AnimeCharacterAsset> => {
          return loadAnimeBundle(scene, id, downloads, false, canonical);
        })().finally(() => { tasks.delete(taskKey); });
        tasks.set(taskKey, work);
      }
      assets[id] = await work;
    } catch (error) {
      const failure = assetFailure(id, error);
      errors[id] = failure.message;
      failures.push(failure);
    }
  }));
  // Concurrent background/select loads may finish in either order. Publish only
  // the requested characters into the latest registry, never a stale snapshot.
  const latest = { ...((scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined) ?? {}) };
  const latestErrors = { ...((scene.registry.get(ANIME_ERRORS) as Record<string, string> | undefined) ?? {}) };
  for (const id of requested) {
    if (assets[id]) latest[id] = assets[id]; else delete latest[id];
    if (errors[id]) latestErrors[id] = errors[id]; else delete latestErrors[id];
  }
  scene.registry.set(ANIME_CHARACTERS, latest);
  scene.registry.set(ANIME_ERRORS, latestErrors);
  const result = { ok: failures.length === 0, requested, assets: latest, errors: latestErrors, failures };
  scene.registry.set(ANIME_LOAD_RESULT, result);
  return result;
}

/** Explicit opt-in by the six-person full entry; legacy/sample callers never request forms. */
export async function loadAnimeCharacterForms(scene: Phaser.Scene, ids: readonly string[], downloads = sharedDownloads(scene.game ?? scene.registry)): Promise<AnimeLoadResult> {
  const requested = [...new Set(ids)].filter(id => id === 'luffy');
  const failures: AssetFailure[] = [];
  const errors: Record<string, string> = {};
  await Promise.all(requested.map(async id => {
    const current = (): AnimeCharacterAssets => ({ ...((scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined) ?? {}) });
    try {
      const base = current()[id];
      if (!base) throw new AssetLoadError('invalid', '五档必须先加载并核对常态路飞');
      const canonical = canonicalAnimePreview(true);
      if (!canonical && deliveryRecord(`${GEAR5_ASSET_BASE}runtime.json`) && isGear5AssetReady(scene, base)) return;
      // A failed refresh invalidates only this form, preserving accepted base art.
      const cleared = { ...base, forms: { ...base.forms } };
      delete cleared.forms.gear5;
      scene.registry.set(ANIME_CHARACTERS, { ...current(), [id]: cleared });
      const tasks = workMap(scene.textures, characterWork), taskKey = gear5ResourceKey(id) + (canonical ? ':canonical-full' : '');
      let work = tasks.get(taskKey);
      if (!work) {
        work = loadAnimeBundle(scene, id, downloads, true, canonical).finally(() => { tasks.delete(taskKey); });
        tasks.set(taskKey, work);
      }
      const form = await work;
      const latest = current(), latestBase = latest[id];
      if (!latestBase || latestBase.key !== base.key) throw new AssetLoadError('invalid', '常态资源已更新，请重试五档载入');
      latest[id] = { ...latestBase, forms: { ...latestBase.forms, gear5: form } };
      scene.registry.set(ANIME_CHARACTERS, latest);
      const issues = gear5AssetIssues(scene, latest[id]);
      if (issues.length) throw new AssetLoadError('invalid', issues.join('；'));
    } catch (error) {
      const failure = assetFailure(gear5ResourceKey(id), error);
      failures.push(failure); errors[id] = failure.message;
      const latest = current();
      if (latest[id]) {
        latest[id] = { ...latest[id]!, forms: { ...latest[id]!.forms } };
        delete latest[id]!.forms!.gear5;
      }
      scene.registry.set(ANIME_CHARACTERS, latest);
    }
  }));
  return { ok: failures.length === 0, requested, assets: (scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined) ?? {}, errors, failures };
}

/** Recheck real installed frames and full form coverage before enabling deterministic logic. */
export function isGear5AssetReady(scene: Phaser.Scene, base: AnimeCharacterAsset | undefined): boolean {
  return gear5AssetIssues(scene, base).length === 0;
}

/** Exact reasons are shared by Preload and the defensive Fight gate; never swallow them. */
export function gear5AssetIssues(scene: Phaser.Scene, base: AnimeCharacterAsset | undefined): string[] {
  if (!base) return ['常态路飞资源未登记'];
  const issues: string[] = [];
  const form = base?.forms?.gear5;
  if (base.deliveryVersion !== DELIVERY_VERSION) issues.push('常态路飞资源版本与当前加载版本不符');
  issues.push(...validateGear5BaseRuntime(base.runtime, characters.luffy!).map(issue => `常态路飞：${issue}`));
  if (!form) return [...issues, '独立五档资源未登记'];
  if (form.deliveryVersion !== DELIVERY_VERSION) issues.push('五档资源版本与当前加载版本不符');
  if (form.key === base.key) issues.push('五档错误复用常态纹理');
  issues.push(...validateGear5Runtime(form.runtime, characters.luffy!).map(issue => `五档：${issue}`));
  const baseKeys = new Set([base.key, ...Object.values(base.frameTextures ?? {})]);
  if ([form.key, ...Object.values(form.frameTextures ?? {})].some(key => baseKeys.has(key))) issues.push('五档与常态纹理命名空间重叠');
  for (const [label, asset] of [['常态路飞', base], ['五档', form]] as const) for (const name of Object.keys(asset.runtime.attachments)) {
    const key = asset.frameTextures?.[name] ?? asset.key;
    if (!scene.textures.exists(key)) issues.push(`${label}纹理未安装：${key}`);
    else if (!scene.textures.get(key).has(name)) issues.push(`${label}纹理缺帧：${name}`);
  }
  return [...new Set(issues)];
}

/** Build FighterView's immutable form-aware presentation from an installed asset. */
export function animeCharacterPresentation(asset: AnimeCharacterAsset): import('./animations').CharacterPresentation {
  return { ...asset.runtime, ...(asset.frameTextures ? { frameTextures: asset.frameTextures } : {}),
    forms: Object.fromEntries(Object.entries(asset.forms ?? {}).map(([id, form]) => [id,
      { ...form.runtime, key: form.key, ...(form.frameTextures ? { frameTextures: form.frameTextures } : {}) }])) };
}

function validateFormAlpha(image: HTMLImageElement, atlas: AtlasData): void {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new AssetLoadError('decode', '无法核验五档图集透明通道');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let visible = false, transparent = false;
  for (let i = 3; i < data.length && (!visible || !transparent); i += 4) {
    visible ||= data[i]! > 0; transparent ||= data[i] === 0;
  }
  for (const [name, { frame }] of Object.entries(atlas.frames)) {
    let frameVisible = false;
    for (let y = frame.y; y < frame.y + frame.h && !frameVisible; y++) for (let x = frame.x; x < frame.x + frame.w; x++) {
      if (data[(y * canvas.width + x) * 4 + 3]! > 0) { frameVisible = true; break; }
    }
    if (!frameVisible) throw new AssetLoadError('invalid', `五档动作帧没有可见原画像素：${name}`);
  }
  canvas.width = canvas.height = 0;
  if (!visible || !transparent) throw new AssetLoadError('invalid', '五档图集必须含真实人物像素和透明背景');
}

function canonicalAnimePreview(full: boolean): boolean {
  return import.meta.env.DEV && full && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('rosterPreview') === '0929';
}

export const animeBundleReadUrl = (url: string, canonical = false): string => import.meta.env.DEV && canonical ? `${url}?opfCanonical=1017` : url;

async function loadAnimeBundle(scene: Phaser.Scene, id: string, downloads: AssetDownloads, form = false, canonical = false): Promise<AnimeCharacterAsset> {
      const base = form ? GEAR5_ASSET_BASE : `assets/characters/${id}/anime/`;
      const value: unknown = await downloads.read(animeBundleReadUrl(`${base}runtime.json`, canonical), response => response.json());
      const invalid = form ? validateGear5Runtime(value, characters[id]!) : validateAnimeRuntimeManifest(value, characters[id]?.moves);
      if (invalid.length || !isAnimeRuntimeManifest(value) || value.characterId !== id) throw new AssetLoadError('invalid', invalid[0] ?? '人物配置身份不匹配');
      const [pageResult, uiResult] = await Promise.allSettled([settleAll(animeAtlasPages(value).map(async page => {
        const [atlas, { image, imageHash }] = await settleAll([
          fetchAtlas(animeBundleReadUrl(`${base}${page.data}`, canonical), id, false, downloads, form ? value.formEvidence!.atlasHashes[page.data] : undefined), fetchAnimeImage(animeBundleReadUrl(`${base}${page.image}`, canonical), downloads),
        ]);
        if (image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new AssetLoadError('texture', `人物图集单页超过 4096：${page.id}`);
        if ((page.width !== undefined && image.naturalWidth !== page.width) || (page.height !== undefined && image.naturalHeight !== page.height)) throw new AssetLoadError('invalid', `人物分页尺寸不匹配：${page.id}`);
        if (form && imageHash !== value.formEvidence!.atlasHashes[page.image]) throw new AssetLoadError('integrity', `五档图集图像哈希不匹配：${page.id}`);
        return { page, atlas, image, imageHash };
      })), form ? Promise.resolve(undefined) : loadInterface(scene, id, downloads, canonical)]);
      // Do not announce a retryable result while the parallel UI decode still
      // holds object URLs or can deliver a late completion into the next load.
      if (pageResult.status === 'rejected') throw pageResult.reason;
      if (uiResult.status === 'rejected') throw uiResult.reason;
      const pages = pageResult.value;
      const uiKey = uiResult.value;
      // Page files must not inject or shadow a frame assigned elsewhere. Validate the
      // complete atlas namespace before installing any immutable texture.
      for (const { page, atlas } of pages) for (const name of Object.keys(atlas.frames)) {
        if (!value.attachments[name] || (value.framePages?.[name] ?? 'p0') !== page.id) {
          throw new AssetLoadError('invalid', `人物分页包含未声明或归属错误的动作帧：${page.id}/${name}`);
        }
      }
      for (const [name, geometry] of Object.entries(value.attachments)) {
        const pageId = value.framePages?.[name] ?? 'p0';
        const loaded = pages.find(entry => entry.page.id === pageId);
        const frame = loaded?.atlas.frames[name]?.frame;
        const image = loaded?.image;
        if (!frame || !image || frame.x + frame.w > image.naturalWidth || frame.y + frame.h > image.naturalHeight
          || frame.w !== geometry.size.width || frame.h !== geometry.size.height) throw new AssetLoadError('invalid', `动作帧不完整：${name}`);
      }
      if (form) for (const { image, atlas } of pages) validateFormAlpha(image, atlas);
      // Include all runtime/atlas metadata and the PNG bytes, not just frame names or dimensions.
      // Immutable keys keep a running Fight's texture intact when another bundle is loaded.
      const identity = await sha256(JSON.stringify([value, pages.map(({ page, atlas, imageHash }) => [page.id, atlas, imageHash])]));
      const frameTextures: Record<string, string> = {};
      let key = '';
      for (const { page, atlas, image } of pages) {
        const pageKey = `${id}-anime-${form ? 'gear5-' : ''}${identity}${page.id === 'p0' ? '' : `-${page.id}`}`;
        const texture = scene.textures.exists(pageKey) ? scene.textures.get(pageKey) : scene.textures.addAtlas(pageKey, image, atlas);
        if (!texture) throw new AssetLoadError('texture', `人物纹理注册失败：${page.id}`);
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        if (page.id === 'p0') key = pageKey;
        for (const name of Object.keys(atlas.frames)) frameTextures[name] = pageKey;
      }
      return { key, runtime: value, frameTextures, ...(uiKey ? { uiKey } : {}), deliveryVersion: DELIVERY_VERSION };
}

class AssetLoadError extends Error {
  constructor(readonly code: AssetErrorCode, message: string) { super(message); }
}

function assetFailure(characterId: string, error: unknown): AssetFailure {
  if (error instanceof AssetLoadError || error instanceof AssetDownloadError) return { characterId, code: error.code, message: error.message };
  if (error instanceof Error && error.name === 'AbortError') return { characterId, code: 'timeout', message: '人物资源请求超时，可重试' };
  const message = error instanceof Error ? error.message : '人物资源载入失败';
  return { characterId, code: message.includes('decode') ? 'decode' : message.includes('timed out') ? 'timeout' : 'unavailable', message };
}

/** Drain sibling downloads/decodes before allowing a scene retry to begin. */
async function settleAll<const T extends readonly unknown[]>(promises: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  const results = await Promise.allSettled(promises);
  const failed = results.find(result => result.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
  return results.map(result => (result as PromiseFulfilledResult<unknown>).value) as { -readonly [P in keyof T]: Awaited<T[P]> };
}

async function fetchAtlas(url: string, id: string, requireIdle = true, downloads = new AssetDownloads(), expectedHash?: string): Promise<AtlasData> {
    const data = await downloads.read(url, async response => {
      if (!expectedHash) return response.json();
      const bytes = await response.arrayBuffer();
      if (await sha256(bytes) !== expectedHash) throw new AssetLoadError('integrity', '五档图集坐标文件哈希不匹配');
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    }) as AtlasData;
    if (!data?.frames || typeof data.frames !== 'object' || !Object.keys(data.frames).length) throw new AssetLoadError('invalid', '人物图集没有动作帧');
    if (requireIdle && !data.frames[`${id}/idle/0`]) throw new AssetLoadError('invalid', '人物图集缺少站立帧');
    for (const entry of Object.values(data.frames)) {
      const f = entry?.frame;
      if (!f || ![f.x, f.y, f.w, f.h].every(Number.isInteger) || f.x < 0 || f.y < 0 || f.w <= 0 || f.h <= 0) throw new AssetLoadError('invalid', '人物图集帧坐标非法');
    }
    return data;
}

async function sha256(value: string | ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle?.digest) throw new AssetLoadError('integrity', '此浏览器无法执行 SHA-256 完整性校验，请使用新版 Chrome / Edge 并通过 HTTPS（本机可用 localhost / 127.0.0.1）打开');
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchAnimeInterface(id: string, downloads: AssetDownloads, canonical = false): Promise<{ image: HTMLImageElement; atlas: AtlasData; identity: string }> {
  const record = uiSources[id as keyof typeof uiSources];
  if (!record) throw new AssetLoadError('invalid', '人物界面配置缺失');
  const imageUrl = animeBundleReadUrl(record.image, canonical);
  const { image, imageHash } = await fetchAnimeImage(imageUrl, downloads);
  const delivery = deliveryRecord(imageUrl);
  if ((delivery && delivery.sourceSha256 !== record.sha256) || imageHash !== (delivery?.sha256 ?? record.sha256)) throw new AssetLoadError('integrity', '人物界面原图内容校验失败，请重新载入');
  if (image.naturalWidth !== record.width || image.naturalHeight !== record.height || Math.max(record.width, record.height) > 4096) {
    throw new AssetLoadError('invalid', '人物界面图片尺寸不匹配');
  }
  const frames: AtlasData['frames'] = {};
  for (const [name, frame] of Object.entries(record.frames)) {
    if (![frame.x, frame.y, frame.w, frame.h].every(Number.isInteger) || frame.x < 0 || frame.y < 0 || frame.w <= 0 || frame.h <= 0
      || frame.x + frame.w > record.width || frame.y + frame.h > record.height) throw new AssetLoadError('invalid', '人物界面裁切范围非法');
    frames[`${id}/ui/${name}`] = { frame };
  }
  return { image, atlas: { frames }, identity: await sha256(JSON.stringify([imageHash, record.frames])) };
}

/** Fetch the exact bytes used for both decoding and the immutable candidate texture key. */
async function fetchAnimeImage(url: string, downloads: AssetDownloads): Promise<{ image: HTMLImageElement; imageHash: string }> {
  // Keep arrayBuffer: some embedded Chromium hosts fail large response.blob().
  const bytes = await downloads.read(url, response => response.arrayBuffer());
  const delivery = deliveryRecord(url);
  const imageHash = delivery?.sha256 ?? await sha256(bytes);
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: delivery?.contentType ?? (url.endsWith('.webp') ? 'image/webp' : 'image/png') }));
  try { return { image: await fetchImage(objectUrl), imageHash }; }
  finally { URL.revokeObjectURL(objectUrl); }
}

export function fetchImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const timer = setTimeout(() => finish(new Error('Image load timed out')), REQUEST_TIMEOUT);
    const abort = () => finish(new AssetLoadError('timeout', '图片请求超时，可重试'));
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
      if (error) { image.src = ''; reject(error); }
      else resolve(image);
    };
    image.onload = () => image.naturalWidth > 0 ? finish() : finish(new Error('Empty image'));
    image.onerror = () => finish(new Error('Image decode failed'));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    image.src = url;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function presentationAtlas(value: unknown, image: HTMLImageElement, requiredFrames: readonly string[]): AtlasData {
  if (!isRecord(value) || !isRecord(value.frames) || !Object.keys(value.frames).length) throw new AssetLoadError('invalid', '技能图集没有合法帧表');
  for (const name of requiredFrames) if (!Object.hasOwn(value.frames, name)) throw new AssetLoadError('invalid', `技能图集缺少必需帧：${name}`);
  for (const [name, entry] of Object.entries(value.frames)) {
    if (!isRecord(entry) || !isRecord(entry.frame)) throw new AssetLoadError('invalid', `技能图集帧结构非法：${name}`);
    const f = entry.frame;
    const dimensions = [f.x, f.y, f.w, f.h];
    if (!dimensions.every(Number.isInteger) || (f.x as number) < 0 || (f.y as number) < 0 || (f.w as number) <= 0 || (f.h as number) <= 0
      || (f.x as number) + (f.w as number) > image.naturalWidth || (f.y as number) + (f.h as number) > image.naturalHeight) {
      throw new AssetLoadError('invalid', `技能图集帧坐标非法或越界：${name}`);
    }
    // The delivered FX pack is unrotated/untrimmed. Reject metadata that would
    // change its visible size or origin despite a superficially valid rectangle.
    if ((entry.rotated !== undefined && entry.rotated !== false) || (entry.trimmed !== undefined && entry.trimmed !== false)) throw new AssetLoadError('invalid', `技能图集帧变换不受支持：${name}`);
    for (const field of ['sourceSize', 'spriteSourceSize']) {
      const size = entry[field];
      if (size !== undefined && (!isRecord(size) || size.w !== f.w || size.h !== f.h
        || (field === 'spriteSourceSize' && (size.x !== 0 || size.y !== 0)))) throw new AssetLoadError('invalid', `技能图集帧尺寸元数据非法：${name}`);
    }
  }
  if (value.meta !== undefined && (!isRecord(value.meta) || (value.meta.size !== undefined && (!isRecord(value.meta.size)
    || value.meta.size.w !== image.naturalWidth || value.meta.size.h !== image.naturalHeight)))) throw new AssetLoadError('invalid', '技能图集图片尺寸与元数据不符');
  return value as unknown as AtlasData;
}

function validatePresentationTexture(scene: Phaser.Scene, key: string, frames: readonly string[]): void {
  if (!scene.textures.exists(key)) throw new AssetLoadError('texture', '表现纹理注册失败');
  const texture = scene.textures.get(key);
  const image = texture.getSourceImage();
  if (!image || ![image.width, image.height].every(value => Number.isInteger(value) && value > 0)) throw new AssetLoadError('texture', '表现纹理图片已失效');
  for (const name of frames) {
    if (!texture.has(name)) throw new AssetLoadError('texture', `表现纹理缺少必需帧：${name}`);
    const frame = texture.get(name);
    if (![frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight].every(Number.isInteger)
      || frame.cutX < 0 || frame.cutY < 0 || frame.cutWidth <= 0 || frame.cutHeight <= 0
      || frame.cutX + frame.cutWidth > image.width || frame.cutY + frame.cutHeight > image.height) throw new AssetLoadError('texture', `表现纹理帧已失效：${name}`);
  }
}

async function presentationImage(url: string, downloads: AssetDownloads): Promise<HTMLImageElement> {
  const bytes = await downloads.read(url, response => response.arrayBuffer());
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: deliveryRecord(url)?.contentType ?? (url.endsWith('.webp') ? 'image/webp' : 'image/png') }));
  try {
    const image = await fetchImage(objectUrl);
    if (!Number.isInteger(image.naturalHeight) || image.naturalHeight <= 0) throw new AssetLoadError('decode', '表现图片尺寸非法');
    return image;
  } finally { URL.revokeObjectURL(objectUrl); }
}

function validateCachedFxBundle(scene: Phaser.Scene, asset: PresentationFxAsset): void {
  const issues = validateFxRuntime(asset.runtime, asset.characterId);
  if (issues.length) throw new AssetLoadError('invalid', issues[0]!);
  for (const page of asset.runtime.pages) {
    const frames = Object.keys(asset.runtime.framePages).filter(frame => asset.runtime.framePages[frame] === page.id);
    const key = asset.frameTextures[frames[0]!];
    if (!key || frames.some(frame => asset.frameTextures[frame] !== key)) throw new AssetLoadError('texture', `FX分页帧纹理归属失效：${page.id}`);
    validatePresentationTexture(scene, key, frames);
    const image = scene.textures.get(key).getSourceImage();
    if (image.width !== page.width || image.height !== page.height) throw new AssetLoadError('texture', `FX分页纹理尺寸失效：${page.id}`);
  }
}

/** Page files are known only from this explicitly requested contract, never a directory. */
async function loadPresentationFxRuntime(scene: Phaser.Scene, request: PresentationResource, downloads: AssetDownloads): Promise<void> {
  const epoch = presentationGeneration(scene, request.key);
  const requestIdentity = JSON.stringify(request);
  const remove = (key: string): void => { if (scene.textures.exists(key)) scene.textures.remove(key); };
  const touched = new Set<string>();
  try {
    const base = request.runtime && fxRuntimeBase(request.key, request.runtime);
    if (!base) throw new AssetLoadError('invalid', `FX运行合同路径必须位于已声明角色命名空间：${request.key}`);
    const previous = (scene.registry.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined)?.[request.key];
    if (deliveryRecord(request.runtime!) && previous?.deliveryVersion === DELIVERY_VERSION && previous.requestIdentity === requestIdentity) {
      validateCachedFxBundle(scene, previous);
      return;
    }
    const tasks = workMap(scene.textures, presentationWork);
    const taskKey = `${request.key}:runtime:${epoch}:${requestIdentity}`;
    let work = tasks.get(taskKey);
    if (!work) {
      work = (async () => {
        const raw: unknown = await downloads.read(request.runtime!, response => response.json());
        const id = request.key.slice(3);
        if (!isFxRuntime(raw, id)) throw new AssetLoadError('invalid', validateFxRuntime(raw, id)[0] ?? 'FX合同非法');
        for (const reference of request.frames) if (!fxReferenceFrames(raw, reference)) throw new AssetLoadError('invalid', `FX合同缺少必需帧或动画：${reference}`);
        const pages = await settleAll(raw.pages.map(async page => {
          const [atlas, { image, imageHash }] = await settleAll([
            downloads.read(`${base}${page.data}`, response => response.json()), fetchAnimeImage(`${base}${page.image}`, downloads),
          ]);
          const issues = validateFxRuntimeAtlas(raw, page, atlas, image.naturalWidth, image.naturalHeight);
          if (issues.length) throw new AssetLoadError('invalid', issues[0]!);
          return { page, atlas: atlas as AtlasData, image, imageHash };
        }));
        const identity = await sha256(JSON.stringify([raw, pages.map(({ page, atlas, imageHash }) => [page.id, atlas, imageHash])]));
        // A late background completion cannot reinstall pages released by a new match.
        if (presentationGeneration(scene, request.key) !== epoch) throw new AssetLoadError('invalid', '已换角，未采用过时FX载入');
        const frameTextures: Record<string, string> = {};
        for (const { page, atlas, image } of pages) {
          const key = `${request.key}-${identity}-${page.id}`;
          touched.add(key);
          const texture = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.addAtlas(key, image, atlas);
          if (!texture) throw new AssetLoadError('texture', `FX分页纹理注册失败：${page.id}`);
          texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
          for (const frame of Object.keys(atlas.frames)) frameTextures[frame] = key;
        }
        const asset: PresentationFxAsset = { characterId: id, runtime: raw, frameTextures, requestIdentity, deliveryVersion: DELIVERY_VERSION };
        validateCachedFxBundle(scene, asset);
        const latest = { ...((scene.registry.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined) ?? {}) };
        const old = latest[request.key];
        latest[request.key] = asset;
        scene.registry.set(PRESENTATION_FX_ASSETS, latest);
        const retained = new Set(Object.values(frameTextures));
        for (const oldKey of new Set(Object.values(old?.frameTextures ?? {}))) if (!retained.has(oldKey)) remove(oldKey);
        remove(request.key); // An earlier single-page declaration cannot be borrowed.
      })().finally(() => { tasks.delete(taskKey); });
      tasks.set(taskKey, work);
    }
    await work;
  } catch (error) {
    for (const key of touched) remove(key);
    if (presentationGeneration(scene, request.key) === epoch) {
      releaseFxBundle(scene, request.key, remove);
      remove(request.key);
    }
    throw error;
  }
}

/** Full anime requires its declared stage/FX pack; optional callers still receive failures for inspection. */
export async function loadPresentationAssets(
  scene: Phaser.Scene,
  downloads = sharedDownloads(scene.game ?? scene.registry),
  scope: 'menu' | 'fight' = 'fight',
  characterIds: readonly string[] = ['luffy', 'akainu'],
): Promise<PresentationAssetLoadResult> {
  const profile = readPresentation(scene.registry);
  const required = profile.art === 'anime' && profile.scope === 'full';
  // An explicit DEV roster may run a full local match only after the same
  // complete character/UI/FX gates pass. Release builds still keep four ids.
  const plan = presentationResources(scope, characterIds, rosterFxPreviewEnabled());
  const requests: readonly PresentationResource[] = plan.resources;
  const results = await Promise.all(requests.map(async request => {
    try {
      if (request.runtime) {
        await loadPresentationFxRuntime(scene, request, downloads);
        return { key: request.key };
      }
      // An explicit rollback to single-atlas art supersedes a loaded or still
      // pending runtime bundle; it must not inherit the older animation map.
      const runtimeAsset = (scene.registry.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined)?.[request.key];
      const hasPendingRuntime = [...(presentationWork.get(scene.textures)?.keys() ?? [])].some(key => key.startsWith(`${request.key}:runtime:`));
      if (runtimeAsset || hasPendingRuntime) presentationGeneration(scene, request.key, true);
      if (!scene.textures.exists(request.key)) {
        const tasks = workMap(scene.textures, presentationWork);
        let work = tasks.get(request.key);
        if (!work) {
          work = (async () => {
        const [imageResult, atlasResult] = await Promise.allSettled([
          presentationImage(request.image, downloads),
          request.atlas ? downloads.read(request.atlas, response => response.json()) : Promise.resolve(null),
        ]);
        if (imageResult.status === 'rejected') throw imageResult.reason;
        if (atlasResult.status === 'rejected') throw atlasResult.reason;
        const image = imageResult.value;
        const texture = request.atlas
          ? scene.textures.addAtlas(request.key, image, presentationAtlas(atlasResult.value, image, request.frames))
          : scene.textures.addImage(request.key, image);
        if (!texture) throw new AssetLoadError('texture', '表现纹理注册失败');
          })().finally(() => { tasks.delete(request.key); });
          tasks.set(request.key, work);
        }
        await work;
      }
      validatePresentationTexture(scene, request.key, request.frames);
      releaseFxBundle(scene, request.key, key => { if (scene.textures.exists(key)) scene.textures.remove(key); });
      return { key: request.key };
    } catch (error) {
      // Invalid cached/partly installed textures cannot make retry appear successful.
      if (!request.runtime) {
        releaseFxBundle(scene, request.key, key => { if (scene.textures.exists(key)) scene.textures.remove(key); });
        if (scene.textures.exists(request.key)) scene.textures.remove(request.key);
      }
      const reason = assetFailure('', error);
      const message = error instanceof Error && error.name === 'AbortError' ? '资源请求超时，可重试' : reason.message;
      return { key: request.key, failure: { key: request.key, code: reason.code, message: `${request.key}：${message}` } };
    }
  }));
  const failures = [
    ...results.flatMap(result => result.failure ? [result.failure] : []),
    ...plan.unknownCharacterIds.map(id => ({ key: `fx-${id}`, code: 'invalid' as const, message: `fx-${id}：角色表现资源未声明` })),
  ];
  const result = { ok: failures.length === 0, required, requested: requests.map(request => request.key), loaded: results.filter(result => !result.failure).map(result => result.key), failures };
  if (scope === 'fight') scene.registry.set(PRESENTATION_ASSET_LOAD_RESULT, result);
  return result;
}

/** Call only after Fight has shut down. Verified byte/cache entries remain reusable;
 * this releases decoded combat textures for characters that are no longer selected. */
export function releaseUnusedFightAssets(scene: Phaser.Scene, retainedCharacterIds: readonly string[]): string[] {
  const retained = new Set(retainedCharacterIds);
  const removed: string[] = [];
  const remove = (key: string): void => {
    if (!scene.textures.exists(key)) return;
    scene.textures.remove(key);
    removed.push(key);
  };
  for (const [id, plan] of Object.entries(CHARACTER_RESOURCE_PLANS)) {
    if (!retained.has(id)) for (const resource of plan.presentation) {
      presentationGeneration(scene, resource.key, true);
      releaseFxBundle(scene, resource.key, remove);
      remove(resource.key);
    }
  }
  // Candidate textures follow the same match lifetime; a later missing pack
  // must not accidentally borrow a stale preview texture from another match.
  for (const id of Object.keys(ROSTER_FX_CANDIDATES)) if (!retained.has(id)) {
    presentationGeneration(scene, `fx-${id}`, true);
    releaseFxBundle(scene, `fx-${id}`, remove);
    remove(`fx-${id}`);
  }
  for (const [key, asset] of Object.entries((scene.registry.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined) ?? {})) if (!retained.has(asset.characterId)) {
    presentationGeneration(scene, key, true);
    releaseFxBundle(scene, key, remove);
  }
  const assets = { ...((scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined) ?? {}) };
  const errors = { ...((scene.registry.get(ANIME_ERRORS) as Record<string, string> | undefined) ?? {}) };
  for (const [id, asset] of Object.entries(assets)) {
    if (retained.has(id)) continue;
    for (const key of new Set([asset.key, ...Object.values(asset.frameTextures ?? {})])) remove(key);
    for (const form of Object.values(asset.forms ?? {})) for (const key of new Set([form.key, ...Object.values(form.frameTextures ?? {})])) remove(key);
    delete assets[id];
    delete errors[id];
  }
  scene.registry.set(ANIME_CHARACTERS, assets);
  scene.registry.set(ANIME_ERRORS, errors);
  return removed;
}

export function spriteFrame(scene: Phaser.Scene, charId: string, anim: string, index = 0): { key: string; frame: string } | null {
  if (readPresentation(scene.registry).art === 'anime') {
    const asset = (scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined)?.[charId];
    if (!asset) return null;
    // A title/card can intentionally use a real idle drawing until a portrait exists.
    // Combat/result actions never borrow an unrelated drawing or a legacy texture.
    const displayAnim = anim === 'portrait' && !asset.runtime.anims.portrait ? 'idle' : anim;
    const frame = `${charId}/${displayAnim}/${index}`;
    const key = asset.frameTextures?.[frame] ?? asset.key;
    return scene.textures.exists(key) && scene.textures.get(key).has(frame) ? { key, frame } : null;
  }
  const keys = (scene.registry.get(SPRITE_KEYS) as SpriteKeys | undefined) ?? {};
  const key = keys[charId];
  if (!key) return null;
  const frame = `${charId}/${anim}/${index}`;
  return scene.textures.get(key).has(frame) ? { key, frame } : null;
}

/** High-density interface crops never replace a combat action or borrow legacy art. */
export function interfaceFrame(scene: Phaser.Scene, charId: string, kind: 'body' | 'portrait'): { key: string; frame: string } | null {
  if (readPresentation(scene.registry).art !== 'anime') return null;
  const asset = (scene.registry.get(ANIME_CHARACTERS) as AnimeCharacterAssets | undefined)?.[charId];
  const uiKey = (scene.registry.get(ANIME_INTERFACES) as InterfaceAssets | undefined)?.[charId]?.key ?? asset?.uiKey;
  const frame = `${charId}/ui/${kind}`;
  return uiKey && scene.textures.exists(uiKey) && scene.textures.get(uiKey).has(frame) ? { key: uiKey, frame } : null;
}
