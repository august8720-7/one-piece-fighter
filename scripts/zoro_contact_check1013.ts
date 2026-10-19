/** Exact contact fixture for an existing Zoro sword, not real browser acceptance. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Btn, FightSim, px, totalFrames, type FighterDef, type Facing } from '../src/core';
import { zoroDef } from '../src/characters/zoro/def';
import { akainuDef } from '../src/characters/akainu/def';
import { labubuDef } from '../src/characters/labubu/def';

const move = zoroDef.moves.find(entry => entry.id === 'st_a')!;
const box = move.frames.find(frame => frame.hitboxes?.length)!.hitboxes![0]!;
const sourcePoints = { grip: [309, 958], tip: [497, 936] } as const;
const root = [187, 1218] as const;
const factor = 94 / 379;
for (const [x, y] of Object.values(sourcePoints)) {
  const world = [(x - root[0]) * factor, (y - root[1]) * factor];
  assert(world[0]! > box[0] && world[0]! < box[0] + box[2]);
  assert(world[1]! > box[1] && world[1]! < box[1] + box[3]);
}
assert.equal(move.damage, 36);
assert.equal(totalFrames(move), 19);
assert.deepEqual(move.frames.map(frame => frame.duration), [5, 3, 11]);
const legacy: FighterDef = {
  ...zoroDef,
  moves: zoroDef.moves.map(entry => entry.id !== 'st_a' ? entry : {
    ...entry, frames: entry.frames.map(frame => !frame.hitboxes ? frame : { ...frame, hitboxes: [[9, -62, 34, 21] as const] }),
  }),
};
const cases = [
  { label: 'old-box-misses-visible-blade-range', fighter: legacy, opponent: akainuDef, crouch: false, distance: 90, damage: 0 },
  { label: 'new-box-connects-visible-blade-range', fighter: zoroDef, opponent: akainuDef, crouch: false, distance: 90, damage: 36 },
  { label: 'high-blade-does-not-invent-low-hit', fighter: zoroDef, opponent: labubuDef, crouch: true, distance: 60, damage: 0 },
];
const results = [];
for (const facing of [1, -1] as const satisfies readonly Facing[]) {
  for (const fixture of cases) {
    const sim = new FightSim({ p1: fixture.fighter, p2: fixture.opponent, introFrames: 0, roundTime: -1, seed: 1013 });
    const [me, other] = sim.state.fighters;
    // Deliberate synthetic initial positions; only InputFrames are used after setup.
    me.x = px(-fixture.distance / 2) * facing;
    other.x = px(fixture.distance / 2) * facing;
    me.facing = facing;
    other.facing = facing === 1 ? -1 : 1;
    const p2 = fixture.crouch ? Btn.Down : 0;
    sim.step({ p1: 0, p2 });
    const hpBefore = other.hp;
    sim.step({ p1: Btn.A, p2 });
    for (let frame = 0; frame < 26; frame++) sim.step({ p1: 0, p2 });
    const damage = hpBefore - other.hp;
    assert.equal(damage, fixture.damage, `${fixture.label}/${facing}`);
    results.push({ fixture: fixture.label, facing, distance: fixture.distance, opponent: fixture.opponent.id, crouch: fixture.crouch, damage, passed: true });
  }
}
const out = 'D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro/zoro-sta-contact-check1013.json';
const body = {
  date: '2026-10-13', kind: 'synthetic-contact-fixtures-not-gameplay-acceptance',
  source: 'public/assets/generated/source/roster-zoro-sword-repair-0929.png',
  sourceSha256: '09fb1df4358b3f0046ca20c18eef1b0acf31fa7a6c650dce1b834907fb7d74c9',
  sourcePoints, root, worldUnitsPerSourcePixel: factor, oldBox: [9, -62, 34, 21], newBox: box,
  preserved: ['36 damage', '5/3/11 timing', 'input', 'chain', 'source pixels', 'root', 'old characters/core'],
  newMovesSha256: createHash('sha256').update(readFileSync('src/characters/zoro/moves.ts')).digest('hex'),
  fixtures: results, normalSpeedBrowserReview: 'pending',
};
writeFileSync(out, JSON.stringify(body, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
process.stdout.write(JSON.stringify(body) + '\n');
