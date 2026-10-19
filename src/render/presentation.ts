import uiArtManifest from './anime/uiArtManifest.json';

export type ArtStyle = 'legacy' | 'anime';
export type RenderQuality = 'high' | 'performance';
export type PresentationScope = 'full' | 'sample';

/** Kept outside combat state; scene navigation must carry this exact profile. */
export interface PresentationProfile {
  art: ArtStyle;
  quality: RenderQuality;
  scope: PresentationScope;
}

export type PresentationData = Partial<PresentationProfile>;
export const PRESENTATION = 'presentationProfile';
export const PRESENTATION_LOAD = 'presentationLoadResult';
export const PRESENTATION_VERSION = import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('rosterPreview') === '0929'
  ? '角色扩充候选 · 1013' : '四角色联动 · 0927';
const releaseRoster: Record<string, { image: string; enabled?: boolean; pcRosterAccepted?: boolean }> = uiArtManifest.characters;
const sixRoleBuild = Object.keys(releaseRoster).length === 6
  && ['luffy', 'akainu', 'labubu', 'twinkle', 'aokiji', 'shanks'].every(id => releaseRoster[id] && releaseRoster[id]!.enabled !== false)
  && ['aokiji', 'shanks'].every(id => releaseRoster[id]!.pcRosterAccepted === true);
const LEGACY: PresentationProfile = { art: 'legacy', quality: 'performance', scope: 'full' };

interface Registry {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

export function resolvePresentation(data: PresentationData = {}, previous: PresentationProfile = LEGACY): PresentationProfile {
  const art = data.art === 'anime' || data.art === 'legacy' ? data.art : previous.art;
  return {
    art,
    quality: data.quality === 'high' || data.quality === 'performance' ? data.quality : previous.quality,
    scope: art === 'legacy' ? 'full' : data.scope === 'full' || data.scope === 'sample' ? data.scope : previous.scope,
  };
}

export function presentationFromQuery(query: URLSearchParams): PresentationProfile {
  const art = query.get('art') === 'anime' ? 'anime' : 'legacy';
  return resolvePresentation({
    art,
    quality: query.get('quality') === 'performance' || art === 'legacy' ? 'performance' : 'high',
    // Preserve the explicit 0912 training URL; a full request never becomes a sample silently.
    scope: query.get('scope') === 'sample' || (query.get('scope') !== 'full' && query.get('mode') === 'training' && art === 'anime') ? 'sample' : 'full',
  });
}

export function readPresentation(registry: Registry): PresentationProfile {
  return resolvePresentation((registry.get(PRESENTATION) as PresentationData | undefined) ?? {});
}

export function adoptPresentation(registry: Registry, data: PresentationData = {}): PresentationProfile {
  const profile = resolvePresentation(data, readPresentation(registry));
  registry.set(PRESENTATION, profile);
  if (typeof document !== 'undefined') document.body.dataset.art = profile.art;
  return profile;
}

export function legacyPresentation(profile: PresentationProfile): PresentationProfile {
  return { ...profile, art: 'legacy', scope: 'full' };
}

export function presentationLabel(profile: PresentationProfile): string {
  const version = profile.art === 'anime' && profile.scope === 'full' && sixRoleBuild ? '六人联动 · 1017' : PRESENTATION_VERSION;
  return `${version} · ${profile.art === 'anime' ? profile.scope === 'sample' ? '动漫动作内部样板' : '动漫版' : '旧版'}`;
}
