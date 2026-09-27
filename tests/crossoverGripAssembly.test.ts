import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim, SKILL_BUTTONS, px, SUBPIXEL } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { attachmentPoint, connectedHeldReaction, currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, sampleMoveIssues, validateFullCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
const neutral = { p1: 0, p2: 0 };

describe('actual LABUBU and dedicated Twinkle paired artwork', () => {
  it('keeps original pixels and aligns the real center hold from connection through frame23 for both players and facings', async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import json,sys
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST)
rows={}
for char in ['labubu','twinkle']:
 config=resolved['characters'][char];outputs,report=builder.atlas.build_character(char,config,'paired-art-center-regression')
 rows[char]={'runtime':json.loads(outputs['runtime.json'])}
 if char=='labubu':rows[char]['split']=report['transparency']['leg_flip_hold']['foreground'];rows[char]['source']=config['sources']['leg_grip_0926']
print(json.dumps(rows))
`]);
    const rows = JSON.parse(result.stdout) as {
      labubu: { runtime: AnimeRuntimeManifest; split: { preparedRgbaSha256: string; recombinedRgbaSha256: string }; source: { adoptionStatus: string; permittedSampleVictims: string[] } };
      twinkle: { runtime: AnimeRuntimeManifest };
    };
    const actorRuntime = rows.labubu.runtime, victimRuntime = rows.twinkle.runtime;
    expect(rows.labubu.source.adoptionStatus).toBe('paired_sample_candidate');
    expect(rows.labubu.source.permittedSampleVictims).toEqual(['luffy', 'akainu', 'labubu', 'twinkle']);
    expect(rows.labubu.split.preparedRgbaSha256).toBe(rows.labubu.split.recombinedRgbaSha256);
    expect(validateAnimeRuntimeManifest(actorRuntime, labubuDef.moves)).toEqual([]);
    expect(validateAnimeRuntimeManifest(victimRuntime, twinkleDef.moves)).toEqual([]);
    expect(actorRuntime.anims.sp_leg_flip!.exposures?.map(phase => phase.ticks)).toEqual([12, 4, 28]);
    expect(actorRuntime.anims.sp_leg_flip!.throwExposures).toEqual([{ frame: 1, ticks: 24 }, { frame: 2, ticks: 22 }]);
    expect(actorRuntime.foregroundFrames?.['labubu/sp_leg_flip/1']).toBe('labubu/sp_leg_flip/1/foreground');
    const actorDef = createSampleFighter(labubuDef, actorRuntime, { opponentRuntime: victimRuntime });
    const victimDef = createSampleFighter(twinkleDef, victimRuntime, { opponentRuntime: actorRuntime });
    const legFlip = labubuDef.moves.find(move => move.id === 'sp_leg_flip')!;
    expect(actorDef.moves.find(move => move.id === legFlip.id)).toBe(legFlip);
    for (const other of ['labubu', 'luffy', 'akainu']) {
      const runtime = other === 'labubu' ? actorRuntime : JSON.parse(await readFile(resolve(`public/assets/characters/${other}/anime/runtime.json`), 'utf8')) as AnimeRuntimeManifest;
      expect(sampleMoveIssues(legFlip, actorRuntime, runtime)).toEqual([]);
      const incomplete = structuredClone(runtime);
      delete incomplete.anims.held_leg_flip;
      expect(sampleMoveIssues(legFlip, actorRuntime, incomplete).length).toBeGreaterThan(0);
    }
    for (const player of [0, 1] as const) for (const facing of [1, -1] as const) {
      const sim = new FightSim({ p1: player === 0 ? actorDef : victimDef, p2: player === 0 ? victimDef : actorDef,
        introFrames: 0, roundTime: -1, controlModes: ['simple', 'simple'] });
      const actor = sim.state.fighters[player], victim = sim.state.fighters[player === 0 ? 1 : 0];
      actor.x = px(-30) * facing;
      victim.x = actor.x + px(38) * facing;
      actor.facing = facing; victim.facing = facing === 1 ? -1 : 1;
      sim.step(player === 0 ? { p1: SKILL_BUTTONS[4]!, p2: 0 } : { p1: 0, p2: SKILL_BUTTONS[4]! });
      for (let tick = 0; tick < 40 && actor.state !== 'throw'; tick++) sim.step(neutral);
      expect(actor.state).toBe('throw');
      const held: number[] = [];
      while (victim.state === 'thrown') {
        held.push(actor.stateFrame);
        expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: 'sp_leg_flip', index: 1 });
        expect(connectedHeldReaction(sim, victim)).toEqual({ anim: 'held_leg_flip', index: 0 });
        expect(victim.x - actor.x).toBe(px(30) * facing);
        const point = (runtime: AnimeRuntimeManifest, name: string, socket: string, fighter: typeof actor) => attachmentPoint(runtime.attachments[name]!, socket, {
          x: fighter.x / SUBPIXEL, y: fighter.y / SUBPIXEL, facing: fighter.facing,
          scaleX: 1 / (2 * runtime.textureDensity!), scaleY: 1 / (2 * runtime.textureDensity!),
        })!;
        const hand = point(actorRuntime, 'labubu/sp_leg_flip/1', 'grip_gap', actor);
        const ankle = point(victimRuntime, 'twinkle/held_leg_flip/0', 'grip', victim);
        expect(hand.x).toBeCloseTo(ankle.x, 8);
        expect(hand.y).toBeCloseTo(ankle.y, 8);
        sim.step(neutral);
      }
      expect(held).toEqual(Array.from({ length: 24 }, (_, i) => i));
      expect(actor.stateFrame).toBe(24);
      expect(victim.state).toBe('hit_air');
      expect(connectedHeldReaction(sim, victim)).toBeNull();
      expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: 'sp_leg_flip', index: 2 });
      expect(actorRuntime.foregroundFrames?.['labubu/sp_leg_flip/2']).toBeUndefined();
      while (actor.state === 'throw') sim.step(neutral);
      expect(connectedHeldReaction(sim, victim)).toBeNull();
    }
    expect(validateFullCoverage(labubuDef, actorRuntime, twinkleDef).ok).toBe(true);
    expect(validateFullCoverage(twinkleDef, victimRuntime, labubuDef).ok).toBe(true);
  }, 20000);
});
