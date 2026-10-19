"""Explicit eight-reaction recipe from recovered, visually checked Garp page."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/garp-reactions1003/crop-review-tight1003')
OUT = ROOT / 'scripts/garp_reactions_recipe1003.json'

def main():
    rows = json.loads((EVIDENCE/'explicit-crop-neighbor-review1003.json').read_text(encoding='utf8'))
    assert len(rows)==9 and rows[0]['alpha64Height']==406
    names = ['crouch_1003','block_stand_1003','block_crouch_1003','hit_crouch_1003',
             'jump_guard_1003','hit_air_1003','knockdown_1003','getup_kneel_1003']
    roots = [[202,287],[211,413],[231,284],[239,324],
             [239,415],[199,449],[251,183],[244,294]]
    sockets = [{},{},{},{},{},{},{},{'ground_palm':[92,276]}]
    frames = {}
    for index,(name,row,root,points) in enumerate(zip(names,rows[1:],roots,sockets)):
        note = 'Independent original reaction. Floor/sole root and pelvic projection observed on actual art; source-wide uniform scale, no per-pose fit.'
        if index in [4,5]:
            note = 'Independent actual airborne pose. Virtual root below actual crown by full-neutral height; x follows pelvic projection. No rotation/translation of a grounded pose; normal-speed rise/fall/hit still pending.'
        frames[name] = {'crop':row['crop'],'root':root,'sockets':points,'note':note}
        if row['excludeRects']:frames[name]['excludeRects']=row['excludeRects']
    def single(name,ticks):
        return {'frames':[name],'loop':False,'exposures':[{'frame':0,'ticks':ticks}]}
    recipe = {
        'characterId':'garp','sourceKey':'garp_reactions_1003',
        'sourceHash':'e5fe4892a2aed7a3042122dbc55190240197e8509360f3785e6e285dc7b4d0ee',
        'evidenceDir':str(EVIDENCE),
        'measurementFile':'docs/assets/garp-reactions-measurements1003.json',
        'scaleReference':{'crop':rows[0]['crop'],'excludeRects':rows[0]['excludeRects'],
            'expectedHeight64':406,'targetSourceHeight':408,
            'basis':'Cell1 neutral alpha64height406 vs original neutral408; all8 reaction crops share408/406. Old neutral/attack art retained; no single-pose scaling.',
        },
        'frames':frames,
        'anims':{
            'crouch':single(names[0],60),'block_stand':single(names[1],12),
            'block_crouch':single(names[2],12),'hit_crouch':single(names[3],12),
            'jump_neutral':single(names[4],30),'hit_air':single(names[5],12),
            'knockdown':single(names[6],36),
            'getup':{'frames':[names[7],'idle'],'loop':False,
                     'exposures':[{'frame':0,'ticks':12},{'frame':1,'ticks':2}]},
        },
        'unusedReviewCrops':{'garp_reaction_neutral_reference_1003':{
            'source':'garp_reactions_1003','regions':[rows[0]['crop']],
            'reason':'Sheet-wide neutral scale reference only; old idle remains, not additional adopted art.',
        }},
        'knownDifferences':[
            'Eight real reaction crops only. Getup explicitly ends on existing genuine neutral for2of14coreticks; that reference is not new art.',
            'Jump guard is one actual folded-leg midair candidate. Dedicated rising/falling jump presentation still required before complete release.',
            'Old walk drawings remain unadopted; no new walk/run poses are created from these reactions.',
            'Original9cell source layout crosses nominal grid areas but true alpha components are separate. Initial neighbor-bbox guard rejected crop7; precise neighboring silhouette row runs retain every selected own alpha16 body pixel, then crops7/8 manually viewed complete.',
            'Static extraction does not prove normal-speed controllable basic sample, game contacts, nine skills, sound or complete match.',
        ],
    }
    with OUT.open('x',encoding='utf8') as stream:
        json.dump(recipe,stream,ensure_ascii=False,indent=2)
        stream.write('\n')
    print(str(OUT))

if __name__=='__main__':main()
