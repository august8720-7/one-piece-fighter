"""Explicit recipes for inspected reactions and three independent ankle-held poses."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-reactionsheld1003')
OUT = ROOT / 'scripts/aokiji_reactionsheld_recipe1003.json'

def main():
    rows = json.loads((EVIDENCE / 'explicit-crop-neighbor-review1003.json').read_text(encoding='utf8'))
    assert len(rows) == 8 and rows[0]['alpha64Height'] == 392
    manifest = json.loads((ROOT / 'scripts/roster_aokiji_manifest0929.json').read_text(encoding='utf8'))
    character = manifest['characters']['aokiji']
    world = character['scale'] * (407 / 392) / 2
    names = ['thrown_generic_1003','throw_tech_push_1003','ko_recline_1003','win_ice_1003',
             'held_leg_flip_1003','held_labubu_throw_1003','held_twinkle_throw_1003']
    indexes = [1,2,3,4,5,6,7]
    roots = [[206,357], [219,360], [240,178], [185,402]]
    sockets = [{'grip':[160,112]}, {'near_palm':[309,82],'far_palm':[374,71]}, {},
               {'ice_palm':[255,115]}]
    held_grips = [[452,284], [411,267], [444,207]]
    # Canonical world offsets are read from the already accepted legacy held
    # geometry. These are static ankle socket roots, not runtime transformations.
    legacy = json.loads((ROOT / 'public/assets/characters/luffy/anime/runtime.json').read_text(encoding='utf8'))
    legacy_density = legacy['textureDensity']
    targets = {}
    for name in ['held_leg_flip','held_labubu_throw','held_twinkle_throw']:
        geo = legacy['attachments'][f'luffy/{name}/0']
        root, grip = geo['root'], geo['sockets']['grip']
        targets[name] = [(grip['x']-root['x'])/(2*legacy_density),
                         (grip['y']-root['y'])/(2*legacy_density)]
    for name, grip in zip(targets, held_grips):
        target = targets[name]
        roots.append([grip[0]-target[0]/world, grip[1]-target[1]/world])
        sockets.append({'grip':grip})

    frames = {}
    for position, (name, index, root, points) in enumerate(zip(names,indexes,roots,sockets)):
        row = rows[index]
        note = ('Independent real generated reaction. Ground roots use visible '
                'sole/floor and pelvic projection; one source-wide standing scale.')
        if position >= 4:
            held = list(targets)[position-4]
            note = ('Independent actual ankle-held body: measured visible cuff/upper '
                    'shoe grip, static root registered at existing canonical world '
                    f'offset {targets[held]}. This is not a reused/rotated pose or a '
                    'runtime translation, rotation, or per-pose scale. Actual pair '
                    'fit and release remain unverified.')
        frames[name] = {'crop':row['crop'],'root':root,'sockets':points,'note':note}
        if row['excludeRects']:
            frames[name]['excludeRects'] = row['excludeRects']

    def single(name, ticks):
        return {'frames':[name],'loop':False,'exposures':[{'frame':0,'ticks':ticks}]}

    gait = ['walk_contact_near','walk_pass_near','walk_contact_far','walk_pass_far']
    assert all(frame in character['frames'] for frame in gait)
    recipe = {
        'sourceKey':'aokiji_reactions_held_1003',
        'sourceHash':'0e3f2e8931f8f381ba977dbff46febf92cc547a7a5bf2207e050e8d7e50196cc',
        'evidenceDir':str(EVIDENCE),
        'measurementFile':'docs/assets/aokiji-reactionsheld-measurements1003.json',
        'scaleReference':{'crop':rows[0]['crop'], 'excludeRects':rows[0]['excludeRects'],
            'expectedHeight64':392,
            'basis':'Cell1 complete neutral standing alpha64height392 against established407; all7 adopted original body poses share407/392. Reference is not a new runtime pose. Conditional roots use actual ankle pixels and legacy canonical socket offsets; no rendered transforms.',
        },
        'frames':frames,
        'anims':{
            'thrown':single(names[0],45), 'throw_tech':single(names[1],12),
            'ko':single(names[2],60), 'win':single(names[3],60),
            'held_leg_flip':single(names[4],24),
            'held_labubu_throw':single(names[5],24),
            'held_twinkle_throw':single(names[6],26),
            'dash':{'frames':gait,'loop':True,
                    'exposures':[{'frame':i,'ticks':n} for i,n in enumerate([4,4,4,5])]},
        },
        'unusedReviewCrops':{
            'aokiji_reactionsheld_neutral_reference_1003':{
                'source':'aokiji_reactions_held_1003','regions':[rows[0]['crop']],
                'reason':'Single sheet-wide standing scale reference; existing neutral remains, not counted as additional art.',
            },
        },
        'knownDifferences':[
            'Seven actual independent reactions, no generated reference counted as adopted crop.',
            'Three cuff/upper-shoe sockets observed in separate real hip/knee/arm poses. Existing canonical held roots register actual socket position, but cannot certify pairing or visual readability.',
            'Generic thrown is a separate raised-leg losing-balance pose. It is not substituted for any of the three specific held poses.',
            'Dash explicitly reuses the existing four real alternating walk poses at4/4/4/5ticks; zero new dash art. Walk40ticks at1.8984375 travels75.9375world; dash17ticks at4.3984375 travels74.7734375, difference1.53percent. Normal-speed gait/sliding check remains pending.',
            'KO body is actual reclining art, no rotation of standing; win actual one-hand ice display differs from idle.',
            'All base states/26 moves/9 skills being present only means static resource candidate coverage; sound, FX, real contact, CPU/full match and publication are parent work.',
        ],
    }
    with OUT.open('x',encoding='utf8') as stream:
        json.dump(recipe,stream,ensure_ascii=False,indent=2)
        stream.write('\n')
    with (EVIDENCE / 'canonical-held-sockets1003.json').open('x',encoding='utf8') as stream:
        json.dump({'legacySource':'luffy runtime local already accepted',
                   'canonicalWorldRelativeGrip':targets, 'actualSourceGrips':held_grips,
                   'worldPixelsPerSourcePixel':world,'roots':roots[4:]},stream,indent=2)
    print(str(OUT))

if __name__ == '__main__':
    main()
