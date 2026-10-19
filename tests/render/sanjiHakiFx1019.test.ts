import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { FightSim, SUBPIXEL, px, type HitEvent } from '../../src/core';
import { sanjiDef } from '../../src/characters/sanji/def';
import { akainuDef } from '../../src/characters/akainu/def';
import { SkillEffects } from '../../src/render/fx/SkillEffects';
import { drawSanjiHakiWave, sanjiHakiContact, sanjiHakiPhase } from '../../src/render/fx/sanjiHakiFx1019';

vi.mock('phaser', () => ({ default: {} }));
const move = sanjiDef.moves.find(item => item.id === 'ult_ifrit_finale')!;

function drawing() {
  const calls: { method: string; args: unknown[] }[] = [];
  const graphics = new Proxy({}, { get: (_target, property) => (...args: unknown[]) => {
    calls.push({ method: String(property), args }); return graphics;
  } }) as Phaser.GameObjects.Graphics;
  const scene = { add: { graphics: () => graphics }, textures: { exists: () => false } } as unknown as Phaser.Scene;
  return { calls, graphics, scene };
}

describe('Sanji user-requested material-only Haki finale', () => {
  it('uses only the existing final active segment and retains all nine combat slots', () => {
    const before = JSON.stringify(sanjiDef);
    expect(sanjiHakiPhase('sanji', 'attack', 36, move)).toBeNull();
    expect(sanjiHakiPhase('sanji', 'attack', 37, move)).toEqual({ stage: 'charge', age: 0, duration: 5 });
    expect(sanjiHakiPhase('sanji', 'attack', 42, move)).toEqual({ stage: 'release', age: 0, duration: 6 });
    expect(sanjiHakiPhase('sanji', 'attack', 47, move)?.stage).toBe('release');
    expect(sanjiHakiPhase('sanji', 'attack', 48, move)).toBeNull();
    expect(sanjiHakiPhase('sanji', 'idle', 42, move)).toBeNull();
    expect(sanjiHakiPhase('luffy', 'attack', 42, move)).toBeNull();
    expect(sanjiHakiPhase('sanji', 'attack', 42, sanjiDef.moves[0]!)).toBeNull();
    expect(sanjiDef.skillSlots).toHaveLength(9);
    expect(sanjiDef.skillSlots?.[8]).toBe('ult_ifrit_finale');
    expect(move).toMatchObject({ meterCost: 300, armorBreak: true, damage: 66, hitstop: 9 });
    expect(JSON.stringify(sanjiDef)).toBe(before);
  });

  it('mirrors material around the real root and never invents an eye position', () => {
    const right = drawing(), left = drawing();
    const phase = { stage: 'charge', age: 1, duration: 5 } as const;
    drawSanjiHakiWave(right.graphics, { x: 100, y: 200 }, phase, 1, 2);
    drawSanjiHakiWave(left.graphics, { x: 100, y: 200 }, phase, -1, 2);
    const r = right.calls.find(call => call.method === 'lineBetween')!.args as number[];
    const l = left.calls.find(call => call.method === 'lineBetween')!.args as number[];
    expect(r[0]! + l[0]!).toBeCloseTo(200);
    expect(r[2]! + l[2]!).toBeCloseTo(200);
    expect(right.calls.some(call => call.method === 'fillCircle')).toBe(false);
    drawSanjiHakiWave(right.graphics, { x: 100, y: 200 }, phase, 1, 2, { x: 120, y: 45 });
    expect(right.calls.find(call => call.method === 'fillCircle')?.args.slice(0, 2)).toEqual([120, 45]);
  });

  it('adds a finite impact only for a real final hit and clears it on reset', () => {
    const sim = new FightSim({ p1: sanjiDef, p2: akainuDef, introFrames: 0, roundTime: -1 });
    const fighter = sim.state.fighters[0], defender = sim.state.fighters[1];
    fighter.x = px(200); defender.x = px(235);
    fighter.state = 'attack'; fighter.moveId = move.id; fighter.stateFrame = 41; fighter.facing = 1;
    sim.step({ p1: 0, p2: 0 });
    const hit = sim.hits.find(event => event.attacker === 0 && event.kind === 'hit')!;
    expect(hit).toBeDefined();
    expect(sanjiHakiContact(hit, fighter)).toBe(true);
    expect(sanjiHakiContact({ ...hit, kind: 'block' }, fighter)).toBe(false);
    expect(sanjiHakiContact({ ...hit, projectile: true }, fighter)).toBe(false);
    fighter.stateFrame = 13;
    expect(sanjiHakiContact(hit, fighter)).toBe(false);
    fighter.stateFrame = 42;
    const { scene, calls } = drawing();
    const effects = new SkillEffects(scene), screen = (value: number) => value / SUBPIXEL;
    effects.contact({ ...hit, kind: 'block' } as HitEvent, sim.state);
    effects.finish(screen, screen);
    expect(calls.some(call => call.method === 'strokeCircle')).toBe(false);
    effects.contact(hit, sim.state);
    effects.finish(screen, screen);
    expect(calls.find(call => call.method === 'strokeCircle')?.args.slice(0, 2)).toEqual([screen(hit.x), screen(hit.y)]);
    for (let i = 0; i < 12; i++) effects.tick();
    const count = calls.filter(call => call.method === 'strokeCircle').length;
    effects.begin(); effects.finish(screen, screen);
    expect(calls.filter(call => call.method === 'strokeCircle')).toHaveLength(count);
    effects.contact(hit, sim.state); effects.clear(); effects.finish(screen, screen);
    expect(calls.filter(call => call.method === 'strokeCircle')).toHaveLength(count);
  });
});
