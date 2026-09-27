import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage, validateSampleCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
const moveIds = ['cr_a', 'cr_b', 'cr_c', 'cr_d', 'j_a', 'j_b', 'j_c', 'j_d'];

describe('Twinkle crouching and aerial normal artwork', () => {
  it('keeps the eight independent contacts on one source scale and the original logical phase boundaries', async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import hashlib,json,sys
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
from PIL import Image
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST)
config=resolved['characters']['twinkle']
source=builder.atlas.load_sources(config['sources'])['normal_b']
reference=source.crop((0,0,418,418)).getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
expectedScale=610/(reference[3]-reference[1])
factor=config['scale']*expectedScale*config['textureDensity']
active=[]
for moveId in ${JSON.stringify(moveIds)}:
 animation=config['anims'][moveId]
 frameId=animation['frames'][1]
 frame=config['frames'][frameId]
 prepared,geometry,_=builder.atlas.prepare_frame(source,frame,factor)
 x,y,w,h=frame['crop']
 cx,cy=frame['sockets']['contact']
 active.append({'moveId':moveId,'frameId':frameId,'source':frame['source'],'cropHash':hashlib.sha256(source.crop((x,y,x+w,y+h)).tobytes()).hexdigest(),'contactAlpha':source.getpixel((x+cx,y+cy))[3],'sourceRoot':frame['root'],'preparedRoot':geometry['root'],'preparedSize':list(prepared.size),'sourceSize':[w,h],'phaseFrames':animation['frames']})
runtime=json.loads(builder.atlas.build_character('twinkle',config,'normal-b-phase-regression')[0]['runtime.json'])
opponent=json.loads(builder.atlas.build_character('labubu',resolved['characters']['labubu'],'normal-b-phase-regression')[0]['runtime.json'])
rise=config['frames']['jump_rise']
reaction=builder.atlas.load_sources(config['sources'])['reactions']
riseImage,riseGeometry,_=builder.atlas.prepare_frame(reaction,rise,1)
rx,ry,rw,rh=rise['crop']
restored=riseImage.crop((0,0,rw,24)).getchannel('A').point(lambda a:255 if a>=64 else 0)
riseProof={'globalRoot':[rx+riseGeometry['root']['x'],ry+riseGeometry['root']['y']],'restoredPixels':sum(restored.histogram()[1:]),'oldPixelsUnchanged':riseImage.crop((0,24,rw,rh)).tobytes()==reaction.crop((816,836,1254,1254)).tobytes()}
print(json.dumps({'runtime':runtime,'opponent':opponent,'active':active,'expectedScale':expectedScale,'actualScale':config['sources']['normal_b']['unitScale'],'factor':factor,'riseProof':riseProof}))
`]);
    const proof = JSON.parse(result.stdout) as {
      runtime: AnimeRuntimeManifest; opponent: AnimeRuntimeManifest; expectedScale: number; actualScale: number; factor: number;
      riseProof: { globalRoot: number[]; restoredPixels: number; oldPixelsUnchanged: boolean };
      active: Array<{ moveId: string; frameId: string; source: string; cropHash: string; contactAlpha: number; sourceRoot: number[]; preparedRoot: { x: number; y: number }; preparedSize: number[]; sourceSize: number[]; phaseFrames: string[] }>;
    };
    expect(proof.actualScale).toBe(proof.expectedScale);
    expect(proof.riseProof.globalRoot).toEqual([1103, 1225]);
    expect(proof.riseProof.restoredPixels).toBeGreaterThan(100);
    expect(proof.riseProof.oldPixelsUnchanged).toBe(true);
    expect(proof.active).toHaveLength(8);
    expect(new Set(proof.active.map(frame => frame.cropHash)).size).toBe(8);
    expect(validateAnimeRuntimeManifest(proof.runtime, twinkleDef.moves)).toEqual([]);
    const sim = new FightSim({ p1: twinkleDef, p2: labubuDef });
    const fighter = sim.state.fighters[0];
    for (const frame of proof.active) {
      expect(frame.source).toBe('normal_b');
      expect(frame.contactAlpha).toBeGreaterThanOrEqual(64);
      expect(frame.preparedRoot.x).toBeCloseTo(frame.sourceRoot[0]! * proof.factor, 10);
      expect(frame.preparedRoot.y).toBeCloseTo(frame.sourceRoot[1]! * proof.factor, 10);
      expect(frame.preparedSize).toEqual(frame.sourceSize.map(size => Math.round(size * proof.factor)));
      expect(new Set(frame.phaseFrames).size).toBe(3);
      expect(frame.phaseFrames).toEqual(frame.moveId.startsWith('cr_')
        ? ['prejump', frame.frameId, 'crouch']
        : ['jump_rise', frame.frameId, 'jump_fall']);
      const move = twinkleDef.moves.find(candidate => candidate.id === frame.moveId)!;
      expect(proof.runtime.anims[move.id]!.exposures?.map(exposure => exposure.ticks)).toEqual(move.frames.map(phase => phase.duration));
      fighter.state = 'attack';
      fighter.moveId = move.id;
      for (const facing of [1, -1] as const) {
        fighter.facing = facing;
        let elapsed = 0;
        for (const [index, phase] of move.frames.entries()) {
          for (let tick = 0; tick < phase.duration; tick++) {
            fighter.stateFrame = elapsed + tick;
            expect(currentAnimation(sim, fighter, proof.runtime.anims)).toEqual({ anim: move.id, index });
            expect(Boolean(phase.hitboxes?.length)).toBe(index === 1);
          }
          elapsed += phase.duration;
        }
      }
    }
    const candidate = createSampleFighter(twinkleDef, proof.runtime, { opponentRuntime: proof.opponent });
    const opponent = createSampleFighter(labubuDef, proof.opponent, { opponentRuntime: proof.runtime });
    for (const moveId of moveIds) {
      expect(candidate.moves.find(move => move.id === moveId)).toBe(twinkleDef.moves.find(move => move.id === moveId));
    }
    expect(validateSampleCoverage(candidate, proof.runtime, opponent).ok).toBe(true);
    expect(validateSampleCoverage(opponent, proof.opponent, candidate).ok).toBe(true);
    const complete = validateFullCoverage(twinkleDef, proof.runtime, labubuDef);
    expect(complete.ok).toBe(true);
    expect(complete.missingMoves).toEqual([]);
    expect(complete.missingStates).toEqual([]);
  }, 15000);
});
