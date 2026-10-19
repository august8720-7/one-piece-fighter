import { describe, expect, it } from 'vitest';
import { Btn, FightSim, px } from '../../src/core';
import { luffyDef, akainuDef, characterAi } from '../../src/characters';
import { Cpu } from '../../src/ai/cpu';
import { actionCanReach } from '../../src/ai/attackRange';
import type { AiProfile } from '../../src/ai/types';

const wait = [{ weight: 1, action: { kind: 'wait' as const, frames: 1 } }];
const passive: AiProfile = { closeRange: 50, midRange: 160, close: wait, mid: wait, far: wait, antiAir: [], projectileAnswer: [], okizeme: [], followups: [] };
function make(enabled = true) {
  const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0, roundTime: -1, gear5Enabled: [enabled, false] });
  const [player, opponent] = sim.state.fighters;
  player.x = px(-170); opponent.x = px(170); player.meter = 300;
  return sim;
}
function run(sim: FightSim, cpu: Cpu, frames: number) {
  const output: number[] = [];
  for (let i = 0; i < frames; i++) { const bits = cpu.input(sim); output.push(bits); sim.step({ p1: bits, p2: 0 }); }
  return output;
}

describe('Gear5 legal CPU input', () => {
  it('observes a safe opportunity for its reaction delay then pays the same real activation cost', () => {
    const sim = make(); const cpu = new Cpu(0, passive, 'hard', 12);
    const output = run(sim, cpu, 60);
    expect(output.slice(0, 4).some(bits => !!(bits & Btn.Awakening))).toBe(false);
    expect(output.filter(bits => !!(bits & Btn.Awakening))).toHaveLength(1);
    expect(sim.state.fighters[0].form).toBe('gear5');
    expect(sim.state.fighters[0].meter).toBe(0);
  });
  it('does not mutate state while deciding, and is deterministic for identical state/seed', () => {
    const a = make(), b = make(), cpuA = new Cpu(0, passive, 'normal', 7), cpuB = new Cpu(0, passive, 'normal', 7);
    for (let frame = 0; frame < 90; frame++) {
      const before = JSON.stringify(a.state);
      const input = cpuA.input(a);
      expect(JSON.stringify(a.state)).toBe(before);
      expect(cpuB.input(b)).toBe(input);
      a.step({ p1: input, p2: 0 }); b.step({ p1: input, p2: 0 });
    }
  });
  it('never awakens when resources/form gate are unavailable or opponent is too close', () => {
    for (const setup of [
      (sim: FightSim) => { sim.state.fighters[0].meter = 299; },
      (sim: FightSim) => { sim.state.fighters[0].x = px(-35); sim.state.fighters[1].x = px(35); },
    ]) {
      const sim = make(); setup(sim);
      expect(run(sim, new Cpu(0, passive, 'hard', 1), 100).some(bits => !!(bits & Btn.Awakening))).toBe(false);
    }
    expect(run(make(false), new Cpu(0, passive, 'hard', 1), 100).some(bits => !!(bits & Btn.Awakening))).toBe(false);
  });
  it('filters reach against real form moves, preserving the longer base gatling only outside Gear5', () => {
    const sim = make(), [player, opponent] = sim.state.fighters;
    player.x = px(-90); opponent.x = px(90);
    const gatling = { kind: 'special' as const, motion: '236' as const, button: 'P' as const };
    expect(actionCanReach(gatling, player, opponent, sim.effectiveMoves(player))).toBe(true);
    sim.step({ p1: Btn.Awakening, p2: 0 });
    for (let i = 0; i < 36; i++) sim.step({ p1: 0, p2: 0 });
    expect(player.form).toBe('gear5');
    expect(actionCanReach(gatling, player, opponent, sim.effectiveMoves(player))).toBe(false);
    expect(sim.effectiveMoves(player).find(move => move.id === 'g5_elastic_rush')).toBeDefined();
  });
  it('uses form versions through original classical motions in real combat', () => {
    const sim = make();
    sim.step({ p1: Btn.Awakening, p2: 0 });
    for (let i = 0; i < 36; i++) sim.step({ p1: 0, p2: 0 });
    sim.state.fighters[0].x = px(-40); sim.state.fighters[1].x = px(40);
    const cpu = new Cpu(0, { ...characterAi.luffy!, close: [{ weight: 1, action: { kind: 'special', motion: '236', button: 'P' } }] }, 'hard', 5);
    const used = new Set<string>();
    for (let i = 0; i < 300; i++) {
      sim.step({ p1: cpu.input(sim), p2: 0 });
      const id = sim.state.fighters[0].moveId; if (id) used.add(id);
    }
    expect(used.has('g5_elastic_rush')).toBe(true);
    expect(used.has('sp_gatling')).toBe(false);
  });
});
