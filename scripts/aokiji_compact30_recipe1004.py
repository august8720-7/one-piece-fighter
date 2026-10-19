"""Record observed shoe/hand landmarks for the actual failed compact30 PNG."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004/compact30-review1004')


def main():
    rows = json.loads((OUT / 'inspected-crops1004.json').read_text(encoding='utf8'))
    assert rows[0]['alpha64Height'] == 706
    holding = {
        'throw_fwd': {'crop': rows[1]['crop'], 'excludeRects': [], 'root': [369, 719],
                      'sockets': {'grip': [554, 561], 'near_palm': [524, 546], 'far_palm': [560, 578],
                                  'sole_back': [183, 714], 'sole_front': [554, 701]},
                      'rootBasis': 'Actual shoe support-centre x183/554; rounded midpoint369. Floor719 from rear sole alpha16 exclusive boundary. Front sole lies14 source pixels higher. Grip manually marks enclosed own front white trouser/shin; all shoe/hand marks inspected in original724px cell, approximate landmark tolerance2px. No root pulled to target.'},
        'throw_back': {'crop': rows[2]['crop'], 'excludeRects': [], 'root': [350, 720],
                       'sockets': {'grip': [552, 557], 'near_palm': [507, 547], 'far_palm': [549, 578],
                                   'sole_back': [150, 715], 'sole_front': [550, 702]},
                       'rootBasis': 'Actual shoe support-centre x150/550; midpoint350. Floor720 from rear sole alpha16 exclusive boundary. Front sole lies13 source pixels higher. Grip manually marks own front white shin. Original724px cell, landmark tolerance2px; no target-derived root.'},
    }
    recipe = {'sourceKey': 'aokiji_low_holds_compact30_1004', 'sourceHash': rows[0]['sourceHash'],
              'reviewDir': OUT.as_posix(), 'holdOffset': 30,
              'scaleReference': {'crop': rows[0]['crop'], 'excludeRects': [], 'expectedHeight64': 706,
                                 'referenceOnly': True, 'headAndBothSolesComplete': True},
              'holding': holding, 'manualLandmarkTolerancePx': 2,
              'status': 'not-adopted-own-shin-enclosed-shoes-wide',
              'runtimeOrAuthoringOrRootChanged': False}
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
    for move, config in holding.items():
        name = 'front-hold' if move == 'throw_fwd' else 'back-hold'
        image = Image.open(OUT / f'{name}-white-cell1004.png').convert('RGB')
        draw = ImageDraw.Draw(image)
        for label, point in {'root': config['root'], **config['sockets']}.items():
            x, y = point
            color = '#b84934' if label == 'grip' else '#37648a'
            draw.ellipse((x - 5, y - 5, x + 5, y + 5), outline=color, width=2)
            draw.text((max(5, min(550, x + 8)), max(5, y - 23)), label, font=font, fill=color)
        draw.text((20, 20), 'ACTUAL FAILED SOURCE / manual landmarks +/-2px', font=font, fill='#324958')
        draw.text((20, 48), 'Hands enclose OWN white shin; no runtime/root changes', font=font, fill='#b84934')
        path = OUT / f'{name}-observed-landmarks1004.png'
        assert not path.exists()
        image.save(path)
    dest = ROOT / 'docs/assets/aokiji-low-hold-compact30-measurements1004.json'
    with dest.open('x', encoding='utf8') as stream:
        json.dump(recipe, stream, ensure_ascii=False, indent=2)
    print(json.dumps({'recipe': dest.as_posix(), 'referenceHeight': 706, 'hold': 30,
                      'runtimeModified': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
