"""Actual legacy held victim plus abstract Aokiji; reference only, not runtime art."""
from pathlib import Path
import json
import hashlib
import sys
from PIL import Image, ImageDraw, ImageFont
from aokiji_throw_static_pairs1004 import frame, paste, socket_world, checks

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/aokiji-low-hold1004')

def main():
    assert (OUT/'README.md').is_file()
    compact=sys.argv[1:]==['--compact30']
    assert sys.argv[1:] in [[],['--compact30']]
    suffix='-compact30' if compact else ''
    path=OUT/f'aokiji-real-ankle-pair-guide{suffix}1004.png'
    assert not path.exists()
    nodes=json.loads((OUT/'guide-metadata-wide1004.json').read_text(encoding='utf8'))['frontAndBackAbstractNodes']
    neutral=frame('aokiji','idle');victim=frame('luffy','held_leg_flip')
    hold=30 if compact else 38
    target=socket_world(victim,'grip');target=[hold-target[0],target[1]]
    if compact:
        for name,pose in nodes.items():
            pose.update({'hip':[-9,-29],'neck':[-2,-49],'head':[1,-57],
                         'shoulder_near':[3,-44],'elbow_near':[16,-29],
                         'hand_near':target,'shoulder_far':[-3,-46],
                         'elbow_far':[10,-30],'hand_far':[target[0]+0.5,target[1]-1.2],
                         'knee_near':[3,-22],'foot_near':[8,0],
                         'knee_far':[-19,-19],'foot_far':[-8,0]})
            if name=='back':pose.update({'hip':[-11,-30],'neck':[-3,-49],'elbow_near':[14,-27],'elbow_far':[8,-29]})
    canvas=Image.new('RGBA',(2400,800),'#f7f6f0');draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
    small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
    ground=650;zoom=4
    paste(canvas,neutral['body'],neutral['density'],(350,ground),1)
    draw.text((25,25),'REAL AOKIJI STYLE / STANDING H=100',font=font,fill='#294858')
    draw.text((25,62),'New output: only this person; normal head, arms and leg lengths',font=small,fill='#657884')
    draw.line((25,ground,775,ground),fill='#81949d',width=3)
    for col,name in enumerate(['front','back'],1):
        origin=(col*800+270,ground)
        def p(point):return origin[0]+point[0]*zoom,origin[1]+point[1]*zoom
        vaxis=(origin[0]+hold*zoom,ground)
        paste(canvas,victim['body'],victim['density'],vaxis,-1)
        pose=nodes[name]
        for a,b in [('hip','neck'),('neck','head'),('neck','shoulder_far'),
                    ('shoulder_far','elbow_far'),('elbow_far','hand_far'),
                    ('neck','shoulder_near'),('shoulder_near','elbow_near'),('elbow_near','hand_near'),
                    ('hip','knee_far'),('knee_far','foot_far'),('hip','knee_near'),('knee_near','foot_near')]:
            draw.line((*p(pose[a]),*p(pose[b])),fill='#899aa1' if 'far' in a+b else '#2c5974',width=10)
        hx,hy=p(pose['head']);draw.ellipse((hx-28,hy-28,hx+28,hy+28),outline='#2c5974',width=5)
        draw.line((hx+24,hy-7,hx+33,hy,hx+24,hy+5),fill='#2c5974',width=4)
        for foot in ['foot_near','foot_far']:
            x,y=p(pose[foot]);draw.rounded_rectangle((x-18,y-10,x+18,y),radius=4,fill='#2c5974')
        tx,ty=p(target);draw.ellipse((tx-10,ty-10,tx+10,ty+10),outline='#158947',width=5)
        draw.line((col*800+25,ground,(col+1)*800-25,ground),fill='#81949d',width=3)
        draw.ellipse((origin[0]-6,ground-6,origin[0]+6,ground+6),fill='#c24e3b')
        draw.ellipse((vaxis[0]-6,ground-6,vaxis[0]+6,ground+6),fill='#b18b40')
        draw.text((col*800+25,25),f'{name.upper()} HOLD: OTHER PERSON ANKLE',font=font,fill='#294858')
        draw.text((col*800+25,62),'Blue joints = Aokiji. Existing victim is reference only; OMIT in output.',font=small,fill='#657884')
        draw.text((col*800+25,692),f'OWN feet under body (+/-{8 if compact else 14}). Hands outside OWN knee/shoe.',font=small,fill='#294858')
        draw.text((col*800+25,724),f'GREEN = other ankle (+{target[0]:.4f},{target[1]:.4f}). Root gap{hold}, opposite facing.',font=small,fill='#137440')
        draw.text((col*800+25,757),'Redraw Aokiji only; no extra character/foot, dots, labels or skeleton.',font=small,fill='#657884')
    canvas.convert('RGB').save(path)
    record={'purpose':'actual-held-reference-plus-abstract-caster-only-not-new-runtime-art',
            'targetR':target,'hold':hold,'sameFloor':True,'casterPoseNodes':nodes,
            'neutralRuntimeHash':neutral['runtimeHash'],'victimRuntimeHash':victim['runtimeHash'],
            'guideSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'inputHashes':checks,
            'imagePerPoseScaleChanged':False,'existingRootsChanged':False,
            'note':'Single ordinary drawing zoom4, actual held victim uses its real opposing-facing root. Aokiji nodes explain intended new anatomy only, no generated/painted character pixels.'}
    with (OUT/f'real-ankle-pair-metadata{suffix}1004.json').open('x',encoding='utf8') as stream:json.dump(record,stream,ensure_ascii=False,indent=2)
    print(str(path))

if __name__=='__main__':main()
