"""Explicit non-central marine art intake; no generation, inferred poses, or game writes."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw
from aokiji_intake_helpers1003 import diagnose, inspected_crops, main_components

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'scripts/roster_marine_sources0929.json'
ALLOWED = {'kizaru','fujitora','ryokugyu','garp','sengoku'}

def sha(value):
    return hashlib.sha256(value).hexdigest()

def save(path, value):
    with Path(path).open('x',encoding='utf8') as stream:
        json.dump(value,stream,ensure_ascii=False,indent=2)
        stream.write('\n')

def copy_png(source, destination, folder):
    assert (folder / 'README.md').is_file()
    destination = destination.resolve()
    assert destination.is_relative_to((ROOT/'public/assets/generated/source').resolve())
    value = source.read_bytes()
    assert value.startswith(b'\x89PNG\r\n\x1a\n')
    assert value.endswith(bytes.fromhex('0000000049454e44ae426082'))
    with Image.open(io.BytesIO(value)) as image:
        assert image.format == 'PNG'
        image.verify()
    with Image.open(io.BytesIO(value)) as image:
        rgba = image.convert('RGBA')
        rgba.load()
    assert source.read_bytes() == value, 'Download still changing'
    before = {'source':str(source),'destination':str(destination),'bytes':len(value),
              'sha256':sha(value),'size':list(rgba.size),
              'alpha':list(rgba.getchannel('A').getextrema()),
              'originalDownloadSuffix':source.suffix,
              'verified':['PNG signature','terminal IEND','Pillow verify','complete RGBA decode','stable repeated bytes'],
              'observedAt':datetime.now().astimezone().isoformat()}
    save(folder/'copy-before1003.json',before)
    with destination.open('xb') as stream:
        stream.write(value)
    copied = destination.read_bytes()
    assert sha(copied) == sha(value)
    save(folder/'copy-after1003.json',{**before,'copiedSha256':sha(copied),'equal':True,'originalPreserved':source.is_file()})
    white = Image.new('RGBA',rgba.size,'white')
    white.alpha_composite(rgba)
    white.convert('RGB').save(folder/'source-white1003.png')
    print(json.dumps(before,ensure_ascii=False))

def register(character_id, recipe_path):
    assert character_id in ALLOWED
    recipe = json.loads(recipe_path.read_text(encoding='utf8'))
    assert recipe['characterId'] == character_id
    folder = Path(recipe['evidenceDir'])
    assert (folder/'README.md').is_file()
    manifest_path = ROOT/f'scripts/roster_{character_id}_manifest0929.json'
    before = manifest_path.read_bytes()
    manifest = json.loads(before)
    assert list(manifest['characters']) == [character_id]
    char = manifest['characters'][character_id]
    source = json.loads(json.dumps(json.loads(CATALOG.read_text(encoding='utf8'))['sources'][recipe['sourceKey']]))
    assert source['sha256'] == recipe['sourceHash']
    path = ROOT/source['file']
    assert sha(path.read_bytes()) == recipe['sourceHash']
    image = Image.open(path).convert('RGBA')
    image.load()
    reference = recipe['scaleReference']
    x,y,w,h = reference['crop']
    ref = image.crop((x,y,x+w,y+h))
    for rx,ry,rw,rh in reference.get('excludeRects',[]):
        ref.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
    bb = ref.getchannel('A').point(lambda v:255 if v>=64 else 0).getbbox()
    height = bb[3]-bb[1]
    assert height == reference['expectedHeight64']
    source['unitScale'] = reference['targetSourceHeight']/height
    source['scaleBasis'] = reference['basis']
    char['sources'][recipe['sourceKey']] = source
    world = char['scale']*source['unitScale']/2
    (folder/'authoring-before.json').write_bytes(before)
    rows = []
    for name,frame in recipe['frames'].items():
        assert name not in char['frames'],'Preserve old frames'
        frame = {**frame,'source':recipe['sourceKey'],'transparency':{'mode':'source-alpha'}}
        char['frames'][name] = frame
        x,y,w,h = frame['crop']
        cut = image.crop((x,y,x+w,y+h))
        for rx,ry,rw,rh in frame.get('excludeRects',[]):
            cut.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
        bb16 = cut.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox()
        assert bb16 and all(v>0 for v in [bb16[0],bb16[1],w-bb16[2],h-bb16[3]])
        rx,ry = frame['root']
        sockets = frame.get('sockets',{})
        white = Image.new('RGBA',cut.size,'white')
        white.alpha_composite(cut)
        draw = ImageDraw.Draw(white)
        draw.line((rx-5,ry,rx+5,ry),fill='red',width=2)
        draw.line((rx,ry-5,rx,ry+5),fill='red',width=2)
        for px,py in sockets.values():
            draw.ellipse((px-3,py-3,px+3,py+3),outline='blue',width=2)
        draw.text((3,3),name,fill='black')
        white.convert('RGB').save(folder/(name+'-root-review1003.png'))
        rows.append({'frame':name,'crop':frame['crop'],'root':frame['root'],
                     'socketsWorldRelativeToRoot':{key:[round((p[0]-rx)*world,4),round((p[1]-ry)*world,4)] for key,p in sockets.items()},
                     'excludeRects':frame.get('excludeRects',[]),'alpha16Bbox':bb16})
    for name,anim in recipe['anims'].items():
        assert name not in char['anims'],'Preserve old animations'
        assert all(frame in char['frames'] for frame in anim['frames'])
        char['anims'][name] = anim
    manifest.setdefault('unusedReviewCrops',{}).update(recipe.get('unusedReviewCrops',{}))
    assert manifest_path.read_bytes() == before,'Another writer changed this character'
    encoded = (json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()
    manifest_path.write_bytes(encoded)
    record = {'characterId':character_id,'status':'static-candidate-not-game-contact-or-sound-acceptance',
              'sourceKey':recipe['sourceKey'],'sourceHash':recipe['sourceHash'],
              'referenceHeight64':height,'sourceUnitScale':source['unitScale'],
              'worldPixelsPerSourcePixel':world,'frames':rows,
              'timing':{key:[exposure['ticks'] for exposure in anim['exposures']] for key,anim in recipe['anims'].items()},
              'knownDifferences':recipe.get('knownDifferences',[]),
              'newCrops':len(recipe['frames']),'totalCrops':len(char['frames']),'totalAnims':len(char['anims']),
              'recordedAtUtc':datetime.now(timezone.utc).isoformat(),'manifestAfterHash':sha(encoded)}
    save(folder/'measurements1003.json',record)
    assert Path(recipe['measurementFile']).name.startswith(character_id+'-')
    save(ROOT/recipe['measurementFile'],record)
    print(json.dumps({key:record[key] for key in ['characterId','newCrops','totalCrops','totalAnims','worldPixelsPerSourcePixel']},ensure_ascii=False))

def crops_tight(source, folder, boxes):
    """Use exact neighboring silhouette runs when its bbox crosses selected body.

    The caller has already viewed and selected every semantic pose bbox. The
    selected component's visible alpha16 pixels cannot be erased by any run.
    """
    image = Image.open(source).convert('RGBA')
    image.load()
    width,height = image.size
    labels,entries = main_components(image)
    bybox = {tuple(entry['bbox']):entry for entry in entries}
    main_ids = {entry['id'] for entry in entries}
    rows = []
    for index, box in enumerate(boxes,1):
        own = bybox[tuple(box)]['id']
        x,y,right,bottom = max(0,box[0]-8),max(0,box[1]-8),min(width,box[2]+8),min(height,box[3]+8)
        neighbor = {(px,py) for py in range(y,bottom) for px in range(x,right)
                    if labels[py*width+px] in main_ids-{own}}
        mask = set()
        for px,py in neighbor:
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    qx,qy = px+dx,py+dy
                    if x<=qx<right and y<=qy<bottom and labels[qy*width+qx] != own:
                        mask.add((qx,qy))
        assert not any(labels[py*width+px] == own for px,py in mask)
        runs = []
        for py in range(y,bottom):
            xs = sorted(px for px,qy in mask if qy==py)
            if not xs:continue
            start = previous = xs[0]
            for px in xs[1:]:
                if px == previous+1:previous = px
                else:
                    runs.append([start-x,py-y,previous-start+1,1])
                    start = previous = px
            runs.append([start-x,py-y,previous-start+1,1])
        # Merge only identical x/width runs on consecutive rows. A whole-piece
        # bounding box is never permitted to erase an interleaved own silhouette.
        rects = []
        for run in runs:
            if rects and rects[-1][0]==run[0] and rects[-1][2]==run[2] and rects[-1][1]+rects[-1][3]==run[1]:
                rects[-1][3] += 1
            else:rects.append(run)
        cut = image.crop((x,y,right,bottom))
        for rx,ry,rw,rh in rects:
            cut.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
        alpha = cut.getchannel('A')
        bb64 = alpha.point(lambda v:255 if v>=64 else 0).getbbox()
        bb16 = alpha.point(lambda v:255 if v>=16 else 0).getbbox()
        white = Image.new('RGBA',cut.size,'white')
        white.alpha_composite(cut)
        white.convert('RGB').save(folder/f'crop-{index:02}-white1003.png')
        rows.append({'index':index,'crop':[x,y,right-x,bottom-y],'excludeRects':rects,
                     'alpha64Box':bb64,'alpha64Height':bb64[3]-bb64[1],
                     'alpha16Box':bb16,'ownVisibleAlpha16PixelsExcluded':0,
                     'exclusionBasis':'Exact other inspected main silhouette alpha16 row runs, safe1px fringe only outside own visible component; not neighboring whole bbox.'})
    save(folder/'explicit-crop-neighbor-review1003.json',rows)
    print(json.dumps([{'index':row['index'],'crop':row['crop'],'alpha64Height':row['alpha64Height'],
                       'excludeRectCount':len(row['excludeRects']),'ownVisibleAlpha16PixelsExcluded':0} for row in rows],ensure_ascii=False))

def main():
    sys.stdout.reconfigure(encoding='utf8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['copy','diagnose','crops','crops-tight','register'])
    parser.add_argument('--source',type=Path)
    parser.add_argument('--destination',type=Path)
    parser.add_argument('--folder',type=Path)
    parser.add_argument('--boxes',type=Path)
    parser.add_argument('--recipe',type=Path)
    parser.add_argument('--character',choices=sorted(ALLOWED))
    args = parser.parse_args()
    if args.action == 'copy':copy_png(args.source,args.destination,args.folder)
    elif args.action == 'register':register(args.character,args.recipe)
    else:
        assert (args.folder/'README.md').is_file()
        if args.action == 'diagnose':diagnose(args.source,args.folder)
        elif args.action == 'crops-tight':crops_tight(args.source,args.folder,json.loads(args.boxes.read_text(encoding='utf8')))
        else:inspected_crops(args.source,args.folder,json.loads(args.boxes.read_text(encoding='utf8')))

if __name__ == '__main__':
    main()
