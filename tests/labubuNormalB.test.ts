import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage, validateSampleCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
const moves = ['cr_a', 'cr_b', 'cr_c', 'cr_d', 'j_a', 'j_b', 'j_c', 'j_d'];

describe('LABUBU crouching and aerial normal artwork', () => {
  it('preserves one scale, distinct contacts and logical timing while retaining only sample coverage', async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import hashlib,json,sys
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST)
config=resolved['characters']['labubu'];source=builder.atlas.load_sources(config['sources'])['normal_b']
bbox=source.crop((0,0,418,418)).getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
expectedScale=709/(bbox[3]-bbox[1]);factor=config['scale']*expectedScale*config['textureDensity']
rows=[]
for move in ${JSON.stringify(moves)}:
 animation=config['anims'][move];frameId=animation['frames'][1];f=config['frames'][frameId]
 art,geometry,_=builder.atlas.prepare_frame(source,f,factor)
 x,y,w,h=f['crop'];cx,cy=f['sockets']['contact']
 full,_,_=builder.atlas.prepare_frame(source,f,1)
 preserved=True
 if y==818: preserved=full.crop((0,18,418,436)).tobytes()==source.crop((x,836,x+418,1254)).tobytes()
 rows.append({'move':move,'source':f['source'],'hash':hashlib.sha256(full.tobytes()).hexdigest(),'alpha':source.getpixel((x+cx,y+cy))[3],'root':f['root'],'preparedRoot':geometry['root'],'originalCellPreserved':preserved,'phaseFrames':animation['frames']})
runtime=json.loads(builder.atlas.build_character('labubu',config,'labubu-normal-b-regression')[0]['runtime.json'])
opponent=json.loads(builder.atlas.build_character('twinkle',resolved['characters']['twinkle'],'labubu-normal-b-regression')[0]['runtime.json'])
print(json.dumps({'runtime':runtime,'opponent':opponent,'rows':rows,'factor':factor,'actualScale':config['sources']['normal_b']['unitScale'],'expectedScale':expectedScale}))
`]);
    const proof = JSON.parse(result.stdout) as {
      runtime: AnimeRuntimeManifest; opponent: AnimeRuntimeManifest; factor: number; actualScale: number; expectedScale: number;
      rows: Array<{ move: string; source: string; hash: string; alpha: number; root: number[]; preparedRoot: { x: number; y: number }; originalCellPreserved: boolean; phaseFrames: string[] }>;
    };
    expect(proof.actualScale).toBe(proof.expectedScale);
    expect(new Set(proof.rows.map(row => row.hash)).size).toBe(8);
    expect(validateAnimeRuntimeManifest(proof.runtime, labubuDef.moves)).toEqual([]);
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef });
    const fighter = sim.state.fighters[0];
    for (const row of proof.rows) {
      expect(row.source).toBe('normal_b');
      expect(row.alpha).toBeGreaterThanOrEqual(64);
      expect(row.originalCellPreserved).toBe(true);
      expect(row.preparedRoot.x).toBeCloseTo(row.root[0]! * proof.factor, 10);
      expect(row.preparedRoot.y).toBeCloseTo(row.root[1]! * proof.factor, 10);
      expect(new Set(row.phaseFrames).size).toBe(3);
      const move = labubuDef.moves.find(candidate => candidate.id === row.move)!;
      expect(proof.runtime.anims[move.id]!.exposures?.map(exposure => exposure.ticks)).toEqual(move.frames.map(frame => frame.duration));
      fighter.state = 'attack';
      fighter.moveId = move.id;
      for (const facing of [1, -1] as const) {
        fighter.facing = facing;
        let elapsed = 0;
        for (const [index, frame] of move.frames.entries()) {
          for (let tick = 0; tick < frame.duration; tick++) {
            fighter.stateFrame = elapsed + tick;
            expect(currentAnimation(sim, fighter, proof.runtime.anims)).toEqual({ anim: move.id, index });
            expect(Boolean(frame.hitboxes?.length)).toBe(index === 1);
          }
          elapsed += frame.duration;
        }
      }
    }
    const candidate = createSampleFighter(labubuDef, proof.runtime, { opponentRuntime: proof.opponent });
    const opponent = createSampleFighter(twinkleDef, proof.opponent, { opponentRuntime: proof.runtime });
    for (const id of moves) expect(candidate.moves.find(move => move.id === id)).toBe(labubuDef.moves.find(move => move.id === id));
    expect(validateSampleCoverage(candidate, proof.runtime, opponent).ok).toBe(true);
    expect(validateSampleCoverage(opponent, proof.opponent, candidate).ok).toBe(true);
    const complete = validateFullCoverage(labubuDef, proof.runtime, twinkleDef);
    expect(complete.ok).toBe(true);
    expect(complete.missingMoves).toEqual([]);
    expect(complete.missingStates).toEqual([]);
  }, 15000);
});
