import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim, totalFrames } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, validateFullCoverage } from '../src/render/anime/sampleMode';

const run = promisify(execFile);

describe('crossover tumble, charge and symphony original-pose assembly', () => {
  it('keeps five real hits, six real casts and the unchanged armored-startup boundary', async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import json,sys,hashlib
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST);rows={}
for char,alias,referenceHeight,cropHeight,mother in [('labubu','tumble_riot',412,446,709),('twinkle','ultimate',360,440,610)]:
 config=resolved['characters'][char];sources=builder.atlas.load_sources(config['sources']);source=sources[alias]
 reference=source.crop((0,0,418,cropHeight)).getchannel('A').point(lambda a:255 if a>=64 else 0);box=reference.getbbox()
 assert box[3]-box[1]==referenceHeight
 extraFeet=reference.crop((0,418,418,cropHeight));feetPixels=sum(extraFeet.histogram()[1:])
 hashes={};alphas={};protected={}
 for name,f in config['frames'].items():
  if f['source']!=alias:continue
  image,_,_=builder.atlas.prepare_frame(source,f,1);x,y,w,h=f['crop'];protected[name]=image.tobytes()==source.crop((x,y,x+w,y+h)).tobytes();hashes[name]=hashlib.sha256(image.tobytes()).hexdigest()
  point=f['sockets'].get('projectile_origin',f['sockets']['contact']);alphas[name]=source.getpixel((x+point[0],y+point[1]))[3]
 runtime=json.loads(builder.atlas.build_character(char,config,'finisher-phase-regression')[0]['runtime.json'])
 rows[char]={'runtime':runtime,'animations':config['anims'],'hashes':hashes,'alphas':alphas,'protected':protected,'feetPixels':feetPixels,'scale':config['sources'][alias]['unitScale'],'expectedScale':mother/referenceHeight}
print(json.dumps(rows))
`]);
    const rows = JSON.parse(result.stdout) as Record<string, {
      runtime: AnimeRuntimeManifest; animations: Record<string, { frames: string[] }>;
      hashes: Record<string, string>; alphas: Record<string, number>; protected: Record<string, boolean>;
      feetPixels: number; scale: number; expectedScale: number;
    }>;
    for (const def of [labubuDef, twinkleDef]) {
      const row = rows[def.id]!;
      expect(row.scale).toBe(row.expectedScale);
      expect(row.feetPixels).toBeGreaterThan(50);
      expect(Object.values(row.protected).every(Boolean)).toBe(true);
      expect(Object.values(row.alphas).every(alpha => alpha >= 64)).toBe(true);
      expect(validateAnimeRuntimeManifest(row.runtime, def.moves)).toEqual([]);
      expect(validateFullCoverage(def, row.runtime, twinkleDef).ok).toBe(true);
    }
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef });
    const attacker = sim.state.fighters[0];
    const tumble = labubuDef.moves.find(move => move.id === 'sp_tumble_riot')!;
    const hitPoses = ['riot_shoulder', 'riot_curl', 'riot_unfold', 'riot_twist', 'riot_finish'];
    expect(new Set(hitPoses.map(name => rows.labubu!.hashes[name])).size).toBe(5);
    attacker.state = 'attack'; attacker.moveId = tumble.id;
    for (const facing of [1, -1] as const) {
      attacker.facing = facing;
      let elapsed = 0, hit = 0;
      for (const phase of tumble.frames) {
        for (let tick = 0; tick < phase.duration; tick++) {
          attacker.stateFrame = elapsed + tick;
          const pose = rows.labubu!.animations[tumble.id]!.frames[currentAnimation(sim, attacker, rows.labubu!.runtime.anims).index];
          if (phase.hitboxes?.length) expect(pose).toBe(hitPoses[hit]);
        }
        if (phase.hitboxes?.length) hit++;
        elapsed += phase.duration;
      }
      expect(hit).toBe(5);
      expect(elapsed).toBe(totalFrames(tumble));
    }
    const charge = labubuDef.moves.find(move => move.id === 'sp_monster_charge')!;
    expect(charge.frames.map(frame => frame.duration)).toEqual([16, 6, 7, 42]);
    expect(charge.frames.map(frame => Boolean(frame.armor))).toEqual([true, false, false, false]);
    attacker.moveId = charge.id;
    for (const [tick, expected] of [[0, 'charge_windup'], [15, 'charge_windup'], [16, 'charge_windup'], [21, 'charge_windup'], [22, 'charge_active'], [28, 'charge_active'], [29, 'charge_recover'], [70, 'charge_recover']] as const) {
      attacker.stateFrame = tick;
      expect(rows.labubu!.animations[charge.id]!.frames[currentAnimation(sim, attacker, rows.labubu!.runtime.anims).index]).toBe(expected);
    }
    const caster = sim.state.fighters[1], ultimate = twinkleDef.moves.find(move => move.id === 'ult_star_symphony')!;
    caster.state = 'attack'; caster.moveId = ultimate.id;
    const casts = ['symphony_beat1', 'symphony_beat2', 'symphony_beat3', 'symphony_beat4', 'symphony_beat5', 'symphony_beat6'];
    expect(new Set(casts.map(name => rows.twinkle!.hashes[name])).size).toBe(6);
    expect(ultimate.projectiles?.map(projectile => projectile.frame)).toEqual([8, 12, 16, 21, 26, 32]);
    for (const [index, projectile] of ultimate.projectiles!.entries()) {
      caster.stateFrame = projectile.frame;
      expect(rows.twinkle!.animations[ultimate.id]!.frames[currentAnimation(sim, caster, rows.twinkle!.runtime.anims).index]).toBe(casts[index]);
    }
    caster.stateFrame = 34;
    expect(rows.twinkle!.animations[ultimate.id]!.frames[currentAnimation(sim, caster, rows.twinkle!.runtime.anims).index]).toBe('symphony_recover');
    const selected = createSampleFighter(labubuDef, rows.labubu!.runtime, { opponentRuntime: rows.twinkle!.runtime });
    const opponent = createSampleFighter(twinkleDef, rows.twinkle!.runtime, { opponentRuntime: rows.labubu!.runtime });
    expect(selected.moves.find(move => move.id === charge.id)).toBe(charge);
    expect(selected.moves.find(move => move.id === tumble.id)).toBe(tumble);
    expect(opponent.moves.find(move => move.id === ultimate.id)).toBe(ultimate);
    expect(selected.moves.some(move => move.id === 'sp_leg_flip')).toBe(true);
    expect(rows.labubu!.runtime.anims.held_leg_flip?.frames).toBe(1);
    expect(rows.twinkle!.runtime.anims.held_leg_flip?.frames).toBe(1);
  }, 20000);
});
