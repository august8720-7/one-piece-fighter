/** Direct deterministic fixture for the genuine st_a fist. Not browser acceptance. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Btn, FightSim, px, totalFrames, type Facing } from '../src/core';
import { kizaruDef } from '../src/characters/kizaru/def';
import { akainuDef } from '../src/characters/akainu/def';
import { labubuDef } from '../src/characters/labubu/def';

const move = kizaruDef.moves.find(entry => entry.id === 'st_a')!;
const box = move.frames.find(frame => frame.hitboxes?.length)!.hitboxes![0]!;
const fistWorld = [47.44776119402985, -82.97014925373135] as const;
assert(fistWorld[0] > box[0] && fistWorld[0] < box[0] + box[2]);
assert(fistWorld[1] > box[1] && fistWorld[1] < box[1] + box[3]);
assert.equal(move.damage, 32);
assert.equal(totalFrames(move), 17);
assert.deepEqual(move.frames.map(frame => frame.duration), [5, 3, 9]);
const results = [];
for (const facing of [1, -1] as const satisfies readonly Facing[]) {
  for (const [opponent, crouch, expectedHit] of [[akainuDef, false, true], [labubuDef, true, false]] as const) {
    const sim = new FightSim({ p1: kizaruDef, p2: opponent, introFrames: 0, roundTime: -1, seed: 1013 });
    const [me, other] = sim.state.fighters;
    // This is an explicitly synthetic deterministic fixture, never a real-game claim.
    me.x = px(-27) * facing;
    other.x = px(27) * facing;
    me.facing = facing;
    other.facing = facing === 1 ? -1 : 1;
    const p2 = crouch ? Btn.Down : 0;
    sim.step({ p1: 0, p2 });
    sim.step({ p1: Btn.A, p2 });
    const hpBefore = other.hp;
    for (let frame = 0; frame < 24; frame++) sim.step({ p1: 0, p2 });
    const damage = hpBefore - other.hp;
    assert.equal(damage > 0, expectedHit, `${facing}/${opponent.id}/${crouch}`);
    if (expectedHit) assert.equal(damage, 32);
    results.push({ facing, opponent: opponent.id, crouch, expectedHit, damage, passed: true });
  }
}
const root = 'D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/kizaru';
const body = {
  date: '2026-10-13', kind: 'deterministic-fixture-not-browser-or-art-acceptance',
  source: 'public/assets/generated/source/roster-kizaru-locomotion-0929.png',
  sourceSha256: '5f7997b50c663b2ce7ef7ba0dff8748484abde809019cc0416ff7b2267d9d7e1',
  diagnosticCrop: 'kizaru-sta-diagnostic-crop1013.png', diagnosticCropSourceRect: [170, 840, 445, 950],
  manuallyInspectedFistBoundsInSource: [394, 884, 434, 913],
  sourceRoot: [230, 1224], worldUnitsPerSourcePixel: 102 / 402, fistWorld,
  oldBox: [16, -73, 31, 24], newBox: box,
  preserved: ['damage32', 'startup5/active3/recovery9', 'inputs', 'chain', 'roots', 'all-source-pixels', 'old-characters', 'core'],
  newMovesSha256: createHash('sha256').update(readFileSync('src/characters/kizaru/moves.ts')).digest('hex'),
  fixtures: results, browserReview: 'pending-walk-sample',
};
writeFileSync(`${root}/kizaru-sta-contact-check1013.json`, JSON.stringify(body, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
process.stdout.write(JSON.stringify(body) + '\n');
