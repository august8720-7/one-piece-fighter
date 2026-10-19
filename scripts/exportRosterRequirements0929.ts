/** Export real logical timings for artwork authors; this creates no artwork or completion claims. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rosterCandidates0929 } from '../src/characters/rosterCandidates0929';
import { DEFAULT_ANIMS } from '../src/render/animations';

const target = process.argv[2];
if (!target) throw new Error('Provide an explicit local JSON output path under the documented authoring directory.');
const output = resolve(target);
const body = {
  schemaVersion: 1,
  kind: 'pc-roster-authoring-requirements',
  status: 'data-candidates-not-artwork-acceptance',
  platform: 'pc',
  characters: rosterCandidates0929.map(({ def }) => ({
    id: def.id, name: def.name, tagline: def.tagline,
    worldHeight: -def.pushboxStand[1],
    pushboxStand: def.pushboxStand,
    hurtboxStand: def.hurtboxStand,
    requiredStates: Object.keys(DEFAULT_ANIMS),
    conditionalReactions: ['held_leg_flip', 'held_labubu_throw', 'held_twinkle_throw'],
    voiceEvents: ['select', 'attack', 'hit', 'ko', 'win', 'idle', 'special'],
    skillSlots: def.skillSlots,
    moves: def.moves.map(move => ({
      id: move.id, name: move.name, type: move.type,
      input: move.input,
      totalTicks: move.frames.reduce((sum, frame) => sum + frame.duration, 0),
      phases: move.frames.map(frame => ({ ticks: frame.duration, sprite: frame.sprite,
        ...(frame.hitboxes ? { hitboxes: frame.hitboxes } : {}),
        ...(frame.velocity ? { velocity: frame.velocity } : {}),
      })),
      ...(move.throwData ? { throwData: move.throwData } : {}),
      ...(move.projectiles ? { projectiles: move.projectiles } : {}),
    })),
  })),
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(body, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
process.stdout.write(`${JSON.stringify({ output, characters: body.characters.length,
  skills: body.characters.reduce((sum, fighter) => sum + (fighter.skillSlots?.length ?? 0), 0),
  moves: body.characters.reduce((sum, fighter) => sum + fighter.moves.length, 0),
})}\n`);
