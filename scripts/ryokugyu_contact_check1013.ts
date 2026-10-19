/** Four direct fixtures for one real fist. No browser or artwork acceptance claim. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Btn, FightSim, px, totalFrames, type Facing } from '../src/core';
import { ryokugyuDef } from '../src/characters/ryokugyu/def';
import { akainuDef } from '../src/characters/akainu/def';
import { labubuDef } from '../src/characters/labubu/def';

const outRoot = 'D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/ryokugyu';
const movesFile = 'src/characters/ryokugyu/moves.ts';
const beforeText = readFileSync(`${outRoot}/ryokugyu-moves-before-sta1013.ts`, 'utf8');
const afterText = readFileSync(movesFile, 'utf8');
const oldBox = [19, -78, 32, 25] as const;
const replacement = 'hitbox: [29, -93, 27, 17]';
assert.equal(afterText, beforeText.replace('hitbox: [19, -78, 32, 25]', replacement), 'Only one hitbox may change.');
const move = ryokugyuDef.moves.find(entry => entry.id === 'st_a')!;
const box = move.frames.find(frame => frame.hitboxes?.length)!.hitboxes![0]!;
const sourceRoot = [242, 1222] as const;
const sourceFist = [419, 909] as const;
const factor = 106 / 384;
const fistWorld = [(sourceFist[0] - sourceRoot[0]) * factor, (sourceFist[1] - sourceRoot[1]) * factor];
assert(fistWorld[1]! < oldBox[1], 'Old box must reproduce the visible-fist mismatch.');
assert(fistWorld[0]! >= box[0] && fistWorld[0]! <= box[0] + box[2]);
assert(fistWorld[1]! >= box[1] && fistWorld[1]! <= box[1] + box[3]);
assert.equal(move.damage, 37);
assert.equal(totalFrames(move), 20);
assert.deepEqual(move.frames.map(frame => frame.duration), [6, 3, 11]);
const fixtures = [];
for (const facing of [1, -1] as const satisfies readonly Facing[]) {
  for (const [opponent, crouch, expected] of [[akainuDef, false, 37], [labubuDef, true, 0]] as const) {
    const sim = new FightSim({ p1: ryokugyuDef, p2: opponent, introFrames: 0, roundTime: -1, seed: 1013 });
    const [me, other] = sim.state.fighters;
    // Synthetic fixture setup. Gameplay after this point receives only real InputFrames.
    me.x = px(-30) * facing;
    other.x = px(30) * facing;
    me.facing = facing;
    other.facing = facing === 1 ? -1 : 1;
    const p2 = crouch ? Btn.Down : 0;
    sim.step({ p1: 0, p2 });
    const beforeHp = other.hp;
    sim.step({ p1: Btn.A, p2 });
    for (let frame = 0; frame < 26; frame++) sim.step({ p1: 0, p2 });
    const damage = beforeHp - other.hp;
    assert.equal(damage, expected, `${facing}/${opponent.id}/${crouch}`);
    fixtures.push({ facing, opponent: opponent.id, crouch, distance: 60, expectedDamage: expected, actualDamage: damage, passed: true });
  }
}
const report = {
  date: '2026-10-13', workspace: process.cwd(), kind: 'synthetic-input-fixture-not-IAB-acceptance',
  source: 'public/assets/generated/source/roster-ryokugyu-locomotion-0929.png',
  sourceSha256: '56f0d9e30aa939d51c75276b48a1048d4105237bc02a9be562386bee9a789d12',
  sourceRoot, sourceFist, worldUnitsPerSourcePixel: factor, fistWorld, oldBox, newBox: box,
  sourceScopeCheck: 'Exact whole-file comparison confirms only this literal hitbox changed.',
  preserved: ['37 damage', '6/3/11 timing', 'all other moves', 'input', 'chain', 'root', 'atlas', 'core', 'central registry'],
  beforeSha256: createHash('sha256').update(beforeText).digest('hex'),
  afterSha256: createHash('sha256').update(afterText).digest('hex'),
  fixtures, browserReview: 'not-performed',
};
writeFileSync(`${outRoot}/ryokugyu-sta-contact-check1013.json`, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
process.stdout.write(JSON.stringify(report) + '\n');
