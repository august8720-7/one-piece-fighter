import { describe, expect, it } from 'vitest';
import { Btn, FightSim } from '../../src/core';
import { akainuDef, characterAnims, luffyDef, moveFrameCounts } from '../../src/characters';
import { DEFAULT_ANIMS, currentAnimation, frameName, requiredFrames } from '../../src/render/animations';

const mk = () => new FightSim({ p1: luffyDef, p2: akainuDef, seed: 1, introFrames: 0 });
const run = (sim: FightSim, p1: number, p2: number, frames: number) => {
  for (let i = 0; i < frames; i++) sim.step({ p1, p2 });
};

describe('animations', () => {
  it('idle 按 fps 循环取帧', () => {
    const sim = mk();
    const f = sim.state.fighters[0];
    const table = characterAnims['luffy']!;
    // luffy idle 4 帧 8fps → 每帧持续 7~8 逻辑帧
    run(sim, 0, 0, 1);
    expect(currentAnimation(sim, f, table)).toEqual({ anim: 'idle', index: 0 });
    run(sim, 0, 0, 8);
    expect(currentAnimation(sim, f, table).index).toBe(1);
    run(sim, 0, 0, 8 * 3);
    expect(currentAnimation(sim, f, table).index).toBe(0); // 循环回到 0
  });

  it('招式用 FrameData.sprite 作为帧号', () => {
    const sim = mk();
    sim.step({ p1: Btn.C, p2: 0 }); // st_c: startup 9 (sprite 0) / active 4 (sprite 1) / recovery (sprite 2)
    const f = sim.state.fighters[0];
    expect(currentAnimation(sim, f, {})).toEqual({ anim: 'st_c', index: 0 });
    run(sim, 0, 0, 9);
    expect(currentAnimation(sim, f, {}).index).toBe(1);
    run(sim, 0, 0, 4);
    expect(currentAnimation(sim, f, {}).index).toBe(2);
  });

  it('非循环动画停在最后一帧', () => {
    const sim = mk();
    run(sim, Btn.Up, 0, 4); // prejump 3 → jump_neutral（2 帧 6fps，不循环）
    run(sim, 0, 0, 30);
    const f = sim.state.fighters[0];
    expect(f.state).toBe('jump_neutral');
    expect(currentAnimation(sim, f, {}).index).toBe(1);
  });

  it('requiredFrames 覆盖所有状态与所有招式的每一帧', () => {
    const names = requiredFrames('luffy', characterAnims['luffy']!, moveFrameCounts(luffyDef));
    const set = new Set(names);
    for (const state of Object.keys(DEFAULT_ANIMS)) expect(set.has(frameName('luffy', state, 0))).toBe(true);
    for (const m of luffyDef.moves) {
      const maxSprite = Math.max(...m.frames.map((fr) => fr.sprite));
      expect(set.has(frameName('luffy', m.id, maxSprite))).toBe(true);
    }
    expect(names.length).toBe(set.size); // 无重复
  });
});
