"""Build the explicit recipe for visually reviewed Aokiji blow/throw cells."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-blowthrows1003')
OUT = ROOT / 'scripts/aokiji_blowthrows_recipe1003.json'

def main():
    assert (EVIDENCE / 'README.md').is_file()
    rows = json.loads((EVIDENCE / 'explicit-crop-neighbor-review1003.json').read_text(encoding='utf8'))
    assert len(rows) == 12 and [r['index'] for r in rows] == list(range(1, 13))
    names = [
        'cd_start_1003', 'cd_active_1003', 'cd_recover_1003',
        'j_cd_start_1003', 'j_cd_active_1003', 'j_cd_recover_1003',
        'throw_fwd_hold_1003', 'throw_fwd_release_1003', 'throw_fwd_recover_1003',
        'throw_back_hold_1003', 'throw_back_release_1003', 'throw_back_recover_1003',
    ]
    # Root x follows the observed sole midpoint on grounded poses, and pelvic
    # projection on airborne poses. Air y = crown9 + reference standing314.
    roots = [[182,323], [178,300], [172,318], [193,323], [233,323], [204,323],
             [175,302], [207,292], [176,307], [188,314], [233,310], [183,317]]
    sockets = {1:{'shoulder':[246,63], 'ice_edge':[277,67]},
               4:{'shoulder':[244,58], 'ice_edge':[265,62]},
               6:{'grip':[314,106], 'grip_far':[331,76]},
               7:{'released_palm':[322,95], 'released_palm_far':[333,50]},
               9:{'grip':[294,109], 'grip_far':[308,83]},
               10:{'released_palm':[51,57]}}
    frames = {}
    for i, (name, row, root) in enumerate(zip(names, rows, roots)):
        note = ('Independent generated pose. Ground root from actual shoe support; '
                'one source-wide scale; no per-pose scale or contact-fitting transform.')
        if 3 <= i <= 5:
            note = ('Independent generated airborne shoulder pose. Virtual root one '
                    'standing height below observed crown, x at pelvic projection; '
                    'not a rotated/translated standing frame.')
        if i == 10:
            note += (' Back-release far arm is hidden behind the actual cape; only '
                     'one hand is visible. Normal-speed readability remains unverified.')
        frames[name] = {'crop':row['crop'], 'root':root, 'sockets':sockets.get(i,{}), 'note':note}
        if row['excludeRects']:
            frames[name]['excludeRects'] = row['excludeRects']

    def anim(first, ticks, throw=False):
        result = {'frames':names[first:first+3], 'loop':False,
                  'exposures':[{'frame':i,'ticks':n} for i,n in enumerate(ticks)]}
        if throw:
            result['throwExposures'] = list(result['exposures'])
        return result

    recipe = {
        'sourceKey':'aokiji_blow_throws_1003',
        'sourceHash':'a3ebd0fbd0f7ca0541dd92932a899c13d39cfbb508fcc31f4a866edaf7f5fca3',
        'evidenceDir':str(EVIDENCE),
        'measurementFile':'docs/assets/aokiji-blowthrows-measurements1003.json',
        'scaleReference':{
            'crop':rows[0]['crop'], 'excludeRects':rows[0]['excludeRects'],
            'expectedHeight64':314,
            'basis':'Cell1 full-standing shoulder preparation alpha64height314 against established407; all12 body cells share407/314. Ground roots from visible shoe support, air roots from neutral height, no hitbox-fitting transforms.',
        },
        'frames':frames,
        'anims':{
            'cd':anim(0,[18,5,27]), 'j_cd':anim(3,[12,6,16]),
            'throw_fwd':anim(6,[22,8,15],True),
            'throw_back':anim(9,[22,8,15],True),
            'throw':{'frames':[names[6]], 'loop':False,
                     'exposures':[{'frame':0,'ticks':45}]},
        },
        'knownDifferences':[
            'Ordinary throws enter connected throw at stateFrame0. Real hold pose remains22ticks, release8ticks and restore15ticks; total45 and release22 match existing core.',
            'Generic throw explicitly reuses forward connected-hold body; it is not counted as a new crop or a unique alternate throw.',
            'Forward and backward hand grips differ in source art. These measured real hands require actual opponent pair/contact checks before adoption.',
            'Backward release hides far arm behind cape; no program edit reconstructs it. Actual readability and release are pending.',
            'Static extraction/timing does not certify game contact, sound, full match, or public completion.',
        ],
    }
    with OUT.open('x',encoding='utf8') as stream:
        json.dump(recipe, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(str(OUT))

if __name__ == '__main__':
    main()
