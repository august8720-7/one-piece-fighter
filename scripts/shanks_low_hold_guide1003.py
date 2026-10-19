"""Abstract reference only; no character pixels or runtime atlas are produced."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-low-hold-1003')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    readme = OUT / 'README.md'
    if not readme.exists():
        readme.write_text('抽象骨架和地线，仅作为官方网页生图的关节位置参考。不是香克斯人物图，不进入运行图集，不计姿势覆盖。站高94world；握持手中心固定(+16,-13.2)，虚拟对手不画，左臂缺失。所有源图、失败稿保留。\n', encoding='utf-8')
    path = OUT / 'low-hold-guide1003.png'
    assert not path.exists(), 'Preserve the existing guide.'
    image = Image.new('RGB', (1400, 900), '#f7f7f4')
    draw = ImageDraw.Draw(image)
    scale = 6
    def panel(center, base, neutral):
        def point(p): return (int(center + p[0]*scale), int(base + p[1]*scale))
        draw.line((center-250, base, center+250, base), fill='#687076', width=3)
        draw.line((center, base-650, center, base+30), fill='#a8adb1', width=2)
        if neutral:
            nodes = {'hip': (0,-44), 'neck': (0,-76), 'head': (0,-85), 'shoulder': (12,-69),
                     'elbow': (20,-50), 'hand': (10,-45), 'knee0': (-10,-21), 'foot0': (-13,0), 'knee1': (10,-21), 'foot1': (13,0)}
        else:
            nodes = {'hip': (-3,-25), 'neck': (5,-44), 'head': (5,-53), 'shoulder': (7,-39),
                     'elbow': (21,-27), 'hand': (16,-13.2), 'knee0': (-17,-14), 'foot0': (-13,0), 'knee1': (15,-10), 'foot1': (13,0)}
        for a,b in [('hip','neck'),('neck','head'),('neck','shoulder'),('shoulder','elbow'),('elbow','hand'),('hip','knee0'),('knee0','foot0'),('hip','knee1'),('knee1','foot1')]:
            draw.line((*point(nodes[a]),*point(nodes[b])),fill='#657483',width=10)
        hx,hy = point(nodes['head']); r=7*scale
        draw.ellipse((hx-r,hy-r,hx+r,hy+r), fill='#eef1f3',outline='#657483',width=5)
        for name in ['hip','neck','shoulder','elbow','knee0','knee1']:
            x,y=point(nodes[name]);draw.ellipse((x-7,y-7,x+7,y+7),fill='#657483')
        for name in ['foot0','foot1']:
            x,y=point(nodes[name]);draw.ellipse((x-23,y-9,x+23,y),fill='#556572')
        rx,ry=point((0,0));draw.ellipse((rx-8,ry-8,rx+8,ry+8),fill='#e95243')
        draw.text((rx-45,ry+15),'ROOT (0,0)',fill='#b42d22')
        left_missing=point((-12,-68) if neutral else (-6,-38))
        draw.line((left_missing[0]-12,left_missing[1]-12,left_missing[0]+12,left_missing[1]+12),fill='#d4493f',width=5)
        draw.line((left_missing[0]-12,left_missing[1]+12,left_missing[0]+12,left_missing[1]-12),fill='#d4493f',width=5)
        if not neutral:
            x,y=point(nodes['hand']);draw.ellipse((x-18,y-18,x+18,y+18),outline='#248d4b',width=6)
            draw.text((x+23,y-10),'ONLY RIGHT HAND: (+16, -13.2)',fill='#1d723d')
            draw.text((center-175,base-580),'CROUCH HOLD - SAME HEAD SIZE',fill='#2e414b')
        else: draw.text((center-120,base-630),'NEUTRAL HEIGHT = 94',fill='#2e414b')
    panel(320,760,True)
    panel(970,760,False)
    image.save(path)
    (OUT/'points1003.json').write_text(json.dumps({'purpose':'abstract pose reference only, not runtime art','standingHeight':94,'hand':[16,-13.2],'groundRoot':[0,0],'missingArm':'left','runtimeUsed':False},indent=2)+'\n',encoding='utf-8')
    print(path)


if __name__=='__main__': main()
