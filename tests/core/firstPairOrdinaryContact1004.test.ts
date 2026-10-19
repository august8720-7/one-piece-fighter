import { describe, expect, it } from 'vitest';
import { Btn, FightSim, px } from '../../src/core';
import { shanksDef } from '../../src/characters/shanks/def';
import { aokijiDef } from '../../src/characters/aokiji/def';

// Real jump/normal inputs; no renderer fixture or simulated visual acceptance.
describe('new Shanks measured ordinary contact remains reachable', () => {
  it.each([
    ['st_c', Btn.C, false], ['st_d', Btn.D, false], ['cd', Btn.C | Btn.D, false],
    ['j_a', Btn.A, true], ['j_b', Btn.B, true], ['j_c', Btn.C, true],
    ['j_d', Btn.D, true], ['j_cd', Btn.C | Btn.D, true],
  ] as const)('%s connects from a real neutral or descending jump in both facings', (moveId, button, air) => {
    for (const facing of [1, -1] as const) {
      const sim = new FightSim({ p1: shanksDef, p2: aokijiDef, introFrames: 0, roundTime: -1 });
      sim.state.fighters[0].x = 0;
      sim.state.fighters[1].x = px(55 * facing);
      sim.state.fighters[0].facing = facing;
      sim.state.fighters[1].facing = facing === 1 ? -1 : 1;
      if (air) {
        sim.step({ p1: Btn.Up, p2: 0 });
        // Hold through prejump for a full jump; tapping gives a short hop which
        // can land before the eleven-frame airborne blowback startup completes.
        while (!sim.state.fighters[0].airborne) sim.step({ p1: Btn.Up, p2: 0 });
        // Enter on actual descent, so the grounded opponent lies beneath the real limb.
        while (sim.state.fighters[0].vy <= 0) sim.step({ p1: 0, p2: 0 });
      }
      sim.step({ p1: button, p2: 0 });
      expect(sim.state.fighters[0].moveId).toBe(moveId);
      let hit = sim.hits.find(event => event.kind === 'hit' && event.moveId === moveId);
      for (let tick = 0; tick < 55 && !hit; tick++) {
        sim.step({ p1: 0, p2: 0 });
        hit = sim.hits.find(event => event.kind === 'hit' && event.moveId === moveId);
      }
      expect(hit, `${moveId}/${facing} must contact the actual grounded hurtbox`).toBeDefined();
      expect(sim.state.fighters[1].hp).toBe(aokijiDef.maxHp - hit!.damage);
    }
  });
});
