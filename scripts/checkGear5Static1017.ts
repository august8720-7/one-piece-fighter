import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { luffyDef } from '@characters/luffy/def';
import { luffyGear5 } from '@characters/luffy/gear5';
import { DEFAULT_ANIMS, HELD_REACTION_ANIMS, validateAnimeRuntimeManifest } from '@render/animations';
const candidate=process.argv[2]; if(!candidate)throw new Error('Usage: vite-node scripts/checkGear5Static1017.ts <candidate-directory>');
const runtime=JSON.parse(readFileSync(resolve(candidate,'build/runtime.json'),'utf8'));
const moves=[...luffyDef.moves.filter(move=>move.id!=='sp_gear2'&&!Object.hasOwn(luffyGear5.replacements,move.id)),...luffyGear5.moves,luffyGear5.awakening];
const required=[...new Set([...Object.keys(DEFAULT_ANIMS).filter(id=>id!=='portrait'),...HELD_REACTION_ANIMS,...moves.map(move=>move.id)])];
const missing=required.filter(id=>!runtime.anims[id]);
const errors=validateAnimeRuntimeManifest(runtime,moves);
const data={kind:'static-full-coverage-clock-geometry-check-not-loader-or-gameplay-acceptance',requiredCount:required.length,covered:required.length-missing.length,missing,validationErrors:errors,actualRuntimeReview:runtime.formEvidence?.review,allGameControlsAndContactAccepted:false};
writeFileSync(resolve(candidate,'static-full-validation1017.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data));
if(errors.length||missing.length)process.exitCode=1;

