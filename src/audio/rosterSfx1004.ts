import contract from './rosterSfx1004.json';
import { availablePcRosterIds } from '../characters/rosterAvailability1004';
import type { CueRequest, FightAudioEvent } from './audioTypes';

type ReleaseProfile = { cueId: string; projectile: boolean; releaseOnStart?: boolean };
const profiles = contract.moves as Readonly<Record<string, Readonly<Record<string, ReleaseProfile>>>>;
const checks = contract.fileChecks as Readonly<Record<string, { sha256: string; bytes: number }>>;

/** Actual reviewed release cues; start/recover retain the existing shared sounds. */
export function rosterReleaseEventCues(event: FightAudioEvent, base: CueRequest[], hasCue: (id: string) => boolean,
  available = availablePcRosterIds()): CueRequest[] {
  const detached = event.phase === 'projectile_spawn' || event.phase === 'projectile_end';
  const material = detached ? event.materialCharacterId ?? event.characterId : event.characterId;
  const profile = event.moveId ? profiles[material]?.[event.moveId] : undefined;
  if (!available.includes(material) || !profile || !hasCue(profile.cueId)) return base;
  if (event.phase === 'swing' && (profile.projectile || profile.releaseOnStart)) {
    return base.filter(cue => cue.id !== 'whoosh' && cue.id !== profile.cueId);
  }
  // Dodges have no attacking hitboxes and therefore emit no swing event.
  if ((event.phase === 'start' && profile.releaseOnStart)
    || (event.phase === 'swing' && !profile.projectile && !profile.releaseOnStart)
    || (event.phase === 'projectile_spawn' && profile.projectile)) {
    return [...base.filter(cue => cue.id !== 'whoosh' && cue.id !== profile.cueId), { id: profile.cueId, player: event.player }];
  }
  return base;
}

/** Bank hashes are managed separately; preserve the exact reviewed WAV identity. */
export async function verifyRosterReleaseAudio(file: string, bytes: ArrayBuffer, managedSourceSha256?: string): Promise<void> {
  const expected = checks[file];
  if (!expected) return;
  if (managedSourceSha256 !== undefined) {
    if (managedSourceSha256 !== expected.sha256) throw new Error('Roster release delivery source SHA256 mismatch');
    return;
  }
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  if (bytes.byteLength !== expected.bytes || actual !== expected.sha256) throw new Error('Roster release audio SHA256 mismatch');
}
