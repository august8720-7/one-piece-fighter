import { describe, expect, it } from 'vitest';
import { luffyDef } from '../../src/characters/luffy/def';
import { defaultKeyConfig } from '../../src/input/keymap';
import { ROLE_PLAYSTYLES, roleChoiceCommand, roleChoiceLines } from '../../src/render/ui/rolePlaystyles';
import { ROLE_PRACTICES, practicesFor } from '../../src/render/ui/rolePractice';

describe('six shared role cards', () => {
  it('each role shares its three existing choices with the practice contracts', () => {
    expect(ROLE_PRACTICES).toHaveLength(18);
    for (const [id, role] of Object.entries(ROLE_PLAYSTYLES)) {
      expect(practicesFor(id).map(practice => practice.moveId)).toEqual(role.choices.map(choice => choice.moveId));
      expect(role.win.length).toBeGreaterThan(0); expect(role.weakness.length).toBeGreaterThan(0);
    }
  });
  it('shows remapped normal and skill keys rather than assuming Q/E/R', () => {
    const keys = defaultKeyConfig(['simple', 'simple']).p1;
    keys.C = 'KeyY'; keys.Skill4 = 'KeyP'; keys.Skill5 = '';
    const lines = roleChoiceLines(luffyDef, keys, 'simple', 1);
    expect(lines[0]).toContain('Y'); expect(lines[1]).toContain('P'); expect(lines[2]).toContain('未绑定');
  });
  it('classic commands mirror with facing and still use actual attack bindings', () => {
    const keys = defaultKeyConfig().p1; keys.B = 'KeyH';
    expect(roleChoiceCommand(luffyDef, 'sp_rocket', keys, 'classic', 1)).toContain('↓↘→');
    expect(roleChoiceCommand(luffyDef, 'sp_rocket', keys, 'classic', -1)).toContain('↓↙←');
    expect(roleChoiceCommand(luffyDef, 'sp_rocket', keys, 'classic', -1)).toContain('H');
  });
});
