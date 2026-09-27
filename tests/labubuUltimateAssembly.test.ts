import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim, totalFrames } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);

describe('LABUBU ultimate original-pose assembly', () => {
  it('retains five distinct hit poses and the original recovery duration with real brake and guard artwork', async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import json,sys,hashlib
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST);config=resolved['characters']['labubu'];source=builder.atlas.load_sources(config['sources'])['ultimate']
reference=source.crop((0,0,418,444)).getchannel('A').point(lambda a:255 if a>=64 else 0);bbox=reference.getbbox();height=bbox[3]-bbox[1]
poses={}
for name,f in config['frames'].items():
 if f['source']!='ultimate':continue
 image,_,_=builder.atlas.prepare_frame(source,f,1);x,y,w,h=f['crop'];px,py=f['sockets']['contact']
 poses[name]={'hash':hashlib.sha256(image.tobytes()).hexdigest(),'alpha':source.getpixel((x+px,y+py))[3],'sourcePixelsPreserved':image.tobytes()==source.crop((x,y,x+w,y+h)).tobytes()}
runtime=json.loads(builder.atlas.build_character('labubu',config,'labubu-ultimate-regression')[0]['runtime.json'])
other=json.loads(builder.atlas.build_character('twinkle',resolved['characters']['twinkle'],'labubu-ultimate-regression')[0]['runtime.json'])
print(json.dumps({'runtime':runtime,'other':other,'frames':config['anims']['ult_monster_mayhem']['frames'],'poses':poses,'height':height,'extraFeet':sum(reference.crop((0,418,418,444)).histogram()[1:]),'actualScale':config['sources']['ultimate']['unitScale'],'expectedScale':709/height}))
`]);
    const proof = JSON.parse(result.stdout) as {
      runtime: AnimeRuntimeManifest; other: AnimeRuntimeManifest; frames: string[];
      poses: Record<string, { hash: string; alpha: number; sourcePixelsPreserved: boolean }>;
      height: number; extraFeet: number; actualScale: number; expectedScale: number;
    };
    expect(proof.height).toBe(386);
    expect(proof.extraFeet).toBeGreaterThan(50);
    expect(proof.actualScale).toBe(proof.expectedScale);
    expect(Object.keys(proof.poses)).toHaveLength(8);
    expect(new Set(Object.values(proof.poses).map(pose => pose.hash)).size).toBe(8);
    expect(Object.values(proof.poses).every(pose => pose.alpha >= 64 && pose.sourcePixelsPreserved)).toBe(true);
    expect(validateAnimeRuntimeManifest(proof.runtime, labubuDef.moves)).toEqual([]);
    const move = labubuDef.moves.find(candidate => candidate.id === 'ult_monster_mayhem')!;
    const hits = ['mayhem_shoulder', 'mayhem_low_push', 'mayhem_upper', 'mayhem_kick', 'mayhem_finish'];
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef }), fighter = sim.state.fighters[0];
    fighter.state = 'attack'; fighter.moveId = move.id;
    for (const facing of [1, -1] as const) {
      fighter.facing = facing;
      let elapsed = 0, hit = 0;
      for (const phase of move.frames) {
        for (let tick = 0; tick < phase.duration; tick++) {
          fighter.stateFrame = elapsed + tick;
          const pose = proof.frames[currentAnimation(sim, fighter, proof.runtime.anims).index];
          if (phase.hitboxes?.length) expect(pose).toBe(hits[hit]);
          else if (elapsed >= 51) expect(pose).toBe(elapsed + tick < 65 ? 'mayhem_brake' : 'mayhem_recover');
        }
        if (phase.hitboxes?.length) hit++;
        elapsed += phase.duration;
      }
      expect(hit).toBe(5);
      expect(elapsed).toBe(94);
    }
    expect(proof.runtime.anims[move.id]!.exposures!.reduce((sum, exposure) => sum + exposure.ticks, 0)).toBe(totalFrames(move));
    const selected = createSampleFighter(labubuDef, proof.runtime, { opponentRuntime: proof.other });
    expect(selected.moves.find(candidate => candidate.id === move.id)).toBe(move);
    expect(selected.moves.some(candidate => candidate.id === 'sp_leg_flip')).toBe(true);
    expect(validateFullCoverage(labubuDef, proof.runtime, twinkleDef).ok).toBe(true);
  }, 20000);
});
