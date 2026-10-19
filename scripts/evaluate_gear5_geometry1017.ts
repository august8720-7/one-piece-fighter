/** Read-only FightSim proposal experiment. Never changes runtime data or grants art acceptance. */
import { readFileSync, writeFileSync } from 'node:fs';
import { Btn, FightSim, px, type BoxPx, type FighterDef, type MoveData } from '../src/core';
import { luffyDef } from '../src/characters/luffy/def';
import { akainuDef } from '../src/characters/akainu/def';

const proposal = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as Record<string, BoxPx[]>;
const proposedMoves = luffyDef.gear5!.moves.map(move => {
  const boxes = proposal[move.id];
  if (!boxes) return move;
  let activeIndex = 0;
  return { ...move, frames: move.frames.map(frame => frame.hitboxes
    ? { ...frame, hitboxes: [boxes[activeIndex++]!] } : frame) };
});
function withoutGeometry(moves: readonly MoveData[]) {
  return JSON.stringify(moves, (key, value) => key === 'hitboxes' ? undefined : value);
}
if (withoutGeometry(proposedMoves) !== withoutGeometry(luffyDef.gear5!.moves)) throw Error('Proposal changed non-geometric data');
const candidate: FighterDef = { ...luffyDef, gear5: { ...luffyDef.gear5!, moves: proposedMoves } };
const results: unknown[] = [];
function confirmIntoSlam(def: FighterDef, distance: number) {
  const sim = new FightSim({ p1: def, p2: akainuDef, introFrames: 0, roundTime: -1,
    controlModes: ['simple', 'classic'], gear5Enabled: [true, false] });
  const [player, opponent] = sim.state.fighters;
  player.meter = 300; sim.step({ p1: Btn.Awakening, p2: 0 });
  for (let i = 0; i < 36; i++) sim.step({ p1: 0, p2: 0 });
  player.x = 0; opponent.x = px(distance);
  const events: unknown[] = [];
  let third = false;
  sim.step({ p1: Btn.Skill1, p2: 0 });
  for (let i = 0; i < 100; i++) {
    sim.step({ p1: 0, p2: 0 });
    for (const event of sim.hits) if (event.attacker === 0 && event.kind === 'hit') {
      events.push({ moveId: event.moveId, damage: event.damage, hitId: sim.currentFrame(player)?.hitId,
        frame: event.frame, defenderBefore: event.defenderBefore });
      if (sim.currentFrame(player)?.hitId === 3) third = true;
    }
    if (third) break;
  }
  const frozenFrame = player.stateFrame, cancelUntil = player.cancelUntil;
  const hitstop = player.hitstop;
  for (let i = 0; i < hitstop; i++) sim.step({ p1: 0, p2: 0 });
  const windowPreserved = player.stateFrame === frozenFrame && player.cancelUntil === cancelUntil;
  const available = sim.skillAvailability(0, 1).available;
  sim.step({ p1: Btn.Skill2, p2: 0 });
  const accepted = player.moveId === 'g5_bounce_slam';
  for (let i = 0; i < 95; i++) {
    sim.step({ p1: 0, p2: 0 });
    for (const event of sim.hits) if (event.attacker === 0 && event.moveId === 'g5_bounce_slam') events.push({
      moveId: event.moveId, damage: event.damage, kind: event.kind, frame: event.frame, defenderBefore: event.defenderBefore,
      rootGap: (opponent.x - player.x) / 256,
    });
  }
  return { distance, thirdRealHit: third, frozenFrame, cancelUntil, hitstop, windowPreserved,
    unfrozenTicksWaitedBeforeE: 0, available, accepted, events, totalHpLost: opponent.def.maxHp - opponent.hp };
}
function trial(label: string, def: FighterDef, slot: number, distance: number, p2: number, jumpLead = -1) {
  const sim = new FightSim({ p1: def, p2: akainuDef, introFrames: 0, roundTime: -1,
    controlModes: ['simple', 'classic'], gear5Enabled: [true, false] });
  const [player, opponent] = sim.state.fighters;
  player.meter = 300;
  sim.step({ p1: Btn.Awakening, p2: 0 });
  for (let i = 0; i < 36; i++) sim.step({ p1: 0, p2: 0 });
  player.x = 0; opponent.x = px(distance);
  const events: unknown[] = [];
  const startHp = opponent.hp;
  if (jumpLead >= 0) for (let i = 0; i < jumpLead; i++) sim.step({ p1: 0, p2: Btn.Up });
  const castFrame = sim.state.frame;
  const input = [Btn.Skill1, Btn.Skill2, Btn.Skill3][slot]!;
  const moveId = def.gear5!.moves[slot]!.id;
  for (let i = 0; i < 110; i++) {
    sim.step({ p1: i === 0 ? input : 0, p2: jumpLead >= 0 ? Btn.Up : p2 });
    for (const event of sim.hits) if (event.attacker === 0 && event.moveId === moveId) events.push({
      kind: event.kind, relativeTick: event.frame - castFrame, damage: event.damage,
      hitId: sim.currentFrame(player)?.hitId, rootGap: (opponent.x - player.x) / 256,
      targetRootY: opponent.y / 256,
    });
  }
  results.push({ variant: label, moveId, distance, target: jumpLead >= 0 ? `natural-jump-lead-${jumpLead}` : p2 === Btn.Down ? 'crouch' : p2 === Btn.Right ? 'standing-guard' : 'standing',
    hpLost: startHp - opponent.hp, events });
}
for (const [label, def] of [['baseline', luffyDef], ['proposal', candidate]] as const) {
  for (const distance of [60, 85, 105, 130]) trial(label, def, 0, distance, 0);
  trial(label, def, 0, 85, Btn.Right);
  for (const distance of [60, 85, 110, 170]) trial(label, def, 1, distance, Btn.Down);
  trial(label, def, 1, 60, Btn.Right);
  for (const distance of [60, 85, 125]) trial(label, def, 2, distance, 0, 0);
  trial(label, def, 2, 85, 0, 10);
  trial(label, def, 2, 85, 0);
  trial(label, def, 2, 125, 0);
}
const report = JSON.stringify({ kind: 'real-FightSim-read-only-geometry-proposal-not-adoption', onlyHitboxesChanged: true,
  setup: 'Akainu target; real 300-meter activation +36 ticks, then explicit training positions; every hit/block from actual sim inputs/collision; no forced hit/HP/stun/air state', proposal, results,
  thirdHitIntoE: [60, 85].map(distance => confirmIntoSlam(candidate, distance)) }, null, 2);
if (process.argv[3]) writeFileSync(process.argv[3], report + '\n');
else console.log(report);
