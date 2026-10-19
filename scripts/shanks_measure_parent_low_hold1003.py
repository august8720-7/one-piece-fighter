"""Read-only measurement of root's first low-grip source; no adoption or moves."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

expected = '2cf971b8954b7912a82b39fb29033040ca22249cd54e9727c78e6cbe027c3967'
matches = [file for file in Path('C:/Users/august/Downloads').glob('红发独臂剑客*') if file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest() == expected]
assert len(matches) == 1, 'Only the exact parent first source may be inspected'
source = matches[0]
image = Image.open(source).convert('RGBA')
assert image.size == (1254, 1254)
out = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-completion-1003-1509')
assert (out / 'README.md').is_file()
neutral_height = 627
unit = 94 / neutral_height
poses = [
    {'pose': 'forward_hold_first_source', 'rearSole': [839, 652], 'frontSole': [1038, 642], 'observedGripGap': [1010, 609]},
    {'pose': 'back_hold_first_source', 'rearSole': [249, 1204], 'frontSole': [497, 1192], 'observedGripGap': [461, 1144]},
]
result = {'source': str(source), 'sha256': expected, 'kind': 'source-manual-point-diagnostic-not-adopted', 'neutralAlpha8Bounds': [26, 27, 531, 654], 'neutralHeight': neutral_height, 'worldUnitPerSourcePixel': unit, 'manualPointUncertaintySourcePixels': 3, 'runtimeChanged': False, 'holdOffsetChanged': False, 'poses': []}
matte = Image.alpha_composite(Image.new('RGBA', image.size, 'white'), image).convert('RGB')
draw = ImageDraw.Draw(matte)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
for pose in poses:
    root = [(pose['rearSole'][0] + pose['frontSole'][0]) / 2, max(pose['rearSole'][1], pose['frontSole'][1])]
    midpoint_y = (pose['rearSole'][1] + pose['frontSole'][1]) / 2
    point = pose['observedGripGap']
    world = [(point[0] - root[0]) * unit, (point[1] - root[1]) * unit]
    target_y = -13.180327868852459
    record = {**pose, 'rootFromSoleMidpointXAndLowestSoleY': root, 'worldGripForMarkedGap': world, 'worldGripYUsingAverageSoleY': (point[1] - midpoint_y) * unit, 'raiseHandSourcePixelsForTargetY': (world[1] - target_y) / unit, 'raiseHandWorldUnitsForTargetY': world[1] - target_y, 'note': 'Hand/gap is at own front shoe, not an already verified external ankle grip. Keep feet grounded; root is not relocated to force hand coordinates.'}
    result['poses'].append(record)
    color = '#05a2be'
    for label, xy, c in [('rear sole', pose['rearSole'], '#ca7131'), ('front sole', pose['frontSole'], '#ca7131'), ('grip gap', point, color), ('root', root, '#c82756')]:
        x, y = xy
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), outline=c, width=3)
        draw.text((x - 62, y - 34), label, font=font, fill=c)
    target_source_y = root[1] + target_y / unit
    draw.line((point[0] - 42, target_source_y, point[0] + 42, target_source_y), fill='#a438bc', width=3)
    draw.text((point[0] - 120, target_source_y - 29), 'target y from grounded soles', font=font, fill='#a438bc')
matte.save(out / 'shanks-root-low-hold-first-source-marked1003.png')
with (out / 'shanks-root-low-hold-first-source-measurements1003.json').open('x', encoding='utf-8') as output:
    output.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
