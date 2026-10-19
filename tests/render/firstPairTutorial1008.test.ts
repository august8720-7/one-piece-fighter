import { describe, expect, it } from 'vitest';
import { Btn, FightSim, px } from '../../src/core';
import { Dummy } from '../../src/ai/dummy';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import { luffyDef } from '../../src/characters/luffy/def';
import { defaultKeyConfig } from '../../src/input/keymap';
import { TutorialProgress, tutorialInstruction, tutorialSpecial, tutorialStepDone } from '../../src/render/ui/tutorialSteps';

describe('first-pair tutorial uses each real Skill1', () => {
  for (const fighter of [aokijiDef, shanksDef]) {
    it(`${fighter.id}: mirrored classic and remapped simple instructions require real projectile contact`, () => {
      const move = fighter.moves.find(candidate => candidate.id === fighter.skillSlots![0])!;
      expect(tutorialSpecial(fighter.id)).toEqual({ moveId: move.id, name: move.name });
      const keys = defaultKeyConfig();
      keys.p1.A = 'KeyX'; keys.p1.Skill1 = 'KeyT';
      for (const facing of [1, -1] as const) for (const mode of ['classic', 'simple'] as const) {
        const instruction = tutorialInstruction('special', fighter.id, keys, facing, mode);
        expect(instruction).toContain(move.name);
        expect(instruction).toContain(mode === 'simple' ? '按 T ' : facing === 1 ? 'S → S+D → D+X' : 'S → S+A → A+X');
        const sim = new FightSim({ p1: fighter, p2: luffyDef, introFrames: 0, roundTime: -1, controlModes: [mode, 'classic'] });
        // Mirror only the starting fixture, then use real inputs/hit events.
        sim.state.fighters[0].x = px(-90 * facing); sim.state.fighters[1].x = px(90 * facing);
        sim.state.fighters[0].facing = facing; sim.state.fighters[1].facing = facing === 1 ? -1 : 1;
        const context = () => ({ p1Bits: 0, p1State: sim.state.fighters[0].state,
          p1MoveId: sim.state.fighters[0].moveId, p1CharId: fighter.id,
          p2ComboHits: sim.state.fighters[1].comboHits, events: sim.hits });
        const forward = facing === 1 ? Btn.Right : Btn.Left;
        if (mode === 'classic') {
          sim.step({ p1: Btn.Down, p2: 0 }); sim.step({ p1: Btn.Down | forward, p2: 0 });
          sim.step({ p1: forward | Btn.A, p2: 0 });
        } else sim.step({ p1: Btn.Skill1, p2: 0 });
        expect(sim.state.fighters[0].moveId).toBe(move.id);
        expect(tutorialStepDone('special', context())).toBe(false);
        let completed = false;
        for (let frame = 0; frame < 100 && !completed; frame++) {
          sim.step({ p1: 0, p2: 0 }); completed = tutorialStepDone('special', context());
        }
        expect(completed).toBe(true);
        expect(sim.hits.some(event => event.kind === 'hit' && event.moveId === move.id && event.projectile)).toBe(true);
        expect(tutorialStepDone('special', { ...context(), events: sim.hits.map(event => ({ ...event, kind: 'block' as const })) })).toBe(false);
      }
    });

    it(`${fighter.id}: all six steps finish with actual input and collision`, () => {
      const sim = new FightSim({ p1: fighter, p2: luffyDef, introFrames: 0, roundTime: -1 });
      sim.training = { infiniteHp: true, infiniteMeter: true };
      const progress = new TutorialProgress(), dummy = new Dummy();
      const tick = (p1Bits: number, p2Bits = 0) => {
        sim.step({ p1: p1Bits, p2: p2Bits });
        const me = sim.state.fighters[0];
        progress.tick({ p1Bits, p1State: me.state, p1MoveId: me.moveId, p1CharId: fighter.id,
          p2ComboHits: sim.state.fighters[1].comboHits, events: sim.hits });
      };
      const close = () => {
        sim.resetPositions();
        sim.state.fighters[0].x = px(-15); sim.state.fighters[1].x = px(15);
      };
      for (let frame = 0; frame < 24; frame++) tick(Btn.Right);
      expect(progress.stepId).toBe('light');
      close(); tick(Btn.A); for (let frame = 0; frame < 45; frame++) tick(0);
      expect(progress.stepId).toBe('heavy');
      close(); tick(Btn.C); for (let frame = 0; frame < 60; frame++) tick(0);
      expect(progress.stepId).toBe('block');
      sim.resetPositions(); dummy.mode = 'attack';
      for (let frame = 0; frame < 1500 && progress.stepId === 'block'; frame++) tick(Btn.Left, dummy.input(sim, 1)!);
      expect(progress.stepId).toBe('special');
      // Keep starting separation so the projectile does not spawn past the target.
      sim.resetPositions(); tick(Btn.Down); tick(Btn.Down | Btn.Right); tick(Btn.Right | Btn.A);
      for (let frame = 0; frame < 100 && progress.stepId === 'special'; frame++) tick(0);
      expect(progress.stepId).toBe('combo');
      close(); tick(Btn.A);
      for (let frame = 0; frame < 20 && !sim.state.fighters[0].hasHit; frame++) tick(0);
      expect(sim.state.fighters[0].hasHit).toBe(true);
      tick(Btn.C); for (let frame = 0; frame < 45; frame++) tick(0);
      expect(progress.stepId).toBeNull();
    });
  }
});
