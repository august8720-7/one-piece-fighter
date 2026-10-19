import { describe, expect, it } from 'vitest';
import { Btn, FightSim, px, type HitEvent } from '../../src/core';
import { luffyDef } from '../../src/characters/luffy/def';
import { akainuDef } from '../../src/characters/akainu/def';

function ready(distance: number) {
  const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0, roundTime: -1,
    controlModes: ['simple', 'classic'], gear5Enabled: [true, false] });
  sim.state.fighters[0].meter = 300;
  sim.step({ p1: Btn.Awakening, p2: 0 });
  for (let i = 0; i < 36; i++) sim.step({ p1: 0, p2: 0 });
  sim.state.fighters[0].x = 0; sim.state.fighters[1].x = px(distance);
  return sim;
}
function advance(sim: FightSim, ticks: number, p2 = 0): HitEvent[] {
  const events: HitEvent[] = [];
  for (let i = 0; i < ticks; i++) { sim.step({ p1: 0, p2 }); events.push(...sim.hits); }
  return events.filter(event => event.attacker === 0);
}

describe('entity-aligned new Gear5 geometry1017', () => {
  for (const distance of [60, 85]) it(`keeps the real third-hit E cancel at ${distance}, with honest follow-up reach`, () => {
    const sim = ready(distance), fighter = sim.state.fighters[0];
    const hits: HitEvent[] = [];
    sim.step({ p1: Btn.Skill1, p2: 0 });
    for (let i = 0; i < 100 && hits.length < 3; i++) hits.push(...advance(sim, 1).filter(event => event.kind === 'hit'));
    expect(hits.map(event => event.damage)).toEqual([38, 34, 30]);
    expect(fighter.cancelUntil - fighter.stateFrame).toBe(8);
    const stateFrame = fighter.stateFrame;
    advance(sim, fighter.hitstop);
    expect(fighter.stateFrame).toBe(stateFrame);
    expect(sim.skillAvailability(0, 1).available).toBe(true);
    sim.step({ p1: Btn.Skill2, p2: 0 });
    expect(fighter.moveId).toBe('g5_bounce_slam');
    const slam = advance(sim, 95).filter(event => event.moveId === 'g5_bounce_slam');
    if (distance === 60) {
      expect(slam.map(event => event.damage)).toEqual([150]);
      expect(slam[0]?.defenderBefore?.state).toBe('idle'); // Legal cancel and later hit, not a guaranteed four-hit combo.
    } else expect(slam).toEqual([]);
  });
  it('retains a real jump intercept at85 and clear misses beyond all three entities', () => {
    const air = ready(85);
    air.step({ p1: Btn.Skill3, p2: Btn.Up });
    expect(advance(air, 40, Btn.Up).some(event => event.kind === 'hit' && event.moveId === 'g5_rising_whip' && event.damage === 100)).toBe(true);
    for (const [distance, button, target] of [[130, Btn.Skill1, 0], [110, Btn.Skill2, Btn.Down], [125, Btn.Skill3, Btn.Up]]) {
      const sim = ready(distance!);
      sim.step({ p1: button!, p2: target! });
      expect(advance(sim, 90, target).filter(event => event.kind === 'hit')).toEqual([]);
    }
  });
});
