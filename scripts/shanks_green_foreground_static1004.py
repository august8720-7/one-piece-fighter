"""Original-pixel foreground trial and unchanged three-representative pairing."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-green-foreground-static1004')
assert (OUT/'README.md').is_file()
assert not (OUT/'pairs1004.json').exists()
sys.path.insert(0,str(ROOT/'scripts'))
from build_anime_atlas import split_foreground

hashes = {}
def read(path):
    data=path.read_bytes();hashes[str(path)]=hashlib.sha256(data).hexdigest();return data
source=ROOT/'public/assets/generated/source/roster-shanks-fresh-front-green-repair-1004.png'
assert hashlib.sha256(read(source)).hexdigest()=='5736bf68bc96ed65519e3f871d143e82982b4ae551a2b34c77eed10fb8df3272'
runtime_file=ROOT/'public/assets/characters/shanks/anime/runtime.json'
read(runtime_file)
image=Image.open(source).convert('RGBA')
crop=[777,301,751,674]
original=image.crop((crop[0],crop[1],crop[0]+crop[2],crop[1]+crop[3]))
root=[1205-crop[0],965-crop[1]]
hand=[1380-crop[0],845-crop[1]]
world=94/979
absolute_polygon=[
 [1246,700],[1258,693],[1272,691],[1284,698],[1291,714],
 [1310,749],[1330,784],[1344,800],[1354,806],[1378,808],
 [1394,814],[1407,820],[1414,826],[1409,833],[1402,834],
 [1394,830],[1383,827],[1372,827],[1364,832],[1359,840],
 [1358,851],[1364,864],[1375,872],[1384,875],[1391,871],
 [1399,872],[1407,877],[1407,883],[1397,892],[1385,897],
 [1372,897],[1358,890],[1344,883],[1337,871],[1328,855],
 [1322,834],[1313,813],[1298,793],[1284,765],[1268,736],[1251,712],
]
polygon=[[x-crop[0],y-crop[1]] for x,y in absolute_polygon]
config={'crop':crop,'foregroundPolygon':polygon,
 'foregroundNote':'Manual inspected true near right palm/fingers and near forearm source pixels only. Concave C inner contour excludes opaque cape; all excluded pixels remain body. No painting, relocation or geometric transform.'}
raw_body,raw_fore,raw_stats=split_foreground(original,config)
assert Image.alpha_composite(raw_body,raw_fore).tobytes()==original.tobytes()
raw_body.save(OUT/'source-body-partition1004.png')
raw_fore.save(OUT/'source-near-palm-arm-partition1004.png')
preview_size=(round(original.width*world*4),round(original.height*world*4))
prepared=original.resize(preview_size,Image.Resampling.LANCZOS)
body,fore,prepared_stats=split_foreground(prepared,config)
assert Image.alpha_composite(body,fore).tobytes()==prepared.tobytes()
body.save(OUT/'prepared-body1004.png');fore.save(OUT/'prepared-near-palm-arm1004.png')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)

def legacy_frame(cid,state):
    folder=ROOT/f'public/assets/characters/{cid}/anime'
    rt=json.loads(read(folder/'runtime.json'))
    anim=rt['anims'][state]
    index=anim.get('throwExposures',anim['exposures'])[0]['frame']
    name=f'{cid}/{state}/{index}'
    pid=rt['framePages'][name]
    page=next(p for p in rt['pages'] if p['id']==pid)
    atlas=json.loads(read(folder/page['data']))
    read(folder/page['image'])
    box=atlas['frames'][name]['frame']
    with Image.open(folder/page['image']) as im:
        pixels=im.crop((box['x'],box['y'],box['x']+box['w'],box['y']+box['h'])).convert('RGBA')
    return pixels,rt['attachments'][name],rt['textureDensity'],name

def paste_source(canvas,pixels,axis,facing):
    factor=world*4
    px=pixels if facing==1 else ImageOps.mirror(pixels)
    rx=root[0]*factor if facing==1 else px.width-root[0]*factor
    canvas.alpha_composite(px,(round(axis[0]-rx),round(axis[1]-root[1]*factor)))

rows=[];montages={}
for reaction in ['held_leg_flip','thrown']:
  panels=[]
  for cid,kind in [('labubu','small verified'),('luffy','ordinary verified'),('akainu','larger available adult')]:
    victim,geo,density,name=legacy_frame(cid,reaction)
    factor=4/(2*density)
    victim=victim.resize((round(victim.width*factor),round(victim.height*factor)),Image.Resampling.LANCZOS)
    for facing in [1,-1]:
      axis=[340 if facing==1 else 660,500]
      victim_axis=[axis[0]+30*facing*4,axis[1]]
      canvas=Image.new('RGBA',(1000,630),'#f5f4ef')
      d=ImageDraw.Draw(canvas)
      d.line((25,500,975,500),fill='#8fa3ad',width=2)
      d.text((18,15),f'Shanks true front holding / {cid} {reaction} / facing{facing}',font=font,fill='#1d3847')
      d.text((18,42),'Body < actual victim < original near palm/arm; static candidate, NOT game acceptance',font=small,fill='#54717d')
      paste_source(canvas,body,axis,facing)
      v=ImageOps.mirror(victim) if facing==1 else victim
      vrx=geo['root']['x']*factor
      if facing==1:vrx=v.width-vrx
      canvas.alpha_composite(v,(round(victim_axis[0]-vrx),round(victim_axis[1]-geo['root']['y']*factor)))
      paste_source(canvas,fore,axis,facing)
      hp=[axis[0]+facing*(hand[0]-root[0])*world*4,axis[1]+(hand[1]-root[1])*world*4]
      vp={k:[30*facing-facing*(s['x']-geo['root']['x'])/(2*density),(s['y']-geo['root']['y'])/(2*density)] for k,s in geo.get('sockets',{}).items()}
      if reaction=='held_leg_flip':socket='grip'
      else:
        names=[k for k in vp if not k.startswith('sole') and k!='pelvis']
        socket=min(names,key=lambda k:math.dist([(hand[0]-root[0])*world*facing,(hand[1]-root[1])*world],vp[k]))
      target=vp[socket]
      actual=[facing*(hand[0]-root[0])*world,(hand[1]-root[1])*world]
      d=ImageDraw.Draw(canvas)
      d.text((18,549),f'Actual C about({actual[0]:.3f},{actual[1]:.3f}) / actual victim {socket}({target[0]:.3f},{target[1]:.3f})',font=small,fill='#1d3847')
      d.text((18,579),'Roots0/30, original common scale94/979. C cape remains body; no source pixels moved.',font=small,fill='#54717d')
      file=OUT/f'{reaction}-{cid}-face{facing}-foreground1004.png';canvas.convert('RGB').save(file)
      # Clean enlarged contact is the actual rendered composition, not a fake
      # proxy foot. Whole diagnostic zoom applies equally to all actors.
      cx,cy=map(round,hp)
      contact=canvas.crop((cx-60,cy-55,cx+60,cy+55)).resize((480,440),Image.Resampling.NEAREST)
      contact.convert('RGB').save(OUT/f'{reaction}-{cid}-face{facing}-contact1004.png')
      panels.append(canvas.convert('RGB'))
      rows.append({'victim':cid,'representative':kind,'reaction':reaction,'attackerFacing':facing,'victimFacing':-facing,
                   'casterSourceRoot':root,'casterRootWorld':[0,0],'victimRootWorld':[30*facing,0],
                   'candidateHoldOffset':30,'currentOrdinarySelector':'generic thrown unchanged',
                   'contractOnly':reaction=='held_leg_flip','handWorldApprox':actual,'targetSocket':socket,'targetWorld':target,
                   'deltaHandMinusTarget':[actual[i]-target[i] for i in [0,1]],'victimFrame':name,
                   'runtimeChanged':False,'diagnosticFile':str(file),'manualHandUncertaintySourcePixels':5,'manualSoleCenterUncertaintySourcePixels':10})
  montage=Image.new('RGB',(2000,630*3),'white')
  for i,p in enumerate(panels):montage.paste(p,(i%2*1000,i//2*630))
  montage.save(OUT/f'{reaction}-foreground-pairs1004.jpg',quality=94)
for path,digest in hashes.items():assert hashlib.sha256(Path(path).read_bytes()).hexdigest()==digest
result={'status':'original-pixel-layer-static-candidate-not-adopted','checkedAtUtc':datetime.now(timezone.utc).isoformat(),
        'crop':crop,'sourceRootAbsolute':[1205,965],'sourceRootLocal':root,'sourceHandAbsoluteApprox':[1380,845],
        'neutralSourceHeight':979,'worldPerSourcePixel':world,'candidateHoldOffset':30,
        'foregroundConfig':config,'sourceRgbaRoundTrip':raw_stats,'preparedRgbaRoundTrip':prepared_stats,
        'allRgbaBytesUnchangedAfterPartitionRecombine':True,'inputHashes':hashes,'pairs':rows,
        'activeRuntimeOrMovesOrSelectorsChanged':False,'reactionBoundary':'held_leg_flip is a candidate contract; actual Shanks ordinary generic thrown remains unchanged.'}
with (OUT/'pairs1004.json').open('x',encoding='utf-8') as out:json.dump(result,out,ensure_ascii=False,indent=2)
with (ROOT/'docs/assets/shanks-green-foreground-static1004.json').open('x',encoding='utf-8') as out:json.dump(result,out,ensure_ascii=False,indent=2)
print(json.dumps({'rawRgbaEqual':True,'preparedRgbaEqual':True,'pairs':len(rows),'foregroundVisiblePixels':raw_stats['foregroundVisiblePixels'],'runtimeChanged':False}))
