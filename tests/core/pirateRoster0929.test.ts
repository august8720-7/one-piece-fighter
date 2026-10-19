import { describe, expect, it } from 'vitest';
import { ANY_ATTACK, Btn, FightSim, SKILL_BUTTONS, px, totalFrames, type FighterDef, type MotionId, type MoveData } from '../../src/core';
import { Cpu } from '../../src/ai/cpu';
import { luffyDef } from '../../src/characters/luffy/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { shanksAi } from '../../src/characters/shanks/ai';
import { zoroDef } from '../../src/characters/zoro/def';
import { zoroAi } from '../../src/characters/zoro/ai';
import { sanjiDef } from '../../src/characters/sanji/def';
import { sanjiAi } from '../../src/characters/sanji/ai';
import { whitebeardDef } from '../../src/characters/whitebeard/def';
import { whitebeardAi } from '../../src/characters/whitebeard/ai';
import { bigmomDef } from '../../src/characters/bigmom/def';
import { bigmomAi } from '../../src/characters/bigmom/ai';
import { kaidoDef } from '../../src/characters/kaido/def';
import { kaidoAi } from '../../src/characters/kaido/ai';

const PIRATES = [
  { def: shanksDef, ai: shanksAi }, { def: zoroDef, ai: zoroAi }, { def: sanjiDef, ai: sanjiAi },
  { def: whitebeardDef, ai: whitebeardAi }, { def: bigmomDef, ai: bigmomAi }, { def: kaidoDef, ai: kaidoAi },
] as const;
const NEUTRAL = { p1: 0, p2: 0 };

function ready(def: FighterDef, facing: 1 | -1 = 1, mode: 'classic' | 'simple' = 'simple', distance = 380, opponent = luffyDef) {
  const sim = new FightSim({ p1: def, p2: opponent, controlModes: [mode, 'classic'], introFrames: 0, roundTime: -1, seed: 929 });
  const [me, other] = sim.state.fighters;
  me.x = px(-distance / 2) * facing;
  other.x = px(distance / 2) * facing;
  me.facing = facing;
  other.facing = facing === 1 ? -1 : 1;
  me.meter = 300;
  return sim;
}

function classicInput(motion: MotionId, button: number, facing: 1 | -1): number[] {
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

function skill(def: FighterDef, id: string): { slot: number; move: MoveData } {
  const slot = def.skillSlots!.indexOf(id);
  expect(slot).toBeGreaterThanOrEqual(0);
  return { slot, move: def.moves.find(move => move.id === id)! };
}

function attackHits(def: FighterDef, id: string, distance = 52, opponent = luffyDef, facing: 1 | -1 = 1) {
  const { slot, move } = skill(def, id);
  const sim = ready(def, facing, 'simple', distance, opponent);
  sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
  const hits = [...sim.hits];
  for (let tick = 0; tick < totalFrames(move) + 180; tick++) {
    sim.step(NEUTRAL);
    hits.push(...sim.hits);
  }
  return { sim, hits: hits.filter(event => event.kind === 'hit' && event.attacker === 0 && event.moveId === id) };
}

describe('0929 pirate candidate roster inputs and recovery', () => {
  for (const { def } of PIRATES) {
    it(`${def.id}: all nine skills execute via real simple/classic inputs on both facings and finish`, () => {
      expect(def.skillSlots).toHaveLength(9);
      expect(new Set(def.skillSlots).size).toBe(9);
      for (const [slot, id] of def.skillSlots!.entries()) {
        const move = def.moves.find(entry => entry.id === id)!;
        for (const facing of [1, -1] as const) {
          for (const mode of ['simple', 'classic'] as const) {
            const sim = ready(def, facing, mode);
            const inputs = mode === 'simple' ? [SKILL_BUTTONS[slot]!] : classicInput(move.input.motion!, move.input.button, facing);
            for (const p1 of inputs) sim.step({ p1, p2: 0 });
            expect(sim.state.fighters[0].moveId, `${def.id}/${id}/${mode}/${facing}`).toBe(id);
            expect(sim.state.fighters[0].meter).toBe(300 - (move.meterCost ?? 0));
            for (let tick = 0; tick < totalFrames(move) + 180; tick++) sim.step(NEUTRAL);
            expect(sim.state.fighters[0]).toMatchObject({ state: 'idle', moveId: null, airborne: false, install: null });
          }
        }
      }
    });

    it(`${def.id}: insufficient meter, airborne and hitstun cannot bypass skill eligibility`, () => {
      for (const [slot, id] of def.skillSlots!.entries()) {
        const move = def.moves.find(entry => entry.id === id)!;
        if (move.meterCost) {
          const sim = ready(def);
          sim.state.fighters[0].meter = move.meterCost - 1;
          expect(sim.skillAvailability(0, slot).reason).toBe('meter');
          sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
          expect(sim.state.fighters[0].moveId).toBeNull();
          expect(sim.state.fighters[0].meter).toBe(move.meterCost - 1);
        }
        const air = ready(def);
        Object.assign(air.state.fighters[0], { state: 'jump_neutral', airborne: true, y: px(-50), vy: 0 });
        expect(air.skillAvailability(0, slot).reason).toBe('air');
        air.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        expect(air.state.fighters[0].moveId).toBeNull();
        const stunned = ready(def);
        Object.assign(stunned.state.fighters[0], { state: 'hit_stand', stun: 12 });
        expect(stunned.skillAvailability(0, slot).reason).toBe('recovery');
        stunned.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
        expect(stunned.state.fighters[0].moveId).toBeNull();
      }
      const whiff = ready(def);
      whiff.step({ p1: Btn.Skill2, p2: 0 });
      expect(whiff.skillAvailability(0, 0).reason).toBe('cancel');
      whiff.step({ p1: Btn.Skill1, p2: 0 });
      expect(whiff.state.fighters[0].moveId).toBe(def.skillSlots![1]);
    });

    it(`${def.id}: complete normal inputs select their own attacks and light attacks reach small/large bodies`, () => {
      for (const [stance, prefix] of [['stand', 'st'], ['crouch', 'cr'], ['air', 'j']] as const) {
        for (const [letter, button] of [['a', Btn.A], ['b', Btn.B], ['c', Btn.C], ['d', Btn.D]] as const) {
          const sim = ready(def, 1, 'classic');
          if (stance === 'air') Object.assign(sim.state.fighters[0], { state: 'jump_neutral', airborne: true, y: px(-60), vy: 0 });
          sim.step({ p1: button | (stance === 'crouch' ? Btn.Down : 0), p2: 0 });
          expect(sim.state.fighters[0].moveId).toBe(`${prefix}_${letter}`);
        }
      }
      for (const id of ['f_c', 'cd', 'j_cd']) {
        const sim = ready(def, 1, 'classic');
        if (id === 'j_cd') Object.assign(sim.state.fighters[0], { state: 'jump_neutral', airborne: true, y: px(-60), vy: 0 });
        sim.step({ p1: id === 'f_c' ? Btn.Right | Btn.C : Btn.C | Btn.D, p2: 0 });
        expect(sim.state.fighters[0].moveId).toBe(id);
      }
      for (const opponent of [luffyDef, bigmomDef]) for (const facing of [1, -1] as const) {
        const contact = def.pushboxStand[2] / 2 + opponent.pushboxStand[2] / 2 + 1;
        const sim = ready(def, facing, 'classic', contact, opponent);
        sim.step({ p1: Btn.A, p2: 0 });
        const hits = [...sim.hits];
        for (let tick = 0; tick < 60; tick++) { sim.step(NEUTRAL); hits.push(...sim.hits); }
        expect(hits.some(event => event.moveId === 'st_a' && event.kind === 'hit'), `${def.id}/${opponent.id}/${facing}`).toBe(true);
      }
    });

    it(`${def.id}: ordinary front/back throws damage and release without remaining held`, () => {
      for (const direction of [4, 6] as const) {
        const sim = ready(def, 1, 'classic', def.pushboxStand[2] / 2 + 16);
        sim.step({ p1: (direction === 6 ? Btn.Right : Btn.Left) | Btn.C, p2: 0 });
        expect(sim.state.fighters[0].moveId).toBe(direction === 6 ? 'throw_fwd' : 'throw_back');
        expect(sim.state.fighters[1].state).toBe('thrown');
        for (let tick = 0; tick < 180; tick++) sim.step(NEUTRAL);
        expect(sim.state.fighters[1].hp).toBeLessThan(luffyDef.maxHp);
        expect(sim.state.fighters.every(fighter => fighter.state !== 'throw' && fighter.state !== 'thrown')).toBe(true);
        const [me, other] = sim.state.fighters;
        expect(Math.sign(other.x - me.x)).toBe(direction === 6 ? 1 : -1);
      }
    });
  }
});

describe('0929 pirate candidates have working distinct combat mechanics', () => {
  it('short multi-hit sword and kick sequences actually connect, including every Zoro ultimate hit', () => {
    const sequences = [
      { def: shanksDef, id: 'sp_single_arm_cut', count: 2 },
      { def: zoroDef, id: 'sp_oni_giri', count: 3 },
      { def: sanjiDef, id: 'sp_mutton_flurry', count: 3 },
      { def: whitebeardDef, id: 'sp_quake_naginata_combo', count: 3 },
      { def: zoroDef, id: 'ult_asura_finale', count: 5 },
    ];
    for (const { def, id, count } of sequences) {
      const { hits } = attackHits(def, id);
      expect(hits, `${def.id}/${id}`).toHaveLength(count);
      expect(hits.every(hit => hit.damage > 0)).toBe(true);
    }
  });

  it('grounded anti-air attacks hit real airborne opponents without launching the attacker', () => {
    for (const def of [shanksDef, zoroDef, sanjiDef, whitebeardDef, kaidoDef]) {
      const sim = ready(def, 1, 'simple', 45);
      Object.assign(sim.state.fighters[1], { state: 'jump_neutral', airborne: true, y: px(-58), vy: 0 });
      sim.step({ p1: Btn.Skill3, p2: 0 });
      const hits = [...sim.hits];
      for (let tick = 0; tick < 65; tick++) { sim.step(NEUTRAL); hits.push(...sim.hits); }
      expect(hits.some(hit => hit.moveId === def.skillSlots![2] && hit.kind === 'hit'), def.id).toBe(true);
      expect(sim.state.fighters[0].y).toBe(0);
      expect(sim.state.fighters[0].airborne).toBe(false);
    }
  });

  it('every declared projectile skill spawns live projectiles which leave the simulation', () => {
    for (const { def } of PIRATES) for (const move of def.moves.filter(entry => entry.projectiles?.length)) {
      const { slot } = skill(def, move.id);
      const sim = ready(def);
      const spawned = new Set<number>();
      const ended = new Set<number>();
      sim.step({ p1: SKILL_BUTTONS[slot]!, p2: 0 });
      for (let tick = 0; tick < totalFrames(move) + Math.max(...move.projectiles!.map(p => p.ttl)) + 80; tick++) {
        for (const projectile of sim.state.projectiles) spawned.add(projectile.id);
        for (const projectile of sim.projectileEnds) ended.add(projectile.id);
        sim.step(NEUTRAL);
      }
      expect(spawned.size, `${def.id}/${move.id}`).toBe(move.projectiles!.length);
      expect(ended.size, `${def.id}/${move.id}`).toBe(move.projectiles!.length);
      expect(sim.state.projectiles).toHaveLength(0);
    }
  });

  it('representative sword, quake, fire and breath projectiles deal damage through real input', () => {
    for (const [def, id] of [[shanksDef, 'sp_haki_slash'], [zoroDef, 'sp_pound_slash'], [whitebeardDef, 'sp_quake_wave'], [bigmomDef, 'sp_heavenly_fire'], [kaidoDef, 'ult_blast_breath']] as const) {
      const { hits } = attackHits(def, id, 170);
      expect(hits.some(hit => hit.projectile && hit.damage > 0), `${def.id}/${id}`).toBe(true);
    }
  });

  it('Big Mom thunder hits its fixed spot but does not track a distant opponent', () => {
    expect(attackHits(bigmomDef, 'sp_thunder', 100).hits.length).toBeGreaterThan(0);
    expect(attackHits(bigmomDef, 'sp_thunder', 200).hits).toHaveLength(0);
    const sim = ready(bigmomDef, 1, 'simple', 200);
    const casterX = sim.state.fighters[0].x;
    sim.step({ p1: Btn.Skill3, p2: 0 });
    for (let tick = 0; tick < 30 && sim.state.projectiles.length === 0; tick++) sim.step(NEUTRAL);
    expect(sim.state.projectiles[0]!.x).toBe(casterX + px(100));
  });

  it('paid sidesteps avoid a strike only during their real invulnerability and then become vulnerable', () => {
    for (const def of [shanksDef, sanjiDef]) {
      const sim = ready(def, 1, 'simple', 40);
      const hp = sim.state.fighters[0].hp;
      sim.step({ p1: Btn.Skill6, p2: Btn.A });
      for (let tick = 0; tick < 19; tick++) sim.step(NEUTRAL);
      expect(sim.state.fighters[0].hp).toBe(hp);
      expect(sim.state.fighters[0].meter).toBe(267);
      sim.step({ p1: 0, p2: Btn.A });
      for (let tick = 0; tick < 30; tick++) sim.step(NEUTRAL);
      expect(sim.state.fighters[0].hp).toBeLessThan(hp);
    }
  });

  it('Kaido charge armor covers only its declared opening and a miss has real punishable recovery', () => {
    const sim = ready(kaidoDef);
    sim.step({ p1: Btn.Skill5, p2: 0 });
    expect(sim.hasArmor(sim.state.fighters[0])).toBe(true);
    for (let tick = 0; tick < 10; tick++) sim.step(NEUTRAL);
    expect(sim.hasArmor(sim.state.fighters[0])).toBe(false);
    for (let tick = 0; tick < 18; tick++) sim.step(NEUTRAL);
    expect(sim.state.fighters[0].state).toBe('attack');
    expect(sim.currentFrame(sim.state.fighters[0])?.hitboxes).toBeUndefined();
    expect(sim.skillAvailability(0, 0).reason).toBe('cancel');
  });
});

describe('0929 pirate candidate CPU behavior', () => {
  for (const { def, ai } of PIRATES) {
    it(`${def.id}: seeded CPU produces legal classic inputs, real attacks and repeatable results`, () => {
      const run = () => {
        const sim = ready(def, 1, 'classic', 140);
        const cpu = new Cpu(0, ai, 'normal', 929);
        const valid = Btn.Up | Btn.Down | Btn.Left | Btn.Right | ANY_ATTACK | Btn.Start;
        const trace: number[] = [];
        const moves = new Set<string>();
        for (let tick = 0; tick < 600 && sim.state.phase === 'fight'; tick++) {
          const p1 = cpu.input(sim);
          expect(p1 & ~valid).toBe(0);
          sim.step({ p1, p2: 0 });
          if (sim.state.fighters[0].moveId) moves.add(sim.state.fighters[0].moveId!);
          trace.push(p1, sim.state.fighters[0].x, sim.state.fighters[1].hp);
        }
        return { trace, moves, hp: sim.state.fighters[1].hp };
      };
      const first = run(), second = run();
      expect(second.trace).toEqual(first.trace);
      expect(first.moves.size).toBeGreaterThan(1);
      expect(first.hp).toBeLessThan(luffyDef.maxHp);
    });
  }
});
