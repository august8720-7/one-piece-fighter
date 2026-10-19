"""Explicit eight-reaction recipe from the recovered actual Sengoku request."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/sengoku-reactions1003')
OUT = ROOT / 'scripts/sengoku_reactions_recipe1003.json'

def main():
    rows = json.loads((EVIDENCE/'explicit-crop-neighbor-review1003.json').read_text(encoding='utf8'))
    assert len(rows)==9 and rows[0]['alpha64Height']==419
    names = ['crouch_1003','block_stand_1003','block_crouch_1003','hit_crouch_1003',
             'jump_guard_1003','hit_air_1003','knockdown_1003','getup_kneel_1003']
    roots = [[201,307],[213,426],[185,315],[199,298],
             [255,427],[211,437],[207,147],[230,298]]
    frames = {}
    for index,(name,row,root) in enumerate(zip(names,rows[1:],roots)):
        note = 'Independent original human-uniform reaction. Floor/sole root and pelvic projection observed on actual art; one source-wide scale. Hat, bird, glasses and braid retained, no local transforms.'
        if index in [4,5]:
            note = ('Independent actual airborne human-uniform pose. Virtual root '
                    'from the neutral hat/head plane and pelvic projection; airborne '
                    'braid lift is not used to move the body root. No rotated standing '
                    'frame. Normal-speed rise/fall and hit contact remain pending.')
        frames[name] = {'crop':row['crop'],'root':root,
                        'sockets':{'ground_palm':[168,283]} if index==7 else {},'note':note}
        if row['excludeRects']:frames[name]['excludeRects']=row['excludeRects']
    def single(name,ticks):
        return {'frames':[name],'loop':False,'exposures':[{'frame':0,'ticks':ticks}]}
    recipe = {
        'characterId':'sengoku','sourceKey':'sengoku_reactions_recovered_1003',
        'sourceHash':'b8e32bc4d99da87ee70ea2ee005761c7c609edc3a6a5d2fb96dc45cce9081cd9',
        'evidenceDir':str(EVIDENCE),
        'measurementFile':'docs/assets/sengoku-reactions-measurements1003.json',
        'scaleReference':{'crop':rows[0]['crop'],'excludeRects':rows[0]['excludeRects'],
            'expectedHeight64':419,'targetSourceHeight':420,
            'basis':'Cell1 full neutral including actual hat/bird alpha64height419 vs original neutral420. All8 adopted reactions share420/419; the raised airborne beard does not define head scale. Old neutral and attack retained, no per-pose fit.',
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
        'unusedReviewCrops':{'sengoku_reaction_neutral_reference_1003':{
            'source':'sengoku_reactions_recovered_1003','regions':[rows[0]['crop']],
            'reason':'Sheet-wide full-standing scale reference only; existing neutral remains, not new adopted art.',
        }},
        'knownDifferences':[
            'Actual recovered webpage prompt677characters differs from prepared1003draft828characters; receipt records recovered exact prompt, no unsubmitted clipping instruction attributed to this image.',
            'Eight true new reaction crops; existing neutral is explicit final2ticks of14tick getup, not additional new art.',
            'Jump guard is one actual folded-leg midair candidate; rising/falling phases and other jump directions remain absent before complete release.',
            'All reactions remain human-uniform; no Buddha form is substituted for basic states. Actual hat, bird, round glasses and long braid retained.',
            'Cells7/8 interleave nominal grid areas. Exact other inspected silhouette row exclusions preserve every own alpha16 pixel, and both cropped full figures were manually viewed intact.',
            'Old ambiguous walk poses are not adopted. Static reactions are not a controllable basic sample, nine skills, sound or full-match acceptance.',
        ],
    }
    with OUT.open('x',encoding='utf8') as stream:
        json.dump(recipe,stream,ensure_ascii=False,indent=2)
        stream.write('\n')
    print(str(OUT))

if __name__=='__main__':main()
