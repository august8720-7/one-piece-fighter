"""Record observed fresh front shoe/hand landmarks; target never determines root."""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004/fresh-front-review1004')


def main():
    rows = json.loads((OUT / 'inspected-crops1004.json').read_text(encoding='utf8'))
    assert rows[0]['alpha64Height'] == 790
    root = [470, 822]
    near = [672, 731]
    far = [731, 714]
    centre = [(near[0] + far[0]) / 2, (near[1] + far[1]) / 2]
    scale = 100 / 790
    target = [16.0327868852459, -13.180327868852459]
    actual = [(near[0] - root[0]) * scale, (near[1] - root[1]) * scale]
    far_world = [(far[0] - root[0]) * scale, (far[1] - root[1]) * scale]
    delta = [actual[0] - target[0], actual[1] - target[1]]
    config = {
        'crop': rows[1]['crop'], 'excludeRects': [], 'root': root,
        'sockets': {'grip': near, 'near_grip': near, 'far_grip': far,
                    'near_palm': [636, 731], 'far_palm': [721, 686],
                    'sole_back': [411, 817], 'sole_front': [530, 812],
                    'knee_near': [362, 599], 'knee_far': [695, 601]},
        'rootBasis': 'Actual rear shoe support centre411/front530, rounded midpoint470; floor822 from actual rear-shoe alpha16 boundary, not lower cape boundary823. Both shoes whole. Original887px cell hand opening landmarks approximate+/-3px; no root pulled to target. grip is only the nearer C-space, not a manufactured shared grip; far C-space is separately recorded.',
    }
    recipe = {
        'sourceKey': 'aokiji_low_hold_front_fresh_1004', 'sourceHash': rows[0]['sourceHash'],
        'reviewDir': OUT.as_posix(), 'holdOffset': 30,
        'scaleReference': {'crop': rows[0]['crop'], 'excludeRects': [], 'expectedHeight64': 790,
                           'referenceOnly': True, 'headAndBothSolesComplete': True},
        'holding': {'throw_fwd': config}, 'manualLandmarkTolerancePx': 3,
        'targetWorldR': target, 'targetOriginalCellPx': [root[0] + target[0] / scale, root[1] + target[1] / scale],
        'nearOpeningWorldR': actual, 'farOpeningWorldR': far_world,
        'openingCentreMidpointPx': centre, 'midpointIsActualSharedGrip': False,
        'openingSeparationWorld': math.hypot(far[0] - near[0], far[1] - near[1]) * scale,
        'nearOpeningDeltaWorld': delta, 'nearOpeningTargetDistanceWorld': math.hypot(*delta),
        'shoeSupportCentreDistanceWorld': (530 - 411) * scale,
        'staticDecision': 'not-adopted-rightward-reach-and-no-clear-shared-grip',
        'improvements': ['actual-deep-squat', 'shoes-collected-under-body', 'hands-separated-from-own-front-shin', 'complete-main-alpha16-figure'],
        'issues': ['forearms-still-diagonal-right', 'near-C-space-and-far-C-space-differ', 'near-C-space-blue-sleeve-not-clear-transparent-ankle-hole', 'hands-still-right-of-canonical-ankle'],
        'runtimeOrAuthoringOrRootChanged': False,
    }
    dest = ROOT / 'docs/assets/aokiji-low-hold-fresh-front-measurements1004.json'
    with dest.open('x', encoding='utf8') as stream:
        json.dump(recipe, stream, ensure_ascii=False, indent=2)
    image = Image.open(OUT / 'front-hold-white-cell1004.png').convert('RGB')
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
    for label, point in {'root': root, **config['sockets'], 'target': recipe['targetOriginalCellPx']}.items():
        x, y = point
        color = '#158947' if label == 'target' else '#b84934' if 'grip' in label else '#37648a'
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), outline=color, width=2)
        draw.text((max(8, min(690, x + 8)), max(8, y - 23)), label, font=font, fill=color)
    draw.line((*recipe['targetOriginalCellPx'], *near), fill='#b84934', width=2)
    draw.text((20, 25), 'OBSERVED FRESH FRONT / no runtime or root changes', font=font, fill='#324958')
    draw.text((20, 52), 'GREEN = actual held-ankle target; RED = source hand openings', font=font, fill='#324958')
    image.save(OUT / 'front-hold-observed-landmarks1004.png')
    print(json.dumps({'standingHeight': 790, 'root': root, 'nearWorld': actual, 'farWorld': far_world,
                      'target': target, 'nearDistance': math.hypot(*delta),
                      'shoeDistance': recipe['shoeSupportCentreDistanceWorld'],
                      'openingDistance': recipe['openingSeparationWorld'], 'adopted': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
