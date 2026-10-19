import { describe, expect, it } from 'vitest';
import { Btn, attack } from '../../src/core';
import { moveBodyVisual, type MovePresentation } from '../../src/render/fx/movePresentation';

const move = attack({ id: 'cuts', name: 'cuts', stance: 'stand', button: Btn.A,
  segments: [{ startup: 11, active: 3, hitbox: [0, -40, 30, 20] },
    { startup: 4, active: 3, hitbox: [0, -40, 30, 20] }], recovery: 20, damage: 60 });
const active: MovePresentation = { body: 'cut', impact: 'impact', bodyClock: 'active',
  segmentBodies: ['horizontal', 'diagonal'] };

describe('actual move body FX clock', () => {
  it('keeps legacy move-time contracts unchanged', () => {
    expect(moveBodyVisual({ state: 'attack', stateFrame: 11 }, move, { body: 'cut', impact: 'hit' }))
      .toEqual({ reference: 'cut', age: 11 });
  });
  it('shows the first real FX frame on contact startup', () => {
    expect(moveBodyVisual({ state: 'attack', stateFrame: 11 }, move, active))
      .toEqual({ reference: 'horizontal', age: 0 });
    expect(moveBodyVisual({ state: 'attack', stateFrame: 13 }, move, active))
      .toEqual({ reference: 'horizontal', age: 2 });
  });
  it('resets on the next actual hit segment with its separate source clip', () => {
    expect(moveBodyVisual({ state: 'attack', stateFrame: 18 }, move, active))
      .toEqual({ reference: 'diagonal', age: 0 });
    expect(moveBodyVisual({ state: 'attack', stateFrame: 20 }, move, active))
      .toEqual({ reference: 'diagonal', age: 2 });
  });
  it('retains move-time for recovery and nonattack states', () => {
    expect(moveBodyVisual({ state: 'attack', stateFrame: 21 }, move, active))
      .toEqual({ reference: 'cut', age: 21 });
    expect(moveBodyVisual({ state: 'idle', stateFrame: 0 }, move, active))
      .toEqual({ reference: 'cut', age: 0 });
  });
  it('uses the declared base clip if an active segment has no override', () => {
    expect(moveBodyVisual({ state: 'attack', stateFrame: 18 }, move, { ...active, segmentBodies: ['horizontal'] }))
      .toEqual({ reference: 'cut', age: 0 });
  });
});
