import { describe, expect, it } from 'vitest';
import { Btn, FightSim, STAGE_LEFT, STAGE_RIGHT, THROW_TECH_FRAMES, px, type FighterDef } from '../../src/core';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { luffyDef } from '../../src/characters/luffy/def';
import { akainuDef } from '../../src/characters/akainu/def';
import { labubuDef } from '../../src/characters/labubu/def';
import { connectedHeldReaction, heldReactionForMove, HELD_LEG_FLIP } from '../../src/render/animations';

function grab(caster: FighterDef, target: FighterDef, facing: 1 | -1, wall: boolean, back = false) {
  const sim = new FightSim({ p1: caster, p2: target, introFrames: 0, roundTime: -1 });
  const [me, other] = sim.state.fighters;
  // Initial positions are a pure-logic fixture. Every grab/release/tech transition
  // below comes from actual InputFrame processing, not assigned combat state.
  other.x = wall ? (facing === 1 ? STAGE_RIGHT - px(target.pushboxStand[2] / 2)
    : STAGE_LEFT + px(target.pushboxStand[2] / 2)) : px(20 * facing);
  me.x = other.x - facing * px((caster.pushboxStand[2] + target.pushboxStand[2]) / 2);
  me.facing = facing; other.facing = facing === 1 ? -1 : 1;
  sim.step({ p1: ((facing === 1) !== back ? Btn.Right : Btn.Left) | Btn.C, p2: 0 });
  expect(me.state).toBe('throw'); expect(other.state).toBe('thrown');
  expect(me.moveId).toBe(back ? 'throw_back' : 'throw_fwd');
  return { sim, me, other, move: sim.move(me)! };
}

describe('reviewed first-pair front grip uses the existing wall rule', () => {
  for (const caster of [aokijiDef, shanksDef]) for (const target of [luffyDef, labubuDef, akainuDef]) {
    it(`${caster.id}/${target.id}: keeps the adopted grip until original release in center and both corners`, () => {
      for (const facing of [1, -1] as const) for (const wall of [false, true]) {
        const { sim, me, other, move } = grab(caster, target, facing, wall);
        const timing = move.throwData!, beforeHp = other.hp;
        expect(timing.holdOffset).toBe(30);
        expect(timing.keepHoldOffsetAtWall).toBeUndefined();
        const heldFrames: number[] = [];
        while (other.state === 'thrown' && heldFrames.length <= timing.releaseFrame) {
          heldFrames.push(me.stateFrame);
          expect(Math.abs(other.x - me.x)).toBe(px(30));
          expect(connectedHeldReaction(sim, other)).toEqual({ anim: HELD_LEG_FLIP, index: 0 });
          for (const fighter of [me, other]) {
            const half = px(fighter.def.pushboxStand[2] / 2);
            expect(fighter.x).toBeGreaterThanOrEqual(STAGE_LEFT + half);
            expect(fighter.x).toBeLessThanOrEqual(STAGE_RIGHT - half);
          }
          sim.step({ p1: 0, p2: 0 });
        }
        expect(heldFrames).toEqual(Array.from({ length: timing.releaseFrame }, (_, tick) => tick));
        expect(me.stateFrame).toBe(timing.releaseFrame);
        expect(other.state).toBe('hit_air');
        expect(other.hp).toBe(beforeHp - move.damage);
        expect(connectedHeldReaction(sim, other)).toBeNull();
        for (let tick = timing.releaseFrame + 1; tick <= timing.duration; tick++) sim.step({ p1: 0, p2: 0 });
        expect(me.state).toBe('idle');
        expect(other.hp).toBe(beforeHp - move.damage);
      }
    });
  }

  it.each([aokijiDef, shanksDef])('$id: tech clears the conditional pose without deferred damage', caster => {
    for (const facing of [1, -1] as const) {
      const { sim, me, other, move } = grab(caster, luffyDef, facing, true);
      sim.step({ p1: 0, p2: Btn.C });
      expect(me.state).toBe('throw_tech'); expect(other.state).toBe('throw_tech');
      expect(connectedHeldReaction(sim, other)).toBeNull();
      for (let tick = 0; tick <= THROW_TECH_FRAMES + move.throwData!.duration; tick++) sim.step({ p1: 0, p2: 0 });
      expect(me.state).toBe('idle');
      expect(other.hp).toBe(luffyDef.maxHp);
      expect(connectedHeldReaction(sim, other)).toBeNull();
    }
  });

  it('preserves timing/damage and keeps old-caster reactions unchanged', () => {
    for (const [caster, damage, duration, release, backOffset] of [
      [aokijiDef, 110, 45, 22, 30], [shanksDef, 114, 42, 21, 30],
    ] as const) {
      const front = caster.moves.find(move => move.id === 'throw_fwd')!;
      const back = caster.moves.find(move => move.id === 'throw_back')!;
      expect(front.damage).toBe(damage);
      expect(front.throwData).toMatchObject({ duration, releaseFrame: release, techWindow: 8, holdOffset: 30 });
      expect(back.throwData?.holdOffset).toBe(backOffset);
      expect(heldReactionForMove(caster.id, back)).toBe(HELD_LEG_FLIP);
    }
    for (const caster of [luffyDef, akainuDef]) for (const id of ['throw_fwd', 'throw_back']) {
      expect(heldReactionForMove(caster.id, caster.moves.find(move => move.id === id)!)).toBeNull();
    }
  });

  it.each([aokijiDef, shanksDef])('$id: uses the reviewed back grip until release and changes sides once', caster => {
    for (const facing of [1, -1] as const) {
      const { sim, me, other, move } = grab(caster, luffyDef, facing, false, true);
      const hp = other.hp;
      for (let tick = 0; tick < move.throwData!.releaseFrame; tick++) {
        expect((other.x - me.x) * facing).toBe(px(30));
        expect(connectedHeldReaction(sim, other)?.anim).toBe(HELD_LEG_FLIP);
        sim.step({ p1: 0, p2: 0 });
      }
      expect(other.state).toBe('hit_air');
      expect((other.x - me.x) * facing).toBeLessThan(0);
      expect(other.hp).toBe(hp - move.damage);
      expect(connectedHeldReaction(sim, other)).toBeNull();
    }
  });

  it('keeps the reviewed Shanks back grip at both walls for small, normal and large bodies', () => {
    for (const target of [labubuDef, luffyDef, akainuDef]) for (const facing of [1, -1] as const) {
      const { sim, me, other, move } = grab(shanksDef, target, facing, true, true);
      const hp = other.hp;
      for (let tick = 0; tick < move.throwData!.releaseFrame; tick++) {
        expect((other.x - me.x) * facing).toBe(px(30));
        expect(connectedHeldReaction(sim, other)?.anim).toBe(HELD_LEG_FLIP);
        sim.step({ p1: 0, p2: 0 });
      }
      expect(other.state).toBe('hit_air');
      expect((other.x - me.x) * facing).toBeLessThan(0);
      expect(other.hp).toBe(hp - 114);
      expect(connectedHeldReaction(sim, other)).toBeNull();
    }
  });
});
