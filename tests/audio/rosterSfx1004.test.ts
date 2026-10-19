import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import contract from '../../src/audio/rosterSfx1004.json';
import samples from '../../src/audio/sampleManifest.json';
import { rosterReleaseEventCues, verifyRosterReleaseAudio } from '../../src/audio/rosterSfx1004';
import { withAvailableRosterAudio } from '../../src/characters/rosterAvailability1004';
import { aokijiDef } from '../../src/characters/aokiji/def';
import { shanksDef } from '../../src/characters/shanks/def';
import type { CueCatalog, FightAudioEvent } from '../../src/audio/audioTypes';

describe('reviewed first-pair release audio', () => {
  it('binds all real skill slots to adopted files and their actual projectile route', () => {
    const profiles = contract.moves as Record<string, Record<string, { cueId: string; projectile: boolean }>>;
    const catalog = samples.cues as CueCatalog;
    for (const def of [aokijiDef, shanksDef]) {
      expect(Object.keys(profiles[def.id]!).sort()).toEqual([...def.skillSlots!].sort());
      for (const moveId of def.skillSlots!) {
        const profile = profiles[def.id]![moveId]!;
        expect(profile.projectile).toBe(!!def.moves.find(move => move.id === moveId)!.projectiles?.length);
        const cue = catalog[profile.cueId]!;
        expect(cue.characterId).toBe(def.id);
        expect(cue.files[0]).toMatch(new RegExp(`^assets/audio/sfx/roster-adopted1004/${def.id}/`));
        expect(Object.hasOwn(contract.fileChecks, cue.files[0]!)).toBe(true);
      }
    }
    expect(contract.adoptedStages).toEqual(['release']);
    expect(Object.keys(contract.fileChecks)).toHaveLength(13);
    expect(catalog['sfx.aokiji.ice_uplift.release']?.files).toEqual(catalog['sfx.aokiji.ice_blade.release']?.files);
    expect(catalog['sfx.aokiji.ice_mirror.release']?.files).toEqual(catalog['sfx.aokiji.ice_blade.release']?.files);
    expect(catalog['sfx.shanks.step_thrust.release']?.files).toEqual(catalog['sfx.shanks.low_cut.release']?.files);
    expect(catalog['sfx.shanks.sidestep.release']?.files).toEqual(catalog['sfx.shanks.low_cut.release']?.files);
  });

  it('checks exact local WAVs and managed source identities and rejects corrupt audio', async () => {
    for (const [file, record] of Object.entries(contract.fileChecks)) {
      const data = readFileSync(resolve('public', file));
      const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      await expect(verifyRosterReleaseAudio(file, bytes)).resolves.toBeUndefined();
      await expect(verifyRosterReleaseAudio(file, new Uint8Array([1, 2]).buffer)).rejects.toThrow('SHA256');
      await expect(verifyRosterReleaseAudio(file, new Uint8Array([1, 2]).buffer, record.sha256)).resolves.toBeUndefined();
      await expect(verifyRosterReleaseAudio(file, bytes, 'changed')).rejects.toThrow('SHA256');
    }
  });

  it('emits one release per real active segment, including an already adapted preview event', () => {
    const event: FightAudioEvent = { phase: 'swing', characterId: 'shanks', moveId: 'sp_step_thrust', player: 0 };
    const id = 'sfx.shanks.step_thrust.release';
    expect(rosterReleaseEventCues(event, [{ id: 'whoosh' }, { id }], () => true, ['shanks'])).toEqual([{ id, player: 0 }]);
    const base = [{ id: 'special' }];
    expect(rosterReleaseEventCues({ ...event, phase: 'start' }, base, () => true, ['shanks'])).toBe(base);
    expect(rosterReleaseEventCues({ ...event, phase: 'recover' }, base, () => true, ['shanks'])).toBe(base);
    expect(rosterReleaseEventCues(event, base, () => true, [])).toBe(base);
    expect(rosterReleaseEventCues(event, base, () => false, ['shanks'])).toBe(base);
  });

  it('uses the original reflected material on actual spawns without a caster swing duplicate', () => {
    const event: FightAudioEvent = { phase: 'projectile_spawn', characterId: 'luffy', materialCharacterId: 'aokiji',
      moveId: 'sp_ice_lance', player: 1 };
    expect(rosterReleaseEventCues(event, [{ id: 'whoosh' }], () => true, ['aokiji'])).toEqual([
      { id: 'sfx.aokiji.ice_lance.release', player: 1 },
    ]);
    expect(rosterReleaseEventCues({ ...event, phase: 'swing', characterId: 'aokiji' }, [{ id: 'whoosh' }], () => true, ['aokiji'])).toEqual([]);
    const base = [{ id: 'hit_heavy' }];
    expect(rosterReleaseEventCues({ ...event, phase: 'projectile_end', endReason: 'round_reset' }, base, () => true, ['aokiji'])).toBe(base);
  });

  it('keeps unselected new sound banks out of default and mirrored fights', () => {
    const catalog = samples.cues as CueCatalog;
    expect(withAvailableRosterAudio(catalog, [])['sfx.aokiji.ice_lance.release']).toBeUndefined();
    const active = withAvailableRosterAudio(catalog, ['aokiji']);
    expect(active['sfx.aokiji.ice_lance.release']).toBeDefined();
    expect(active['sfx.shanks.haki_slash.release']).toBeUndefined();
    expect(active.hit_heavy).toBe(catalog.hit_heavy);
  });

  it('plays a no-hitbox dodge on its actual start rather than waiting for an absent swing', () => {
    for (const def of [aokijiDef, shanksDef]) {
      const moveId = def.id === 'aokiji' ? 'sp_ice_body' : 'sp_sidestep';
      const move = def.moves.find(item => item.id === moveId)!;
      expect(move.frames.every(frame => !frame.hitboxes?.length)).toBe(true);
      const id = def.id === 'aokiji' ? 'sfx.aokiji.ice_body.release' : 'sfx.shanks.sidestep.release';
      const event: FightAudioEvent = { phase: 'start', player: 0, characterId: def.id, moveId };
      expect(rosterReleaseEventCues(event, [], () => true, [def.id])).toEqual([{ id, player: 0 }]);
      expect(rosterReleaseEventCues({ ...event, phase: 'swing' }, [{ id }], () => true, [def.id])).toEqual([]);
    }
  });
});
