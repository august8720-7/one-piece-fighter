import uiArtManifest from '../render/anime/uiArtManifest.json';
import type { CueCatalog } from '../audio/audioTypes';

/** Release is explicit; UI crops, source folders and voice counts do not grant it. */
export const NEW_PC_ROSTER_IDS = ['aokiji', 'kizaru', 'fujitora', 'ryokugyu', 'garp', 'shanks',
  'zoro', 'sanji', 'whitebeard', 'bigmom', 'kaido', 'sengoku', 'blackbeard', 'roger', 'rocks',
  'shiki', 'rayleigh', 'gaban', 'beckman'] as const;
const candidates = new Set<string>(NEW_PC_ROSTER_IDS);
type ApprovalArt = Readonly<Record<string, { enabled?: boolean; pcRosterAccepted?: boolean; [field: string]: unknown }>>;

export function releasedPcRosterIds(records: ApprovalArt = uiArtManifest.characters): string[] {
  return NEW_PC_ROSTER_IDS.filter(id => records[id]?.pcRosterAccepted === true && records[id]?.enabled !== false);
}

export function availablePcRosterIds(dev = import.meta.env.DEV,
  search = typeof window === 'undefined' ? '' : window.location.search): string[] {
  const result = new Set(releasedPcRosterIds());
  const query = new URLSearchParams(search);
  if (dev && query.get('rosterPreview') === '0929') {
    for (const id of [query.get('p1'), query.get('p2')]) if (id && candidates.has(id)) result.add(id);
  }
  return [...result];
}

/** Reviewed audio may precede art completion; default four-role menus stay isolated. */
export function withAvailableRosterAudio(catalog: CueCatalog, available = availablePcRosterIds()): CueCatalog {
  const enabled = new Set(available);
  return Object.fromEntries(Object.entries(catalog).filter(([id, cue]) => {
    const owner = cue.characterId ?? (id.startsWith('voice.') ? id.split('.')[1] : undefined);
    return !owner || !candidates.has(owner) || enabled.has(owner);
  }));
}
