import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FightSim, SKILL_BUTTONS, px } from '../src/core';
import { labubuDef, twinkleDef } from '../src/characters';
import { currentAnimation, validateAnimeRuntimeManifest, type AnimDef, type AnimeRuntimeManifest, type FrameExposure } from '../src/render/animations';

const run = promisify(execFile);
const python = process.env.OPF_PYTHON ?? 'python';
const base = {
  frames: { prepare: {}, hold: {}, release: {}, unrelated: {} },
  animations: { sp_leg_flip: { frames: ['prepare', 'hold', 'release'], ticks: [12, 4, 28], loop: false,
    throwFrames: ['hold', 'release'], throwTicks: [24, 22] } },
};
interface Row { frames: string[]; loop: boolean; exposures: FrameExposure[]; throwExposures: FrameExposure[] }

async function assemble(configs: unknown[]): Promise<Array<{ row?: Row; error?: string }>> {
  const code = `import json,sys
sys.path.insert(0, ${JSON.stringify(resolve('scripts'))})
import build_crossover_manifest0922 as builder
results=[]
for config in json.loads(sys.argv[1]):
 try: results.append({'row':builder.animations(config)['sp_leg_flip']})
 except ValueError as error: results.append({'error':str(error)})
print(json.dumps(results))`;
  const result = await run(python, ['-c', code, JSON.stringify(configs)]);
  return JSON.parse(result.stdout) as Array<{ row?: Row; error?: string }>;
}

function runtime(row: Row): AnimeRuntimeManifest {
  const animation: AnimDef = { frames: row.frames.length, fps: 60, loop: row.loop, pixelArt: false,
    exposures: row.exposures, throwExposures: row.throwExposures };
  return { schemaVersion: 1, characterId: 'labubu', style: 'anime', continuous: true,
    atlas: { image: 'atlas.png', data: 'atlas.json' }, anims: { sp_leg_flip: animation },
    attachments: Object.fromEntries(row.frames.map((_, index) => [`labubu/sp_leg_flip/${index}`, {
      size: { width: 80, height: 100 }, root: { x: 40, y: 100 }, sockets: {},
    }])) };
}

describe('independent connected-throw frame selection', () => {
  it('keeps startup separate, holds from connection through tick 23, and releases at the actual tick 24', async () => {
    const { row } = (await assemble([base]))[0]!;
    const art = runtime(row!);
    expect(validateAnimeRuntimeManifest(art, labubuDef.moves)).toEqual([]);
    const sim = new FightSim({ p1: labubuDef, p2: twinkleDef, introFrames: 0, roundTime: -1, controlModes: ['simple', 'simple'] });
    const [actor, victim] = sim.state.fighters;
    actor.x = px(-40); victim.x = px(-2); actor.facing = 1; victim.facing = -1;
    sim.step({ p1: SKILL_BUTTONS[4]!, p2: 0 });
    expect(currentAnimation(sim, actor, art.anims)).toEqual({ anim: 'sp_leg_flip', index: 0 });
    for (let tick = 0; tick < 30 && actor.state !== 'throw'; tick++) sim.step({ p1: 0, p2: 0 });
    expect(actor.state).toBe('throw');
    for (let tick = 0; tick < 46; tick++) {
      expect(actor.stateFrame).toBe(tick);
      expect(currentAnimation(sim, actor, art.anims)).toEqual({ anim: 'sp_leg_flip', index: tick < 24 ? 1 : 2 });
      if (tick < 24) expect(victim.state).toBe('thrown');
      if (tick === 24) expect(victim.state).toBe('hit_air');
      sim.step({ p1: 0, p2: 0 });
    }
    expect(actor.state).toBe('idle');
    for (const wrongTicks of [21, 23]) {
      const invalid = structuredClone(art);
      invalid.anims.sp_leg_flip!.throwExposures = [{ frame: 1, ticks: 24 }, { frame: 2, ticks: wrongTicks }];
      expect(validateAnimeRuntimeManifest(invalid, labubuDef.moves)).toContain('sp_leg_flip: throw duration mismatch');
    }
  });

  it('preserves the old positional sequence when throwFrames is omitted, including repeated crop names', async () => {
    const legacy = structuredClone(base) as unknown as { frames: object; animations: Record<string, Record<string, unknown>> };
    delete legacy.animations.sp_leg_flip!.throwFrames;
    legacy.animations.sp_leg_flip!.frames = ['prepare', 'hold', 'hold'];
    legacy.animations.sp_leg_flip!.throwTicks = [12, 12, 22];
    const { row } = (await assemble([legacy]))[0]!;
    expect(row!.throwExposures).toEqual([{ frame: 0, ticks: 12 }, { frame: 1, ticks: 12 }, { frame: 2, ticks: 22 }]);
  });

  it('rejects orphan selectors, unrelated crops, invalid tick counts and zero-tick workarounds', async () => {
    const variations: Array<Record<string, unknown>> = [
      { throwFrames: ['hold'], throwTicks: undefined },
      { throwFrames: [] }, { throwFrames: ['unrelated'] }, { throwFrames: ['absent'] },
      { throwFrames: 'hold' }, { throwFrames: [1] }, { throwTicks: [46] },
      { throwTicks: [0, 46] }, { throwTicks: [-1, 47] }, { throwTicks: [true, 45] }, { throwTicks: [24.5, 21.5] },
    ];
    const results = await assemble(variations.map(change => ({ ...base, animations: {
      sp_leg_flip: { ...base.animations.sp_leg_flip, ...change },
    } })));
    expect(results).toHaveLength(variations.length);
    expect(results.every(result => typeof result.error === 'string' && !result.row)).toBe(true);
  });
});
