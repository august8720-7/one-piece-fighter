import { describe, expect, it } from 'vitest';
import { Btn, FightSim, SUBPIXEL } from '../../src/core';
import { luffyDef, akainuDef } from '../../src/characters';
import { gear5Status } from '../../src/render/hud/gear5Status';
import { Gear5PracticeSession } from '../../src/render/ui/gear5Practice';

function make(enabled = true) {
  return new FightSim({ p1: luffyDef, p2: akainuDef, introFrames: 0, roundTime: -1,
    controlModes: ['simple', 'classic'], gear5Enabled: [enabled, false] });
}
describe('Gear5 visible state and optional walkthrough', () => {
  it('explains real request failure and current lifecycle, independent of UI clocks', () => {
    const sim = make();
    expect(gear5Status(sim, 0, 'H')?.text).toContain('觉醒[H]');
    expect(gear5Status(sim, 0, 'H')?.text).toContain('需要3格气');
    expect(gear5Status(sim, 1, 'PageUp')).toBeNull();
    sim.step({ p1: Btn.Awakening, p2: 0 });
    expect(gear5Status(sim, 0, 'H')?.text).toContain('需要3格气');
    sim.state.fighters[0].meter = 300;
    sim.step({ p1: 0, p2: 0 }); sim.step({ p1: Btn.Awakening, p2: 0 });
    expect(gear5Status(sim, 0, 'H')?.text).toContain('可被打断');
    for (let i = 0; i < 24; i++) sim.step({ p1: 0, p2: 0 });
    expect(gear5Status(sim, 0, 'H')?.text).toContain('12.0秒');
    for (let i = 0; i < 720; i++) sim.step({ p1: 0, p2: 0 });
    expect(gear5Status(sim, 0, 'H')?.text).toContain('五档疲劳 3.0秒');
    for (let i = 0; i < 180; i++) sim.step({ p1: 0, p2: 0 });
    expect(gear5Status(sim, 0, 'H')?.text).not.toContain('疲劳');
  });
  it('never starts or replenishes a walkthrough through a disabled form gate', () => {
    const sim = make(false), session = new Gear5PracticeSession();
    const before = JSON.stringify(sim.state);
    session.reset(sim);
    expect(JSON.stringify(sim.state)).toBe(before);
    expect(gear5Status(sim, 0, 'T')?.text).toContain('此模式未开放');
  });
  it('requires actual form, all three real hits, expiry, and full fatigue recovery', () => {
    const sim = make(), session = new Gear5PracticeSession(); session.reset(sim);
    const tick = (bits = 0) => { sim.step({ p1: bits, p2: 0 }); session.observe(sim); };
    tick(Btn.Skill1);
    for (let i = 0; i < 90; i++) tick();
    expect(session.stage).toBe('awaken');
    expect(session.hitMoves.size).toBe(0);
    session.reset(sim); tick(Btn.Awakening);
    for (let i = 0; i < 36; i++) tick();
    expect(session.stage).toBe('moves');
    for (const button of [Btn.Skill1, Btn.Skill2, Btn.Skill3]) {
      for (let i = 0; i < 160; i++) {
        const [player, opponent] = sim.state.fighters;
        if (!player.airborne && !opponent.airborne && Math.abs(player.x - opponent.x) < 85 * SUBPIXEL) break;
        tick(player.x < opponent.x ? Btn.Right : Btn.Left);
      }
      tick(); tick(button);
      for (let i = 0; i < 100; i++) tick();
    }
    expect(session.hitMoves.size).toBe(3);
    expect(session.stage).toBe('expiry');
    for (let i = 0; i < 900 && session.stage !== 'complete'; i++) tick();
    expect(session.stage).toBe('complete');
    expect(sim.state.fighters[0].form).toBeNull();
    expect(sim.state.fighters[0].fatigueFrames).toBe(0);
  });
  it('does not count presses/whiffs as tutorial success and permits explicit retry', () => {
    const sim = make(), session = new Gear5PracticeSession(); session.reset(sim);
    sim.step({ p1: Btn.Awakening, p2: 0 });
    for (let i = 0; i < 1000; i++) { sim.step({ p1: 0, p2: 0 }); session.observe(sim); }
    expect(session.stage).toBe('retry');
    expect(session.hitMoves.size).toBe(0);
    session.reset(sim);
    expect(session.stage).toBe('awaken');
    expect(sim.state.fighters[0].meter).toBe(300);
    expect(sim.training.infiniteMeter).toBe(false);
  });
});
