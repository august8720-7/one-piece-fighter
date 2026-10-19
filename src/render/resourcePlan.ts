import { MOVE_PRESENTATIONS } from './fx/movePresentation';
import { ROSTER_FX_CANDIDATES } from './fx/rosterFxCandidates1003';
import { releasedPcRosterIds } from '../characters/rosterAvailability1004';

export interface PresentationResource {
  key: string;
  image: string;
  atlas: string | null;
  frames: readonly string[];
  /** Explicit multi-page/tick contract. Absent keeps the existing single-atlas path. */
  runtime?: string;
}

interface CharacterResourcePlan {
  presentation: readonly PresentationResource[];
  /** Trusted delivery-manifest namespaces. Runtime directory contents are never inspected. */
  downloadPrefixes: readonly string[];
  downloadFiles: readonly string[];
}

function moveFrames(characterId: string, direct: readonly string[]): readonly string[] {
  return [...new Set([
    ...direct,
    ...Object.values(MOVE_PRESENTATIONS[characterId] ?? {}).flatMap(move => [move.body, move.impact]),
  ])].sort();
}

const stageResources: readonly PresentationResource[] = [
  { key: 'marineford-backdrop', image: 'assets/stages/marineford/backdrop.webp', atlas: null, frames: [] },
  { key: 'marineford-floor', image: 'assets/stages/marineford/floor.webp', atlas: null, frames: [] },
];

export const COMMON_PRESENTATION_RESOURCES: readonly PresentationResource[] = [
  ...stageResources,
  {
    key: 'fx-common',
    image: 'assets/fx/common/atlas.png',
    atlas: 'assets/fx/common/atlas.json',
    frames: ['impact', 'rebound', 'smoke'],
  },
];

export const MENU_PRESENTATION_RESOURCES: readonly PresentationResource[] = [stageResources[0]!];

export const CHARACTER_RESOURCE_PLANS: Readonly<Record<string, CharacterResourcePlan>> = {
  ...Object.fromEntries(releasedPcRosterIds().flatMap(id => {
    const entry = ROSTER_FX_CANDIDATES[id];
    return entry ? [[id, {
      presentation: [{ key: `fx-${id}`, image: entry.image, atlas: entry.atlas, frames: entry.frames,
        ...(entry.runtime ? { runtime: entry.runtime } : {}) }],
      downloadPrefixes: [`assets/characters/${id}/anime/`, `assets/audio/voice/${id}/`, `assets/fx/${id}/`,
        `assets/audio/sfx/roster-adopted1004/${id}/`],
      downloadFiles: [],
    }]] : [];
  })),
  luffy: {
    presentation: [{
      key: 'fx-luffy', image: 'assets/fx/luffy.png', atlas: 'assets/fx/luffy.json',
      frames: moveFrames('luffy', ['impact', 'rebound', 'steam', 'wind']),
    }],
    downloadPrefixes: ['assets/characters/luffy/anime/', 'assets/audio/voice/luffy/'],
    downloadFiles: ['assets/fx/luffy.png', 'assets/fx/luffy.json'],
  },
  akainu: {
    presentation: [{
      key: 'fx-akainu', image: 'assets/fx/akainu.png', atlas: 'assets/fx/akainu.json',
      frames: moveFrames('akainu', ['dog', 'meteor', 'eruption', 'smoke', 'flame']),
    }],
    downloadPrefixes: ['assets/characters/akainu/anime/', 'assets/audio/voice/akainu/'],
    downloadFiles: ['assets/fx/akainu.png', 'assets/fx/akainu.json'],
  },
  labubu: {
    presentation: [{
      key: 'fx-labubu', image: 'assets/fx/labubu/atlas.png', atlas: 'assets/fx/labubu/atlas.json',
      frames: ['impact', 'wind', 'charge'],
    }],
    downloadPrefixes: ['assets/characters/labubu/anime/', 'assets/audio/voice/labubu/'],
    downloadFiles: ['assets/fx/labubu/atlas.png', 'assets/fx/labubu/atlas.json'],
  },
  twinkle: {
    presentation: [{
      key: 'fx-twinkle', image: 'assets/fx/twinkle/atlas.png', atlas: 'assets/fx/twinkle/atlas.json',
      frames: ['star', 'wave', 'impact', 'spark', 'shield'],
    }],
    downloadPrefixes: ['assets/characters/twinkle/anime/', 'assets/audio/voice/twinkle/'],
    downloadFiles: ['assets/fx/twinkle/atlas.png', 'assets/fx/twinkle/atlas.json'],
  },
};

export const REQUIRED_FX_FRAMES: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(CHARACTER_RESOURCE_PLANS).map(([id, plan]) => [id, plan.presentation.flatMap(resource => resource.frames)]),
);

function uniqueResources(resources: readonly PresentationResource[]): PresentationResource[] {
  return [...new Map(resources.map(resource => [resource.key, resource])).values()];
}

export function presentationResources(scope: 'menu' | 'fight', characterIds: readonly string[], candidateSample = false): {
  resources: PresentationResource[];
  unknownCharacterIds: string[];
} {
  if (scope === 'menu') return { resources: [...MENU_PRESENTATION_RESOURCES], unknownCharacterIds: [] };
  const ids = [...new Set(characterIds)];
  const unknownCharacterIds = ids.filter(id => !CHARACTER_RESOURCE_PLANS[id] && !(candidateSample && ROSTER_FX_CANDIDATES[id]));
  return {
    resources: uniqueResources([
      ...COMMON_PRESENTATION_RESOURCES,
      ...ids.flatMap(id => CHARACTER_RESOURCE_PLANS[id]?.presentation ?? []),
      ...(candidateSample ? ids.filter(id => !CHARACTER_RESOURCE_PLANS[id]).flatMap(id => {
        const entry = ROSTER_FX_CANDIDATES[id];
        return entry ? [{ key: `fx-${id}`, image: entry.image, atlas: entry.atlas, frames: entry.frames,
          ...(entry.runtime ? { runtime: entry.runtime } : {}) }] : [];
      }) : []),
    ]),
    unknownCharacterIds,
  };
}

const resourceFiles = (resource: PresentationResource): string[] => resource.runtime
  ? [resource.runtime] : [resource.image, ...(resource.atlas ? [resource.atlas] : [])];
const COMMON_DOWNLOAD_FILES = new Set(COMMON_PRESENTATION_RESOURCES.flatMap(resourceFiles));

/** Select only URLs explicitly assigned to common or selected-character resource namespaces. */
export function fightDownloadUrls(records: Readonly<Record<string, unknown>>, characterIds: readonly string[] = []): string[] {
  const ids = [...new Set(characterIds)];
  return Object.keys(records).filter(url => {
    if (COMMON_DOWNLOAD_FILES.has(url)) return true;
    return ids.some(id => {
      const plan = CHARACTER_RESOURCE_PLANS[id];
      return !!plan && (plan.downloadFiles.includes(url) || plan.presentation.some(resource => resourceFiles(resource).includes(url)) || plan.downloadPrefixes.some(prefix => url.startsWith(prefix))
        || url.startsWith(`assets/audio/sfx/${id}-`));
    });
  });
}

/** Explicit six-person full-mode opt-in. Ordinary/sample/legacy warmups stay unchanged. */
export function gear5DownloadUrls(records: Readonly<Record<string, unknown>>, characterIds: readonly string[]): string[] {
  return characterIds.includes('luffy') ? Object.keys(records).filter(url => url.startsWith('assets/characters/luffy/forms/gear5/')) : [];
}
