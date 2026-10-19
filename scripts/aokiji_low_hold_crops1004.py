"""Read-only inspected three-body diagnostics, preserving actual source edge failures."""
from pathlib import Path
import json
from PIL import Image
from aokiji_intake_helpers1003 import main_components

ROOT=Path(__file__).resolve().parents[1]
OUT=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004')

def main():
    image=Image.open(ROOT/'public/assets/generated/source/roster-aokiji-low-hold-1004.png').convert('RGBA')
    width,height=image.size
    labels,entries=main_components(image);ids={entry['id'] for entry in entries}
    boxes=[[0,140,548,893],[542,326,1078,892],[1066,344,1586,888]]
    bybox={tuple(entry['bbox']):entry for entry in entries}
    rows=[]
    for index,box in enumerate(boxes,1):
        own=bybox[tuple(box)]['id'];x,y,right,bottom=max(0,box[0]-8),max(0,box[1]-8),min(width,box[2]+8),min(height,box[3]+8)
        cut=image.crop((x,y,right,bottom));mask=set()
        for py in range(y,bottom):
            for px in range(x,right):
                if labels[py*width+px] not in ids-{own}:continue
                for dy in [-1,0,1]:
                    for dx in [-1,0,1]:
                        qx,qy=px+dx,py+dy
                        if x<=qx<right and y<=qy<bottom and labels[qy*width+qx]!=own:mask.add((qx,qy))
        rects=[]
        for py in range(y,bottom):
            xs=sorted(px for px,qy in mask if qy==py)
            if not xs:continue
            start=previous=xs[0]
            for px in xs[1:]:
                if px==previous+1:previous=px
                else:rects.append([start-x,py-y,previous-start+1,1]);start=previous=px
            rects.append([start-x,py-y,previous-start+1,1])
        assert not any(labels[py*width+px]==own for px,py in mask)
        for rx,ry,rw,rh in rects:cut.paste((0,0,0,0),(rx,ry,rx+rw,ry+rh))
        alpha=cut.getchannel('A');bb64=alpha.point(lambda value:255 if value>=64 else 0).getbbox();bb16=alpha.point(lambda value:255 if value>=16 else 0).getbbox()
        white=Image.new('RGBA',cut.size,'white');white.alpha_composite(cut);white.convert('RGB').save(OUT/f'crop-{index:02}-white1004.png')
        rows.append({'index':index,'crop':[x,y,right-x,bottom-y],'excludeRects':rects,'alpha64Box':bb64,
                     'alpha64Height':bb64[3]-bb64[1],'alpha16Box':bb16,'sourceTouchesCanvasEdge':box[0]==0 or box[2]==width,
                     'ownVisibleAlpha16PixelsExcluded':0,'sourceWasPaddedOrRepaired':False})
    with (OUT/'inspected-crops1004.json').open('x',encoding='utf8') as stream:json.dump(rows,stream,indent=2)
    print(json.dumps([{key:row[key] for key in row if key!='excludeRects'} for row in rows]))

if __name__=='__main__':main()
