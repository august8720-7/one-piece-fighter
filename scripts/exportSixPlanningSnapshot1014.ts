/** Planning-only data export; does not execute or mutate the simulation. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { luffyDef } from '../src/characters/luffy/def';
import { akainuDef } from '../src/characters/akainu/def';
import { labubuDef } from '../src/characters/labubu/def';
import { twinkleDef } from '../src/characters/twinkle/def';
import { aokijiDef } from '../src/characters/aokiji/def';
import { shanksDef } from '../src/characters/shanks/def';
import { luffyAi } from '../src/characters/luffy/ai';
import { akainuAi } from '../src/characters/akainu/ai';
import { labubuAi } from '../src/characters/labubu/ai';
import { twinkleAi } from '../src/characters/twinkle/ai';
import { aokijiAi } from '../src/characters/aokiji/ai';
import { shanksAi } from '../src/characters/shanks/ai';
import * as constants from '../src/core/constants';
import * as balance from '../src/core/balance';
import { Btn } from '../src/core/types';
import { DEFAULT_P1, DEFAULT_P2, DEFAULT_SIMPLE_P1, DEFAULT_SIMPLE_P2, P2_NO_NUMPAD, P2_SIMPLE_NO_NUMPAD } from '../src/input/keymap';

const root = resolve(process.cwd());
if (!/^D:[\\/]/i.test(root)) throw new Error('Planning exports must run from the D workspace');
const definitions = [luffyDef, akainuDef, labubuDef, twinkleDef, aokijiDef, shanksDef];
const ai = [luffyAi, akainuAi, labubuAi, twinkleAi, aokijiAi, shanksAi];
const files = [
  ...definitions.flatMap(def => ['def', 'moves', 'animations', 'ai'].map(name => `src/characters/${def.id}/${name}.ts`)),
  'src/core/types.ts', 'src/core/constants.ts', 'src/core/balance.ts', 'src/core/moveBuilder.ts',
  'src/core/FightSim.ts', 'src/input/keymap.ts', 'package.json', 'package-lock.json',
];
const sourceFiles = files.map(file => {
  const bytes = readFileSync(resolve(root, file));
  return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
const output = resolve(root, 'docs/specs/六人当前数据快照1014.json');
const snapshot = {
  schemaVersion: 1, snapshotDate: '2026-10-14', observedAtUtc: new Date().toISOString(),
  workspace: root, gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  note: 'Includes uncommitted character/core values. Current data, not a balance or Gear5 acceptance claim.',
  sourceFiles,
  units: { logicHz: 60, subpixelsPerPixel: 256, movement: 'integer subpixels per logic tick', boxes: 'pixel [x,y,w,h] relative to right-facing foot root', frameDuration: 'positive integer logic ticks', frameVelocityAndKnockback: 'pixels per tick', y: 'negative is up', meter: '100 units per bar; costs in meter units' },
  constants: Object.fromEntries(Object.entries(constants).filter(([, value]) => typeof value !== 'function')),
  balance,
  buttons: Object.fromEntries(Object.entries(Btn).filter(([key]) => Number.isNaN(Number(key)))),
  defaultKeys: { classicP1: DEFAULT_P1, classicP2: DEFAULT_P2, simpleP1: DEFAULT_SIMPLE_P1, simpleP2: DEFAULT_SIMPLE_P2, classicP2NoNumpad: P2_NO_NUMPAD, simpleP2NoNumpad: P2_SIMPLE_NO_NUMPAD },
  characters: definitions.map((definition, index) => ({ definition, ai: ai[index] })),
};
writeFileSync(output, JSON.stringify(snapshot, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
console.log(JSON.stringify({ output, characters: definitions.length, moves: definitions.reduce((sum, def) => sum + def.moves.length, 0), skills: definitions.reduce((sum, def) => sum + (def.skillSlots?.length ?? 0), 0), sourceFiles: sourceFiles.length }));
