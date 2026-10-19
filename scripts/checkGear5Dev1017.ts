import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { luffyDef } from '@characters/luffy/def';
import { validateGear5Runtime } from '@render/anime/formAssets';
const baseline=process.argv[2];
if(!baseline)throw new Error('Usage: vite-node scripts/checkGear5Dev1017.ts <review-baseline-directory>');
const manifestPath=resolve('scripts/gear5_authoring1017.json');
const manifestRaw=readFileSync(manifestPath);
const manifest=JSON.parse(manifestRaw.toString('utf8'));
const config=manifest.characters.luffy;
const runtimePath=resolve('public/assets/characters/luffy/forms/gear5/runtime.json');
const runtime=JSON.parse(readFileSync(runtimePath,'utf8'));
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const errors=validateGear5Runtime(runtime,luffyDef);
const authorSha256=hash(manifestRaw);
if(runtime.formEvidence?.authorManifestSha256!==authorSha256)errors.push('Runtime is not bound to current author manifest');
const sourceHashes:Record<string,string>={};
for(const [key,source] of Object.entries(config.sources as Record<string,{file:string;sha256:string}>)) {
  const actual=hash(readFileSync(resolve(source.file)));sourceHashes[key]=actual;
  if(actual!==source.sha256||runtime.formEvidence?.sourceHashes?.[key]!==actual)errors.push(`Source hash mismatch: ${key}`);
}
const pageHashes:Record<string,string>={};
for(const page of runtime.pages as {image:string;data:string}[])for(const file of [page.image,page.data]) {
  const actual=hash(readFileSync(resolve(dirname(runtimePath),file)));pageHashes[file]=actual;
  if(runtime.formEvidence?.atlasHashes?.[file]!==actual)errors.push(`Page hash mismatch: ${file}`);
}
const baseBefore=JSON.parse(readFileSync(resolve(baseline,'base-png-before1017.json'),'utf8')) as {file:string;sha256:string}[];
const basePngs=baseBefore.map(item=>({...item,actualSha256:hash(readFileSync(resolve(item.file)))}));
for(const item of basePngs)if(item.sha256!==item.actualSha256)errors.push(`Base PNG changed: ${item.file}`);
const data={kind:'D-local-DEV-original-art-coverage-only-not-gameplay-or-production-acceptance',runtimePath,authorManifestSha256:authorSha256,review:runtime.formEvidence?.review,animations:Object.keys(runtime.anims).length,pageHashes,sourceHashes,legacyBasePngsUnchanged:basePngs.every(item=>item.sha256===item.actualSha256),basePngs,pendingContact:Object.keys(config.pendingContact??{}),actualGameControlsVerified:false,normalThrowCaptureHoldReleaseVerified:false,productionEncodingRun:false,published:false,validationErrors:errors};
writeFileSync(resolve(baseline,'dev-runtime-validation1017.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({runtimePath,authorManifestSha256:authorSha256,review:data.review,animations:data.animations,pages:runtime.pages.length,pendingContact:data.pendingContact,legacyBasePngsUnchanged:data.legacyBasePngsUnchanged,validationErrors:errors}));
if(errors.length)process.exitCode=1;
