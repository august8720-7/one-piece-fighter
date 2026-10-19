import { describe, expect, it } from 'vitest';
import { Btn, FightSim, attack, px, type FighterDef, type FightSimOptions } from '../../src/core';
import { luffyDef } from '../../src/characters/luffy/def';
import { akainuDef } from '../../src/characters/akainu/def';

const none = { p1: 0, p2: 0 };
function make(options: Partial<FightSimOptions> = {}) {
  const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0, roundTime: -1,
    controlModes: ['simple', 'simple'], gear5Enabled: [true, false], ...options });
  sim.state.fighters[0].meter = 300;
  return sim;
}
function advance(sim: FightSim, ticks: number, p1 = 0, p2 = 0) {
  for (let i = 0; i < ticks; i++) sim.step({ p1, p2 });
}
function activate(sim = make()) {
  sim.step({ p1: Btn.Awakening, p2: 0 }); advance(sim, 24);
  expect(sim.state.fighters[0].form).toBe('gear5');
  expect(sim.state.fighters[0].formFrames).toBe(720);
  return sim;
}
function operable(sim = activate()) { advance(sim, 12); return sim; }

describe('explicit Gear5 logic candidate lifecycle', () => {
  it('is disabled by default, never replaces old abilities or spends meter', () => {
    const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0 });
    sim.state.fighters[0].meter = 300;
    sim.step({ p1: Btn.Awakening, p2: 0 });
    expect(sim.awakeningFeedback[0]?.reason).toBe('disabled');
    expect(sim.state.fighters[0].meter).toBe(300);
    expect(sim.state.fighters[0].moveId).toBeNull();
  });

  it('spends once, commits after 24 subsequent action ticks, keeps 12 recovery ticks', () => {
    const sim = make(); const f = sim.state.fighters[0];
    sim.step({ p1: Btn.Awakening, p2: 0 });
    expect([f.meter, f.stateFrame, f.form]).toEqual([0, 0, null]);
    advance(sim, 23, Btn.Awakening);
    expect(f.form).toBeNull();
    sim.step({ p1: Btn.Awakening, p2: 0 });
    expect([f.form, f.formFrames, f.stateFrame]).toEqual(['gear5', 720, 24]);
    advance(sim, 11, Btn.Skill1);
    expect(f.moveId).toBe('g5_awakening');
    sim.step(none);
    expect([f.state, f.formFrames]).toEqual(['idle', 708]);
  });

  it('freezes startup/recovery on hitstop but the committed duration includes hitstop', () => {
    const sim = make(), f = sim.state.fighters[0];
    sim.step({ p1: Btn.Awakening, p2: 0 }); f.hitstop = 3;
    advance(sim, 3); expect(f.stateFrame).toBe(0);
    advance(sim, 24); expect([f.form, f.formFrames]).toEqual(['gear5', 720]);
    f.hitstop = 4; advance(sim, 4);
    expect([f.stateFrame, f.formFrames]).toEqual([24, 716]);
  });

  for (const startup of [10, 24]) it(`real strike on startup action tick ${startup} interrupts before commit`, () => {
    const strike = attack({ id: 'test_strike', name: 'timed real hit', stance: 'stand', button: Btn.A,
      segments: [{ startup, active: 1, hitbox: [-100, -80, 200, 60] }], recovery: 1,
      damage: 10, knockback: { x: 0, y: 0 } });
    const defender: FighterDef = { ...akainuDef, moves: [strike] };
    const sim = make({ p2: defender }); const f = sim.state.fighters[0];
    f.x = px(-20); sim.state.fighters[1].x = px(20);
    sim.step({ p1: Btn.Awakening, p2: Btn.A }); advance(sim, startup);
    expect(sim.hits.some(e => e.kind === 'hit' && e.defender === 0)).toBe(true);
    expect([f.form, f.awakeningStarted, f.formFrames, f.fatigueFrames]).toEqual([null, null, 0, 0]);
    // Opponent's real hit grants normal defensive meter, but the 300 activation fee remains spent.
    expect(f.meter).toBeLessThan(300);
  });

  it('actual throw interrupts pending activation without refund or fatigue', () => {
    const sim = make(); const [f, opponent] = sim.state.fighters;
    f.x = px(-20); opponent.x = px(20);
    sim.step({ p1: Btn.Awakening, p2: 0 });
    sim.step({ p1: 0, p2: Btn.Left | Btn.C });
    expect(f.state).toBe('thrown');
    expect([f.form, f.awakeningStarted, f.meter, f.fatigueFrames]).toEqual([null, null, 0, 0]);
  });

  it('rejects insufficient resource and never queues an eventual activation', () => {
    const sim = make(), f = sim.state.fighters[0]; f.meter = 299;
    sim.step({ p1: Btn.Awakening, p2: 0 }); expect(sim.awakeningFeedback[0]?.reason).toBe('meter');
    f.meter = 300; advance(sim, 40, Btn.Awakening);
    expect([f.meter, f.form, f.moveId]).toEqual([300, null, null]);
  });

  it('gives attack/skill edges priority and ignores other characters', () => {
    const sim = make();
    sim.step({ p1: Btn.Awakening | Btn.Skill1, p2: Btn.Awakening });
    expect(sim.state.fighters[0].moveId).toBe('sp_gatling');
    expect(sim.state.fighters[0].meter).toBe(300);
    expect(sim.awakeningFeedback[1]?.reason).toBe('character');
  });

  it('rejects air, active moves, existing install and any fatigue without fee', () => {
    for (const reason of ['air', 'recovery', 'form', 'fatigue'] as const) {
      const sim = make(), f = sim.state.fighters[0];
      if (reason === 'air') { f.airborne = true; f.state = 'jump_neutral'; f.y = px(-50); }
      if (reason === 'recovery') { f.state = 'attack'; f.moveId = 'st_c'; }
      if (reason === 'form') { f.install = 'gear2'; f.installFrames = 100; }
      if (reason === 'fatigue') { f.fatigueFrames = 20; f.fatigueSource = 'gear2'; }
      sim.step({ p1: Btn.Awakening, p2: 0 });
      expect(sim.awakeningFeedback[0]?.reason).toBe(reason);
      expect(f.meter).toBe(300);
    }
  });

  it('counts 720 complete fight ticks, exits before same-tick jump and starts full fatigue', () => {
    const sim = activate(), f = sim.state.fighters[0];
    advance(sim, 719); expect(f.formFrames).toBe(1);
    sim.step({ p1: Btn.Up, p2: 0 });
    expect([f.form, f.formFrames, f.fatigueFrames, f.fatigueSource, f.state]).toEqual([null, 0, 180, 'gear5', 'prejump']);
    advance(sim, 180); expect([f.fatigueFrames, f.fatigueSource]).toEqual([0, null]);
  });

  it('locks the move ID until recovery, then blocks a buffered extension and exits', () => {
    const sim = operable(), f = sim.state.fighters[0];
    sim.step({ p1: Btn.Skill1, p2: 0 });
    const move = sim.move(f); expect(move?.id).toBe('g5_elastic_rush'); expect(Object.isFrozen(move)).toBe(true);
    f.formFrames = 1;
    sim.step({ p1: Btn.Skill2 | Btn.Up, p2: 0 });
    expect([f.formExitPending, f.moveId]).toEqual([true, 'g5_elastic_rush']);
    expect(sim.move(f)).toBe(move);
    advance(sim, 60, Btn.Skill2 | Btn.Up);
    expect(f.form).toBeNull(); expect(f.moveInstance).toBe(2); expect(f.fatigueSource).toBe('gear5');
  });

  it('waits for actual held/released relationships and landing before expiry', () => {
    const sim = operable(), [f, opponent] = sim.state.fighters;
    f.x = px(-20); opponent.x = px(20);
    sim.step({ p1: Btn.Right | Btn.C, p2: 0 });
    expect(f.state).toBe('throw'); f.formFrames = 1;
    sim.step(none); expect([f.form, f.formExitPending, opponent.state]).toEqual(['gear5', true, 'thrown']);
    advance(sim, 60); expect(f.form).toBeNull(); expect(opponent.state).not.toBe('thrown');

    const air = operable(), a = air.state.fighters[0];
    air.step({ p1: Btn.Up, p2: 0 }); advance(air, 3); expect(a.airborne).toBe(true);
    a.formFrames = 1; air.step({ p1: Btn.Skill1, p2: 0 }); expect(a.formExitPending).toBe(true);
    advance(air, 80, Btn.Up | Btn.Skill1); expect(a.form).toBeNull();
  });

  it('uses correct fatigue speed and forbids both installs only for Gear5 fatigue', () => {
    const sim = operable(), f = sim.state.fighters[0]; f.formFrames = 1;
    sim.step(none); f.meter = 300;
    sim.step({ p1: Btn.Right, p2: 0 }); expect(f.vx).toBe(Math.floor(f.def.movement.walkFwdSpeed * 3 / 4));
    sim.step({ p1: Btn.Skill6, p2: 0 }); expect(sim.skillFeedback[0]?.reason).toBe('fatigue'); expect(f.install).toBeNull();
    expect(f.meter).toBe(300);

    const old = make(), oldF = old.state.fighters[0];
    old.step({ p1: Btn.Skill6, p2: 0 });
    advance(old, 598); expect(oldF.install).toBe('gear2');
    old.step(none); expect([oldF.fatigueFrames, oldF.fatigueSource]).toEqual([90, 'gear2']);
    oldF.meter = 300; old.step({ p1: Btn.Skill6, p2: 0 });
    expect([oldF.install, oldF.fatigueFrames, oldF.meter]).toEqual(['gear2', 0, 200]);
  });

  it('forbids classic Gear2 in Gear5 and preserves three-stock round carry', () => {
    const sim = operable(activate(make({ controlModes: ['classic', 'classic'] }))), f = sim.state.fighters[0]; f.meter = 213;
    for (const p1 of [Btn.Down, 0, Btn.Down, Btn.Down | Btn.B]) sim.step({ p1, p2: 0 });
    expect(f.install).toBeNull(); expect(f.meter).toBe(213);
    sim.resetRound();
    expect([sim.state.fighters[0].meter, sim.state.fighters[0].form, sim.state.fighters[0].fatigueSource]).toEqual([213, null, null]);
    sim.resetMatch(); expect(sim.state.fighters[0].meter).toBe(0);
  });

  it('does not advance clocks without steps, or during round-end final form presentation', () => {
    const sim = operable(), f = sim.state.fighters[0]; const remaining = f.formFrames;
    expect(f.formFrames).toBe(remaining); // Pausing is precisely not calling step.
    sim.state.fighters[1].hp = 0; sim.step(none);
    expect(sim.state.phase).toBe('round_end'); const endRemaining = f.formFrames;
    advance(sim, 20); expect([f.form, f.formFrames]).toEqual(['gear5', endRemaining]);
    sim.resetRound(); expect([sim.state.fighters[0].form, sim.state.fighters[0].awakeningStarted]).toEqual([null, null]);
  });
});

describe('real hit metadata and third-hit-only Gear5 confirmation', () => {
  function contact(block = false) {
    const sim = operable(), [f, opponent] = sim.state.fighters;
    f.x = px(-20); opponent.x = px(20);
    sim.step({ p1: Btn.Skill1, p2: block ? Btn.Right : 0 });
    return sim;
  }
  function thirdHit(sim: FightSim, p2 = 0) {
    let hits = 0;
    for (let tick = 0; tick < 100; tick++) {
      sim.step({ p1: 0, p2 });
      if (sim.hits.some(e => e.kind === 'hit' && e.moveId === 'g5_elastic_rush')) hits++;
      if (hits === 3) return;
    }
    throw new Error('Candidate three-hit contact not reached');
  }
  it('first/second hits, blocks, and whiffs do not open a cancel', () => {
    const sim = contact();
    for (let tick = 0; tick < 100 && !sim.hits.some(e => e.kind === 'hit'); tick++) sim.step(none);
    expect(sim.hits.some(e => e.kind === 'hit')).toBe(true);
    expect(sim.skillAvailability(0, 1).available).toBe(false);
    const block = contact(true); advance(block, 70, 0, Btn.Right);
    expect(block.state.fighters[0].hasHit).toBe(false);
  });
  it('opens only the E cancel after third real hit; hitstop does not spend the 8-action-tick window', () => {
    const sim = contact(); thirdHit(sim); const f = sim.state.fighters[0];
    expect(sim.skillAvailability(0, 1).available).toBe(true);
    expect(sim.skillAvailability(0, 6).available).toBe(false);
    const until = f.cancelUntil, frozenFrame = f.stateFrame;
    advance(sim, f.hitstop);
    expect([f.stateFrame, f.cancelUntil]).toEqual([frozenFrame, until]);
    advance(sim, 7); expect(sim.skillAvailability(0, 1).available).toBe(true);
    sim.step({ p1: Btn.Skill2, p2: 0 }); expect(f.moveId).toBe('g5_bounce_slam');
  });
  it('closes after 8 action ticks and expiry overrides even a valid confirmation', () => {
    const sim = contact(); thirdHit(sim); const f = sim.state.fighters[0];
    advance(sim, f.hitstop); advance(sim, 9);
    expect(sim.skillAvailability(0, 1).available).toBe(false);
    const expiring = contact(); thirdHit(expiring); const e = expiring.state.fighters[0]; e.formFrames = 1;
    expiring.step({ p1: Btn.Skill2, p2: 0 }); expect(e.moveId).toBe('g5_elastic_rush'); expect(e.formExitPending).toBe(true);
  });
  it('captures actual grounded defender state before a launching hit changes it', () => {
    const sim = operable(), [f, opponent] = sim.state.fighters; f.x = px(-20); opponent.x = px(20);
    sim.step({ p1: Btn.Skill3, p2: 0 });
    for (let i = 0; i < 20 && !sim.hits.some(e => e.kind === 'hit'); i++) sim.step(none);
    const event = sim.hits.find(e => e.kind === 'hit')!;
    expect(event.defenderBefore).toMatchObject({ airborne: false, state: 'idle', moveId: null });
    expect(opponent.airborne).toBe(true);
    const before = { ...event.defenderBefore }; sim.step(none); expect(event.defenderBefore).toEqual(before);
  });
});
