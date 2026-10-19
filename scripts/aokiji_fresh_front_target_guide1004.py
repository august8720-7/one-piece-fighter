"""Annotate the real fresh candidate with target/abstract joints; reference only."""
from pathlib import Path
import json
import hashlib
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/aokiji-low-hold1004')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert (OUT / 'README.md').is_file()
    recipe = json.loads((ROOT / 'docs/assets/aokiji-low-hold-fresh-front-measurements1004.json').read_text(encoding='utf8'))
    source = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-front-fresh-1004.png'
    assert sha(source) == recipe['sourceHash']
    original = Image.open(source).convert('RGBA')
    canvas = Image.new('RGBA', (1774, 1079), '#f7f6f0')
    canvas.alpha_composite(original, (0, 64))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
    draw.text((20, 12), 'ACTUAL FRESH AOKIJI / SAME SHEET SCALE / ONLY RIGHT ELBOWS, FOREARMS, HANDS NEED REDRAW', font=font, fill='#294858')
    xoff, yoff = 887, 64
    def p(point):
        return point[0] + xoff, point[1] + yoff
    root = recipe['holding']['throw_fwd']['root']
    target = recipe['targetOriginalCellPx']
    near = recipe['holding']['throw_fwd']['sockets']['near_grip']
    far = recipe['holding']['throw_fwd']['sockets']['far_grip']
    for point, color, radius in [(root, '#c24e3b', 6), (near, '#c24e3b', 7), (far, '#c24e3b', 7), (target, '#158947', 13)]:
        x, y = p(point)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=color, width=4)
    draw.line((*p(near), *p(target)), fill='#c24e3b', width=3)
    draw.line((*p(far), *p(target)), fill='#c24e3b', width=3)
    draw.line((xoff + 220, yoff + root[1], xoff + 830, yoff + root[1]), fill='#86999f', width=2)
    abstract = {
        'near_shoulder': [466, 515], 'near_elbow': [target[0], 616], 'near_wrist': [target[0], target[1]],
        'far_shoulder': [601, 510], 'far_elbow': [target[0] - 18, 606], 'far_wrist': [target[0] + 5, target[1] - 3],
    }
    for side in ['near', 'far']:
        points = [abstract[f'{side}_{part}'] for part in ['shoulder', 'elbow', 'wrist']]
        draw.line([p(point) for point in points], fill='#376e9c' if side == 'near' else '#819fb0', width=5)
        for point in points:
            x, y = p(point)
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill='#376e9c')
    draw.text((20, 976), 'GREEN = same other-person ankle; RED = current separate C-spaces. BLUE = abstract normal elbow/forearm guidance.', font=font, fill='#294858')
    draw.text((20, 1011), 'Existing own shoes/root and deep squat stay. Redraw real anatomy; output OMIT all guide markings and other people.', font=small, fill='#657884')
    draw.text((20, 1044), 'Reference only. No source pixels shifted/scaled/rotated; not runtime art, not an adopted pose.', font=small, fill='#657884')
    dest = OUT / 'aokiji-fresh-front-target-guide1004.png'
    assert not dest.exists()
    canvas.convert('RGB').save(dest)
    metadata = {'sourceFile': source.as_posix(), 'sourceHash': sha(source), 'purpose': 'reference-only-not-runtime-art',
                'guideHash': sha(dest), 'originalDrawOffset': [0, 64], 'singleSheetScale': 1,
                'sourceStandingHeight64': 790, 'actualShoeRoot': root, 'targetWorldR': recipe['targetWorldR'],
                'targetInOriginalRightCellPx': target, 'observedNearC': near, 'observedFarC': far,
                'abstractNewArmJointsOnly': abstract, 'rootOrSourceOrRuntimeChanged': False,
                'guideNodesAreNotGeneratedCharacterPixels': True}
    with (OUT / 'aokiji-fresh-front-target-guide-metadata1004.json').open('x', encoding='utf8') as stream:
        json.dump(metadata, stream, ensure_ascii=False, indent=2)
    print(json.dumps({'file': dest.as_posix(), 'sha256': sha(dest), 'sourceHashUnchanged': sha(source) == recipe['sourceHash']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
