import candidate from './rosterVoiceCandidates1003.json';
import type { CueCatalog, CueRequest, FightAudioEvent } from './audioTypes';

const runtimeCues = candidate.runtime.cues as unknown as CueCatalog;
const characterIds = new Set(Object.values(runtimeCues).map(cue => cue.characterId).filter((id): id is string => !!id));
const currentSearch = () => typeof window === 'undefined' ? '' : window.location.search;

export function rosterVoicePreviewCharacters(dev = import.meta.env.DEV, search = currentSearch()): string[] {
  const query = new URLSearchParams(search);
  if (!dev || query.get('rosterPreview') !== '0929') return [];
  return [...new Set([query.get('p1'), query.get('p2')].filter((id): id is string => !!id && characterIds.has(id)))];
}

/** Match the explicit local character preview; never enable this on a release build. */
export function rosterVoicePreviewEnabled(
  dev = import.meta.env.DEV,
  search = currentSearch(),
): boolean {
  return rosterVoicePreviewCharacters(dev, search).length > 0;
}

export function withRosterVoiceCandidates(catalog: CueCatalog, enabled = rosterVoicePreviewEnabled(), requested = rosterVoicePreviewCharacters()): CueCatalog {
  if (!enabled) return catalog;
  // The explicit legacy enabled=true helper still permits its sole reviewed clip.
  // Unheard entries always require actual participant ids, never this fallback.
  const selected = new Set(requested.length ? requested : [candidate.characterId]);
  const result: CueCatalog = { ...catalog };
  if (requested.length) for (const [id, cue] of Object.entries(runtimeCues)) {
    if (cue.characterId && selected.has(cue.characterId) && !Object.hasOwn(result, id)) result[id] = cue;
  }
  if (selected.has(candidate.characterId) && !Object.hasOwn(result, candidate.cueId)) result[candidate.cueId] = {
      files: [candidate.file], group: 'voice', characterId: candidate.characterId,
      gain: 0.7, priority: 60, cooldownMs: 0, maxInstances: 1,
      transcript: candidate.original, source: candidate.sourceUrl,
      note: 'Native audio model reviewed this exact clip; local select preview only, not a named move or human audition.',
  };
  return result;
}

export function rosterCandidateLine(file: string, enabled = rosterVoicePreviewEnabled()) {
  if (!enabled) return undefined;
  if (file === candidate.file) return candidate;
  return candidate.runtime.lines.find(line => line.file === file);
}

/** Candidate bytes use the existing audio error/retry path, never an unchecked fallback. */
export async function verifyRosterVoiceCandidate(file: string, bytes: ArrayBuffer, managedSourceSha256?: string): Promise<void> {
  const checks = candidate.runtime.fileChecks as Readonly<Record<string, { sha256: string }>>;
  const expected = checks[file]?.sha256;
  if (!expected) return;
  // The shared download pool has verified encoded bank bytes/slices. Compare
  // their original identity instead of mistaking delivered Opus for raw WAV.
  if (managedSourceSha256 !== undefined) {
    if (managedSourceSha256 !== expected) throw new Error('Roster delivery source SHA256 mismatch');
    return;
  }
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  if (actual !== expected) throw new Error('Roster audio candidate SHA256 mismatch');
}

/** Adapt only real candidate game events; normal characters and release builds keep their route. */
export function rosterCandidateEventCues(event: FightAudioEvent, base: CueRequest[], hasCue: (id: string) => boolean,
  enabled = rosterVoicePreviewEnabled(), requested = rosterVoicePreviewCharacters()): CueRequest[] {
  if (!enabled) return base;
  const selected = new Set(requested);
  const detached = event.phase === 'projectile_spawn' || event.phase === 'projectile_end';
  const material = detached ? event.materialCharacterId ?? event.characterId : event.characterId;
  if (!selected.has(material) || !event.moveId) return base;
  const profiles = candidate.runtime.moves as Readonly<Record<string, Readonly<Record<string, {
    projectile: boolean; stages: { start: string; release: string; end: string };
  }>>>>;
  const profile = profiles[material]?.[event.moveId];
  if (!profile) return base;
  const emit = (id: string, keep: CueRequest[] = []): CueRequest[] => hasCue(id) ? [...keep, { id, player: event.player }] : base;
  if (event.phase === 'start') return emit(profile.stages.start, base.filter(cue => cue.id !== 'special' && cue.id !== 'magma'));
  if (event.phase === 'swing') return profile.projectile ? base.filter(cue => cue.id !== 'whoosh') : emit(profile.stages.release, base.filter(cue => cue.id !== 'whoosh'));
  if (event.phase === 'recover') return profile.projectile ? base : emit(profile.stages.end, base);
  if (event.phase === 'projectile_spawn' && profile.projectile) return emit(profile.stages.release, base.filter(cue => cue.id !== 'whoosh'));
  if (event.phase === 'projectile_end' && profile.projectile && ['ground', 'timeout', 'out_of_bounds'].includes(event.endReason ?? '')) return emit(profile.stages.end, base);
  return base;
}
