import { describe, expect, it } from 'vitest';
import { FightSim } from '../../src/core/FightSim';
import { luffyDef, akainuDef } from '../../src/characters';
import { defaultKeyConfig } from '../../src/input/keymap';
import { moveCommand, moveListDefinition } from '../../src/render/ui/moveListData';

describe('form-aware move list', () => {
  it('shows the current five-gear commands and actual rebound keys without mutating the base roster', () => {
    const sim = new FightSim({ p1: luffyDef, p2: akainuDef });
    const fighter = sim.state.fighters[0];
    expect(moveListDefinition(fighter, sim.effectiveMoves(fighter))).toBe(luffyDef);
    fighter.form = 'gear5';
    const list = moveListDefinition(fighter, sim.effectiveMoves(fighter));
    expect(list.name).toContain('五档');
    expect(list.moves.some(move => move.id === 'sp_gear2')).toBe(false);
    expect(list.moves.some(move => move.id === 'sp_gatling')).toBe(false);
    const keys = defaultKeyConfig(['simple', 'simple']).p1;
    keys.Skill1 = 'KeyH';
    const rush = list.moves.find(move => move.id === 'g5_elastic_rush')!;
    expect(moveCommand(rush, keys, true, 'simple', list.skillSlots)).toMatch(/^H · 一键/);
    expect(luffyDef.skillSlots?.[0]).toBe('sp_gatling');
    expect(luffyDef.moves.some(move => move.id === 'sp_gear2')).toBe(true);
    fighter.form = null;
    expect(moveListDefinition(fighter, sim.effectiveMoves(fighter))).toBe(luffyDef);
  });
});
