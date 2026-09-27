import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightSim } from '../src/core';
import { GETUP_FRAMES, THROW_TECH_FRAMES } from '../src/core/FightSim';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
interface StateAssembly {
  runtime: AnimeRuntimeManifest;
  animations: Record<string, { frames: string[]; loop: boolean }>;
  hashes: Record<string, string>;
  preserved: Record<string, boolean>;
  scales: Record<string, { actual: number; expected: number; height: number }>;
  contactAlpha: number;
  ordinaryThrowCrops: string[];
  knockdownRepair?: { restoredEqualsBefore: boolean; bodyEqualsBefore: boolean; excludedAlphaMax: number[]; visibleRemovedPixels: number; root: number[]; sockets: object };
}
let rows: Record<string, StateAssembly>;

describe('crossover utility states and complete recovery sequences', () => {
  beforeAll(async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import json,sys,hashlib
from copy import deepcopy
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST);rows={}
for char,mother,utilityHeight,recoveryHeight in [('labubu',709,390,481),('twinkle',610,336,430)]:
 config=resolved['characters'][char];sources=builder.atlas.load_sources(config['sources']);scales={};hashes={};preserved={}
 for alias,width,height in [('utility',418,utilityHeight),('recovery_sequence',528 if char=='labubu' else 512,recoveryHeight)]:
  reference=sources[alias].crop((0,0,width,418 if alias=='utility' else 512)).getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
  assert reference[3]-reference[1]==height
  scales[alias]={'actual':config['sources'][alias]['unitScale'],'expected':mother/height,'height':height}
 for name,frame in config['frames'].items():
  if frame['source'] not in ['utility','recovery_sequence']:continue
  source=sources[frame['source']];image,_,_=builder.atlas.prepare_frame(source,frame,1)
  x,y,w,h=frame['crop'];preserved[name]=image.tobytes()==source.crop((x,y,x+w,y+h)).tobytes()
  hashes[name]=hashlib.sha256(image.tobytes()).hexdigest()
 frame=config['frames']['f_c_active'];x,y,_,_=frame['crop'];cx,cy=frame['sockets']['contact']
 contactAlpha=sources[frame['source']].getpixel((x+cx,y+cy))[3]
 runtime=json.loads(builder.atlas.build_character(char,config,'utility-recovery-phase-regression')[0]['runtime.json'])
 ordinary=[name for name in config['frames'] if name.startswith('ordinary_throw')]
 rows[char]={'runtime':runtime,'animations':config['anims'],'hashes':hashes,'preserved':preserved,'scales':scales,'contactAlpha':contactAlpha,'ordinaryThrowCrops':ordinary}
 if char=='labubu':
  frame=config['frames']['knockdown'];original=deepcopy(frame);original.pop('excludeRects');source=sources[frame['source']]
  before,_,_=builder.atlas.prepare_frame(source,original,1);after,_,_=builder.atlas.prepare_frame(source,frame,1);restored=after.copy();alphaMax=[];removed=0
  for x,y,w,h in frame['excludeRects']:
   rect=(x,y,x+w,y+h);restored.paste(before.crop(rect),(x,y));alphaMax.append(after.crop(rect).getchannel('A').getextrema()[1]);removed+=sum(before.crop(rect).getchannel('A').histogram()[64:])
  rows[char]['knockdownRepair']={'restoredEqualsBefore':restored.tobytes()==before.tobytes(),'bodyEqualsBefore':after.crop((0,22,520,334)).tobytes()==before.crop((0,22,520,334)).tobytes(),'excludedAlphaMax':alphaMax,'visibleRemovedPixels':removed,'root':frame['root'],'sockets':frame['sockets']}
print(json.dumps(rows))
`]);
    rows = JSON.parse(result.stdout) as Record<string, StateAssembly>;
  }, 20000);

  it('keeps whole-page scale and unmodified alpha crops, with different drawings for each recovery phase', () => {
    for (const def of [labubuDef, twinkleDef]) {
      const row = rows[def.id]!;
      for (const scale of Object.values(row.scales)) expect(scale.actual).toBe(scale.expected);
      expect(Object.values(row.preserved)).toHaveLength(13);
      expect(Object.values(row.preserved).every(Boolean)).toBe(true);
      expect(row.contactAlpha).toBeGreaterThanOrEqual(64);
      for (const [anim, count] of [['backdash', 2], ['getup', 3], ['win', 2]] as const) {
        const frames = row.animations[anim]!.frames;
        expect(frames).toHaveLength(count);
        expect(new Set(frames.map(frame => row.hashes[frame])).size).toBe(count);
      }
      expect(validateAnimeRuntimeManifest(row.runtime, def.moves)).toEqual([]);
    }
  });

  it('removes only the two inspected neighboring feet above LABUBU knockdown without moving its body or root', () => {
    const repair = rows.labubu!.knockdownRepair!;
    expect(repair.restoredEqualsBefore).toBe(true);
    expect(repair.bodyEqualsBefore).toBe(true);
    expect(repair.excludedAlphaMax).toEqual([0, 0]);
    expect(repair.visibleRemovedPixels).toBeGreaterThan(500);
    expect(repair.root).toEqual([338, 302]);
    expect(repair.sockets).toEqual({});
  });

  it('finishes backdash, getup and throw-tech artwork inside unchanged state durations, then holds KO and victory', () => {
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef });
    for (const [side, def] of [labubuDef, twinkleDef].entries()) {
      const row = rows[def.id]!, fighter = sim.state.fighters[side]!;
      for (const [state, duration] of [
        ['backdash', def.movement.backdashFrames], ['getup', GETUP_FRAMES], ['throw_tech', THROW_TECH_FRAMES],
      ] as const) {
        const anim = row.runtime.anims[state]!;
        expect(anim.loop).toBe(false);
        expect(anim.exposures!.reduce((sum, phase) => sum + phase.ticks, 0)).toBe(duration);
        fighter.state = state;
        const seen = new Set<number>();
        for (let tick = 0; tick < duration; tick++) {
          fighter.stateFrame = tick;
          const drawing = currentAnimation(sim, fighter, row.runtime.anims);
          expect(drawing.anim).toBe(state);
          seen.add(drawing.index);
        }
        expect(seen.size).toBe(anim.frames);
      }
      fighter.state = 'ko'; fighter.stateFrame = 999;
      expect(row.runtime.anims.ko!.frames).toBe(1);
      expect(row.runtime.anims.ko!.loop).toBe(false);
      expect(currentAnimation(sim, fighter, row.runtime.anims)).toEqual({ anim: 'ko', index: 0 });
      expect(row.runtime.anims.win!.loop).toBe(false);
      for (const [tick, index] of [[0, 0], [23, 0], [24, 1], [47, 1], [999, 1]]) {
        expect(currentAnimation(sim, fighter, row.runtime.anims, { anim: 'win', stateFrame: tick! })).toEqual({ anim: 'win', index });
      }
    }
  });

  it('aligns forward-heavy contact to its original active ticks on both facings while requiring the matched conditional victim reactions', () => {
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef });
    for (const [side, def] of [labubuDef, twinkleDef].entries()) {
      const row = rows[def.id]!, fighter = sim.state.fighters[side]!;
      const move = def.moves.find(candidate => candidate.id === 'f_c')!;
      expect(row.runtime.anims.f_c!.exposures?.map(phase => phase.ticks)).toEqual(move.frames.map(phase => phase.duration));
      expect(row.animations.f_c!.frames[1]).toBe('f_c_active');
      fighter.state = 'attack'; fighter.moveId = move.id;
      for (const facing of [1, -1] as const) {
        fighter.facing = facing;
        let elapsed = 0;
        for (const [index, phase] of move.frames.entries()) {
          for (let tick = 0; tick < phase.duration; tick++) {
            fighter.stateFrame = elapsed + tick;
            expect(currentAnimation(sim, fighter, row.runtime.anims)).toEqual({ anim: 'f_c', index });
            expect(Boolean(phase.hitboxes?.length)).toBe(index === 1);
          }
          elapsed += phase.duration;
        }
      }
      expect(row.ordinaryThrowCrops.sort()).toEqual(['ordinary_throw_hold', 'ordinary_throw_prepare', 'ordinary_throw_release']);
      for (const name of ['throw', 'throw_fwd', 'throw_back']) expect(row.runtime.anims[name]).toBeDefined();
      const full = validateFullCoverage(def, row.runtime, labubuDef);
      expect(full.ok).toBe(true);
      expect(full.missingStates).toEqual([]);
      expect(full.missingMoves).toEqual([]);
      const opponent = rows[def.id === 'labubu' ? 'twinkle' : 'labubu']!.runtime;
      const candidate = createSampleFighter(def, row.runtime, { opponentRuntime: opponent });
      expect(candidate.moves.find(retained => retained.id === 'f_c')).toBe(move);
      expect(candidate.moves.some(retained => retained.id === 'throw_fwd' || retained.id === 'throw_back')).toBe(true);
    }
    expect(rows.labubu!.runtime.anims.sp_leg_flip!.throwExposures).toEqual([{ frame: 1, ticks: 24 }, { frame: 2, ticks: 22 }]);
    expect(rows.labubu!.runtime.foregroundFrames?.['labubu/sp_leg_flip/1']).toBe('labubu/sp_leg_flip/1/foreground');
    expect(rows.twinkle!.runtime.anims.held_leg_flip!.frames).toBe(1);
    expect(rows.labubu!.runtime.anims.held_leg_flip?.frames).toBe(1);
  });
});
