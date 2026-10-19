import { describe, expect, it } from 'vitest';
import { Btn, FightSim, SKILL_BUTTONS, px, type FighterDef, type HitEvent } from '../../src/core';
import { luffyDef } from '../../src/characters/luffy/def';
import { akainuDef } from '../../src/characters/akainu/def';
import { labubuDef } from '../../src/characters/labubu/def';
import { twinkleDef } from '../../src/characters/twinkle/def';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { ROLE_PRACTICES, RolePracticeProgress, RolePracticeSession, type RolePracticeDef } from '../../src/render/ui/rolePractice';

const defs: Record<string, FighterDef> = { luffy: luffyDef, akainu: akainuDef, labubu: labubuDef, twinkle: twinkleDef, aokiji: aokijiDef, shanks: shanksDef };
function fixture(practice: RolePracticeDef) {
  const def = defs[practice.character]!, opponent = defs[practice.opponent]!;
  const sim = new FightSim({ p1: def, p2: opponent, introFrames: 0, roundTime: -1, controlModes: ['simple', 'classic'] });
  const session = new RolePracticeSession(practice);
  session.reset(sim); session.start();
  const skill = def.skillSlots?.indexOf(practice.moveId) ?? -1;
  const bits = skill >= 0 ? SKILL_BUTTONS[skill]! : Btn.C;
  const events: HitEvent[] = [];
  const tick = (p1 = 0) => { sim.step({ p1, p2: session.dummyInput(sim) }); events.push(...sim.hits); session.observe(sim); };
  return { sim, session, bits, tick, events };
}

describe('1014 tactical practice uses genuine inputs and collisions', () => {
  for (const practice of ROLE_PRACTICES) it(`${practice.id}: reachable once with its controlled dummy`, () => {
    const f = fixture(practice);
    let used = false;
    for (let t = 0; t < 600 && f.session.status === 'running'; t++) {
      const [p1, p2] = f.sim.state.fighters;
      let bits = 0;
      const at = practice.result === 'route' || practice.result === 'air' ? 30 : 0;
      if (practice.result === 'grab') {
        if (Math.abs(p2.x - p1.x) > px(40)) bits = Btn.Right;
        else if (!used) { bits = f.bits; used = true; }
      } else if (practice.result === 'reflect') {
        const incoming = f.sim.state.projectiles.find(projectile => projectile.owner === 1);
        if (!used && incoming && Math.abs(incoming.x - p1.x) < px(90)) { bits = f.bits; used = true; }
      } else if (practice.result === 'recovery') {
        if (!used && p2.moveId === 'sp_step_thrust' && p2.stateFrame >= 14) { bits = f.bits; used = true; }
      } else if (!used && t === at) { bits = f.bits; used = true; }
      f.tick(bits);
    }
    expect(f.session.status, JSON.stringify({ message: f.session.message, elapsed: f.session.elapsed, last: f.events.slice(-6), states: f.sim.state.fighters.map(x => ({ state: x.state, x: x.x / 256, y: x.y / 256, move: x.moveId, frame: x.stateFrame })) })).toBe('passed');
    expect(f.events.some(event => event.attacker === 0 && (event.kind === 'hit' || event.kind === 'reflect'))).toBe(true);
  });

  it('does not complete from an empty swing or a block event', () => {
    const f = fixture(ROLE_PRACTICES[0]!);
    f.sim.state.fighters[1].x = px(350);
    f.tick(Btn.C); for (let i = 0; i < 50; i++) f.tick();
    expect(f.session.status).toBe('running');
    f.sim.hits.push({ frame: f.sim.state.frame, kind: 'block', attacker: 0, defender: 1, moveId: 'st_c', damage: 0, counter: false, comboHits: 0, comboDamage: 0, projectile: false, x: 0, y: 0 });
    f.session.observe(f.sim);
    expect(f.session.status).toBe('running');
  });

  it('grounded launch does not count as hitting an airborne opponent', () => {
    const f = fixture(ROLE_PRACTICES.find(p => p.id === 'aokiji.uplift_jump')!);
    f.sim.state.fighters[1].x = f.sim.state.fighters[0].x + px(45);
    f.tick(f.bits);
    for (let t = 0; t < 25 && f.session.status === 'running'; t++) f.tick();
    expect(f.events.some(event => event.kind === 'hit' && event.defenderBefore?.airborne === false)).toBe(true);
    expect(f.session.status).toBe('failed');
  });

  it('a neutral target hit does not count as punishing recovery', () => {
    const f = fixture(ROLE_PRACTICES.find(p => p.id === 'shanks.thrust_recovery')!);
    f.sim.state.fighters[1].x = f.sim.state.fighters[0].x + px(90);
    f.tick(f.bits);
    for (let t = 0; t < 25 && f.session.status === 'running'; t++) f.tick();
    expect(f.events.some(event => event.kind === 'hit')).toBe(true);
    expect(f.session.status).toBe('failed');
  });

  it('reset clears old attempt hits, contacts and scripts', () => {
    const f = fixture(ROLE_PRACTICES[0]!);
    f.tick(Btn.C); for (let i = 0; i < 15 && f.session.status === 'running'; i++) f.tick();
    expect(f.session.status).toBe('passed');
    f.session.reset(f.sim); f.session.start(); f.session.observe(f.sim);
    expect(f.session.status).toBe('running');
    expect(f.session.attempt).toBe(2);
    expect(f.sim.hits).toHaveLength(0);
  });
});

describe('role practice storage remains independent of basic six steps', () => {
  it('whitelists role ids, saves only successes, and is idempotent', () => {
    const data = new Map([['opf.tutorial.v3', 'complete'], ['opf.tutorial.simple.v1', 'skipped'], ['opf.roleTutorial.v1', JSON.stringify({ version: 1, completed: { luffy: ['luffy.long_punch', 'shanks.blade_spacing', 'luffy.g5_activate'] } })]]);
    const store = new RolePracticeProgress({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } });
    expect(store.has('luffy.long_punch')).toBe(true);
    expect(store.has('shanks.blade_spacing')).toBe(false);
    expect(store.has('luffy.g5_activate')).toBe(false);
    store.record('luffy.rocket_entry'); store.record('luffy.rocket_entry'); store.record('luffy.g5_activate');
    expect(JSON.parse(data.get('opf.roleTutorial.v1')!)).toEqual({ version: 1, completed: { luffy: ['luffy.long_punch', 'luffy.rocket_entry'] } });
    expect(data.get('opf.tutorial.v3')).toBe('complete'); expect(data.get('opf.tutorial.simple.v1')).toBe('skipped');
  });
  it('corrupt or refused storage keeps successful ids for the current session', () => {
    const store = new RolePracticeProgress({ getItem: () => '{bad', setItem: () => { throw new Error('denied'); } });
    store.record('luffy.long_punch');
    expect(store.has('luffy.long_punch')).toBe(true); expect(store.persistent).toBe(false);
  });
});
