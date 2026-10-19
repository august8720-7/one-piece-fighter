import { describe, expect, it } from 'vitest';
import { ANY_ATTACK, Btn, FightSim, K, P, SKILL_BUTTONS, firstActiveFrame, px, totalFrames, type Facing, type FighterDef, type HitEvent, type MotionId } from '../../src/core';
import { Cpu } from '../../src/ai/cpu';
import { akainuDef } from '../../src/characters/akainu/def';
import { blackbeardDef } from '../../src/characters/blackbeard/def';
import { blackbeardAi } from '../../src/characters/blackbeard/ai';
import { blackbeardAnims } from '../../src/characters/blackbeard/animations';
import { rogerDef } from '../../src/characters/roger/def';
import { rogerAi } from '../../src/characters/roger/ai';
import { rogerAnims } from '../../src/characters/roger/animations';
import { rocksDef } from '../../src/characters/rocks/def';
import { rocksAi } from '../../src/characters/rocks/ai';
import { rocksAnims } from '../../src/characters/rocks/animations';
import { shikiDef } from '../../src/characters/shiki/def';
import { shikiAi } from '../../src/characters/shiki/ai';
import { shikiAnims } from '../../src/characters/shiki/animations';
import { rayleighDef } from '../../src/characters/rayleigh/def';
import { rayleighAi } from '../../src/characters/rayleigh/ai';
import { rayleighAnims } from '../../src/characters/rayleigh/animations';
import { gabanDef } from '../../src/characters/gaban/def';
import { gabanAi } from '../../src/characters/gaban/ai';
import { gabanAnims } from '../../src/characters/gaban/animations';
import { beckmanDef } from '../../src/characters/beckman/def';
import { beckmanAi } from '../../src/characters/beckman/ai';
import { beckmanAnims } from '../../src/characters/beckman/animations';
const roster = [
  { def: blackbeardDef, ai: blackbeardAi, anims: blackbeardAnims },
  { def: rogerDef, ai: rogerAi, anims: rogerAnims },
  { def: rocksDef, ai: rocksAi, anims: rocksAnims },
  { def: shikiDef, ai: shikiAi, anims: shikiAnims },
  { def: rayleighDef, ai: rayleighAi, anims: rayleighAnims },
  { def: gabanDef, ai: gabanAi, anims: gabanAnims },
  { def: beckmanDef, ai: beckmanAi, anims: beckmanAnims },
] as const;

const idle = { p1: 0, p2: 0 };
function ready(def: FighterDef, distance = 360, facing: Facing = 1, classic = false, opponent = akainuDef): FightSim {
  const sim = new FightSim({ p1: def, p2: opponent, controlModes: [classic ? 'classic' : 'simple', 'simple'], introFrames: 0, roundTime: -1, seed: 1003 });
  const [me, other] = sim.state.fighters;
  me.x = px(-distance / 2) * facing; other.x = px(distance / 2) * facing;
  me.facing = facing; other.facing = facing === 1 ? -1 : 1; me.meter = 300;
  return sim;
}
function run(sim: FightSim, frames: number): HitEvent[] {
  const hits: HitEvent[] = [];
  for (let i = 0; i < frames; i++) { sim.step(idle); hits.push(...sim.hits); }
  return hits;
}
function motionInput(motion: MotionId, button: number, facing: Facing): number[] {
  const f = facing === 1 ? Btn.Right : Btn.Left, b = facing === 1 ? Btn.Left : Btn.Right, p = button & -button;
  switch (motion) {
    case '236': return [Btn.Down, Btn.Down | f, f | p];
    case '214': return [Btn.Down, Btn.Down | b, b | p];
    case '623': return [f, 0, Btn.Down, Btn.Down | f, Btn.Down | f | p];
    case '22': return [Btn.Down, 0, Btn.Down | p];
    case '236236': return [Btn.Down, Btn.Down | f, f, 0, Btn.Down, Btn.Down | f, f | p];
    case '214214': return [Btn.Down, Btn.Down | b, b, 0, Btn.Down, Btn.Down | b, b | p];
  }
}
const distances: Record<string, number[]> = {
  blackbeard: [140, 65, 43, 75, 42, 65, 150, 58, 100],
  roger: [90, 70, 50, 78, 65, 78, 110, 65, 120],
  rocks: [68, 78, 50, 150, 42, 85, 75, 110, 125],
  shiki: [150, 65, 50, 114, 80, 0, 155, 78, 110],
  rayleigh: [80, 60, 45, 68, 0, 0, 64, 150, 100],
  gaban: [60, 45, 44, 65, 40, 58, 53, 80, 60],
  beckman: [160, 48, 80, 155, 45, 0, 175, 185, 170],
};

describe('1003 seven isolated candidates', () => {
  it.each(roster)('$def.id: complete data, no invented artwork or unsupported mechanics', ({ def, ai, anims }) => {
    expect(def.moves).toHaveLength(26);
    expect(new Set(def.moves.map(m => m.id)).size).toBe(26);
    expect(new Set(def.skillSlots).size).toBe(9);
    expect(anims).toEqual({});
    for (const move of def.moves) {
      expect(move.frames.every(f => Number.isInteger(f.duration) && f.duration > 0)).toBe(true);
      expect(move.frames.every(f => f.velocity?.y === undefined)).toBe(true);
      expect(move.install).toBeUndefined();
      for (const p of move.projectiles ?? []) {
        expect(p.durability).toBe(1); expect(p.frame).toBeLessThan(totalFrames(move));
        expect(p.kind.startsWith(def.id + '_')).toBe(true);
        expect(move.knockdown).toBeUndefined(); expect(move.wallBounce).toBeUndefined(); expect(move.armorBreak).toBeUndefined();
      }
    }
    for (const { action } of [...ai.far, ...ai.mid, ...ai.close, ...ai.antiAir, ...ai.projectileAnswer, ...ai.okizeme, ...ai.punish!, ...ai.followups.flatMap(f => f.options)]) {
      if (action.kind !== 'special') continue;
      const move = def.moves.find(m => m.input.motion === action.motion && !!(m.input.button & (action.button === 'P' ? P : K)));
      expect(move).toBeDefined(); expect(action.minMeter ?? 0).toBeGreaterThanOrEqual(move!.meterCost ?? 0);
    }
  });

  it.each(roster)('$def.id: nine shortcuts, mirrored classics, cost, air eligibility and recovery', ({ def }) => {
    for (const [slot, id] of def.skillSlots!.entries()) {
      const move = def.moves.find(m => m.id === id)!;
      for (const facing of [1, -1] as const) {
        const sim = ready(def, 390, facing); sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        expect(sim.state.fighters[0].moveId, id).toBe(id);
        expect(sim.state.fighters[0].meter, id).toBe(300 - (move.meterCost ?? 0));
        sim.step({ p1: SKILL_BUTTONS[(slot + 1) % 9]!, p2: 0 });
        expect(sim.state.fighters[0].moveId, id).toBe(id);
        run(sim, totalFrames(move) + 160);
        expect(sim.state.fighters[0].state, id).toBe('idle'); expect(sim.state.projectiles, id).toHaveLength(0);
        const classic = ready(def, 390, facing, true);
        for (const p1 of motionInput(move.input.motion!, move.input.button, facing)) classic.step({ p1, p2: 0 });
        expect(classic.state.fighters[0].moveId, id).toBe(id);
      }
      if (move.meterCost) {
        const poor = ready(def); poor.state.fighters[0].meter = move.meterCost - 1;
        poor.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        expect(poor.state.fighters[0].moveId, id).toBeNull(); expect(poor.skillAvailability(0, slot).reason).toBe('meter');
      }
      const air = ready(def); air.step({ p1: Btn.Up, p2: 0 }); run(air, 6);
      expect(air.state.fighters[0].airborne).toBe(true); air.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
      expect(air.state.fighters[0].moveId).toBeNull(); expect(air.skillFeedback[0]?.reason).toBe('air');
    }
  });

  it.each(roster)('$def.id: actual damaging skills connect and all seventeen basics resolve', ({ def }) => {
    for (const [slot, id] of def.skillSlots!.entries()) {
      const move = def.moves.find(m => m.id === id)!;
      if (move.dodge || move.reflect) continue;
      const sim = ready(def, distances[def.id]![slot]!); sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
      const hits = run(sim, totalFrames(move) + 160);
      expect(hits.some(h => h.attacker === 0 && h.moveId === id && h.kind === 'hit'), id).toBe(true);
      expect(sim.state.fighters[0].moveId, id).toBeNull();
    }
    for (const move of def.moves.filter(m => !def.skillSlots!.includes(m.id))) {
      const sim = ready(def, move.id === 'f_c' ? 75 : 44, 1, true);
      let input = move.input.button | (move.input.plus ?? 0);
      if (move.input.stance === 'air') { sim.step({ p1: Btn.Up, p2: 0 }); run(sim, 5); }
      if (move.input.stance === 'crouch') input |= Btn.Down;
      if (move.input.direction) input |= move.input.direction === 6 ? Btn.Right : Btn.Left;
      sim.step({ p1: input, p2: 0 }); expect(sim.state.fighters[0].moveId, move.id).toBe(move.id);
      const hits = [...sim.hits, ...run(sim, totalFrames(move) + 100)];
      expect(hits.some(h => h.attacker === 0 && h.moveId === move.id && h.kind === 'hit'), move.id).toBe(true);
    }
  });

  it.each(roster)('$def.id: CPU emits legal reproducible inputs without direct state writes', ({ def, ai }) => {
    const play = () => {
      const sim = ready(def, 150); const cpu = new Cpu(0, ai, 'normal', 103); const trace: number[] = [];
      for (let i = 0; i < 480; i++) {
        const before = JSON.stringify(sim.state); const input = cpu.input(sim);
        expect(JSON.stringify(sim.state)).toBe(before);
        expect(input & ~(Btn.Up | Btn.Down | Btn.Left | Btn.Right | ANY_ATTACK | Btn.Start)).toBe(0);
        sim.step({ p1: input, p2: 0 }); trace.push(input, sim.state.fighters[0].x, sim.state.fighters[1].hp);
      }
      expect(sim.state.fighters[1].hp).toBeLessThan(akainuDef.maxHp); return trace;
    };
    expect(play()).toEqual(play());
  });
});

it('blackbeard grab releases once without healing, pulling distant targets or suppressing their skills', () => {
  const sim = ready(blackbeardDef, 43); const [me, other] = sim.state.fighters; me.hp -= 150;
  sim.step({ p1: Btn.Skill5, p2: 0 }); const hits = run(sim, 170).filter(h => h.attacker === 0 && h.moveId === 'sp_dark_grasp' && h.kind === 'hit');
  expect(hits).toHaveLength(1); expect(me.hp).toBe(blackbeardDef.maxHp - 150); expect(other.hp).toBe(akainuDef.maxHp - 140);
  sim.step({ p1: 0, p2: Btn.Skill1 }); expect(other.moveId).toBe(akainuDef.skillSlots![0]);
  const far = ready(blackbeardDef, 220); const x = far.state.fighters[1].x; far.step({ p1: Btn.Skill5, p2: 0 }); run(far, 100);
  expect(far.state.fighters[1].x).toBe(x); expect(far.state.fighters[1].hp).toBe(akainuDef.maxHp);
});
it('roger and rocks have punishable heavy recovery; brief armor ends before the hit', () => {
  for (const def of [rogerDef, rocksDef]) {
    const sim = ready(def); sim.step({ p1: Btn.Skill6, p2: 0 }); const me = sim.state.fighters[0], move = sim.move(me)!;
    expect(sim.hasArmor(me)).toBe(true); run(sim, firstActiveFrame(move) - 1);
    expect(sim.hasArmor(me)).toBe(false); expect(sim.isStrikeInvulnerable(me)).toBe(false);
    run(sim, 8); expect(me.state).toBe('attack'); expect(sim.currentFrame(me)?.hitboxes).toBeUndefined();
  }
});
it('shiki stones use a fixed local position and expire; no target tracking or flight', () => {
  const spawn = (distance: number) => {
    const sim = ready(shikiDef, distance); const me = sim.state.fighters[0]; const x = me.x;
    sim.step({ p1: Btn.Skill4, p2: 0 }); while (!sim.state.projectiles.length) sim.step(idle);
    const p = sim.state.projectiles[0]!; const local = p.x - x; expect(p.vx).toBe(0); expect(me.y).toBe(0);
    run(sim, 160); expect(sim.state.projectiles).toHaveLength(0); return local;
  };
  expect(spawn(250)).toBe(spawn(370));
});
it('rayleigh reflects an actual shot, while dodge protection expires before recovery ends', () => {
  const sim = ready(rayleighDef, 100, 1, false, beckmanDef);
  sim.step({ p1: Btn.Skill5, p2: Btn.Skill1 }); const hits = run(sim, 100);
  expect(hits.some(h => h.kind === 'reflect' && h.attacker === 0)).toBe(true);
  expect(hits.some(h => h.projectile && h.kind === 'hit' && h.attacker === 0)).toBe(true);
  const dodge = ready(rayleighDef); dodge.step({ p1: Btn.Skill6, p2: 0 }); const me = dodge.state.fighters[0];
  expect(dodge.isStrikeInvulnerable(me)).toBe(true); run(dodge, 15); expect(me.state).toBe('attack'); expect(dodge.isStrikeInvulnerable(me)).toBe(false);
});
it('gaban multi-hit axes and beckman timed bullets each hit more than once, never via projectile durability', () => {
  for (const [def, slot, distance] of [[gabanDef, 6, 50], [beckmanDef, 6, 150]] as const) {
    const sim = ready(def, distance); sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 }); const hits = run(sim, 180).filter(h => h.attacker === 0 && h.kind === 'hit');
    expect(hits.length, def.id).toBeGreaterThan(1);
  }
  const sim = ready(beckmanDef, 180); sim.step({ p1: Btn.Skill3, p2: 0 }); while (!sim.state.projectiles.length) sim.step(idle);
  const p = sim.state.projectiles[0]!; expect(p.vx).toBeGreaterThan(0); expect(p.vy).toBeLessThan(0); expect(p.durability).toBe(1);
});
