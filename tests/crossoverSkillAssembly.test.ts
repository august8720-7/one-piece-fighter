import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim, totalFrames } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage, validateSampleCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
const additions = {
  labubu: ['sp_prank_flurry', 'sp_flip_upper', 'sp_low_slide', 'sp_mischief_drive'],
  twinkle: ['sp_starlight_push', 'sp_upward_spark', 'sp_falling_star', 'sp_blink_dodge', 'sp_star_rain', 'sp_shining_wave'],
};

describe('crossover skill original-pose assembly', () => {
  it('aligns real forward hits and projectile emission while keeping utility effects and full coverage separate', async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import json,sys,hashlib
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST)
rows={}
for char in ['labubu','twinkle']:
 config=resolved['characters'][char];sources=builder.atlas.load_sources(config['sources'])
 runtime=json.loads(builder.atlas.build_character(char,config,'skill-phase-regression')[0]['runtime.json'])
 sourcesProof={}
 for alias in (['flurry_upper','slide_drive'] if char=='labubu' else ['push_up','dodge_rain']):
  source=sources[alias];w=round(source.width/3);h=round(source.height/3)
  box=source.crop((0,0,w,h)).getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
  expected=(709 if char=='labubu' else 610)/(box[3]-box[1])
  sourcesProof[alias]={'expected':expected,'actual':config['sources'][alias]['unitScale']}
 casts={}
 for name,f in config['frames'].items():
  if 'projectile_origin' not in f.get('sockets',{}):continue
  x,y,_,_=f['crop'];px,py=f['sockets']['projectile_origin']
  casts[name]=sources[f['source']].getpixel((x+px,y+py))[3]
 rows[char]={'runtime':runtime,'authorAnimations':config['anims'],'frames':config['frames'],'sourceScale':sourcesProof,'castAlpha':casts}
print(json.dumps(rows))
`]);
    const rows = JSON.parse(result.stdout) as Record<string, {
      runtime: AnimeRuntimeManifest;
      authorAnimations: Record<string, { frames: string[] }>;
      frames: Record<string, { root: number[]; sockets: Record<string, number[]> }>;
      sourceScale: Record<string, { actual: number; expected: number }>;
      castAlpha: Record<string, number>;
    }>;
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef });
    for (const [side, def] of [labubuDef, twinkleDef].entries()) {
      const row = rows[def.id]!;
      expect(validateAnimeRuntimeManifest(row.runtime, def.moves)).toEqual([]);
      for (const scale of Object.values(row.sourceScale)) expect(scale.actual).toBe(scale.expected);
      const fighter = sim.state.fighters[side]!;
      for (const moveId of additions[def.id as keyof typeof additions]) {
        const move = def.moves.find(candidate => candidate.id === moveId)!;
        const animation = row.runtime.anims[moveId]!;
        expect(animation.exposures!.reduce((sum, phase) => sum + phase.ticks, 0)).toBe(totalFrames(move));
        fighter.state = 'attack';
        fighter.moveId = moveId;
        for (const facing of [1, -1] as const) {
          fighter.facing = facing;
          for (let tick = 0; tick < totalFrames(move); tick++) {
            fighter.stateFrame = tick;
            const visual = currentAnimation(sim, fighter, row.runtime.anims);
            const frameId = row.authorAnimations[moveId]!.frames[visual.index]!;
            const frame = row.frames[frameId]!;
            expect(visual.anim).toBe(moveId);
            if (sim.currentFrame(fighter)?.hitboxes?.length && def.id === 'labubu') {
              expect(frameId).not.toBe('flurry_backturn');
              expect(frame.sockets.contact![0]! - frame.root[0]!).toBeGreaterThan(0);
            }
          }
        }
      }
      expect(validateFullCoverage(def, row.runtime, twinkleDef).ok).toBe(true);
    }
    const flurry = rows.labubu!.authorAnimations.sp_prank_flurry!.frames;
    expect(flurry[4]).toBe('flurry_backturn');
    expect(flurry[1]).toBe('flurry_high');
    expect(flurry[5]).toBe(flurry[1]);
    const emissionFrames: Record<string, string[]> = {
      sp_upward_spark: ['upward_release'], sp_falling_star: ['falling_release'],
      sp_star_rain: ['rain_release', 'rain_conduct', 'rain_release', 'rain_conduct'],
      sp_shining_wave: ['wave_release'],
    };
    const twinkle = sim.state.fighters[1];
    for (const [id, expected] of Object.entries(emissionFrames)) {
      const move = twinkleDef.moves.find(candidate => candidate.id === id)!;
      twinkle.state = 'attack'; twinkle.moveId = id;
      expect(move.projectiles).toHaveLength(expected.length);
      for (const [index, projectile] of move.projectiles!.entries()) {
        twinkle.stateFrame = projectile.frame;
        const pose = rows.twinkle!.authorAnimations[id]!.frames[currentAnimation(sim, twinkle, rows.twinkle!.runtime.anims).index]!;
        expect(pose).toBe(expected[index]);
        expect(rows.twinkle!.castAlpha[pose]).toBeGreaterThanOrEqual(64);
      }
    }
    for (const [side, id, boundary, before, after] of [
      [0, 'sp_mischief_drive', 16, 'drive_release', 'drive_recover'],
      [1, 'sp_blink_dodge', 18, 'dodge_twist', 'dodge_recover'],
    ] as const) {
      const fighter = sim.state.fighters[side], row = rows[fighter.def.id]!;
      fighter.state = 'attack'; fighter.moveId = id;
      fighter.stateFrame = boundary - 1;
      expect(row.authorAnimations[id]!.frames[currentAnimation(sim, fighter, row.runtime.anims).index]).toBe(before);
      fighter.stateFrame = boundary;
      expect(row.authorAnimations[id]!.frames[currentAnimation(sim, fighter, row.runtime.anims).index]).toBe(after);
    }
    const labubu = createSampleFighter(labubuDef, rows.labubu!.runtime, { opponentRuntime: rows.twinkle!.runtime });
    const other = createSampleFighter(twinkleDef, rows.twinkle!.runtime, { opponentRuntime: rows.labubu!.runtime });
    expect(validateSampleCoverage(labubu, rows.labubu!.runtime, other).ok).toBe(true);
    expect(validateSampleCoverage(other, rows.twinkle!.runtime, labubu).ok).toBe(true);
    expect(labubu.moves.some(move => move.id === 'throw_fwd')).toBe(true);
    expect(other.moves.some(move => move.id === 'throw_fwd')).toBe(true);
  }, 20000);
});
