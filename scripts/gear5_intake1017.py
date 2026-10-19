"""Explicit reviewed Gear5 crop intake using the existing anime atlas builder.

No grid guessing, image editing, generated pixels, repeated frame filling,
canonical adoption, browser or model invocation. All products are D candidates.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')
BASE = WORK / 'candidate'


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')


def output_folder(path):
    path = path.resolve()
    require(path.is_relative_to(BASE.resolve()) and path != BASE.resolve(), 'Output must be a new child of six-game1014/candidate on D')
    require(not path.exists(), 'Output already exists; choose a new timestamp, never overwrite an intake')
    path.mkdir(parents=True)
    (path / 'README.md').write_text('# Gear5 explicit intake1017\nCandidate only. Originals are unchanged; coordinates/root/unitScale must be reviewed. No automatic cell detection, frame duplication, canonical adoption or gameplay acceptance.\n', encoding='utf-8')
    return path


def image_info(path):
    from PIL import Image
    require(path.is_file() and path.resolve().drive.lower() == 'd:', 'An actual D-drive PNG is required')
    with Image.open(path) as image:
        require(image.format == 'PNG', 'Source must be original PNG')
        image.load()
        require(image.mode == 'RGBA', 'Original must contain a real RGBA channel; no implicit conversion')
        alpha = image.getchannel('A')
        low, high = alpha.getextrema()
        histogram = alpha.histogram()
        return {'path': str(path), 'sha256': sha(path), 'bytes': path.stat().st_size,
                'format': image.format, 'mode': image.mode, 'width': image.width, 'height': image.height,
                'alphaMin': low, 'alphaMax': high, 'transparentPixels': histogram[0],
                'partialAlphaPixels': sum(histogram[1:255]), 'opaquePixels': histogram[255],
                'hasVisibleAndTransparentPixels': high > 0 and low < 255,
                'visibleBounds': alpha.getbbox(), 'visualIdentityReviewed': False}


def preserve_originals(out, paths):
    rows = [{'path': str(path), 'sha256': sha(path), 'bytes': path.stat().st_size,
             'copy': f'originals/{index:02}-{path.name}'} for index, path in enumerate(paths, 1)]
    save(out / 'copy-before.json', rows)
    (out / 'originals').mkdir()
    for row in rows:
        target = out / row['copy']
        shutil.copyfile(row['path'], target)
        require(sha(target) == row['sha256'], 'Original preservation hash mismatch')
    save(out / 'copy-after.json', [{**row, 'shaMatched': True} for row in rows])


def target_map():
    # Evaluate actual TypeScript definitions through the existing Vite SSR loader,
    # with no browser/server listen and a D-only cache. No guessed move durations.
    code = """
import {createServer} from 'vite'; import fs from 'node:fs'; import {createHash} from 'node:crypto';
const server=await createServer({root:process.cwd(),configFile:false,publicDir:false,resolve:{alias:{'@core':process.cwd()+'/src/core','@characters':process.cwd()+'/src/characters'}},cacheDir:'D:/one-piece-fighter-crossover-0922/tools/cache1013/vite-intake1017',server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
 const {luffyDef:d}=await server.ssrLoadModule('/src/characters/luffy/def.ts');
 const {DEFAULT_ANIMS,HELD_REACTION_ANIMS}=await server.ssrLoadModule('/src/render/animations.ts');
 const path='public/assets/characters/luffy/anime/runtime.json',bytes=fs.readFileSync(path),runtime=JSON.parse(bytes);
 const moves=[...d.moves.filter(m=>m.id!=='sp_gear2'&&!Object.hasOwn(d.gear5.replacements,m.id)),...d.gear5.moves,d.gear5.awakening];
 const targets=[...new Set([...Object.keys(DEFAULT_ANIMS).filter(id=>id!=='portrait'),...HELD_REACTION_ANIMS,...moves.map(m=>m.id)])].map(id=>{
  const move=moves.find(m=>m.id===id),base=runtime.anims[id];
  return {id,kind:move?'move':HELD_REACTION_ANIMS.includes(id)?'conditional-held':'state',baselineRuntime:base??null,
   logic:move?{totalTicks:move.frames.reduce((s,f)=>s+f.duration,0),segments:move.frames.map(f=>({sprite:f.sprite,ticks:f.duration,active:!!f.hitboxes?.length,hitId:f.hitId??null,hitboxes:f.hitboxes??[]})),throwSpec:move.throwData??null}:null,
   productionFrameCount:null,artStatus:'not-produced',note:'Baseline exposures/logic are timing evidence, not a requirement to duplicate old frame counts or reuse base pixels.'};
 });
 console.log('GEAR5_TARGET_JSON='+JSON.stringify({schemaVersion:1,characterId:'luffy',formId:'gear5',runtimePath:path,runtimeSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes:Object.fromEntries(['src/characters/luffy/def.ts','src/characters/luffy/gear5.ts','src/render/animations.ts','src/render/anime/formAssets.ts'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),replacements:d.gear5.replacements,excluded:['portrait','sp_gear2',...Object.keys(d.gear5.replacements)],targets}));
}finally{await server.close();}
"""
    result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, text=True, encoding='utf-8', capture_output=True, check=True)
    marker = next(line for line in result.stdout.splitlines() if line.startswith('GEAR5_TARGET_JSON='))
    value = json.loads(marker.split('=', 1)[1])
    value['observedAtUtc'] = datetime.now(timezone.utc).isoformat()
    sample = {'idle', 'walk_fwd', 'walk_back', 'st_a', 'hit_stand'}
    for target in value['targets']:
        target['productionBatch'] = ('first-four-action-sample' if target['id'] in sample else
            'conditional-held-contact' if target['kind'] == 'conditional-held' else
            'awakening-36tick-two-pack' if target['id'] == 'g5_awakening' else
            'three-real-gear5-moves' if target['id'].startswith('g5_') else
            'retained-throws' if target['id'] in {'throw', 'throw_fwd', 'throw_back', 'thrown', 'throw_tech'} else
            'retained-attacks' if target['kind'] == 'move' else 'remaining-mobility-reaction-result')
    return value


def intake(path, out, allow_partial=False):
    require(path.drive.lower() == 'd:' and path.is_file(), 'Reviewed intake JSON must be an actual D-drive file')
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    require(manifest.get('schemaVersion') == 1 and set(manifest.get('characters', {})) == {'luffy'}, 'Use the existing single-character schema1/characters.luffy contract')
    config = manifest['characters']['luffy']
    require(config.get('formId') == 'gear5' and config.get('formReview', 'candidate-not-accepted') == 'candidate-not-accepted', 'Intake can only create an unaccepted Gear5 candidate')
    require(config.get('scale') == 0.22 and config.get('textureDensity') == 2, 'Preserve the current character-wide0.22 scale/density2; calibrate each source once through unitScale')
    review = manifest.get('intakeReview', {})
    require(review.get('status') == 'coordinates-reviewed' and isinstance(review.get('basis'), str) and review['basis'].strip(), 'Explicit coordinate/root review basis is mandatory')
    spec = importlib.util.spec_from_file_location('existing_anime_builder1017', ROOT / 'scripts/build_anime_atlas.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    images = builder.load_sources(config.get('sources'))
    source_info = {}
    for name, source in config['sources'].items():
        require(source.get('formId') == 'gear5' and isinstance(source.get('unitScale'), (int, float)) and not isinstance(source['unitScale'], bool)
                and math.isfinite(source['unitScale']) and 0 < source['unitScale'] <= 8,
                'Every form source needs an explicit reviewed positive unitScale')
        require(isinstance(source.get('scaleBasis'), str) and source['scaleBasis'].strip(), 'Every source requires one fixed-pose scaleBasis; no per-pose fit')
        source_info[name] = image_info((ROOT / source['file']).resolve())
    anims, frames = config.get('anims', {}), config.get('frames', {})
    required = {'idle', 'st_a', 'hit_stand'} | (set() if allow_partial else {'walk_fwd'})
    require(required <= set(anims) and set(anims) <= {'idle', 'walk_fwd', 'walk_back', 'st_a', 'hit_stand'}, 'First sample must contain the required reviewed actions; --allow-partial explicitly permits missing walk')
    pixel_hashes = {}
    for name, frame in frames.items():
        require(set(frame) <= {'source', 'crop', 'root', 'sockets', 'transparency', 'note'}, f'{name}: first intake does not allow transforms, deletion masks, patches or exclusion rectangles')
        require(frame.get('transparency', {}).get('mode') in {'source-alpha', 'border-key'}, f'{name}: explicit existing transparency policy required; no inferred background key')
        image, _, _ = builder.prepare_frame(images[frame['source']], frame, 1, images)
        require(image.getchannel('A').getbbox() is not None, f'{name}: empty crop')
        pixel_hashes[name] = hashlib.sha256(str(image.size).encode() + image.tobytes()).hexdigest()
    for name, anim in anims.items():
        mapping = anim['frames']
        require(len(mapping) == len(set(mapping)), f'{name}: repeated crop mapping is not animation coverage')
        require(len({pixel_hashes[key] for key in mapping}) == len(mapping), f'{name}: duplicate image pixels cannot supply distinct frames')
        require(anim['loop'] == (name in {'idle', 'walk_fwd', 'walk_back'}), f'{name}: incorrect loop policy')
        timing = builder.exposures(anim.get('exposures'), len(mapping), name)
        require({entry['frame'] for entry in timing} == set(range(len(mapping))), f'{name}: every distinct frame must be genuinely shown')
        if name == 'st_a':
            require(timing == [{'frame': 0, 'ticks': 4}, {'frame': 1, 'ticks': 3}, {'frame': 2, 'ticks': 7}], 'st_a must keep the actual4/3/7 startup/active/recovery timing')
        if name in {'walk_fwd', 'walk_back'}:
            ticks = 6 if name == 'walk_fwd' else 8
            require(len(mapping) == 4 and timing == [{'frame': index, 'ticks': ticks} for index in range(4)], f'{name}: four reviewed distinct poses at{ticks} ticks each required')
    raw = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    # Reuse the real builder, including provenance, crop bounds, transparent pixels,
    # root/socket structure, mappings, page packing and all output identities.
    outputs, report = builder.build_character('luffy', config, hashlib.sha256(raw).hexdigest(), 'gear5')
    preserve_originals(out, [path.resolve(), *[(ROOT / source['file']).resolve() for source in config['sources'].values()]])
    (out / 'author-manifest.json').write_bytes(raw)
    built = out / 'build'
    built.mkdir()
    (built / 'README.md').write_text(f'# Normal-speed Gear5 sample\nExplicit{len(anims)}-action candidate only ({", ".join(anims)}), candidate-not-accepted; no base asset or runtime gate writes. Build generated by existing build_anime_atlas.py. Missing walk is never filled.\n', encoding='utf-8')
    for name, data in outputs.items():
        (built / name).write_bytes(data)
    save(out / 'intake-report.json', {'sourceInfo': source_info, 'authorManifestSha256': hashlib.sha256(raw).hexdigest(),
         'pixelHashesBeforeScale': pixel_hashes, 'buildReport': report, 'adopted': False, 'normalSpeedBrowserVerified': False})
    print(json.dumps({'authorManifest': str(out / 'author-manifest.json'), 'build': str(built), 'animations': list(anims),
                      'missingSampleActions': sorted({'idle', 'walk_fwd', 'st_a', 'hit_stand'} - set(anims)), 'adopted': False}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--inspect', type=Path, help='Verify/preserve an actual D PNG; no coordinates inferred')
    mode.add_argument('--intake', type=Path, help='Reviewed explicit builder-schema sample manifest')
    mode.add_argument('--targets', action='store_true', help='Read actual current runtime/core and export bounded production targets')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--allow-partial', action='store_true', help='Explicit three-action preview while real walk awaits repair; never full sample acceptance')
    args = parser.parse_args()
    require(ROOT == Path('D:/Projects/one-piece-fighter') and sys.dont_write_bytecode, 'Use the D workspace through run-d1013.ps1 and Python -B')
    out = output_folder(args.output)
    if args.inspect:
        info = image_info(args.inspect.resolve())
        preserve_originals(out, [args.inspect.resolve()])
        save(out / 'png-inspection.json', info)
        print(json.dumps(info))
    elif args.targets:
        targets = target_map()
        save(out / 'production-targets.json', targets)
        print(json.dumps({'file': str(out / 'production-targets.json'), 'targets': len(targets['targets']), 'artProduced': False}))
    else:
        intake(args.intake.resolve(), out, args.allow_partial)


if __name__ == '__main__':
    main()
