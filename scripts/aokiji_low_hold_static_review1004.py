"""Preview measured real low-hold candidates before any manifest/runtime change."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps
from aokiji_throw_static_pairs1004 import frame as existing_frame, paste as paste_existing, checks as existing_checks

ROOT=Path(__file__).resolve().parents[1]
ZOOM=4

def sha(value):return hashlib.sha256(value).hexdigest()

def clean_crop(image, config):
    x,y,w,h=config['crop']
    result=image.crop((x,y,x+w,y+h))
    for rx,ry,rw,rh in config.get('excludeRects',[]):result.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recipe',type=Path,required=True)
    args=parser.parse_args()
    recipe=json.loads(args.recipe.read_text(encoding='utf8'))
    hold=recipe.get('holdOffset',38)
    assert hold in [30,38], 'Use only explicitly assigned art contracts; do not silently invent throw data'
    folder=Path(recipe['reviewDir'])
    assert (folder/'README.md').is_file()
    assert not (folder/'static-review1004.json').exists()
    catalog=json.loads((ROOT/'scripts/roster_marine_sources0929.json').read_text(encoding='utf8'))['sources']
    receipt=catalog[recipe['sourceKey']]
    original=(ROOT/receipt['file']).read_bytes()
    assert sha(original)==recipe['sourceHash']==receipt['sha256']
    image=Image.open(ROOT/receipt['file']).convert('RGBA');image.load()
    reference=clean_crop(image,recipe['scaleReference'])
    bounds=reference.getchannel('A').point(lambda value:255 if value>=64 else 0).getbbox()
    height=bounds[3]-bounds[1]
    assert height==recipe['scaleReference']['expectedHeight64']
    world=100/height
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
    rows=[];measurements={};panels=[]
    for move,config in recipe['holding'].items():
        assert move in ['throw_fwd','throw_back']
        body=clean_crop(image,config)
        visible=body.getchannel('A').point(lambda value:255 if value>=16 else 0).getbbox()
        assert visible and all(value>0 for value in [visible[0],visible[1],body.width-visible[2],body.height-visible[3]])
        root=config['root']
        hand={name:[(point[0]-root[0])*world,(point[1]-root[1])*world] for name,point in config['sockets'].items()}
        assert 'grip' in hand
        measurements[move]={'crop':config['crop'],'originalSourceRoot':root,'sourceSockets':config['sockets'],
                            'worldSocketsR':hand,'visibleAlpha16Bounds':visible,
                            'sourceWorldScale':world,'groundRootWasPulledToHandTarget':False,
                            'rootBasis':config['rootBasis']}
        for victim_id in ['labubu','luffy','akainu']:
            victim=existing_frame(victim_id,'held_leg_flip')
            geometry=victim['body'][1];grip=geometry['sockets']['grip'];vroot=geometry['root']
            relative=[(grip['x']-vroot['x'])/(2*victim['density']),(grip['y']-vroot['y'])/(2*victim['density'])]
            for facing in [1,-1]:
                target=[facing*(hold-relative[0]),relative[1]]
                actual=[facing*hand['grip'][0],hand['grip'][1]]
                delta=[actual[0]-target[0],actual[1]-target[1]]
                canvas=Image.new('RGBA',(1000,650),'#f5f4ef');draw=ImageDraw.Draw(canvas)
                axis=(340 if facing==1 else 660,520);vaxis=(axis[0]+hold*facing*ZOOM,520)
                draw.text((20,12),f'Aokiji NEW {move} / {victim_id} held-leg / {"R" if facing==1 else "L"}',font=font,fill='#263d4b')
                draw.text((20,40),f'REAL SOURCE, original shoe-axis / proposed hold{hold}; NO runtime/core/selector changes',font=small,fill='#60717b')
                draw.line((25,520,975,520),fill='#7f8f99',width=2)
                paste_existing(canvas,victim['body'],victim['density'],vaxis,-facing)
                scale=world*ZOOM
                shown=body.resize((round(body.width*scale),round(body.height*scale)),Image.Resampling.LANCZOS)
                rx,ry=root[0]*scale,root[1]*scale
                if facing==-1:shown=ImageOps.mirror(shown);rx=shown.width-rx
                canvas.alpha_composite(shown,(round(axis[0]-rx),round(axis[1]-ry)))
                def p(point):return axis[0]+point[0]*ZOOM,axis[1]+point[1]*ZOOM
                hp,tp=p(actual),p(target)
                draw.line((*hp,*tp),fill='#bf4b3d',width=3)
                for point,color in [(hp,'#bf4b3d'),(tp,'#25884e')]:draw.ellipse((point[0]-6,point[1]-6,point[0]+6,point[1]+6),outline=color,width=3)
                draw.text((20,560),f'real grip({actual[0]:.4f},{actual[1]:.4f}) target({target[0]:.4f},{target[1]:.4f})',font=font,fill='#263d4b')
                draw.text((20,591),f'delta({delta[0]:.4f},{delta[1]:.4f}) / distance{math.hypot(*delta):.4f}world; static visual review required',font=small,fill='#263d4b')
                path=folder/f'{move}-{victim_id}-{"R" if facing==1 else "L"}1004.png'
                canvas.convert('RGB').save(path);panels.append(canvas.convert('RGB'))
                rows.append({'move':move,'victim':victim_id,'facing':facing,'proposedHoldOffset':hold,'target':target,'measuredGrip':actual,
                             'delta':delta,'distance':math.hypot(*delta),'file':str(path),
                             'victimRuntimeHash':victim['runtimeHash']})
    montage=Image.new('RGB',(2000,650*math.ceil(len(panels)/2)),'white')
    for index,panel in enumerate(panels):montage.paste(panel,(index%2*1000,index//2*650))
    montage.save(folder/'static-pair-montage1004.jpg',quality=92)
    assert sha((ROOT/receipt['file']).read_bytes())==recipe['sourceHash']
    for path,digest in existing_checks.items():assert sha(Path(path).read_bytes())==digest
    result={'checkedAtUtc':datetime.now(timezone.utc).isoformat(),'status':'candidate-static-pair-review-not-auto-approved',
            'sourceKey':recipe['sourceKey'],'sourceHash':recipe['sourceHash'],'standingReferenceHeight64':height,
            'sourceWideWorldScale':world,'proposedHoldOffset':hold,'measurements':measurements,'pairs':rows,
            'runtimeRootMovesCoreSelectorChanged':False,'sourceOrPoseScaleAdjustedForHandTarget':False}
    with (folder/'static-review1004.json').open('x',encoding='utf8') as stream:json.dump(result,stream,ensure_ascii=False,indent=2)
    print(json.dumps({'measurements':measurements,'pairDistances':[r['distance'] for r in rows],
                      'changedRuntime':False,'autoApproved':False},ensure_ascii=False))

if __name__=='__main__':main()
