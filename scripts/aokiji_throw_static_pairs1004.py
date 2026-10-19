"""Read-only actual-atlas Aokiji throw/socket representative pair diagnostics."""
from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-throw-pairs1004')
ZOOM = 4
HOLD = 38
checks = {}
loaded = {}

def sha(value):return hashlib.sha256(value).hexdigest()

def read_checked(path):
    data = path.read_bytes()
    checks[str(path)] = sha(data)
    return data

def frame(cid, anim):
    key = (cid, anim)
    if key in loaded:return loaded[key]
    folder = ROOT/f'public/assets/characters/{cid}/anime'
    runtime = json.loads(read_checked(folder/'runtime.json'))
    table = runtime['anims'][anim]
    index = table.get('throwExposures',table['exposures'])[0]['frame']
    name = f'{cid}/{anim}/{index}'
    def part(frame_name):
        pid = runtime['framePages'][frame_name]
        page = next(p for p in runtime['pages'] if p['id']==pid)
        atlas = json.loads(read_checked(folder/page['data']))
        read_checked(folder/page['image'])
        box = atlas['frames'][frame_name]['frame']
        with Image.open(folder/page['image']) as image:
            pixels = image.crop((box['x'],box['y'],box['x']+box['w'],box['y']+box['h'])).convert('RGBA')
        return pixels,runtime['attachments'][frame_name]
    body = part(name)
    fore = runtime.get('foregroundFrames',{}).get(name)
    value = {'name':name,'body':body,'foreground':part(fore) if fore else None,
             'density':runtime['textureDensity'],'runtimeHash':checks[str(folder/'runtime.json')]}
    loaded[key] = value
    return value

def socket_world(value, name):
    geom = value['body'][1]
    socket = geom['sockets'][name]
    factor = 1/(2*value['density'])
    return [(socket['x']-geom['root']['x'])*factor,
            (socket['y']-geom['root']['y'])*factor]

def paste(canvas, part, density, axis, facing):
    pixels,geom = part
    factor = ZOOM/(2*density)
    pixels = pixels.resize((round(pixels.width*factor),round(pixels.height*factor)),Image.Resampling.LANCZOS)
    rx,ry = geom['root']['x']*factor,geom['root']['y']*factor
    if facing==-1:
        pixels = ImageOps.mirror(pixels)
        rx = pixels.width-rx
    canvas.alpha_composite(pixels,(round(axis[0]-rx),round(axis[1]-ry)))

def main():
    assert (OUT/'README.md').is_file()
    assert not (OUT/'static-pairs1004.json').exists(),'Preserve prior diagnostics'
    author = json.loads(read_checked(ROOT/'scripts/roster_aokiji_manifest0929.json'))['characters']['aokiji']
    moves_bytes = read_checked(ROOT/'src/characters/aokiji/moves.ts')
    assert moves_bytes.decode('utf8').count('holdOffset: 38')==2
    timing = {'throw_fwd':[22,8,15],'throw_back':[22,8,15]}
    caster_source = {}
    for move,source_name in [('throw_fwd','throw_fwd_hold_1003'),('throw_back','throw_back_hold_1003')]:
        f = author['frames'][source_name]
        x,y,_,_ = f['crop']
        source = author['sources'][f['source']]
        assert sha(read_checked(ROOT/source['file']))==source['sha256']
        factor = author['scale']*source['unitScale']/2
        caster = frame('aokiji',move)
        near,far = socket_world(caster,'grip'),socket_world(caster,'grip_far')
        assert max(abs(near[i]-(f['sockets']['grip'][i]-f['root'][i])*factor) for i in [0,1])<1e-7
        caster_source[move] = {
            'sourceKey':f['source'],'sourceHash':source['sha256'],'crop':f['crop'],
            'sourceRootLocal':f['root'],'sourceRootAbsolute':[x+f['root'][0],y+f['root'][1]],
            'nearGripLocal':f['sockets']['grip'],'nearGripAbsolute':[x+f['sockets']['grip'][0],y+f['sockets']['grip'][1]],
            'farGripLocal':f['sockets']['grip_far'],'farGripAbsolute':[x+f['sockets']['grip_far'][0],y+f['sockets']['grip_far'][1]],
            'worldUnitPerSourcePixel':factor,'nearWorldR':near,'farWorldR':far,
            'floorAxis':'Unchanged source root is world(0,0); lowest actual supported sole is at source-root ground line.',
            'sourceLowestVisibleY':f['root'][1], 'connectedExposures':timing[move],
        }
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
    victims = [('labubu','small verified legacy'),('luffy','ordinary verified legacy'),('akainu','larger available adult legacy')]
    rows,panels = [],[]
    for reaction in ['held_leg_flip','thrown']:
      for victim_id,kind in victims:
       victim = frame(victim_id,reaction)
       for move in ['throw_fwd','throw_back']:
        caster = frame('aokiji',move)
        for facing in [1,-1]:
            victim_facing = -facing
            hand = socket_world(caster,'grip')
            hand = [facing*hand[0],hand[1]]
            victim_sockets = {name:socket_world(victim,name) for name in victim['body'][1]['sockets']}
            targets = {name:[HOLD*facing+victim_facing*p[0],p[1]] for name,p in victim_sockets.items()}
            if reaction=='held_leg_flip':target_name='grip'
            else:
                meaningful = {name:p for name,p in targets.items() if not name.startswith('sole') and name!='pelvis'}
                target_name = min(meaningful,key=lambda name:math.dist(hand,meaningful[name]))
            target = targets[target_name]
            delta = [hand[0]-target[0],hand[1]-target[1]]
            row = {'victim':victim_id,'representative':kind,'reaction':reaction,'move':move,
                   'attackerFacing':facing,'victimFacing':victim_facing,'attackerRootWorld':[0,0],
                   'victimRootWorld':[HOLD*facing,0],'holdOffset':HOLD,
                   'handWorldRelativeAttacker':hand,'targetSocket':target_name,
                   'targetWorldRelativeAttacker':target,'deltaHandMinusTarget':delta,'distance':math.hypot(*delta),
                   'victimDeclaredSocketsWorldRelativeAttacker':targets,
                   'actualSelectorForAokijiNormalThrow':'thrown',
                   'kind':'contract-test-only' if reaction=='held_leg_flip' else 'current-generic-static-diagnostic',
                   'casterFrame':caster['name'],'victimFrame':victim['name'],
                   'victimRuntimeHash':victim['runtimeHash'],'casterRuntimeHash':caster['runtimeHash']}
            canvas = Image.new('RGBA',(1000,650),'#f5f4ef')
            draw = ImageDraw.Draw(canvas)
            draw.text((20,12),f'Aokiji {move} / {victim_id} {reaction} / caster {"R" if facing==1 else "L"}',font=font,fill='#253847')
            draw.text((20,40),'STATIC ATLAS ONLY - original roots and uniform runtime scale; no game acceptance',font=small,fill='#5a6570')
            axis = (340 if facing==1 else 660,520)
            victim_axis = (axis[0]+HOLD*facing*ZOOM,axis[1])
            draw.line((30,axis[1],970,axis[1]),fill='#87949c',width=2)
            paste(canvas,victim['body'],victim['density'],victim_axis,victim_facing)
            paste(canvas,caster['body'],caster['density'],axis,facing)
            if caster['foreground']:paste(canvas,caster['foreground'],caster['density'],axis,facing)
            def point(p):return axis[0]+p[0]*ZOOM,axis[1]+p[1]*ZOOM
            hp,tp = point(hand),point(target)
            draw.line((*hp,*tp),fill='#c34036',width=3)
            for p,color,label in [(hp,'#c34036','real hand'),(tp,'#197c45','victim '+target_name)]:
                draw.ellipse((p[0]-6,p[1]-6,p[0]+6,p[1]+6),outline=color,width=3)
                draw.text((p[0]+9,p[1]-12),label,font=small,fill=color)
            for p,label in [(axis,'caster root'),(victim_axis,'victim root')]:
                draw.line((p[0]-6,p[1],p[0]+6,p[1]),fill='#47687a',width=2)
                draw.line((p[0],p[1]-6,p[0],p[1]+6),fill='#47687a',width=2)
                draw.text((p[0]-36,p[1]+8),label,font=small,fill='#47687a')
            draw.text((20,560),f'hand({hand[0]:.4f},{hand[1]:.4f}) target({target[0]:.4f},{target[1]:.4f})',font=font,fill='#253847')
            draw.text((20,591),f'delta({delta[0]:.4f},{delta[1]:.4f}); distance{row["distance"]:.4f} world / held-leg contract is NOT current selector',font=small,fill='#253847')
            filename = f'{reaction}-{victim_id}-{move}-{"R" if facing==1 else "L"}1004.png'
            canvas.convert('RGB').save(OUT/filename)
            row['diagnosticFile'] = str(OUT/filename)
            panels.append((reaction,canvas.convert('RGB')))
            rows.append(row)
    for reaction in ['held_leg_flip','thrown']:
        chosen = [p for kind,p in panels if kind==reaction]
        montage = Image.new('RGB',(2000,650*math.ceil(len(chosen)/2)),'white')
        for index,panel in enumerate(chosen):montage.paste(panel,(index%2*1000,index//2*650))
        montage.save(OUT/f'{reaction}-pair-montage1004.jpg',quality=92)
    for path,digest in checks.items():assert sha(Path(path).read_bytes())==digest,'Inputs changed during static review'
    result = {'checkedAtUtc':datetime.now(timezone.utc).isoformat(),
              'status':'read-only-static-pair-review-not-game-acceptance',
              'runtimeOrRootOrMovesChanged':False,'casterSourceMeasurements':caster_source,
              'actualSelector':'Aokiji ordinary throw resolves generic thrown; held_leg_flip is contract-only trial.',
              'renderFormula':'world = (attachment - originalRoot)/(2*textureDensity); mirrored exactly as normal facing. Hold root distance38, ground y0. Same scalar zoom4 all bodies.',
              'noWallOrReleaseClaim':True,'inputHashes':checks,'pairs':rows}
    for path in [OUT/'static-pairs1004.json',ROOT/'docs/assets/aokiji-throw-static-pairs1004.json']:
        with path.open('x',encoding='utf8') as stream:json.dump(result,stream,ensure_ascii=False,indent=2)
    summary = [row for row in rows if row['attackerFacing']==1]
    print(json.dumps({'source':caster_source,'pairs':[{
        key:row[key] for key in ['reaction','victim','move','targetSocket','deltaHandMinusTarget','distance']
    } for row in summary],'runtimeChanged':False},ensure_ascii=False))

if __name__=='__main__':main()
