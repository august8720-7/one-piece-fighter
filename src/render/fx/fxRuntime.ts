/** Explicit FX author contracts; no file discovery, rendering clock, or core mutation. */
export interface FxRuntimePage { id: string; image: string; data: string; width: number; height: number }
export interface FxRuntimeAnimation { frames: string[]; ticks: number[]; loop: boolean }
export interface FxRuntimeManifest {
  schemaVersion: 1;
  characterId: string;
  pages: FxRuntimePage[];
  framePages: Record<string, string>;
  anims: Record<string, FxRuntimeAnimation>;
  manifestSha256: string;
}
export const PRESENTATION_FX_ASSETS = 'presentationFxAssets';
export interface PresentationFxAsset {
  characterId: string;
  runtime: FxRuntimeManifest;
  frameTextures: Record<string, string>;
  requestIdentity: string;
  deliveryVersion: string;
}
export type PresentationFxAssets = Record<string, PresentationFxAsset>;
export interface PresentationFrameSource {
  registry?: { get(key: string): unknown };
  textures: { exists(key: string): boolean; get(key: string): { has(frame: string): boolean; getFrameNames?(includeBase?: boolean): string[] } };
}
const namePattern = /^[a-z][a-z0-9_]*$/;
const hashPattern = /^[a-f0-9]{64}$/i;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export function fxRuntimeBase(key: string, runtimeUrl: string): string | null {
  if (!/^fx-[a-z][a-z0-9_]*$/.test(key)) return null;
  const base = `assets/fx/${key.slice(3)}/`;
  return runtimeUrl === `${base}fx-runtime.json` ? base : null;
}

/** Validate every reference before a page can become a Phaser texture. */
export function validateFxRuntime(value: unknown, characterId: string): string[] {
  const issues: string[] = [];
  if (!record(value) || value.schemaVersion !== 1 || value.characterId !== characterId || !namePattern.test(characterId)) return ['FX运行合同身份或版本非法'];
  if (typeof value.manifestSha256 !== 'string' || !hashPattern.test(value.manifestSha256)) issues.push('FX运行合同缺少合法作者SHA256');
  if (!Array.isArray(value.pages) || !value.pages.length) return [...issues, 'FX运行合同没有显式分页'];
  const pages = new Set<string>();
  for (const [index, page] of value.pages.entries()) {
    if (!record(page) || page.id !== `p${index}` || !positive(page.width) || !positive(page.height) || Math.max(page.width, page.height) > 4096) {
      issues.push(`FX分页身份或尺寸非法：p${index}`); continue;
    }
    const stem = index === 0 ? 'atlas' : `atlas-p${index}`;
    if (typeof page.image !== 'string' || ![`${stem}.png`, `${stem}.webp`, `${stem}.avif`].includes(page.image) || page.data !== `${stem}.json`) issues.push(`FX分页路径越界或命名非法：${page.id}`);
    pages.add(page.id as string);
  }
  if (!record(value.framePages) || !Object.keys(value.framePages).length) return [...issues, 'FX运行合同没有显式帧归属'];
  const assigned = new Set<string>();
  for (const [name, page] of Object.entries(value.framePages)) {
    if (!namePattern.test(name) || typeof page !== 'string' || !pages.has(page)) issues.push(`FX帧归属非法：${name}`);
    else assigned.add(page);
  }
  for (const page of pages) if (!assigned.has(page)) issues.push(`FX分页没有实际帧：${page}`);
  if (!record(value.anims)) return [...issues, 'FX运行合同动画表非法'];
  for (const [name, animation] of Object.entries(value.anims)) {
    if (!namePattern.test(name) || Object.hasOwn(value.framePages, name) || !record(animation)) {
      issues.push(`FX动画名非法或与静帧冲突：${name}`); continue;
    }
    const frames = animation.frames, ticks = animation.ticks;
    if (!Array.isArray(frames) || !frames.length || !frames.every(frame => typeof frame === 'string' && Object.hasOwn(value.framePages as object, frame))) issues.push(`FX动画引用不存在的实际帧：${name}`);
    if (!Array.isArray(ticks) || !Array.isArray(frames) || ticks.length !== frames.length || !ticks.every(positive)
      || !Number.isSafeInteger(ticks.reduce((sum, tick) => sum + (typeof tick === 'number' ? tick : 0), 0))) issues.push(`FX动画必须有等长正整数ticks：${name}`);
    if (typeof animation.loop !== 'boolean') issues.push(`FX动画loop非法：${name}`);
  }
  return issues;
}

export function isFxRuntime(value: unknown, characterId: string): value is FxRuntimeManifest {
  return validateFxRuntime(value, characterId).length === 0;
}

/** Atlas geometry remains unrotated/untrimmed, and frames belong to exactly one page. */
export function validateFxRuntimeAtlas(runtime: FxRuntimeManifest, page: FxRuntimePage, value: unknown, width: number, height: number): string[] {
  const issues: string[] = [];
  if (width !== page.width || height !== page.height) issues.push(`FX图片尺寸与合同不符：${page.id}`);
  if (!record(value) || !record(value.frames) || !Object.keys(value.frames).length) return [...issues, `FX分页没有实际帧表：${page.id}`];
  const metadata = value.meta;
  if (!record(metadata) || metadata.manifestSha256 !== runtime.manifestSha256 || !record(metadata.size)
    || metadata.size.w !== width || metadata.size.h !== height || metadata.image !== page.image) issues.push(`FX分页作者SHA256或尺寸元数据不符：${page.id}`);
  for (const [name, entry] of Object.entries(value.frames)) {
    if (!Object.hasOwn(runtime.framePages, name) || runtime.framePages[name] !== page.id) issues.push(`FX分页注入未声明或其他页的帧：${page.id}/${name}`);
    if (!record(entry) || !record(entry.frame)) { issues.push(`FX分页帧结构非法：${name}`); continue; }
    const f = entry.frame;
    if (![f.x, f.y].every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0) || !positive(f.w) || !positive(f.h)
      || (f.x as number) + f.w > width || (f.y as number) + f.h > height) issues.push(`FX分页帧越界：${name}`);
    if ((entry.rotated !== undefined && entry.rotated !== false) || (entry.trimmed !== undefined && entry.trimmed !== false)) issues.push(`FX分页帧不能旋转或裁边：${name}`);
    for (const field of ['sourceSize', 'spriteSourceSize']) {
      const size = entry[field];
      if (size !== undefined && (!record(size) || size.w !== f.w || size.h !== f.h
        || (field === 'spriteSourceSize' && (size.x !== 0 || size.y !== 0)))) issues.push(`FX分页帧尺寸元数据不符：${name}`);
    }
  }
  for (const [name, assigned] of Object.entries(runtime.framePages)) if (assigned === page.id && !Object.hasOwn(value.frames, name)) issues.push(`FX分页缺少实际帧：${page.id}/${name}`);
  return issues;
}

export function fxReferenceFrames(runtime: FxRuntimeManifest, reference: string): readonly string[] | null {
  if (Object.hasOwn(runtime.anims, reference)) return runtime.anims[reference]!.frames;
  return Object.hasOwn(runtime.framePages, reference) ? [reference] : null;
}

/** Age is supplied by stateFrame, TTL, or logic-step burst lifetime, never render delta. */
export function sampleFxFrame(runtime: FxRuntimeManifest, reference: string, age: number | null): string | null {
  if (!Object.hasOwn(runtime.anims, reference)) return Object.hasOwn(runtime.framePages, reference) ? reference : null;
  if (age === null || !Number.isSafeInteger(age) || age < 0) return null;
  const animation = runtime.anims[reference]!;
  const total = animation.ticks.reduce((sum, tick) => sum + tick, 0);
  let tick = animation.loop ? age % total : Math.min(age, total - 1);
  for (const [index, duration] of animation.ticks.entries()) {
    if (tick < duration) return animation.frames[index] ?? null;
    tick -= duration;
  }
  return null;
}

function assetFor(scene: PresentationFrameSource, key: string): PresentationFxAsset | undefined {
  return (scene.registry?.get(PRESENTATION_FX_ASSETS) as PresentationFxAssets | undefined)?.[key];
}

export function hasPresentationFrame(scene: PresentationFrameSource, key: string, reference: string): boolean {
  const asset = assetFor(scene, key);
  if (!asset) return scene.textures.exists(key) && scene.textures.get(key).has(reference);
  const frames = fxReferenceFrames(asset.runtime, reference);
  return !!frames?.length && frames.every(frame => {
    const texture = asset.frameTextures[frame];
    return !!texture && scene.textures.exists(texture) && scene.textures.get(texture).has(frame);
  });
}

/** Read-only diagnostics enumerate only references whose actual page textures exist. */
export function loadedPresentationReferences(scene: PresentationFrameSource, key: string): string[] {
  const asset = assetFor(scene, key);
  if (asset) return [...Object.keys(asset.runtime.framePages), ...Object.keys(asset.runtime.anims)]
    .filter(reference => hasPresentationFrame(scene, key, reference));
  return scene.textures.exists(key) ? scene.textures.get(key).getFrameNames?.(false) ?? [] : [];
}

export function resolvePresentationFrame(scene: PresentationFrameSource, key: string, reference: string, age: number | null = 0): { key: string; frame: string } | null {
  const asset = assetFor(scene, key);
  if (!asset) return hasPresentationFrame(scene, key, reference) ? { key, frame: reference } : null;
  if (!hasPresentationFrame(scene, key, reference)) return null;
  const frame = sampleFxFrame(asset.runtime, reference, age);
  const texture = frame ? asset.frameTextures[frame] : null;
  return frame && texture ? { key: texture, frame } : null;
}

export function hasPresentationRuntime(scene: PresentationFrameSource, key: string): boolean {
  return !!assetFor(scene, key);
}

export function presentationAnimationDuration(scene: PresentationFrameSource, key: string, reference: string): number | null {
  const asset = assetFor(scene, key);
  const animation = asset && Object.hasOwn(asset.runtime.anims, reference) ? asset.runtime.anims[reference] : undefined;
  return animation && !animation.loop ? animation.ticks.reduce((sum, tick) => sum + tick, 0) : null;
}
