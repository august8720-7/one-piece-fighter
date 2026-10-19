import type Phaser from 'phaser';
import { afterEach, expect, it, vi } from 'vitest';
import { FightSim, SKILL_BUTTONS, SUBPIXEL, totalFrames } from '../../src/core';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { RENDER_SCALE } from '../../src/render/screen';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

// Renderer lifecycle fixture only; these strings are not evidence of adopted pixels.
class ImageRecord {
  key = ''; frame = ''; visible = true; x = 0; y = 0; width = 0; height = 0;
  setTexture(key: string, frame: string) { this.key = key; this.frame = frame; return this; }
  setVisible(value: boolean) { this.visible = value; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setOrigin(_x: number, _y: number) { return this; }
  setDisplaySize(width: number, height: number) { this.width = width; this.height = height; return this; }
  setFlipX(_value: boolean) { return this; }
  setAlpha(_value: number) { return this; }
  setDepth(_value: number) { return this; }
  clearTint() { return this; }
  setTint(_value: number) { return this; }
}

it('uses actual mirror startup, reflection and recovery clocks and emits only one dissolve per instance', async () => {
  vi.stubEnv('DEV', true);
  vi.stubGlobal('window', { location: { search: '?rosterPreview=0929' } });
  vi.resetModules();
  const { SkillEffects } = await import('../../src/render/fx/SkillEffects');
  const images: ImageRecord[] = [];
  const scene = {
    registry: { get: () => undefined },
    textures: { exists: () => true, get: () => ({ has: () => true }) },
    add: { image: () => { const image = new ImageRecord(); images.push(image); return image; } },
  } as unknown as Phaser.Scene;
  const effects = new SkillEffects(scene);
  const sim = new FightSim({ p1: aokijiDef, p2: shanksDef, introFrames: 0, roundTime: -1,
    controlModes: ['simple', 'simple'] });
  const move = aokijiDef.moves.find(item => item.id === 'sp_ice_mirror')!;
  const recovery = totalFrames(move) - move.frames.at(-1)!.duration;
  const seen = new Set<string>();
  const draw = () => {
    const before = JSON.stringify(sim.state);
    effects.begin(); effects.fighters(sim, x => x / SUBPIXEL, y => y / SUBPIXEL);
    effects.finish(x => x / SUBPIXEL, y => y / SUBPIXEL);
    expect(JSON.stringify(sim.state)).toBe(before);
    return images.filter(image => image.visible);
  };
  sim.step({ p1: SKILL_BUTTONS[4]!, p2: 0 });
  expect(sim.state.fighters[0].moveId).toBe(move.id);
  while (sim.state.fighters[0].state === 'attack') {
    const fighter = sim.state.fighters[0];
    if (fighter.stateFrame >= recovery) {
      for (let repeatedDraw = 0; repeatedDraw < 5; repeatedDraw++) effects.recover(sim, 0);
    }
    const visible = draw();
    for (const image of visible) seen.add(image.frame);
    expect(visible).toHaveLength(1);
    if (fighter.stateFrame >= recovery) {
      expect(visible[0]!.frame).toBe('mirror_break');
      expect(visible[0]!.width).toBe(32 * RENDER_SCALE);
      expect(visible[0]!.height).toBe(90 * RENDER_SCALE);
      for (let repeatedDraw = 0; repeatedDraw < 5; repeatedDraw++) expect(draw()).toHaveLength(1);
    }
    effects.tick(); sim.step({ p1: 0, p2: 0 });
    // The real dissolve has a bounded lifetime; repeated recovery events cannot renew it.
    if (sim.state.fighters[0].stateFrame >= recovery + 12) break;
  }
  expect(seen).toEqual(new Set(['mirror_start', 'ice_mirror', 'mirror_break']));
  expect(draw()).toHaveLength(0);
  expect(sim.hits).toEqual([]);
  effects.clear();
  expect(draw()).toHaveLength(0);
});
