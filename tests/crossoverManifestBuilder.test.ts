import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage, validateSampleCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
const python = process.env.OPF_PYTHON ?? 'python';
const script = resolve('scripts/build_crossover_manifest0922.py');
const hash = (data: Buffer): string => createHash('sha256').update(data).digest('hex');
const builderImport = `import json,sys\nsys.path.insert(0, ${JSON.stringify(resolve('scripts'))})\nimport build_crossover_manifest0922 as builder`;

describe('corrected crossover manifest builder', () => {
  it('validates corrected mother/action provenance and exposes only explicit sample actions', async () => {
    const result = await run(python, [script]);
    const report = JSON.parse(result.stdout) as {
      status: string;
      buildable: string[];
      characters: Record<string, { targetWorldHeight: number; resolvedSources: string[]; explicitFrames: number; pendingPages: string[] }>;
    };
    expect(report.status).toBe('config-valid');
    expect(report.buildable).toEqual(['labubu', 'twinkle']);
    expect(report.characters.labubu).toMatchObject({ targetWorldHeight: 78, resolvedSources: ['flurry_upper', 'held_leg_flip_0927', 'leg_grip_0926', 'locomotion', 'mother', 'normal_a', 'normal_b', 'reactions', 'recoveries', 'recovery_sequence', 'sample_skills', 'slide_drive', 'thrown_fix', 'tumble_riot', 'ultimate', 'utility'], explicitFrames: 95 });
    expect(report.characters.twinkle).toMatchObject({ targetWorldHeight: 84, resolvedSources: ['dodge_rain', 'held_leg_flip_0927', 'locomotion', 'mother', 'normal_a', 'normal_b', 'push_up', 'reactions', 'recoveries', 'recovery_sequence', 'sample_skills', 'ultimate', 'utility'], explicitFrames: 87 });
    expect(report.characters.labubu!.pendingPages).toEqual([]);
    expect(report.characters.twinkle!.pendingPages).toEqual([]);
  });

  it('assembles the limited sample in memory but refuses the complete-candidate write mode', async () => {
    const checked = await run(python, [script, '--check']);
    const reports = checked.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line) as { character: string; checkOnly: boolean; animations: string[] });
    expect(reports.map(report => report.character)).toEqual(['labubu', 'twinkle']);
    expect(reports.every(report => report.checkOnly)).toBe(true);
    expect(reports.find(report => report.character === 'labubu')!.animations).toEqual(expect.arrayContaining(['st_a', 'jump_neutral', 'thrown', 'sp_pounce_rush', 'sp_leg_flip']));
    expect(reports.find(report => report.character === 'twinkle')!.animations).toEqual(expect.arrayContaining(['st_a', 'jump_neutral', 'sp_tiny_star', 'sp_star_reflect']));
    await expect(run(python, [script, '--write'])).rejects.toMatchObject({ stderr: expect.stringContaining('write requires complete-candidate status') });
  }, 15000);

  it('rejects the original mother and 4x4 action sources even if an alias requests them', async () => {
    const code = [
      'import json,sys',
      `sys.path.insert(0, ${JSON.stringify(resolve('scripts'))})`,
      'import build_crossover_manifest0922 as builder',
      'manifest=builder.load_json(builder.DEFAULT_MANIFEST)',
      'catalog=builder.load_json(builder.ROOT/manifest["sourceCatalog"])',
      'try:',
      ' builder.resolve_source("forbidden",{"catalogKey":"mother","allowedStatuses":["shape_reviewed_candidate"]},catalog,manifest)',
      'except ValueError as error:',
      ' print(json.dumps({"error":str(error)}))',
      'else:',
      ' raise SystemExit("rejected source unexpectedly resolved")',
    ].join('\n');
    const result = await run(python, ['-c', code]);
    expect(JSON.parse(result.stdout)).toEqual({ error: 'forbidden: rejected source key mother cannot enter corrected authoring' });
  });

  it('persists a standard resolved manifest with current custom/catalog/generator provenance', async () => {
    await run(python, [script]);
    const customPath = resolve('scripts/crossover_manifest0922.json');
    const catalogPath = resolve('scripts/crossover_sources0922.json');
    const resolvedPath = resolve('scripts/crossover_manifest0922.resolved.json');
    const [custom, catalog, generator, encoded] = await Promise.all([
      readFile(customPath), readFile(catalogPath), readFile(script), readFile(resolvedPath),
    ]);
    const manifest = JSON.parse(encoded.toString('utf8')) as {
      schemaVersion: number;
      sourceManifest: { file: string; sha256: string };
      sourceCatalog: { file: string; sha256: string };
      generator: { file: string; sha256: string };
      characters: Record<string, { sources: object; frames: object; anims: object; animations?: object }>;
    };
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.sourceManifest).toEqual({ file: 'scripts/crossover_manifest0922.json', sha256: hash(custom) });
    expect(manifest.sourceCatalog).toEqual({ file: 'scripts/crossover_sources0922.json', sha256: hash(catalog) });
    expect(manifest.generator).toEqual({ file: 'scripts/build_crossover_manifest0922.py', sha256: hash(generator) });
    expect(Object.keys(manifest.characters)).toEqual(['labubu', 'twinkle']);
    expect(Object.keys(manifest.characters.labubu!.sources).sort()).toEqual(['flurry_upper', 'held_leg_flip_0927', 'leg_grip_0926', 'locomotion', 'mother', 'normal_a', 'normal_b', 'reactions', 'recoveries', 'recovery_sequence', 'sample_skills', 'slide_drive', 'thrown_fix', 'tumble_riot', 'ultimate', 'utility']);
    expect(Object.keys(manifest.characters.labubu!.frames)).toHaveLength(95);
    expect(Object.keys(manifest.characters.labubu!.anims)).toHaveLength(54);
    expect(Object.keys(manifest.characters.twinkle!.sources).sort()).toEqual(['dodge_rain', 'held_leg_flip_0927', 'locomotion', 'mother', 'normal_a', 'normal_b', 'push_up', 'reactions', 'recoveries', 'recovery_sequence', 'sample_skills', 'ultimate', 'utility']);
    expect(Object.keys(manifest.characters.twinkle!.frames)).toHaveLength(87);
    expect(Object.keys(manifest.characters.twinkle!.anims)).toHaveLength(54);
    expect(manifest.characters.labubu!.animations).toBeUndefined();
    expect(manifest.characters.twinkle!.animations).toBeUndefined();
  });

  it('shows distinct blowback phases at the existing logical boundaries without adding independent crops', async () => {
    const result = await run(python, ['-c', `${builderImport}
resolved,summary=builder.resolve(builder.DEFAULT_MANIFEST)
rows={}
for character,config in resolved['characters'].items():
 outputs,report=builder.atlas.build_character(character,config,'in-memory-phase-regression')
 runtime=json.loads(outputs['runtime.json'])
 rows[character]={'runtime':runtime,'uniqueCrops':report['uniqueCrops'],'mappedFrames':report['mappedFrames'],'sharedPhaseAnimations':summary['characters'][character]['sharedPhaseAnimations']}
print(json.dumps(rows))`]);
    const rows = JSON.parse(result.stdout) as Record<string, {
      runtime: AnimeRuntimeManifest; uniqueCrops: number; mappedFrames: number; sharedPhaseAnimations: string[];
    }>;
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef });
    for (const [side, def] of [labubuDef, twinkleDef].entries()) {
      const row = rows[def.id]!;
      expect(row.uniqueCrops).toBe(def.id === 'labubu' ? 95 : 87);
      expect(row.sharedPhaseAnimations).toEqual(['cd', 'cr_a', 'cr_b', 'cr_c', 'cr_d', 'f_c', 'j_a', 'j_b', 'j_c', 'j_cd', 'j_d']);
      for (const moveId of ['cd', 'j_cd']) {
        const move = def.moves.find(candidate => candidate.id === moveId)!;
        expect(move.frames).toHaveLength(3);
        expect(row.runtime.anims[moveId]!.frames).toBe(3);
        expect(row.runtime.anims[moveId]!.exposures?.map(exposure => exposure.ticks)).toEqual(move.frames.map(frame => frame.duration));
        const fighter = sim.state.fighters[side]!;
        fighter.state = 'attack';
        fighter.moveId = moveId;
        let elapsed = 0;
        for (const [phase, logicalFrame] of move.frames.entries()) {
          for (let local = 0; local < logicalFrame.duration; local++) {
            fighter.stateFrame = elapsed + local;
            const animation = currentAnimation(sim, fighter, row.runtime.anims);
            expect(animation).toEqual({ anim: moveId, index: phase });
            expect(Boolean(logicalFrame.hitboxes?.length)).toBe(phase === 1);
          }
          elapsed += logicalFrame.duration;
        }
      }
      expect(validateFullCoverage(def, row.runtime, twinkleDef).ok).toBe(true);
    }
    const left = createSampleFighter(labubuDef, rows.labubu!.runtime, { opponentRuntime: rows.twinkle!.runtime });
    const right = createSampleFighter(twinkleDef, rows.twinkle!.runtime, { opponentRuntime: rows.labubu!.runtime });
    expect(validateSampleCoverage(left, rows.labubu!.runtime, right).ok).toBe(true);
    expect(validateSampleCoverage(right, rows.twinkle!.runtime, left).ok).toBe(true);
  }, 15000);

  it('rejects undocumented sharing or an active pose borrowed from another animation', async () => {
    const result = await run(python, ['-c', `${builderImport}
from copy import deepcopy
manifest=builder.load_json(builder.DEFAULT_MANIFEST)
base=manifest['characters']['labubu']
errors=[]
for kind in ['missing-note','same-pose','borrowed-active','unshared-startup']:
 config=deepcopy(base)
 animation=config['animations']['cd']
 if kind=='missing-note': animation['sharedPhases']['startup']=''
 elif kind=='same-pose': animation['frames'][2]=animation['frames'][0]
 elif kind=='borrowed-active': animation['frames'][1]='st_c_active'
 else:
  config['frames']['unshared']=deepcopy(config['frames']['punch_windup'])
  animation['frames'][0]='unshared'
 try: builder.animations(config)
 except ValueError as error: errors.append(str(error))
 else: raise AssertionError(kind+' unexpectedly passed')
print(json.dumps(errors))`]);
    expect(JSON.parse(result.stdout)).toEqual([
      'cd: sharedPhases must explain startup and recovery reuse',
      'cd: shared attack phases require three distinct non-looping poses',
      'cd: active phase must retain its independent inspected pose',
      'cd: shared startup/recovery must reuse existing mapped poses',
    ]);
  });

  it('preserves LABUBU jump-root registration while retaining the previously clipped ear tips', async () => {
    const result = await run(python, ['-c', `${builderImport}
from PIL import Image
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST)
config=resolved['characters']['labubu'];frame=config['frames']['jump_rise']
source=builder.atlas.load_sources(config['sources'])['reactions']
image,geometry,_=builder.atlas.prepare_frame(source,frame,1)
x,y,w,h=frame['crop'];original=source.crop((x,y,x+w,y+h))
ex,ey,ew,eh=frame['excludeRects'][0]
protected=image.crop((0,eh,w,h)).tobytes()==original.crop((0,eh,w,h)).tobytes()
ears=image.crop((190,0,w,26)).getchannel('A').point(lambda a:255 if a>=64 else 0)
hold=config['frames']['leg_flip_hold']
holdSource=builder.atlas.load_sources(config['sources'])[hold['source']]
hx,hy=hold['sockets']['front_hand'];cx,cy,_,_=hold['crop']
print(json.dumps({'globalRoot':[x+geometry['root']['x'],y+geometry['root']['y']],'protectedRgbaUnchanged':protected,'restoredEarPixels':sum(ears.histogram()[1:]),'excludedNeighborAlpha':image.crop((ex,ey,ex+ew,ey+eh)).getchannel('A').getextrema()[1],'holdRoot':hold['root'],'holdHasForeground':'foregroundPolygon' in hold,'frontHandRgba':list(holdSource.getpixel((cx+hx,cy+hy)))}))`]);
    const proof = JSON.parse(result.stdout) as {
      globalRoot: number[]; protectedRgbaUnchanged: boolean; restoredEarPixels: number;
      excludedNeighborAlpha: number; holdRoot: number[]; holdHasForeground: boolean; frontHandRgba: number[];
    };
    expect(proof.globalRoot).toEqual([1069, 1226]);
    expect(proof.protectedRgbaUnchanged).toBe(true);
    expect(proof.restoredEarPixels).toBeGreaterThan(100);
    expect(proof.excludedNeighborAlpha).toBe(0);
    expect(proof.holdRoot).toEqual([333, 838]);
    expect(proof.holdHasForeground).toBe(true);
    expect(proof.frontHandRgba[3]).toBeGreaterThanOrEqual(64);
    expect(proof.frontHandRgba[0]).toBeGreaterThan(proof.frontHandRgba[2]!);
  });
});
