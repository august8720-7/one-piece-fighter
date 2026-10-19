"""Aokiji-only explicit body page helpers. Diagnostic regions never infer poses."""
from __future__ import annotations
import argparse, hashlib, json, sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'scripts/roster_aokiji_manifest0929.json'
CATALOG=ROOT/'scripts/roster_marine_sources0929.json'
def sha(blob):return hashlib.sha256(blob).hexdigest()
def save(path,data):
    with Path(path).open('x',encoding='utf8') as f:json.dump(data,f,ensure_ascii=False,indent=2)

def main_components(image):
    w,h=image.size;a=bytearray(image.getchannel('A').tobytes());labels=[0]*(w*h);entries=[];nid=0
    for i,v in enumerate(a):
        if v<16 or labels[i]:continue
        nid+=1;q=deque([i]);labels[i]=nid;xs=[];ys=[]
        while q:
            p=q.popleft();x=p%w;y=p//w;xs.append(x);ys.append(y)
            for c in ([p-1] if x else [])+([p+1] if x<w-1 else [])+([p-w] if y else [])+([p+w] if y<h-1 else []):
                if not labels[c] and a[c]>=16:labels[c]=nid;q.append(c)
        if len(xs)>5000:entries.append({'id':nid,'pixels16':len(xs),'bbox':[min(xs),min(ys),max(xs)+1,max(ys)+1]})
    return labels,entries

def diagnose(source,folder):
    image=Image.open(source).convert('RGBA');image.load();_,entries=main_components(image)
    result={'source':str(source),'sha256':sha(Path(source).read_bytes()),'size':image.size,'alpha':image.getchannel('A').getextrema(),'components':entries,'meaning':'Read-only alpha diagnostics; caller must inspect and choose actual poses/crops.'}
    save(folder/'main-component-diagnostics1003.json',result);print(json.dumps(result,ensure_ascii=False))

def inspected_crops(source,folder,boxes):
    image=Image.open(source).convert('RGBA');image.load();w,h=image.size;labels,entries=main_components(image);bybox={tuple(e['bbox']):e for e in entries};rows=[]
    for index,b in enumerate(boxes,1):
        e=bybox[tuple(b)];x=max(0,b[0]-8);y=max(0,b[1]-8);right=min(w,b[2]+8);bottom=min(h,b[3]+8);cut=image.crop((x,y,right,bottom));ex=[]
        for other in entries:
            if other['id']==e['id']:continue
            points={(px,py) for py in range(y,bottom) for px in range(x,right) if labels[py*w+px]==other['id']}
            while points:
                start=points.pop();q=deque([start]);piece=[start]
                while q:
                    px,py=q.popleft()
                    for c in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                        if c in points:points.remove(c);q.append(c);piece.append(c)
                x0=max(x,min(p[0] for p in piece)-1);y0=max(y,min(p[1] for p in piece)-1);x1=min(right,max(p[0] for p in piece)+2);y1=min(bottom,max(p[1] for p in piece)+2)
                assert not any(labels[py*w+px]==e['id'] for py in range(y0,y1) for px in range(x0,x1)), 'Neighbor box would remove own visible body; inspect manually'
                r=[x0-x,y0-y,x1-x0,y1-y0];ex.append(r);cut.paste((0,0,0,0),(r[0],r[1],r[0]+r[2],r[1]+r[3]))
        a=cut.getchannel('A');b64=a.point(lambda v:255 if v>=64 else 0).getbbox();b16=a.point(lambda v:255 if v>=16 else 0).getbbox();white=Image.new('RGBA',cut.size,'white');white.alpha_composite(cut);white.convert('RGB').save(folder/f'crop-{index:02}-white1003.png')
        rows.append({'index':index,'crop':[x,y,right-x,bottom-y],'excludeRects':ex,'alpha64Box':b64,'alpha64Height':b64[3]-b64[1],'alpha16Box':b16,'ownVisibleAlpha16PixelsExcluded':0})
    save(folder/'explicit-crop-neighbor-review1003.json',rows);print(json.dumps(rows,ensure_ascii=False))

def register(recipe_path):
    recipe=json.loads(Path(recipe_path).read_text(encoding='utf8'));folder=Path(recipe['evidenceDir']);assert(folder/'README.md').is_file()
    before=MANIFEST.read_bytes();manifest=json.loads(before);char=manifest['characters']['aokiji'];source=json.loads(json.dumps(json.loads(CATALOG.read_text(encoding='utf8'))['sources'][recipe['sourceKey']]))
    assert source['sha256']==recipe['sourceHash'];path=ROOT/source['file'];assert sha(path.read_bytes())==recipe['sourceHash']
    image=Image.open(path).convert('RGBA');image.load();reference=recipe['scaleReference'];x,y,w,h=reference['crop'];ref=image.crop((x,y,x+w,y+h))
    for rx,ry,rw,rh in reference.get('excludeRects',[]):ref.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
    bb=ref.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox();height=bb[3]-bb[1];assert height==reference['expectedHeight64']
    source['unitScale']=407/height;source['scaleBasis']=reference['basis'];char['sources'][recipe['sourceKey']]=source;world=char['scale']*source['unitScale']/2
    (folder/'authoring-before.json').write_bytes(before);rows=[]
    for name,frame in recipe['frames'].items():
        assert name not in char['frames'],'Preserve existing frame';frame={**frame,'source':recipe['sourceKey'],'transparency':{'mode':'source-alpha'}};char['frames'][name]=frame
        x,y,w,h=frame['crop'];cut=image.crop((x,y,x+w,y+h))
        for rx,ry,rw,rh in frame.get('excludeRects',[]):cut.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
        bb16=cut.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox();assert bb16 and all(v>0 for v in [bb16[0],bb16[1],w-bb16[2],h-bb16[3]])
        rx,ry=frame['root'];sockets=frame.get('sockets',{});white=Image.new('RGBA',cut.size,'white');white.alpha_composite(cut);d=ImageDraw.Draw(white);d.line((rx-5,ry,rx+5,ry),fill='red',width=2);d.line((rx,ry-5,rx,ry+5),fill='red',width=2)
        for px,py in sockets.values():d.ellipse((px-3,py-3,px+3,py+3),outline='blue',width=2)
        d.text((3,3),name,fill='black');white.convert('RGB').save(folder/(name+'-root-review1003.png'))
        rows.append({'frame':name,'crop':frame['crop'],'root':frame['root'],'socketsWorldRelativeToRoot':{key:[round((p[0]-rx)*world,4),round((p[1]-ry)*world,4)]for key,p in sockets.items()},'excludeRects':frame.get('excludeRects',[]),'alpha16Bbox':bb16})
    for name,anim in recipe['anims'].items():
        assert name not in char['anims'],'Preserve existing animation';assert all(f in char['frames'] for f in anim['frames']);char['anims'][name]=anim
    manifest.setdefault('unusedReviewCrops',{}).update(recipe.get('unusedReviewCrops',{}))
    assert MANIFEST.read_bytes()==before,'Other writer changed manifest';encoded=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();MANIFEST.write_bytes(encoded)
    record={'status':'static-candidate-not-game-contact-or-sound-acceptance','sourceKey':recipe['sourceKey'],'sourceHash':recipe['sourceHash'],'sourceReferenceHeight64':height,'sourceUnitScale':source['unitScale'],'worldPixelsPerSourcePixel':world,'frames':rows,'timing':{key:[e['ticks']for e in anim['exposures']]for key,anim in recipe['anims'].items()},'knownDifferences':recipe.get('knownDifferences',[]),'newCrops':len(recipe['frames']),'totalCrops':len(char['frames']),'totalAnims':len(char['anims']),'recordedAtUtc':datetime.now(timezone.utc).isoformat(),'manifestAfterHash':sha(encoded)}
    save(folder/'measurements1003.json',record);save(ROOT/recipe['measurementFile'],record);print(json.dumps({'newCrops':len(recipe['frames']),'totalCrops':len(char['frames']),'anims':len(char['anims']),'worldPixelsPerSourcePixel':world,'measurementFile':recipe['measurementFile']},ensure_ascii=False))

def main():
    sys.stdout.reconfigure(encoding='utf8');p=argparse.ArgumentParser(description=__doc__);p.add_argument('action',choices=['diagnose','crops','register']);p.add_argument('--source');p.add_argument('--folder',type=Path);p.add_argument('--boxes',type=Path);p.add_argument('--recipe',type=Path);a=p.parse_args()
    if a.action=='register':register(a.recipe)
    else:
        assert(a.folder/'README.md').is_file()
        if a.action=='diagnose':diagnose(a.source,a.folder)
        else:inspected_crops(a.source,a.folder,json.loads(a.boxes.read_text(encoding='utf8')))
if __name__=='__main__':main()
