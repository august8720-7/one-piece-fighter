import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Btn, FightSim, SKILL_BUTTONS, SUBPIXEL, px, type FighterDef, type PlayerIndex } from '../src/core';
import { characters } from '../src/characters';
import { attachmentPoint, connectedHeldReaction, currentAnimation, heldReactionForMove, validateAnimeRuntimeManifest, type AnimeRuntimeManifest } from '../src/render/animations';
import { createSampleFighter, sampleMoveIssues, validateFullCoverage } from '../src/render/anime/sampleMode';

const ids = ['luffy', 'akainu', 'labubu', 'twinkle'] as const;
const runtimes = Object.fromEntries(ids.map(id => [id, JSON.parse(readFileSync(`public/assets/characters/${id}/anime/runtime.json`, 'utf8')) as AnimeRuntimeManifest]));
const neutral = { p1: 0, p2: 0 };
const throws = [
  { actor: 'labubu', move: 'sp_leg_flip', reaction: 'held_leg_flip' },
  { actor: 'labubu', move: 'throw_fwd', reaction: 'held_labubu_throw' },
  { actor: 'labubu', move: 'throw_back', reaction: 'held_labubu_throw' },
  { actor: 'twinkle', move: 'throw_fwd', reaction: 'held_twinkle_throw' },
  { actor: 'twinkle', move: 'throw_back', reaction: 'held_twinkle_throw' },
] as const;

function startThrow(actorDef: FighterDef, victimDef: FighterDef, moveId: string, player: PlayerIndex, facing: 1 | -1) {
  const actorRuntime = runtimes[actorDef.id]!, victimRuntime = runtimes[victimDef.id]!;
  const filteredActor = createSampleFighter(actorDef, actorRuntime, { opponentRuntime: victimRuntime });
  const filteredVictim = createSampleFighter(victimDef, victimRuntime, { opponentRuntime: actorRuntime });
  const special = moveId === 'sp_leg_flip';
  const sim = new FightSim({ p1: player === 0 ? filteredActor : filteredVictim, p2: player === 0 ? filteredVictim : filteredActor,
    introFrames: 0, roundTime: -1, controlModes: special ? ['simple', 'simple'] : ['classic', 'classic'] });
  const actor = sim.state.fighters[player], victim = sim.state.fighters[player === 0 ? 1 : 0];
  actor.x = px(-40) * facing; victim.x = actor.x + px(40) * facing;
  actor.facing = facing; victim.facing = facing === 1 ? -1 : 1;
  const direction = (moveId === 'throw_back' ? -facing : facing) === 1 ? Btn.Right : Btn.Left;
  const bits = special ? SKILL_BUTTONS[4]! : direction | Btn.C;
  sim.step(player === 0 ? { p1: bits, p2: 0 } : { p1: 0, p2: bits });
  for (let tick = 0; tick < 40 && actor.state !== 'throw'; tick++) sim.step(neutral);
  expect(actor.state).toBe('throw'); expect(actor.moveId).toBe(moveId); expect(actor.stateFrame).toBe(0);
  return { sim, actor, victim, actorRuntime, victimRuntime, move: actorDef.moves.find(move => move.id === moveId)! };
}

describe('merged actual conditional-held runtime assembly', () => {
  it('covers every actual ordered roster pairing while still refusing absent matched reactions', () => {
    for (const id of ids) expect(validateAnimeRuntimeManifest(runtimes[id]!, characters[id]!.moves)).toEqual([]);
    for (const p1 of ids) for (const p2 of ids) {
      expect(validateFullCoverage(characters[p1]!, runtimes[p1]!, characters[p2]!).ok, `${p1} receives ${p2}`).toBe(true);
      expect(validateFullCoverage(characters[p2]!, runtimes[p2]!, characters[p1]!).ok, `${p2} receives ${p1}`).toBe(true);
    }
    for (const spec of throws) for (const victim of ids) {
      const move = characters[spec.actor]!.moves.find(move => move.id === spec.move)!;
      expect(sampleMoveIssues(move, runtimes[spec.actor]!, runtimes[victim]!)).toEqual([]);
      const incomplete = structuredClone(runtimes[victim]!);
      delete incomplete.anims[spec.reaction];
      expect(sampleMoveIssues(move, runtimes[spec.actor]!, incomplete).length).toBeGreaterThan(0);
    }
    for (const oldCaster of ['luffy', 'akainu']) {
      for (const move of characters[oldCaster]!.moves.filter(move => move.type === 'throw')) expect(heldReactionForMove(oldCaster, move)).toBeNull();
    }
  });

  it('keeps the legacy held drawings on their appended page and actually binds both Akainu hat patches', () => {
    const manifest = JSON.parse(readFileSync('scripts/anime_manifest.json', 'utf8')) as {
      characters: Record<string, { pageBreakBefore: string[]; frames: Record<string, { sourcePatches?: Array<{ source: string; rect: number[] }> }>; anims: object }>;
    };
    for (const id of ['luffy', 'akainu']) {
      const runtime = runtimes[id]!, config = manifest.characters[id]!;
      expect(config.pageBreakBefore).toEqual(['held_leg_flip']);
      expect(Object.keys(config.anims).slice(-3)).toEqual(['held_leg_flip', 'held_labubu_throw', 'held_twinkle_throw']);
      const newPage = runtime.pages!.at(-1)!.id;
      for (const reaction of ['held_leg_flip', 'held_labubu_throw', 'held_twinkle_throw']) {
        expect(runtime.framePages?.[`${id}/${reaction}/0`]).toBe(newPage);
        if (id === 'akainu') expect(config.frames[reaction]!.sourcePatches).toEqual([
          { source: 'held_hat_fix_0927', rect: [475, 50, 42, 18] },
          { source: 'held_hat_fix_0927', rect: [1445, 100, 50, 22] },
        ]);
      }
      expect(runtime.framePages?.[`${id}/thrown/0`]).not.toBe(newPage);
    }
    for (const id of ids) for (const [reaction, ticks] of [['held_leg_flip', 24], ['held_labubu_throw', 22], ['held_twinkle_throw', 23]] as const) {
      expect(runtimes[id]!.anims[reaction]!.exposures).toEqual([{ frame: 0, ticks }]);
    }
  });

  it('aligns every new pair from first contact through real release in 80 center input paths', () => {
    let paths = 0;
    for (const spec of throws) for (const victimId of ids) for (const player of [0, 1] as const) for (const facing of [1, -1] as const) {
      const { sim, actor, victim, actorRuntime, victimRuntime, move } = startThrow(characters[spec.actor]!, characters[victimId]!, spec.move, player, facing);
      const timing = move.throwData!, hpBefore = victim.hp;
      const held: number[] = [];
      while (victim.state === 'thrown' && held.length <= timing.duration!) {
        held.push(actor.stateFrame);
        expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: spec.move, index: 1 });
        expect(connectedHeldReaction(sim, victim)).toEqual({ anim: spec.reaction, index: 0 });
        expect(victim.x - actor.x).toBe(px(timing.holdOffset) * facing);
        const point = (runtime: AnimeRuntimeManifest, name: string, socket: string, fighter: typeof actor) => attachmentPoint(runtime.attachments[name]!, socket, {
          x: fighter.x / SUBPIXEL, y: fighter.y / SUBPIXEL, facing: fighter.facing,
          scaleX: 1 / (2 * runtime.textureDensity!), scaleY: 1 / (2 * runtime.textureDensity!),
        })!;
        const hand = point(actorRuntime, `${spec.actor}/${spec.move}/1`, 'grip_gap', actor);
        const grip = point(victimRuntime, `${victimId}/${spec.reaction}/0`, 'grip', victim);
        expect(hand.x).toBeCloseTo(grip.x, 8); expect(hand.y).toBeCloseTo(grip.y, 8);
        expect(victim.hp).toBe(hpBefore);
        sim.step(neutral);
      }
      expect(held).toEqual(Array.from({ length: timing.releaseFrame }, (_, index) => index));
      expect(actor.stateFrame).toBe(timing.releaseFrame);
      expect(victim.state).toBe('hit_air'); expect(connectedHeldReaction(sim, victim)).toBeNull();
      expect(currentAnimation(sim, actor, actorRuntime.anims)).toEqual({ anim: spec.move, index: 2 });
      expect(actorRuntime.foregroundFrames?.[`${spec.actor}/${spec.move}/2`]).toBeUndefined();
      expect(victim.hp).toBe(hpBefore - move.damage);
      expect(actor.facing).toBe(spec.move === 'throw_back' ? -facing : facing);
      for (let tick = timing.releaseFrame; tick < timing.duration!; tick++) sim.step(neutral);
      expect(actor.state).toBe('idle');
      paths++;
    }
    expect(paths).toBe(80);
  }, 15000);

  it('releases the conditional pose without damage on real ordinary back-throw techs for every victim', () => {
    for (const actorId of ['labubu', 'twinkle']) for (const victimId of ids) {
      const { sim, actor, victim } = startThrow(characters[actorId]!, characters[victimId]!, 'throw_back', 1, -1);
      const hpBefore = victim.hp;
      for (let tick = 0; tick < 3; tick++) sim.step(neutral);
      sim.step({ p1: Btn.C, p2: 0 });
      expect(actor.state).toBe('throw_tech'); expect(victim.state).toBe('throw_tech');
      expect(connectedHeldReaction(sim, victim)).toBeNull();
      for (let tick = 0; tick < 50; tick++) sim.step(neutral);
      expect(victim.hp).toBe(hpBefore);
    }
  });
});
