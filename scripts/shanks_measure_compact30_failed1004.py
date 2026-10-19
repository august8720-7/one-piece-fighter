"""Diagnose preserved compact-30 failure. Never writes runtime or move data."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/first-pair-independent-shanks-1004-081851')
assert (OUT / 'README.md').is_file()
source = ROOT / 'public/assets/generated/source/roster-shanks-compact30-failed-1004.png'
expected = 'd6a30fda3299260a00c44775c33f09516d2f2f89b57a85e03efe554e2f28a368'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
runtime = ROOT / 'public/assets/characters/shanks/anime/runtime.json'
before_runtime = hashlib.sha256(runtime.read_bytes()).hexdigest()
image = Image.open(source).convert('RGBA')
assert image.size == (2172, 724)
alpha = image.getchannel('A')
mask = alpha.point(lambda value: 255 if value >= 8 else 0)
bounds = mask.crop((0, 0, 724, 724)).getbbox()
assert bounds is not None
height = bounds[3] - bounds[1]
world = 94 / height
target = (16.0327868852459, -13.180327868852459)
poses = [
    {'pose': 'forward', 'rearSole': [1038, 666], 'frontSole': [1130, 663], 'handGap': [1357, 568]},
    {'pose': 'back', 'rearSole': [1810, 666], 'frontSole': [1880, 655], 'handGap': [2116, 573]},
]
view = Image.alpha_composite(Image.new('RGBA', image.size, 'white'), image).convert('RGB')
draw = ImageDraw.Draw(view)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
records = []
for pose in poses:
    rear, front, hand = (pose[key] for key in ['rearSole', 'frontSole', 'handGap'])
    assert alpha.getpixel(tuple(rear)) >= 200
    assert alpha.getpixel(tuple(front)) >= 200
    assert alpha.getpixel(tuple(hand)) < 8
    root = [(rear[0] + front[0]) / 2, rear[1]]
    actual = [(hand[i] - root[i]) * world for i in (0, 1)]
    wanted = [root[i] + target[i] / world for i in (0, 1)]
    records.append({**pose, 'rootFromObservedSoles': root, 'handGapAlpha': alpha.getpixel(tuple(hand)),
                    'handWorld': actual, 'targetHandWorld': list(target), 'targetHandSource': wanted,
                    'horizontalExcessWorld': actual[0] - target[0], 'verticalDifferenceWorld': actual[1] - target[1],
                    'frontSoleHeightDifferenceWorld': (rear[1] - front[1]) * world,
                    'handSourceUncertaintyPixels': 3, 'soleCenterSourceUncertaintyPixels': 10,
                    'soleGroundSourceUncertaintyPixels': 3,
                    'note': 'Anatomical centers are manually read and uncertain; derived numbers are diagnostics, not adopted frame roots or move data.'})
    for label, point, color in [('sole', rear, '#b57d25'), ('sole', front, '#b57d25'), ('hand gap', hand, '#0c8caa'), ('target C center', wanted, '#c82f61')]:
        x, y = point
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), outline=color, width=3)
        draw.text((x - 62, y - 32), label, fill=color, font=font)
    draw.line((root[0] - 120, root[1], hand[0] + 30, root[1]), fill='#a6b3bd', width=2)
    draw.line((wanted[0], wanted[1], hand[0], hand[1]), fill='#c82f61', width=2)
    draw.text((724 if pose['pose'] == 'forward' else 1448, 20),
              f"NOT ADOPTED {pose['pose']}: actual hand about({actual[0]:.1f},{actual[1]:.1f}), target(+16.03,-13.18)",
              font=font, fill='#14232d')
destination = OUT / 'shanks-compact30-source-measured1004.png'
assert not destination.exists()
view.save(destination)
edges = {'top': (0, 0, 2172, 12), 'bottom': (0, 712, 2172, 724),
         'left': (0, 0, 12, 724), 'right': (2160, 0, 2172, 724)}
assert hashlib.sha256(runtime.read_bytes()).hexdigest() == before_runtime
result = {'kind': 'preserved-rejected-source-contact-diagnostic', 'sourceSha256': expected,
          'neutralAlpha8Bounds': list(bounds), 'neutralAlpha8Height': height,
          'worldUnitsPerSourcePixel': world, 'outer12pxAlphaMax': {key: alpha.crop(box).getextrema()[1] for key, box in edges.items()},
          'runtimeSha256BeforeAndAfter': before_runtime, 'runtimeChanged': False, 'movesChanged': False,
          'sourcePixelsChanged': False, 'runtimeAdopted': False, 'poses': records,
          'conclusion': 'Feet are compact but actual C holes remain far to the right. Do not increase holdOffset, move actor roots or scale one pose. Use independent neutral plus vertical-arm guide for new art.'}
with (OUT / 'shanks-compact30-failed-measurements1004.json').open('x', encoding='utf-8') as output:
    json.dump(result, output, ensure_ascii=False, indent=2)
print(json.dumps({'height': height, 'poses': records, 'runtimeAdopted': False}, ensure_ascii=False))
