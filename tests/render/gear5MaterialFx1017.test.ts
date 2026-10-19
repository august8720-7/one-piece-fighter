import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { FightSim, SUBPIXEL } from '../../src/core';
import { luffyDef, akainuDef } from '../../src/characters';
import { SkillEffects } from '../../src/render/fx/SkillEffects';
import { gear5MaterialFor } from '../../src/render/fx/gear5MaterialFx1017';

vi.mock('phaser', () => ({ default: {} }));

describe('Gear5 material-only presentation', () => {
  it('selects no extra limb material for the base form, inactive clock, or other moves', () => {
    expect(gear5MaterialFor('luffy', null, 'ult_red_hawk', 'attack', true)).toBeNull();
    expect(gear5MaterialFor('luffy', 'gear5', 'ult_red_hawk', 'attack', false)).toBeNull();
    expect(gear5MaterialFor('luffy', 'gear5', 'sp_balloon', 'attack', true)).toBeNull();
    expect(gear5MaterialFor('luffy', 'gear5', 'sp_storm', 'attack', true)).toBe('wind');
  });

  it('binds fire to the real mirrored socket, inverts camera framing once, and clears it', () => {
    const calls: { method: string; args: unknown[] }[] = [];
    const graphic = new Proxy({}, { get: (_target, property) => (...args: unknown[]) => {
      calls.push({ method: String(property), args }); return graphic;
    } });
    const images: unknown[] = [];
    const scene = { add: { graphics: () => graphic, image: (...args: unknown[]) => { images.push(args); return {}; } },
      textures: { exists: () => true, get: () => ({ has: () => true }) } } as unknown as Phaser.Scene;
    const layer = { x: 20, y: 30, scaleX: 2, scaleY: 2, add: () => undefined } as unknown as Phaser.GameObjects.Container;
    const effects = new SkillEffects(scene, layer);
    const sim = new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0, roundTime: -1 });
    const fighter = sim.state.fighters[0];
    fighter.form = 'gear5'; fighter.state = 'attack'; fighter.moveId = 'ult_red_hawk'; fighter.stateFrame = 16; fighter.facing = -1;
    const screen = (value: number) => value / SUBPIXEL;
    effects.begin();
    effects.fighters(sim, screen, screen, () => true, (_player, name) => name === 'palm'
      ? { x: 220, y: 130 } : name === 'wrist' ? { x: 240, y: 130 } : null);
    expect(images).toHaveLength(0); // The old fire atlas includes a second solid arm.
    expect(calls.some(call => call.method === 'fillCircle' && call.args[0] === 100 && call.args[1] === 50)).toBe(true);
    expect(calls.filter(call => call.method === 'fillTriangle')).toHaveLength(5);
    effects.begin();
    expect(calls.at(-2)?.method).toBe('clear');
    expect(calls.at(-1)).toEqual({ method: 'setVisible', args: [false] });
    fighter.form = null;
    const before = calls.length;
    effects.fighters(sim, screen, screen, () => true);
    expect(calls).toHaveLength(before);
    expect(images).toHaveLength(0);
  });
});
