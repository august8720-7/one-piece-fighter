import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Btn, FightSim, Rng, SKILL_BUTTONS } from '../../src/core';
import { luffyDef } from '../../src/characters/luffy/def';
import { akainuDef } from '../../src/characters/akainu/def';
import { labubuDef } from '../../src/characters/labubu/def';
import { twinkleDef } from '../../src/characters/twinkle/def';

// Captured BEFORE implementation; full receipt and source hashes live in the D baseline.
const expected = [
  { character: 'luffy', ticks: 2400, sha256: 'e4ab8c9be5fe1374c3dc63a27cf37174b85e5a5471e59cb4a00eb3c647cc535a' },
  { character: 'akainu', ticks: 2400, sha256: '9e2edef15645aac82a95132d52a9c88bcded0c97b6d17264a0015460038d51a9' },
  { character: 'labubu', ticks: 2400, sha256: '69f116fc61b824d6cf12eab54ba93e140786b7b957e12ddeadc0b54e97ce7418' },
  { character: 'twinkle', ticks: 2400, sha256: '8f9922596496f297116330487d6ab0ec452aa83214d56bcc3347a6fb4d63f254' },
];
function replay() {
  return [luffyDef, akainuDef, labubuDef, twinkleDef].map((def, index) => {
    const sim = new FightSim({ p1: def, p2: [akainuDef, labubuDef, twinkleDef, luffyDef][index]!, seed: 37, introFrames: 0, controlModes: ['simple', 'simple'] });
    const rng = new Rng(713 + index), digest = createHash('sha256');
    const keys = [0, Btn.Left, Btn.Right, Btn.Down, Btn.Up, Btn.A, Btn.C, Btn.A | Btn.B, ...SKILL_BUTTONS];
    for (let tick = 0; tick < 2400; tick++) {
      if (tick % 300 === 0) for (const f of sim.state.fighters) f.meter = 300;
      sim.step({ p1: keys[rng.nextInt(keys.length)]!, p2: keys[rng.nextInt(keys.length)]! });
      // Explicit old fields: additive feature/teaching metadata is deliberately excluded.
      digest.update(JSON.stringify({ phase: sim.state.phase, timer: sim.state.timer, wins: sim.state.wins,
        fighters: sim.state.fighters.map(f => [f.state, f.stateFrame, f.x, f.y, f.vx, f.vy, f.hp, f.meter, f.moveId, f.install, f.installFrames, f.fatigueFrames, f.hitstop, f.stun, f.comboHits, f.comboDamage]),
        hits: sim.hits.map(e => [e.frame, e.kind, e.attacker, e.defender, e.moveId, e.damage, e.counter, e.comboHits, e.comboDamage, e.projectile, e.x, e.y]),
        projectiles: sim.state.projectiles, ends: sim.projectileEnds }));
    }
    return { character: def.id, ticks: 2400, sha256: digest.digest('hex') };
  });
}
describe('pre-Gear5 deterministic four-character baseline', () => {
  it('keeps representative fixed input outcomes with the feature disabled', () => {
    const result = replay();
    expect(result).toEqual(expected);
  });
});
