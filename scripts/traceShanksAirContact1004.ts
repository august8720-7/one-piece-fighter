import { Btn, FightSim, GROUND_Y, SUBPIXEL, px } from '../src/core';
import { shanksDef } from '../src/characters/shanks/def';
import { aokijiDef } from '../src/characters/aokiji/def';

for (const hold of [1, 4]) {
  const sim = new FightSim({ p1: shanksDef, p2: aokijiDef, introFrames: 0, roundTime: -1 });
  sim.state.fighters[0].x = 0; sim.state.fighters[1].x = px(55);
  let pressed = false;
  const trace = [];
  for (let tick = 0; tick < 75; tick++) {
    const me = sim.state.fighters[0];
    const pressNow = me.airborne && me.vy > 0 && !pressed;
    if (pressNow) pressed = true;
    sim.step({ p1: tick < hold ? Btn.Up : pressNow ? Btn.C | Btn.D : 0, p2: 0 });
    if (me.airborne || me.moveId || pressNow) trace.push({ tick, pressed: pressNow, state: me.state,
      move: me.moveId, stateFrame: me.stateFrame, airborne: me.airborne,
      yRelativeToGround: (me.y - GROUND_Y) / SUBPIXEL, vy: me.vy / SUBPIXEL,
      x: me.x / SUBPIXEL, targetX: sim.state.fighters[1].x / SUBPIXEL,
      active: sim.currentFrame(me)?.hitboxes, hits: sim.hits.map(hit => ({ ...hit })) });
  }
  process.stdout.write(JSON.stringify({ jumpHeldFrames: hold, trace })+'\n');
}
