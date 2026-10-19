import { describe, expect, it } from 'vitest';
import { ANY_ATTACK, Btn, FightSim, K, P, SKILL_BUTTONS, firstActiveFrame, px, totalFrames, type ControlMode, type Facing, type FighterDef, type HitEvent, type MotionId } from '../../src/core';
import { Cpu } from '../../src/ai/cpu';
import { akainuDef } from '../../src/characters/akainu/def';
import { labubuDef } from '../../src/characters/labubu/def';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { aokijiAnims } from '../../src/characters/aokiji/animations';
import { aokijiAi } from '../../src/characters/aokiji/ai';
import { kizaruDef } from '../../src/characters/kizaru/def';
import { kizaruAnims } from '../../src/characters/kizaru/animations';
import { kizaruAi } from '../../src/characters/kizaru/ai';
import { fujitoraDef } from '../../src/characters/fujitora/def';
import { fujitoraAnims } from '../../src/characters/fujitora/animations';
import { fujitoraAi } from '../../src/characters/fujitora/ai';
import { ryokugyuDef } from '../../src/characters/ryokugyu/def';
import { ryokugyuAnims } from '../../src/characters/ryokugyu/animations';
import { ryokugyuAi } from '../../src/characters/ryokugyu/ai';
import { garpDef } from '../../src/characters/garp/def';
import { garpAnims } from '../../src/characters/garp/animations';
import { garpAi } from '../../src/characters/garp/ai';
import { sengokuDef } from '../../src/characters/sengoku/def';
import { sengokuAnims } from '../../src/characters/sengoku/animations';
import { sengokuAi } from '../../src/characters/sengoku/ai';

const roster = [
  { def: aokijiDef, anims: aokijiAnims, ai: aokijiAi, hitDistances: [130, 55, 38, 90, 0, 0, 150, 50, 70] },
  { def: kizaruDef, anims: kizaruAnims, ai: kizaruAi, hitDistances: [150, 80, 40, 50, 80, 0, 150, 90, 150] },
  { def: fujitoraDef, anims: fujitoraAnims, ai: fujitoraAi, hitDistances: [80, 150, 43, 110, 0, 65, 75, 58, 126] },
  { def: ryokugyuDef, anims: ryokugyuAnims, ai: ryokugyuAi, hitDistances: [95, 85, 45, 88, 35, 55, 65, 48, 65] },
  { def: garpDef, anims: garpAnims, ai: garpAi, hitDistances: [80, 44, 38, 66, 35, 55, 95, 175, 110] },
  { def: sengokuDef, anims: sengokuAnims, ai: sengokuAi, hitDistances: [130, 60, 43, 76, 0, 78, 145, 90, 80] },
] as const;
const idle = { p1: 0, p2: 0 };

function ready(def: FighterDef, facing: Facing = 1, mode: ControlMode = 'simple', distance = 380, opponent = akainuDef): FightSim {
  const sim = new FightSim({ p1: def, p2: opponent, controlModes: [mode, 'simple'], introFrames: 0, roundTime: -1, seed: 29 });
  const [me, other] = sim.state.fighters;
  me.x = px(-distance / 2) * facing;
  other.x = px(distance / 2) * facing;
  me.facing = facing;
  other.facing = facing === 1 ? -1 : 1;
  me.meter = 300;
  return sim;
}

function classicInput(motion: MotionId, button: number, facing: Facing): number[] {
  const forward = facing === 1 ? Btn.Right : Btn.Left;
  const back = facing === 1 ? Btn.Left : Btn.Right;
  const press = button & -button;
  switch (motion) {
    case '236': return [Btn.Down, Btn.Down | forward, forward | press];
    case '214': return [Btn.Down, Btn.Down | back, back | press];
    case '623': return [forward, 0, Btn.Down, Btn.Down | forward, Btn.Down | forward | press];
    case '22': return [Btn.Down, 0, Btn.Down | press];
    case '236236': return [Btn.Down, Btn.Down | forward, forward, 0, Btn.Down, Btn.Down | forward, forward | press];
    case '214214': return [Btn.Down, Btn.Down | back, back, 0, Btn.Down, Btn.Down | back, back | press];
  }
}

function runFrames(sim: FightSim, count: number): HitEvent[] {
  const hits: HitEvent[] = [];
  for (let frame = 0; frame < count; frame++) {
    sim.step(idle);
    hits.push(...sim.hits);
  }
  return hits;
}

describe('0929 marine candidate data contracts', () => {
  it.each(roster)('$def.id declares complete independent controls without unsupported combat claims', ({ def, anims, ai }) => {
    const ids = def.moves.map(move => move.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const stance of ['st', 'cr', 'j']) for (const button of ['a', 'b', 'c', 'd']) expect(ids).toContain(`${stance}_${button}`);
    for (const id of ['f_c', 'cd', 'j_cd', 'throw_fwd', 'throw_back']) expect(ids).toContain(id);
    expect(new Set(def.skillSlots).size).toBe(9);
    expect(def.skillSlots).toHaveLength(SKILL_BUTTONS.length);
    for (const state of ['idle', 'walk_fwd', 'walk_back', 'crouch', 'prejump', 'jump_neutral', 'jump_fwd', 'jump_back', 'landing', 'dash', 'backdash', 'roll_fwd', 'roll_back', 'block_stand', 'block_crouch', 'hit_stand', 'hit_crouch', 'hit_air', 'knockdown', 'getup', 'throw', 'thrown', 'throw_tech', 'ko', 'win', 'portrait']) expect(anims[state], state).toBeDefined();
    for (const move of def.moves) {
      expect(move.install, move.id).toBeUndefined();
      expect(move.throwData?.keepHoldOffsetAtWall, move.id).toBeUndefined();
      expect(move.frames.every(frame => Number.isInteger(frame.duration) && frame.duration > 0), move.id).toBe(true);
      expect(move.frames.every(frame => frame.velocity?.y === undefined), move.id).toBe(true);
      for (const projectile of move.projectiles ?? []) {
        expect(projectile.durability, move.id).toBe(1);
        expect(projectile.kind.startsWith(`${def.id}_`), move.id).toBe(true);
        expect(projectile.frame, move.id).toBeLessThan(totalFrames(move));
        expect(projectile.ttl, move.id).toBeGreaterThan(0);
        expect(move.knockdown, `${move.id} projectile cannot inherit knockdown`).toBeUndefined();
      }
      for (const id of move.chain ?? []) expect(ids).toContain(id);
    }
    const options = [...ai.far, ...ai.mid, ...ai.close, ...ai.antiAir, ...ai.projectileAnswer, ...ai.okizeme, ...(ai.punish ?? []), ...ai.followups.flatMap(group => group.options)];
    for (const { action } of options) {
      if (action.kind !== 'special') continue;
      const button = action.button === 'P' ? P : K;
      const matching = def.moves.find(move => move.input.motion === action.motion && (move.input.button & button) !== 0);
      expect(matching, `${action.motion}${action.button}`).toBeDefined();
      expect(action.minMeter ?? 0, `${matching!.id} CPU cost gate`).toBeGreaterThanOrEqual(matching!.meterCost ?? 0);
    }
  });
});

describe('all 54 marine shortcuts resolve through actual FightSim inputs', () => {
  for (const { def } of roster) for (const [slot, id] of def.skillSlots!.entries()) {
    it(`${def.id}/${id}: both facings, classic input, meter, air and recovery gates`, () => {
      const move = def.moves.find(entry => entry.id === id)!;
      for (const facing of [1, -1] as const) {
        const sim = ready(def, facing);
        sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        expect(sim.state.fighters[0].moveId).toBe(id);
        expect(sim.state.fighters[0].meter).toBe(300 - (move.meterCost ?? 0));
        sim.step({ p1: SKILL_BUTTONS[(slot + 1) % 9]!, p2: 0 });
        expect(sim.state.fighters[0].moveId).toBe(id);
        runFrames(sim, totalFrames(move) + 180);
        expect(sim.state.fighters[0].moveId).toBeNull();
        expect(sim.state.fighters[0].state).toBe('idle');
        expect(sim.state.projectiles).toHaveLength(0);

        const classic = ready(def, facing, 'classic');
        for (const p1 of classicInput(move.input.motion!, move.input.button, facing)) classic.step({ p1, p2: 0 });
        expect(classic.state.fighters[0].moveId).toBe(id);
        expect(classic.state.fighters[0].meter).toBe(300 - (move.meterCost ?? 0));
      }
      if (move.meterCost) {
        const poor = ready(def);
        poor.state.fighters[0].meter = move.meterCost - 1;
        expect(poor.skillAvailability(0, slot).reason).toBe('meter');
        poor.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        expect(poor.state.fighters[0].moveId).toBeNull();
        expect(poor.state.fighters[0].meter).toBe(move.meterCost - 1);
      }
      const jump = ready(def);
      jump.step({ p1: Btn.Up, p2: 0 });
      for (let frame = 0; frame < 8 && !jump.state.fighters[0].airborne; frame++) jump.step({ p1: Btn.Up, p2: 0 });
      expect(jump.state.fighters[0].airborne).toBe(true);
      jump.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
      expect(jump.state.fighters[0].moveId).toBeNull();
      expect(jump.skillFeedback[0]?.reason).toBe('air');
    });
  }
});

describe('marine skill mechanics use implemented effects', () => {
  it.each(roster)('$def.id damaging skills actually connect at their designed ranges', ({ def, hitDistances }) => {
    for (const [slot, id] of def.skillSlots!.entries()) {
      const move = def.moves.find(entry => entry.id === id)!;
      if (move.reflect || move.dodge) continue;
      for (const facing of [1, -1] as const) {
        const sim = ready(def, facing, 'simple', hitDistances[slot]!);
        sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        const hits = runFrames(sim, totalFrames(move) + 150);
        expect(hits.some(hit => hit.attacker === 0 && hit.moveId === id && hit.kind === 'hit'), `${def.id}/${id}/facing${facing}`).toBe(true);
        expect(sim.state.fighters[0].moveId).toBeNull();
      }
    }
  });

  it.each([aokijiDef, fujitoraDef, sengokuDef])('$id reflection returns a real incoming beam and never damages a nearby body by itself', def => {
    const sim = ready(def, 1, 'simple', 94, kizaruDef);
    sim.step({ p1: Btn.Skill5, p2: Btn.Skill1 });
    const hits = runFrames(sim, 100);
    expect(hits.some(hit => hit.kind === 'reflect' && hit.attacker === 0)).toBe(true);
    expect(hits.some(hit => hit.projectile && hit.kind === 'hit' && hit.attacker === 0)).toBe(true);
    expect(sim.state.fighters[0].hp).toBe(def.maxHp);
    const empty = ready(def, 1, 'simple', 45);
    empty.step({ p1: Btn.Skill5, p2: 0 });
    expect(runFrames(empty, 70)).toEqual([]);
  });

  it.each([aokijiDef, kizaruDef])('$id dodge is temporary, spends meter, then exposes recovery without teleporting', def => {
    const sim = ready(def);
    const fighter = sim.state.fighters[0];
    const x = fighter.x;
    sim.step({ p1: Btn.Skill6, p2: 0 });
    const move = sim.move(fighter)!;
    expect(fighter.meter).toBe(267);
    expect(sim.isStrikeInvulnerable(fighter)).toBe(true);
    expect(sim.isThrowable(fighter)).toBe(false);
    runFrames(sim, move.invuln!);
    expect(fighter.state).toBe('attack');
    expect(sim.isStrikeInvulnerable(fighter)).toBe(false);
    expect(sim.isThrowable(fighter)).toBe(true);
    expect(fighter.x).toBe(x);
  });

  it.each([aokijiDef, fujitoraDef, ryokugyuDef])('$id fixed placement ignores opponent movement and ends without a lingering object', def => {
    for (const facing of [1, -1] as const) {
      const spawnAt = (opponentX: number) => {
        const sim = ready(def, facing);
        const casterX = sim.state.fighters[0].x;
        sim.state.fighters[1].x = px(opponentX) * facing;
        sim.step({ p1: Btn.Skill4, p2: 0 });
        for (let frame = 0; frame < 40 && sim.state.projectiles.length === 0; frame++) sim.step(idle);
        const projectile = sim.state.projectiles[0]!;
        expect(projectile).toBeDefined();
        const localX = (projectile.x - casterX) * facing;
        const id = projectile.id;
        const ends = [];
        for (let frame = 0; frame < 100; frame++) {
          sim.step(idle);
          ends.push(...sim.projectileEnds.filter(end => end.id === id));
        }
        expect(ends).toHaveLength(1);
        expect(['ground', 'timeout']).toContain(ends[0]!.reason);
        return localX;
      };
      expect(spawnAt(175)).toBe(spawnAt(90));
    }
  });

  it.each([ryokugyuDef, garpDef])('$id command grab releases once, has full vulnerable recovery and does not heal', def => {
    const sim = ready(def, 1, 'simple', 40);
    const [attacker, defender] = sim.state.fighters;
    attacker.hp -= 200;
    const hpBefore = attacker.hp;
    sim.step({ p1: Btn.Skill5, p2: 0 });
    for (let frame = 0; frame < 20 && attacker.state !== 'throw'; frame++) sim.step(idle);
    expect(attacker.state).toBe('throw');
    const move = sim.move(attacker)!;
    const timing = move.throwData!;
    runFrames(sim, timing.releaseFrame - 1);
    expect(defender.hp).toBe(akainuDef.maxHp);
    sim.step(idle);
    expect(defender.hp).toBe(akainuDef.maxHp - move.damage);
    expect(sim.isStrikeInvulnerable(attacker)).toBe(false);
    expect(attacker.state).toBe('throw');
    runFrames(sim, timing.duration - timing.releaseFrame);
    expect(attacker.state).toBe('idle');
    expect(defender.hp).toBe(akainuDef.maxHp - move.damage);
    expect(attacker.hp).toBe(hpBefore);
  });

  it.each([ryokugyuDef, garpDef, sengokuDef])('$id armor covers only the documented startup slice and has an interruptible opening', def => {
    const sim = ready(def);
    sim.step({ p1: Btn.Skill6, p2: 0 });
    const me = sim.state.fighters[0];
    const move = sim.move(me)!;
    expect(sim.hasArmor(me)).toBe(true);
    runFrames(sim, firstActiveFrame(move) - 1);
    expect(sim.hasArmor(me)).toBe(false);
    expect(me.state).toBe('attack');
    sim.step(idle);
    expect(sim.hasArmor(me)).toBe(false);
  });

  it.each(roster)('$def.id light attacks reach both short and tall bodies after real walk-to-contact input', ({ def }) => {
    for (const opponent of [labubuDef, akainuDef]) for (const facing of [1, -1] as const) {
      const sim = ready(def, facing, 'classic', 240, opponent);
      const forward = facing === 1 ? Btn.Right : Btn.Left;
      let previous = Math.abs(sim.state.fighters[1].x - sim.state.fighters[0].x), stable = 0;
      for (let frame = 0; frame < 200 && stable < 3; frame++) {
        sim.step({ p1: forward, p2: 0 });
        const distance = Math.abs(sim.state.fighters[1].x - sim.state.fighters[0].x);
        stable = distance === previous ? stable + 1 : 0;
        previous = distance;
      }
      expect(stable).toBe(3);
      sim.step(idle);
      sim.step({ p1: Btn.A, p2: 0 });
      const hits = runFrames(sim, 45);
      expect(hits.some(hit => hit.moveId === 'st_a' && hit.kind === 'hit'), `${def.id}/${opponent.id}/${facing}`).toBe(true);
    }
  });
});

describe('marine CPU input-only profiles', () => {
  it.each(roster)('$def.id produces a deterministic legal fight', ({ def, ai }) => {
    const run = () => {
      const sim = new FightSim({ p1: def, p2: def, seed: 92, introFrames: 0, roundTime: -1 });
      const left = new Cpu(0, ai, 'normal', 921), right = new Cpu(1, ai, 'normal', 922);
      const trace: number[] = [];
      let damage = 0;
      for (let frame = 0; frame < 1100 && sim.state.phase === 'fight'; frame++) {
        const p1 = left.input(sim), p2 = right.input(sim);
        const legal = Btn.Up | Btn.Down | Btn.Left | Btn.Right | ANY_ATTACK | Btn.Start;
        expect((p1 | p2) & ~legal).toBe(0);
        sim.step({ p1, p2 });
        trace.push(p1, p2, ...sim.state.fighters.flatMap(fighter => [fighter.x, fighter.y, fighter.hp]));
        damage += sim.hits.reduce((sum, hit) => sum + hit.damage, 0);
      }
      expect(damage).toBeGreaterThan(0);
      return trace;
    };
    expect(run()).toEqual(run());
  });
});
