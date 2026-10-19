import { describe, expect, it } from 'vitest';
import { Btn, FightSim, px, totalFrames, type HitEvent } from '../../src/core';
import { fujitoraDef } from '../../src/characters/fujitora/def';
import { luffyDef } from '../../src/characters/luffy/def';
import { labubuDef } from '../../src/characters/labubu/def';

/** Fixture positions are not browser evidence; attack/hit transitions use real InputFrames. */
function thrustAt(facing: 1 | -1, crouching: boolean) {
  const target = crouching ? labubuDef : luffyDef;
  const sim = new FightSim({ p1: fujitoraDef, p2: target, introFrames: 0, roundTime: -1 });
  const [attacker, defender] = sim.state.fighters;
  attacker.x = 0;
  defender.x = px(75) * facing;
  attacker.facing = facing;
  defender.facing = facing === 1 ? -1 : 1;
  const p2 = crouching ? Btn.Down : 0;
  sim.step({ p1: 0, p2 });
  const move = fujitoraDef.moves.find(item => item.id === 'st_a')!;
  const hits: HitEvent[] = [];
  for (let frame = 0; frame <= totalFrames(move) + 2; frame++) {
    sim.step({ p1: frame === 0 ? Btn.A : 0, p2 });
    hits.push(...sim.hits.filter(hit => hit.moveId === 'st_a' && hit.kind === 'hit'));
  }
  return { hits, hp: defender.hp, maxHp: target.maxHp, move };
}

describe('Fujitora real cane endpoint contact 1013', () => {
  for (const facing of [1, -1] as const) {
    it(`facing ${facing}: standing body at the visible cane tip receives one original-strength hit`, () => {
      const { hits, hp, maxHp, move } = thrustAt(facing, false);
      expect(hits).toHaveLength(1);
      expect(hits[0]!.damage).toBe(37);
      expect(hp).toBe(maxHp - 37);
      expect(move.frames.map(frame => frame.duration)).toEqual([6, 3, 11]);
    });

    it(`facing ${facing}: low crouching LABUBU remains below the raised cane`, () => {
      const { hits, hp, maxHp } = thrustAt(facing, true);
      expect(hits).toHaveLength(0);
      expect(hp).toBe(maxHp);
    });
  }
});
