"""Anatomical external-grip reference only; never used as runtime character art."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-low-hold-1003')


def main():
    assert (OUT / 'README.md').is_file()
    path = OUT / 'external-hold-guide1003.png'
    assert not path.exists(), 'Preserve every earlier guide and failed source.'
    image = Image.new('RGB', (1400, 900), '#f7f7f4')
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
    scale = 6
    def panel(cx, base, neutral):
        def p(xy): return (cx + xy[0] * scale, base + xy[1] * scale)
        nodes = ({'hip': (0,-44), 'neck': (0,-76), 'head': (0,-85), 'shoulder': (12,-69),
                  'elbow': (20,-50), 'hand': (10,-45), 'knee0': (-10,-21), 'foot0': (-13,0),
                  'knee1': (10,-21), 'foot1': (13,0)} if neutral else
                 {'hip': (-3,-25), 'neck': (9,-42), 'head': (13,-52), 'shoulder': (14,-36),
                  'elbow': (27,-27), 'hand': (36,-13.2), 'knee0': (-17,-14), 'foot0': (-13,0),
                  'knee1': (15,-10), 'foot1': (13,0)})
        draw.line((cx-290,base,cx+280,base),fill='#657078',width=3)
        for a,b in [('hip','neck'),('neck','head'),('neck','shoulder'),('shoulder','elbow'),
                    ('elbow','hand'),('hip','knee0'),('knee0','foot0'),('hip','knee1'),('knee1','foot1')]:
            draw.line((*p(nodes[a]),*p(nodes[b])),fill='#657483',width=10)
        x,y=p(nodes['head']); draw.ellipse((x-42,y-42,x+42,y+42),fill='#eef1f3',outline='#657483',width=5)
        for key in ['foot0','foot1']:
            x,y=p(nodes[key]); draw.ellipse((x-30,y-10,x+30,y),fill='#657483')
        x,y=p((0,0)); draw.ellipse((x-7,y-7,x+7,y+7),fill='#d4493f')
        draw.text((cx-55,base+15),'ROOT (0,0)',font=font,fill='#b42d22')
        if neutral:
            draw.text((cx-170,base-650),'STANDING HEIGHT = 94',font=font,fill='#34424b')
        else:
            x,y=p(nodes['hand']); draw.ellipse((x-20,y-20,x+20,y+20),outline='#268f4c',width=5)
            draw.line((*p((18,-13.2)),*p((32,-13.2))),fill='#2482c2',width=4)
            draw.text((cx-210,base-650),'RIGHT HAND OUTSIDE OWN LEG',font=font,fill='#34424b')
            draw.text((cx-130,base-580),'GRIP (+36, -13.2)',font=font,fill='#1d723d')
            draw.text((cx-235,base-535),'Clear space beyond front shoe',font=font,fill='#2482c2')
    panel(330,760,True); panel(980,760,False)
    image.save(path)
    (OUT / 'external-hold-points1003.json').write_text(json.dumps({
        'purpose':'abstract anatomical generation guide only', 'runtimeUsed':False,
        'standingHeight':94,'grip':[36,-13.2],'root':[0,0],
        'decision':'First two drawings still grasp own shin. Put hand beyond front shoe; do not shift runtime roots.'
    },indent=2)+'\n',encoding='utf-8')
    with (OUT / 'README.md').open('a',encoding='utf-8') as out:
        out.write('\nexternal-hold-guide1003.png为第三次请求的独立抽象参考：前两次过近握点仍触自身小腿，改为鞋外空中握点(+36,-13.2)。不进入runtime、不计新人物姿势、旧图保留。\n')
    print(path)


if __name__ == '__main__':
    main()
