import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aokijiDef } from '../src/characters/aokiji/def';
import { labubuDef } from '../src/characters/labubu/def';
import { twinkleDef } from '../src/characters/twinkle/def';
import { HELD_REACTION_ANIMS, heldReactionFrameIssues, type AnimeRuntimeManifest } from '../src/render/animations';
import { validateFullCoverage } from '../src/render/anime/sampleMode';

const runtimeFile = resolve('public/assets/characters/aokiji/anime/runtime.json');
const bytes = readFileSync(runtimeFile);
const runtime = JSON.parse(bytes.toString('utf8')) as AnimeRuntimeManifest;
const base = validateFullCoverage(aokijiDef, runtime);
const labubu = validateFullCoverage(aokijiDef, runtime, labubuDef);
const twinkle = validateFullCoverage(aokijiDef, runtime, twinkleDef);
const reactions = HELD_REACTION_ANIMS.map(name => ({
  name, errors: heldReactionFrameIssues('aokiji', runtime.anims, runtime.attachments, name),
}));
const report = {
  checkedAt: new Date().toISOString(),
  meaning: 'Structural body resource/timing only. Requires normal-speed, contact, FX, sound, CPU, full-match, and public acceptance.',
  runtimeFile, runtimeSha256: createHash('sha256').update(bytes).digest('hex'),
  movesRequired: aokijiDef.moves.length,
  skillsRequired: aokijiDef.skillSlots?.length,
  base, labubu, twinkle, reactions,
  ok: base.ok && labubu.ok && twinkle.ok && reactions.every(row => row.errors.length === 0),
};
const output = process.argv[2];
if (!output) throw new Error('Provide a new explicit report path inside the prepared evidence folder.');
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
if (!report.ok) process.exitCode = 1;
