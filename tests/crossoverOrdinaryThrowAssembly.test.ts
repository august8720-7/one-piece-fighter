import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';
import { Btn, FightSim, SUBPIXEL, px, type FighterDef } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { attachmentPoint, connectedHeldReaction, currentAnimation, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, sampleMoveIssues } from '../src/render/anime/sampleMode';

const run = promisify(execFile);
const neutral = { p1: 0, p2: 0 };
interface Artwork {
  runtime: AnimeRuntimeManifest;
  actorHashes: Record<string, string>;
  actorSourcePixelsPreserved: boolean[];
  actorSocketAlphas: number[];
  foreground: { preparedRgbaSha256: string; recombinedRgbaSha256: string };
  referenceScale: number;
  reusedVictimHashes: Record<string, string>;
  victimGripAlphas: number[];
}
let rows: Record<string, Artwork>;

function startOrdinary(def: FighterDef, player: 0 | 1, facing: 1 | -1, moveId: 'throw_fwd' | 'throw_back') {
  const actorRuntime = rows[def.id]!.runtime, victimRuntime = rows.twinkle!.runtime;
  const actorDef = createSampleFighter(def, actorRuntime, { opponentRuntime: victimRuntime });
  const victimDef = createSampleFighter(twinkleDef, victimRuntime, { opponentRuntime: actorRuntime });
  const sim = new FightSim({ p1: player === 0 ? actorDef : victimDef, p2: player === 0 ? victimDef : actorDef,
    introFrames: 0, roundTime: -1, controlModes: ['classic', 'classic'] });
  const actor = sim.state.fighters[player], victim = sim.state.fighters[player === 0 ? 1 : 0];
  actor.x = px(-30) * facing; victim.x = actor.x + px(38) * facing;
  actor.facing = facing; victim.facing = facing === 1 ? -1 : 1;
  const direction = (moveId === 'throw_fwd' ? facing : -facing) === 1 ? Btn.Right : Btn.Left;
  sim.step(player === 0 ? { p1: direction | Btn.C, p2: 0 } : { p1: 0, p2: direction | Btn.C });
  expect(actor.state).toBe('throw');
  expect(actor.moveId).toBe(moveId);
  expect(actor.stateFrame).toBe(0);
  return { sim, actor, victim, actorRuntime, victimRuntime, move: def.moves.find(move => move.id === moveId)! };
}

describe('ordinary-throw source assembly with explicit conditional victim requirements', () => {
  beforeAll(async () => {
    const result = await run(process.env.OPF_PYTHON ?? 'python', ['-c', `
import json,sys,hashlib
sys.dont_write_bytecode=True
sys.path.insert(0,${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
resolved,_=builder.resolve(builder.DEFAULT_MANIFEST);rows={}
for char in ['labubu','twinkle']:
 config=resolved['characters'][char];sources=builder.atlas.load_sources(config['sources']);hashes={};preserved=[];alphas=[];reused={};grips=[]
 for name in ['ordinary_throw_prepare','ordinary_throw_hold','ordinary_throw_release']:
  frame=config['frames'][name];source=sources[frame['source']];image,_,_=builder.atlas.prepare_frame(source,frame,1)
  x,y,w,h=frame['crop'];hashes[name]=hashlib.sha256(image.tobytes()).hexdigest();preserved.append(image.tobytes()==source.crop((x,y,x+w,y+h)).tobytes())
  for socket in ['near_hand','far_hand'] if name.endswith('hold') else ['front_hand']:
   cx,cy=frame['sockets'][socket];alphas.append(source.getpixel((x+cx,y+cy))[3])
 if char=='twinkle':
  for name in ['held_leg_flip','held_labubu_throw','held_twinkle_throw']:
   frame=config['frames'][name];factor=config['scale']*config['sources'][frame['source']]['unitScale']*config['textureDensity'];source=sources[frame['source']]
   image,_,_=builder.atlas.prepare_frame(source,frame,factor);reused[name]=hashlib.sha256(image.tobytes()).hexdigest()
   x,y,_,_=frame['crop'];cx,cy=frame['sockets']['grip'];grips.append(source.getpixel((int(x+cx),int(y+cy)))[3])
 outputs,report=builder.atlas.build_character(char,config,'ordinary-star-assembly-regression')
 rows[char]={'runtime':json.loads(outputs['runtime.json']),'actorHashes':hashes,'actorSourcePixelsPreserved':preserved,'actorSocketAlphas':alphas,'foreground':report['transparency']['ordinary_throw_hold']['foreground'],'referenceScale':config['sources']['utility']['unitScale'],'reusedVictimHashes':reused,'victimGripAlphas':grips}
print(json.dumps(rows))
`]);
    rows = JSON.parse(result.stdout) as Record<string, Artwork>;
  }, 25000);

  it('uses three real actor drawings and two registrations of one unchanged victim drawing with exact foreground conservation', () => {
    for (const def of [labubuDef, twinkleDef]) {
      const row = rows[def.id]!;
      expect(new Set(Object.values(row.actorHashes)).size).toBe(3);
      expect(row.actorSourcePixelsPreserved).toEqual([true, true, true]);
      expect(row.actorSocketAlphas.every(alpha => alpha >= 64)).toBe(true);
      expect(row.referenceScale).toBe(def.id === 'labubu' ? 709 / 390 : 610 / 336);
      expect(row.foreground.preparedRgbaSha256).toBe(row.foreground.recombinedRgbaSha256);
      expect(validateAnimeRuntimeManifest(row.runtime, def.moves)).toEqual([]);
      for (const moveId of ['throw_fwd', 'throw_back']) {
        const move = def.moves.find(move => move.id === moveId)!;
        const release = move.throwData!.releaseFrame, duration = move.throwData!.duration!;
        expect(row.runtime.anims[moveId]!.throwExposures).toEqual([{ frame: 1, ticks: release }, { frame: 2, ticks: duration - release }]);
        expect(row.runtime.foregroundFrames?.[`${def.id}/${moveId}/1`]).toBe(`${def.id}/${moveId}/1/foreground`);
      }
    }
    expect(new Set(Object.values(rows.twinkle!.reusedVictimHashes)).size).toBe(1);
    expect(rows.twinkle!.victimGripAlphas.every(alpha => alpha >= 64)).toBe(true);
    expect(rows.twinkle!.runtime.anims.held_labubu_throw!.exposures).toEqual([{ frame: 0, ticks: 22 }]);
    expect(rows.twinkle!.runtime.anims.held_twinkle_throw!.exposures).toEqual([{ frame: 0, ticks: 23 }]);
  });

  it('holds on the first connected tick and releases at the unchanged front/back throw tick for either player and facing', () => {
    for (const def of [labubuDef, twinkleDef]) for (const player of [0, 1] as const) {
      for (const facing of [1, -1] as const) for (const moveId of ['throw_fwd', 'throw_back'] as const) {
        const { sim, actor, victim, actorRuntime, victimRuntime, move } = startOrdinary(def, player, facing, moveId);
        const reaction = def.id === 'labubu' ? 'held_labubu_throw' : 'held_twinkle_throw';
        const timing = move.throwData!, hpBefore = victim.hp;
        const ticks: number[] = [];
        while (victim.state === 'thrown') {
          ticks.push(actor.stateFrame);
          expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: moveId, index: 1 });
          expect(connectedHeldReaction(sim, victim)).toEqual({ anim: reaction, index: 0 });
          expect(actor.facing).toBe(facing);
          expect(victim.x - actor.x).toBe(px(timing.holdOffset) * facing);
          const point = (runtime: AnimeRuntimeManifest, frame: string, socket: string, fighter: typeof actor) => attachmentPoint(runtime.attachments[frame]!, socket, {
            x: fighter.x / SUBPIXEL, y: fighter.y / SUBPIXEL, facing: fighter.facing,
            scaleX: 1 / (2 * runtime.textureDensity!), scaleY: 1 / (2 * runtime.textureDensity!),
          })!;
          const hand = point(actorRuntime, `${def.id}/${moveId}/1`, 'grip_gap', actor);
          const grip = point(victimRuntime, `twinkle/${reaction}/0`, 'grip', victim);
          expect(hand.x).toBeCloseTo(grip.x, 8); expect(hand.y).toBeCloseTo(grip.y, 8);
          expect(victim.hp).toBe(hpBefore);
          sim.step(neutral);
        }
        expect(ticks).toEqual(Array.from({ length: timing.releaseFrame }, (_, tick) => tick));
        expect(actor.stateFrame).toBe(timing.releaseFrame);
        expect(victim.state).toBe('hit_air');
        expect(connectedHeldReaction(sim, victim)).toBeNull();
        expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: moveId, index: 2 });
        expect(actorRuntime.foregroundFrames?.[`${def.id}/${moveId}/2`]).toBeUndefined();
        expect(actor.facing).toBe(moveId === 'throw_back' ? -facing : facing);
        expect(Math.sign(victim.x - actor.x)).toBe(actor.facing);
        expect(victim.hp).toBe(hpBefore - move.damage);
        for (let tick = timing.releaseFrame; tick < timing.duration!; tick++) {
          expect(actor.stateFrame).toBe(tick);
          expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: moveId, index: 2 });
          sim.step(neutral);
        }
        expect(actor.state).toBe('idle');
      }
    }
  });

  it('exits the paired reaction immediately on a real tech and retains the original eight-tick tech window', () => {
    for (const def of [labubuDef, twinkleDef]) for (const moveId of ['throw_fwd', 'throw_back'] as const) {
      for (const techTick of [3, 12]) {
        const { sim, actor, victim, move } = startOrdinary(def, 0, 1, moveId);
        expect(move.throwData!.techWindow).toBe(8);
        const hpBefore = victim.hp;
        for (let tick = 0; tick < techTick; tick++) sim.step(neutral);
        sim.step({ p1: 0, p2: Btn.C });
        if (techTick < 8) {
          expect(actor.state).toBe('throw_tech'); expect(victim.state).toBe('throw_tech');
          expect(connectedHeldReaction(sim, victim)).toBeNull();
          expect(victim.hp).toBe(hpBefore);
          for (let tick = 0; tick < 50; tick++) sim.step(neutral);
          expect(victim.hp).toBe(hpBefore);
        } else {
          expect(victim.state).toBe('thrown');
          expect(connectedHeldReaction(sim, victim)).not.toBeNull();
          victim.state = 'hit_stand';
          expect(connectedHeldReaction(sim, victim)).toBeNull();
        }
      }
    }
  });

  it('admits all reviewed victims and still blocks a missing matched reaction', async () => {
    const opponents: Record<string, AnimeRuntimeManifest> = { labubu: rows.labubu!.runtime, twinkle: rows.twinkle!.runtime };
    for (const name of ['luffy', 'akainu']) {
      opponents[name] = JSON.parse(await readFile(resolve(`public/assets/characters/${name}/anime/runtime.json`), 'utf8')) as AnimeRuntimeManifest;
    }
    for (const def of [labubuDef, twinkleDef]) for (const moveId of ['throw_fwd', 'throw_back']) {
      const move = def.moves.find(move => move.id === moveId)!;
      for (const [opponent, runtime] of Object.entries(opponents)) {
        const issues = sampleMoveIssues(move, rows[def.id]!.runtime, runtime);
        expect(issues, `${def.id}/${moveId} -> ${opponent}`).toEqual([]);
        const incomplete = structuredClone(runtime);
        delete incomplete.anims[def.id === 'labubu' ? 'held_labubu_throw' : 'held_twinkle_throw'];
        expect(sampleMoveIssues(move, rows[def.id]!.runtime, incomplete).length).toBeGreaterThan(0);
      }
    }
    expect(rows.labubu!.runtime.anims.held_labubu_throw?.frames).toBe(1);
    expect(rows.labubu!.runtime.anims.held_twinkle_throw?.frames).toBe(1);
  });
});
