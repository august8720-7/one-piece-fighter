"""Pack explicit, provenance-verified roster FX crops without changing RGBA pixels."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import shutil
from PIL import Image
from build_anime_atlas import NAME, integer, load_sources, pack_frames, rectangle

ROOT = Path(__file__).resolve().parents[1]
BACKUP_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/baseline')
EXPECTED = {'aokiji': ('ice_lance', 'ice_impact'), 'shanks': ('haki_wave', 'haki_impact')}
ROSTER_CHARACTERS = (
    'aokiji', 'kizaru', 'fujitora', 'ryokugyu', 'garp', 'shanks', 'zoro', 'sanji',
    'whitebeard', 'bigmom', 'kaido', 'sengoku', 'blackbeard', 'roger', 'rocks',
    'shiki', 'rayleigh', 'gaban', 'beckman',
)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')

def load_catalogs(names):
    """Read only named catalogs. Identical shared records are allowed; conflicts stop."""
    if not isinstance(names, list) or not names or not all(isinstance(name, str) and name for name in names) or len(set(names)) != len(names):
        raise ValueError('catalogs must be a nonempty explicit unique file list')
    catalog, receipts = {}, []
    for name in names:
        if not isinstance(name, str) or not name or Path(name).is_absolute():
            raise ValueError('catalog must be repository-relative')
        path = (ROOT / name).resolve()
        if not path.is_relative_to(ROOT.resolve()):
            raise ValueError('catalog must stay inside the repository')
        raw = path.read_bytes()
        data = json.loads(raw)
        if data.get('schemaVersion', 1) != 1 or not isinstance(data.get('sources'), dict):
            raise ValueError(f'Unsupported source catalog: {name}')
        for key, source in data['sources'].items():
            if key in catalog and catalog[key] != source:
                raise ValueError(f'Conflicting source catalog record: {key}')
            catalog[key] = source
        receipts.append({'file': name, 'sha256': digest(raw)})
    return catalog, receipts


def manifest_catalog_names(spec):
    if ('catalog' in spec) == ('catalogs' in spec):
        raise ValueError('Declare exactly one catalog or catalogs field')
    return [spec['catalog']] if 'catalog' in spec else spec['catalogs']


def explicit_frames(character, entry, version):
    if not isinstance(entry, dict):
        raise ValueError(f'{character}: explicit FX entry required')
    if version == 1:
        if character not in EXPECTED or set(entry) != {'source', 'crops'}:
            raise ValueError('Schema 1 supports only the original aokiji/shanks source/crops contract; use schema 2 for additional frames')
        if not isinstance(entry['crops'], dict) or set(entry['crops']) != set(EXPECTED[character]):
            raise ValueError(f'{character}: incomplete or extra FX frames')
        return {name: {'source': entry['source'], 'crop': entry['crops'][name]} for name in EXPECTED[character]}
    if set(entry) - {'frames', 'pages', 'animations'} or not isinstance(entry.get('frames'), dict) or not entry['frames']:
        raise ValueError(f'{character}: schema 2 requires nonempty explicit frames; optional pages/animations only')
    frames = entry['frames']
    for name, record in frames.items():
        if not isinstance(name, str) or not NAME.fullmatch(name) or not isinstance(record, dict) or set(record) != {'source', 'crop'}:
            raise ValueError(f'{character}/{name}: frame requires a valid name and only source/crop')
    return frames


def explicit_pages(character, entry, frames):
    pages = entry.get('pages', {'p0': list(frames)})
    if not isinstance(pages, dict) or not pages or list(pages) != [f'p{i}' for i in range(len(pages))]:
        raise ValueError(f'{character}: pages must be explicitly ordered p0, p1, ...')
    assigned = []
    for page, names in pages.items():
        if not isinstance(names, list) or not names or not all(isinstance(name, str) and name in frames for name in names):
            raise ValueError(f'{character}/{page}: pages must reference actual explicit frames')
        assigned.extend(names)
    if len(set(assigned)) != len(assigned) or set(assigned) != set(frames):
        raise ValueError(f'{character}: pages must assign every frame exactly once')
    return pages


def explicit_animations(character, entry, frames):
    animations = entry.get('animations', {})
    if not isinstance(animations, dict):
        raise ValueError(f'{character}: animations must be an explicit object')
    for name, animation in animations.items():
        if not isinstance(name, str) or not NAME.fullmatch(name) or not isinstance(animation, dict) or set(animation) != {'frames', 'ticks', 'loop'}:
            raise ValueError(f'{character}/{name}: animation requires frames/ticks/loop')
        mapping, ticks = animation['frames'], animation['ticks']
        if (not isinstance(mapping, list) or not mapping or not all(isinstance(frame, str) and frame in frames for frame in mapping)
                or not isinstance(ticks, list) or len(ticks) != len(mapping) or not all(integer(tick, 1) for tick in ticks)
                or not isinstance(animation['loop'], bool)):
            raise ValueError(f'{character}/{name}: animation references and positive per-frame ticks must match')
    return animations


def prepare(manifest):
    raw = Path(manifest).read_bytes()
    spec = json.loads(raw)
    if not isinstance(spec, dict) or set(spec) - {'schemaVersion', 'catalog', 'catalogs', 'maxCropEdgeAlpha', 'maxTextureSize', 'characters'}:
        raise ValueError('FX manifest must use only explicit schema/catalog/frame configuration fields')
    version = spec.get('schemaVersion')
    if type(version) is not int or version not in (1, 2):
        raise ValueError('schemaVersion must be 1 or 2')
    configured = spec.get('characters')
    if not isinstance(configured, dict) or not configured or set(configured) - set(ROSTER_CHARACTERS):
        raise ValueError('Only the 19 explicit PC roster characters are allowed')
    threshold = spec.get('maxCropEdgeAlpha', 4)
    if type(threshold) is not int or not 0 <= threshold <= 4:
        raise ValueError('maxCropEdgeAlpha must be 0..4; never permit a visible cut edge')
    catalog, catalog_receipts = load_catalogs(manifest_catalog_names(spec))
    sources, configured_frames = {}, {}
    for character, entry in configured.items():
        configured_frames[character] = explicit_frames(character, entry, version)
        for name, frame in configured_frames[character].items():
            key = frame['source']
            if not isinstance(key, str) or key not in catalog:
                raise ValueError(f'{character}/{name}: unknown explicit source {key}')
            source = catalog[key]
            if not isinstance(source, dict) or source.get('adoptionStatus') != 'shape_reviewed_candidate':
                raise ValueError(f'{key}: source must have an explicit visual review')
            sources[key] = source
    # Reuse all official-web source, prompt, reference and evidence hash checks.
    sheets = load_sources(sources)
    outputs, receipts = {}, []
    for character, entry in configured.items():
        crops, identities, rgba_hashes = {}, set(), set()
        for name, frame in configured_frames[character].items():
            sheet = sheets[frame['source']]
            rect = rectangle(frame['crop'], sheet.width, sheet.height, f'{character}/{name}')
            identity = (sources[frame['source']]['sha256'], *rect)
            if identity in identities:
                raise ValueError(f'{character}/{name}: duplicate crop; reuse the existing frame name instead of claiming an independent frame')
            identities.add(identity)
            x, y, w, h = rect
            crop = sheet.crop((x, y, x+w, y+h))
            if crop.getchannel('A').getbbox() is None:
                raise ValueError(f'{character}/{name}: empty alpha')
            rgba_hash = digest(crop.tobytes())
            if version == 2 and (crop.size, rgba_hash) in rgba_hashes:
                raise ValueError(f'{character}/{name}: identical RGBA crop; reuse its frame name instead of claiming a new pose')
            rgba_hashes.add((crop.size, rgba_hash))
            edges = [crop.crop((0,0,w,1)), crop.crop((0,h-1,w,h)),
                     crop.crop((0,0,1,h)), crop.crop((w-1,0,w,h))]
            edge_alpha = max(edge.getchannel('A').getextrema()[1] for edge in edges)
            if edge_alpha > threshold:
                raise ValueError(f'{character}/{name}: crop cuts visible alpha')
            crops[name] = {'rect': list(rect), 'image': crop, 'edgeAlpha': edge_alpha, 'source': frame['source']}
        folder = (ROOT/'public/assets/fx'/character).resolve()
        if not folder.is_relative_to((ROOT/'public/assets/fx').resolve()):
            raise ValueError('FX output escapes runtime directory')
        pages = {'p0': list(crops)} if version == 1 else explicit_pages(character, entry, crops)
        animations = {} if version == 1 else explicit_animations(character, entry, crops)
        page_records, records, frame_pages = [], [], {}
        for page_id, names in pages.items():
            selected = {name: crops[name]['image'] for name in names}
            if version == 1:
                # Keep the reviewed two-frame atlas bytes/layout unchanged.
                size = (sum(c.width+8 for c in selected.values())+8, max(c.height for c in selected.values())+16)
                if max(size) > 4096:
                    raise ValueError('FX page exceeds 4096 texture limit')
                positions, cursor = {}, 8
                for name, crop in selected.items():
                    positions[name] = (cursor, 8)
                    cursor += crop.width+8
            else:
                packed, positions = pack_frames(selected, spec.get('maxTextureSize', 4096))
                size = packed.size
            canvas = Image.new('RGBA', size)
            frames = {}
            for name, crop in selected.items():
                x, y = positions[name]
                # No mask: preserve even fractional alpha and hidden RGB exactly.
                canvas.paste(crop, (x, y))
                if canvas.crop((x,y,x+crop.width,y+crop.height)).tobytes() != crop.tobytes():
                    raise ValueError('RGBA preservation failed')
                frames[name] = {'frame': {'x':x,'y':y,'w':crop.width,'h':crop.height},
                                'rotated':False,'trimmed':False,
                                'spriteSourceSize': {'x':0,'y':0,'w':crop.width,'h':crop.height},
                                'sourceSize': {'w':crop.width,'h':crop.height}}
                frame_pages[name] = page_id
                row = crops[name]
                records.append({'name':name,'crop':row['rect'],'sourceKey':row['source'],
                                'sourceSha256':sources[row['source']]['sha256'],'page':page_id,
                                'rgbaSha256':digest(crop.tobytes()),'pixelsEqual':True,'maxCropEdgeAlpha':row['edgeAlpha']})
            stem = 'atlas' if page_id == 'p0' else f'atlas-{page_id}'
            png = io.BytesIO(); canvas.save(png,format='PNG')
            metadata = {'image':stem+'.png','size':{'w':size[0],'h':size[1]},'scale':'1','manifestSha256':digest(raw)}
            if version == 1:
                metadata['sourceSha256'] = sources[entry['source']]['sha256']
            else:
                metadata['sourceHashes'] = {key:sources[key]['sha256'] for key in sorted({crops[name]['source'] for name in names})}
            outputs[folder/(stem+'.png')] = png.getvalue()
            outputs[folder/(stem+'.json')] = json_bytes({'frames':frames,'meta':metadata})
            page_records.append({'id':page_id,'image':stem+'.png','data':stem+'.json','width':size[0],'height':size[1]})
        if version == 2:
            outputs[folder/'fx-runtime.json'] = json_bytes({'schemaVersion':1,'characterId':character,'pages':page_records,
                'framePages':frame_pages,'anims':animations,'manifestSha256':digest(raw)})
        receipts.append({'character':character,'sourceKey':entry.get('source'),'size':list(size) if len(pages)==1 else None,
                         'pages':page_records,'frames':records,'animations':animations})
    report = {'status':'packed-candidate-not-gameplay-acceptance','manifest':str(Path(manifest).resolve()),
              'manifestSha256':digest(raw),'catalog':spec.get('catalog'),'catalogSha256':catalog_receipts[0]['sha256'] if len(catalog_receipts)==1 else None,
              'catalogs':catalog_receipts,'schemaVersion':version,
              'sources':sources,'characters':receipts,
              'processing':'explicit original RGBA crop and packing; no alpha filtering, repaint, color change or rescale',
              'outputs':[{'file':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':digest(data)} for p,data in outputs.items()]}
    return outputs, report

def commit(outputs, report, report_path, replace=False, backup_dir=None, check=False):
    report_path = Path(report_path).resolve()
    if report_path in outputs or report_path.exists():
        raise FileExistsError('Report must be a new independent file')
    changed = [p for p,data in outputs.items() if p.exists() and p.read_bytes()!=data]
    if changed and not replace:
        raise FileExistsError(f'Preserve prior FX output: {changed[0]}; replacement requires a verified backup')
    backup = Path(backup_dir).resolve() if backup_dir else None
    if replace:
        if backup is None or not backup.is_relative_to(BACKUP_ROOT.resolve()) or backup == BACKUP_ROOT.resolve():
            raise ValueError('Replacement backup must be a new child of the authorized D:/ roster baseline directory')
        if backup.exists():
            raise FileExistsError('Backup directory must be new')
    if check:
        return {**report,'checkOnly':True,'wouldReplace':[str(p) for p in changed]}
    if changed:
        backup.mkdir(parents=True,exist_ok=False)
        (backup/'README.md').write_text('# Roster FX backup 1003\nCopy-before inventory precedes old atlas copies. SHA256 verified before replacing runtime files. Preserve all files.\n',encoding='utf-8')
        # Preserve every old page/runtime file of affected atlases. This inventory
        # is backup-only; it never discovers sources or adopts stray artwork.
        existing = sorted(p for folder in {c.parent for c in changed} for p in folder.iterdir() if p.is_file())
        inventory = [{'file':str(p),'backup':f'{p.parent.name}/{p.name}',
                      'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())} for p in existing]
        (backup/'copy-before.json').write_bytes(json_bytes(inventory))
        for row in inventory:
            old = Path(row['file']); dest = backup/row['backup']
            dest.parent.mkdir(exist_ok=True)
            shutil.copyfile(old,dest)
            if digest(dest.read_bytes()) != row['sha256'] or digest(old.read_bytes()) != row['sha256']:
                raise ValueError('Backup or original changed; no replacement permitted')
        (backup/'copy-after.json').write_bytes(json_bytes(inventory))
        report = {**report,'backup':str(backup),'backupVerified':True}
    for path,data in outputs.items():
        path.parent.mkdir(parents=True,exist_ok=True)
        readme = path.parent/'README.md'
        if not readme.exists():
            readme.write_text('# Roster development FX\nOnly explicit reviewed-source crops, atlas.png/json. Original images and source evidence remain separate. Not release acceptance.\n',encoding='utf-8')
        if not path.exists():
            with path.open('xb') as f:f.write(data)
        elif path.read_bytes()!=data:
            if path not in changed:
                raise ValueError('Output changed during preparation; refusing an unbacked replacement')
            path.write_bytes(data)
        if digest(path.read_bytes()) != digest(data):
            raise ValueError(f'Written output hash mismatch: {path}')
    report_path.parent.mkdir(parents=True,exist_ok=True)
    with report_path.open('xb') as f:f.write(json_bytes({**report,'checkOnly':False}))
    return report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',required=True)
    parser.add_argument('--report',required=True)
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--replace',action='store_true')
    parser.add_argument('--backup-dir')
    args = parser.parse_args()
    outputs, report = prepare(args.manifest)
    result = commit(outputs,report,args.report,args.replace,args.backup_dir,args.check)
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
