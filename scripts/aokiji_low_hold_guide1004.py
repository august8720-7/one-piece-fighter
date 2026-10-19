"""Abstract-only low-hold target plus existing neutral crop; no runtime writes."""
from pathlib import Path
import hashlib
import json
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/aokiji-low-hold1004')

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    assert (OUT/'README.md').is_file()
    wide = sys.argv[1:] == ['--wide']
    assert sys.argv[1:] in [[],['--wide']]
    suffix = '-wide' if wide else ''
    guide_path = OUT/f'aokiji-low-hold-guide{suffix}1004.png'
    assert not guide_path.exists()
    panel_width = 800 if wide else 600
    left_center = 380 if wide else 260
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
    guide = Image.new('RGB',(panel_width*3,860),'#f7f6f0')
    draw = ImageDraw.Draw(guide)
    target = [24.032786885245905,-13.180327868852459]
    pose = {
        'front':{'hip':[-4,-29],'neck':[3,-50],'head':[6,-59],
                 'shoulder_near':[9,-45],'elbow_near':[24,-28],'hand_near':target,
                 'shoulder_far':[3,-47],'elbow_far':[17,-31],'hand_far':[24.5,-14.4],
                 'knee_near':[11,-22],'foot_near':[14,0],
                 'knee_far':[-21,-19],'foot_far':[-14,0]},
        'back':{'hip':[-6,-30],'neck':[1,-50],'head':[5,-59],
                'shoulder_near':[8,-45],'elbow_near':[21,-27],'hand_near':target,
                'shoulder_far':[0,-46],'elbow_far':[15,-30],'hand_far':[24.5,-14.4],
                'knee_near':[10,-23],'foot_near':[14,0],
                'knee_far':[-23,-20],'foot_far':[-14,0]},
    }
    for col,name in enumerate(['front','back'],1):
        center,ground = panel_width*col+panel_width//2,740
        zoom=6
        def p(point):return center+point[0]*zoom,ground+point[1]*zoom
        nodes=pose[name]
        draw.line((panel_width*col+25,ground,panel_width*(col+1)-30,ground),fill='#778791',width=3)
        draw.line((center,110,center,ground+25),fill='#b5bdc0',width=2)
        for a,b in [('hip','neck'),('neck','head'),('neck','shoulder_far'),
                    ('shoulder_far','elbow_far'),('elbow_far','hand_far'),
                    ('neck','shoulder_near'),('shoulder_near','elbow_near'),('elbow_near','hand_near'),
                    ('hip','knee_far'),('knee_far','foot_far'),('hip','knee_near'),('knee_near','foot_near')]:
            draw.line((*p(nodes[a]),*p(nodes[b])),fill='#88949b' if 'far' in a+b else '#3c5668',width=11)
        for joint in ['hip','shoulder_near','shoulder_far','elbow_near','elbow_far','knee_near','knee_far']:
            x,y=p(nodes[joint]);draw.ellipse((x-7,y-7,x+7,y+7),fill='#3c5668')
        hx,hy=p(nodes['head']);draw.ellipse((hx-42,hy-42,hx+42,hy+42),outline='#3c5668',width=6)
        draw.line((hx+31,hy-8,hx+49,hy,hx+31,hy+6),fill='#3c5668',width=4)
        for foot in ['foot_near','foot_far']:
            x,y=p(nodes[foot]);draw.rounded_rectangle((x-27,y-13,x+27,y),radius=5,fill='#506877')
        tx,ty=p(target)
        draw.ellipse((tx-13,ty-13,tx+13,ty+13),outline='#198452',width=5)
        draw.ellipse((tx-6,ty-6,tx+6,ty+6),fill='#198452')
        draw.text((tx-10,ty-55),'BOTH HANDS: SAME ANKLE',font=small,fill='#146840')
        draw.text((panel_width*col+25,28),f'{name.upper()} HOLD - FACE RIGHT',font=font,fill='#2d4555')
        draw.text((panel_width*col+25,65),'Same real anatomy/head size as neutral; no rotated/copied pose',font=small,fill='#566c79')
        draw.text((panel_width*col+25,792),'Target: (+24.0328, -13.1803), own soles on floor',font=small,fill='#146840')
        draw.text((panel_width*col+25,819),'GUIDE ONLY: redraw uniform, fingers, legs and cape; no guide marks',font=small,fill='#657783')
        draw.ellipse((center-7,ground-7,center+7,ground+7),fill='#c54639')
    folder=ROOT/'public/assets/characters/aokiji/anime'
    runtime_path=folder/'runtime.json'
    runtime=json.loads(runtime_path.read_text(encoding='utf8'))
    name='aokiji/idle/0'
    page=next(page for page in runtime['pages'] if page['id']==runtime['framePages'][name])
    atlas_path=folder/page['data'];png_path=folder/page['image']
    box=json.loads(atlas_path.read_text(encoding='utf8'))['frames'][name]['frame']
    with Image.open(png_path) as image:
        neutral=image.crop((box['x'],box['y'],box['x']+box['w'],box['y']+box['h'])).convert('RGBA')
    neutral_path=OUT/'aokiji-existing-neutral1004.png'
    if neutral_path.exists():
        with Image.open(neutral_path) as existing:assert existing.convert('RGBA').tobytes()==neutral.tobytes()
    else:neutral.save(neutral_path)
    geometry=runtime['attachments'][name]
    factor=6/(2*runtime['textureDensity'])
    display=neutral.resize((round(neutral.width*factor),round(neutral.height*factor)),Image.Resampling.LANCZOS)
    rx,ry=geometry['root']['x']*factor,geometry['root']['y']*factor
    guide.paste(display,(round(left_center-rx),round(740-ry)),display)
    draw.line((25,740,panel_width-30,740),fill='#778791',width=3)
    draw.ellipse((left_center-7,733,left_center+7,747),fill='#c54639')
    draw.text((25,28),'REAL EXISTING AOKIJI NEUTRAL',font=font,fill='#2d4555')
    draw.text((25,65),'Style/head-size reference; full standing height = 100 world',font=small,fill='#566c79')
    draw.text((25,792),'RIGHT panels are abstract joint guides, NOT new character art',font=small,fill='#657783')
    path=guide_path;guide.save(path)
    record={'kind':'reference-only-no-runtime-art','standingHeightWorld':100,
            'casterHoldOffset':38,'heldLegFlipWorldGripR':[13.967213114754095,-13.180327868852459],
            'targetCasterGripR':target,'frontAndBackAbstractNodes':pose,
            'actualNeutralFrame':name,'actualNeutralRuntimeHash':sha(runtime_path),
            'actualNeutralAtlasHash':sha(atlas_path),'actualNeutralPngHash':sha(png_path),
            'guideSha256':sha(path),'neutralReferenceSha256':sha(OUT/'aokiji-existing-neutral1004.png'),
            'originalBodyOrRootModified':False,'runtimeUsed':False,
            'note':'Guide joint lengths are explanatory only. Final art must preserve actual normal human anatomy/head size and be measured from real shoe soles, not pinned root to hand target.'}
    metadata_path=OUT/f'guide-metadata{suffix}1004.json'
    with metadata_path.open('x',encoding='utf8') as stream:json.dump(record,stream,ensure_ascii=False,indent=2)
    print(json.dumps({'guide':str(path),'actualNeutral':str(neutral_path),'metadata':str(metadata_path)},ensure_ascii=False))

if __name__=='__main__':main()
