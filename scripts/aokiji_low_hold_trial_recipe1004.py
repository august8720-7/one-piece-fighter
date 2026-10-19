"""Read-only real first-trial hand points; clipped back shoe is not a valid axis."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
FOLDER=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004')

def main():
    rows=json.loads((FOLDER/'inspected-crops1004.json').read_text(encoding='utf8'))
    assert rows[0]['alpha64Height']==752
    front=rows[1]
    recipe={
        'sourceKey':'aokiji_low_holds_1004',
        'sourceHash':'d504a6abfbe0560f471ee57cff06c135771dbe1cd3a99781c596cdc7e6b283e6',
        'reviewDir':str(FOLDER),
        'scaleReference':{'crop':rows[0]['crop'],'excludeRects':rows[0]['excludeRects'],
                          'expectedHeight64':752,'referenceOnly':True,
                          'leftCapeClipped':True,'headAndBothSolesComplete':True},
        'holding':{'throw_fwd':{
            'crop':front['crop'],'excludeRects':front['excludeRects'],
            'root':[294,574],
            'sockets':{'grip':[469,395],'near_palm':[440,377],'far_palm':[475,410],
                       'sole_back':[111,573],'sole_front':[476,547]},
            'rootBasis':'Actual rear/full-front shoe support centres111/476, rounded midpoint294; floor574 from lowest rear sole alpha16 exclusive boundary. No root pulled to grip target. Both hands visibly enclose own front white trouser/shin; grip marks their real enclosed centre.',
        }},
        'backNotAdopted':{'crop':rows[2]['crop'],'sourceTouchesCanvasRight':True,
                          'rightEdgeAlpha16Pixels':10,'verifiedCompleteFrontSole':False,
                          'gripSourceAbsoluteApproxObserved':[1520,725],
                          'noInventedWorldXBecauseFootClipped':True},
    }
    with (ROOT/'docs/assets/aokiji-low-hold-trial-measurements1004.json').open('x',encoding='utf8') as stream:json.dump(recipe,stream,ensure_ascii=False,indent=2)
    print(json.dumps({'frontRoot':[294,574],'frontGrip':[469,395],'referenceH':752,
                      'backFootClipped':True,'adopted':False}))

if __name__=='__main__':main()
