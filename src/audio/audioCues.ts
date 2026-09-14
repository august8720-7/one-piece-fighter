import type { AudioCue, CueCatalog, CueRequest, FightAudioEvent, SfxKind } from './audioTypes';

export const SFX_KINDS: readonly SfxKind[] = [
  'hit_light', 'hit_heavy', 'block', 'throw', 'special', 'ko', 'menu_move',
  'menu_confirm', 'round_start', 'counter', 'whoosh', 'magma', 'meteor_fall', 'meteor_land',
];

export function hitSfxKind(damage: number, counter: boolean): SfxKind {
  return counter ? 'counter' : damage >= 60 ? 'hit_heavy' : 'hit_light';
}

type MoveAudioStage = 'start' | 'release' | 'end';
interface MoveAudioProfile {
  family: string;
  fallback: Readonly<Record<MoveAudioStage, SfxKind>>;
  projectile?: 'meteor' | 'dog';
}

const profile = (family: string, start: SfxKind, release: SfxKind, end: SfxKind, projectile?: 'meteor' | 'dog'): MoveAudioProfile => ({
  family, fallback: { start, release, end }, ...(projectile ? { projectile } : {}),
});
const AKAINU_AUDIO = {
  daifunka: profile('daifunka', 'magma', 'special', 'magma'),
  ground_split: profile('ground_split', 'magma', 'throw', 'magma'),
  meigou: profile('meigou', 'magma', 'whoosh', 'magma'),
  meteor: profile('meteor', 'magma', 'meteor_fall', 'meteor_land', 'meteor'),
  inugami: profile('inugami', 'magma', 'whoosh', 'whoosh', 'dog'),
  magma_body: profile('magma_body', 'magma', 'magma', 'whoosh'),
};
const LUFFY_AUDIO = {
  gatling: profile('gatling', 'whoosh', 'whoosh', 'whoosh'),
  gigant: profile('gigant', 'whoosh', 'special', 'whoosh'),
  red_hawk: profile('red_hawk', 'whoosh', 'magma', 'magma'),
  gear2: profile('gear2', 'whoosh', 'whoosh', 'whoosh'),
  balloon: profile('balloon', 'whoosh', 'special', 'whoosh'),
  stretch: profile('stretch', 'whoosh', 'whoosh', 'whoosh'),
};
const AUDIO_FAMILIES: Readonly<Record<string, Readonly<Record<string, MoveAudioProfile>>>> = { akainu: AKAINU_AUDIO, luffy: LUFFY_AUDIO };
const MOVE_AUDIO: Readonly<Record<string, Readonly<Record<string, MoveAudioProfile>>>> = {
  akainu: {
    sp_daifunka: AKAINU_AUDIO.daifunka, sp_daifunka_ren: AKAINU_AUDIO.daifunka,
    sp_ground_split: AKAINU_AUDIO.ground_split,
    sp_meigou: AKAINU_AUDIO.meigou, ult_meigou_end: AKAINU_AUDIO.meigou,
    sp_meteor: AKAINU_AUDIO.meteor, sp_meteor_rain: AKAINU_AUDIO.meteor,
    sp_inugami: AKAINU_AUDIO.inugami, sp_magma_body: AKAINU_AUDIO.magma_body,
  },
  luffy: {
    st_c: LUFFY_AUDIO.stretch,
    sp_gatling: LUFFY_AUDIO.gatling, sp_storm: LUFFY_AUDIO.gatling,
    sp_gigant_pistol: LUFFY_AUDIO.gigant, ult_red_hawk: LUFFY_AUDIO.red_hawk,
    sp_gear2: LUFFY_AUDIO.gear2, sp_balloon: LUFFY_AUDIO.balloon,
    sp_bazooka: LUFFY_AUDIO.stretch, sp_rifle: LUFFY_AUDIO.stretch, sp_rocket: LUFFY_AUDIO.stretch,
  },
};
const stageCue = (character: string, moveAudio: MoveAudioProfile, stage: MoveAudioStage): string => `sfx.${character}.${moveAudio.family}.${stage}`;

/** Missing recorded effects use the existing synthesizer; voices never do. */
export function createCueCatalog(samples: CueCatalog): CueCatalog {
  const catalog: CueCatalog = {};
  for (const kind of SFX_KINDS) {
    catalog[kind] = {
      files: [], group: 'sfx', fallback: kind, gain: 0.7,
      priority: kind === 'ko' ? 90 : kind === 'hit_heavy' || kind === 'counter' ? 60 : 40,
      cooldownMs: kind.startsWith('menu_') ? 35 : kind === 'meteor_fall' ? 75 : 30,
      maxInstances: kind === 'meteor_fall' ? 3 : 4,
    };
  }
  catalog.magma_hit = { files: [], group: 'sfx', fallback: 'hit_heavy', gain: 0.7, cooldownMs: 60, maxInstances: 3 };
  catalog.body_land = { files: [], group: 'sfx', fallback: 'throw', gain: 0.65, cooldownMs: 80, maxInstances: 2 };
  for (const [character, families] of Object.entries(AUDIO_FAMILIES)) {
    for (const moveAudio of Object.values(families)) {
      for (const stage of ['start', 'release', 'end'] as const) {
        catalog[stageCue(character, moveAudio, stage)] = {
          files: [], group: 'sfx', characterId: character, fallback: moveAudio.fallback[stage],
          gain: stage === 'start' ? 0.45 : stage === 'release' ? 0.7 : 0.3,
          priority: stage === 'release' ? 45 : stage === 'start' ? 30 : 20,
          // Meteor rain spawns every four logical frames; short gatling segments also stay audible.
          cooldownMs: stage === 'start' ? 80 : 35,
          maxInstances: moveAudio.projectile === 'meteor' ? 4 : stage === 'release' ? 3 : 2,
        };
      }
    }
  }
  for (const [id, sample] of Object.entries(samples)) {
    const defaults: AudioCue = sample.group === 'voice'
      ? { files: [], group: 'voice', gain: 0.9, priority: id.endsWith('.ko') ? 100 : id.endsWith('.hurt') ? 25 : 70, cooldownMs: id.endsWith('.hurt') ? 500 : 180, maxInstances: 1 }
      : sample.group === 'ambient'
        ? { files: [], group: 'ambient', gain: 0.35, priority: 5, loop: true, maxInstances: 1 }
        : catalog[id] ?? { files: [], group: 'sfx', gain: 0.7, priority: 40, cooldownMs: 40, maxInstances: 3 };
    catalog[id] = { ...defaults, ...sample };
  }
  return catalog;
}

/** Presentation-only mapping; damage, hitboxes and simulation never depend on audio. */
export function eventCues(event: FightAudioEvent, hasCue: (id: string) => boolean): CueRequest[] {
  const result: CueRequest[] = [];
  const add = (id: string, player = event.player) => result.push({ id, player });
  const voice = (kind: string, characterId = event.characterId, player = event.player) => {
    const id = `voice.${characterId}.${kind}`;
    if (hasCue(id)) add(id, player);
  };
  const move = event.moveId ?? '';
  const materialCharacter = event.materialCharacterId ?? event.characterId;
  const moveAudio = MOVE_AUDIO[event.characterId]?.[move];
  const projectileAudio = MOVE_AUDIO[materialCharacter]?.[move]
    ?? (materialCharacter === 'akainu' ? event.projectileKind === 'meteor' ? AKAINU_AUDIO.meteor : event.projectileKind === 'dog' ? AKAINU_AUDIO.inugami : undefined : undefined);
  switch (event.phase) {
    case 'start':
      // A normal with a material profile (stretch heavy) still has a real startup cue.
      if (moveAudio) add(stageCue(event.characterId, moveAudio, 'start'));
      if (!move.startsWith('sp_') && !move.startsWith('ult_')) break;
      if (!moveAudio) add(event.characterId === 'akainu' ? 'magma' : 'special');
      if (hasCue(`voice.${event.characterId}.${move}`)) voice(move);
      else voice('attack');
      break;
    case 'swing':
      // A projectile's real spawn event owns its release, not the caster's animation.
      if (!moveAudio?.projectile) add(moveAudio ? stageCue(event.characterId, moveAudio, 'release') : 'whoosh');
      break;
    case 'recover':
      if (moveAudio && !moveAudio.projectile) add(stageCue(event.characterId, moveAudio, 'end'));
      break;
    case 'hit':
      add(event.counter ? 'counter' : materialCharacter === 'akainu' && (move.startsWith('sp_') || move.startsWith('ult_') || move === 'st_c' || move === 'f_c')
        ? 'magma_hit' : hitSfxKind(event.damage ?? 0, false));
      if (event.defenderId && event.defenderPlayer !== undefined) voice('hurt', event.defenderId, event.defenderPlayer);
      break;
    case 'block': add('block'); break;
    case 'reflect':
      // The reflector owns this contact; moveId still names the incoming projectile.
      add(event.characterId === 'luffy' ? 'sfx.luffy.stretch.release' : 'block');
      break;
    case 'throw': add('throw'); break;
    case 'landing': add('body_land'); break;
    case 'ko': add('ko'); voice('ko'); break;
    case 'win': voice('win'); break;
    case 'round_start': add('round_start'); break;
    case 'projectile_spawn':
      add(projectileAudio?.projectile ? stageCue(materialCharacter, projectileAudio, 'release') : event.projectileKind === 'meteor' ? 'meteor_fall' : 'whoosh');
      break;
    case 'projectile_end':
      // Contact events already sound once. Administrative cleanup never sounds like an impact.
      if (event.projectileKind === 'meteor' && event.endReason === 'ground') add(projectileAudio?.projectile === 'meteor' ? stageCue(materialCharacter, projectileAudio, 'end') : 'meteor_land');
      if (event.projectileKind === 'dog' && (event.endReason === 'timeout' || event.endReason === 'out_of_bounds') && projectileAudio?.projectile === 'dog') add(stageCue(materialCharacter, projectileAudio, 'end'));
      break;
  }
  return result;
}
