"""Read-only source geometry and original-pixel static low-hand diagnostics.

No runtime manifest, move, holdOffset, selector or source-pixel edits.
"""
from pathlib import Path
import hashlib
import json
import math
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/first-pair-independent-shanks-1004-081851')
assert (OUT / 'README.md').is_file()
catalog = json.loads((ROOT / 'scripts/roster_shanks_hold_sources1004.json').read_text(encoding='utf-8'))['sources']
entry = catalog['shanks_external_hold_1004']
path = ROOT / entry['file']
assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']
image = Image.open(path).convert('RGBA')
assert image.size == (2172, 724)
alpha = image.getchannel('A')
neutral_bounds = [40, 28, 580, 687]
neutral_height, world = 659, 94 / 659
target_y = -13.180327868852459
old_held_x = 13.967213114754095
poses = [
    {'pose': 'forward', 'crop': [726, 195, 662, 500], 'rearSole': [935, 677], 'frontSole': [1207, 623], 'handGap': [1363, 527], 'soleAlpha8Y': [678, 624]},
    {'pose': 'back', 'crop': [1491, 198, 645, 497], 'rearSole': [1725, 685], 'frontSole': [1941, 620], 'handGap': [2111, 535], 'soleAlpha8Y': [688, 621]},
]
border = {'top': alpha.crop((0, 0, 2172, 12)), 'bottom': alpha.crop((0, 712, 2172, 724)), 'left': alpha.crop((0, 0, 12, 724)), 'right': alpha.crop((2160, 0, 2172, 724))}
result = {'kind': 'read-only-original-source-diagnostic-not-adopted', 'sourceKey': 'shanks_external_hold_1004', 'sourceSha256': entry['sha256'], 'neutralAlpha8Bounds': neutral_bounds, 'neutralAlpha8Height': neutral_height, 'worldUnitsPerSourcePixel': world, 'sourceAlphaRange': list(alpha.getextrema()), 'outer12pxAlphaMax': {key: strip.getextrema()[1] for key, strip in border.items()}, 'manualAnatomicalPointUncertaintySourcePixels': 3, 'runtimeChanged': False, 'moveChanged': False, 'holdOffsetChanged': False, 'selectorChanged': False, 'poses': []}
matte = Image.alpha_composite(Image.new('RGBA', image.size, 'white'), image).convert('RGB')
draw = ImageDraw.Draw(matte)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
for pose in poses:
    rear, front, hand = pose['rearSole'], pose['frontSole'], pose['handGap']
    root = [(rear[0] + front[0]) / 2, rear[1]]
    point_world = [(hand[i] - root[i]) * world for i in [0, 1]]
    desired_hand_y = root[1] + target_y / world
    crop_x, crop_y, crop_w, crop_h = pose['crop']
    geometry = {'root': [root[0] - crop_x, root[1] - crop_y], 'hand': [hand[0] - crop_x, hand[1] - crop_y]}
    record = {**pose, 'groundedSoleRoot': root, 'groundPlaneBasis': 'x midpoint of observed actual shoe contacts; y solid rear sole alpha>=200. Front solid sole is visibly higher; do not average away the lift.', 'handGapAlpha': alpha.getpixel(tuple(hand)), 'handGapWorld': point_world, 'frontShoeAboveGroundWorld': (rear[1] - front[1]) * world, 'frontShoeNeedsLowerSourcePixels': rear[1] - front[1], 'targetHandWorldY': target_y, 'targetHandSourceY': desired_hand_y, 'handNeedsLowerSourcePixels': desired_hand_y - hand[1], 'handNeedsLowerWorld': target_y - point_world[1], 'hypotheticalHorizontalOffsetOnly': point_world[0] + old_held_x, 'hypotheticalOffsetIsNotMoveData': True, 'sourceCropLocalGeometry': geometry}
    result['poses'].append(record)
    for label, point, color in [('rear sole', rear, '#c67526'), ('front sole', front, '#c67526'), ('hand gap', hand, '#0a8cac'), ('actual floor root', root, '#c32b56')]:
        x, y = point
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), outline=color, width=3)
        draw.text((x - 66, y - 31), label, font=font, fill=color)
    draw.line((crop_x, root[1], crop_x + crop_w, root[1]), fill='#bc6880', width=2)
    draw.line((front[0], front[1] + 5, front[0], root[1] - 4), fill='#c67526', width=3)
    draw.line((hand[0], hand[1] + 7, hand[0], desired_hand_y - 7), fill='#ae3294', width=3)
    draw.ellipse((hand[0] - 7, desired_hand_y - 7, hand[0] + 7, desired_hand_y + 7), outline='#ae3294', width=3)
    draw.text((crop_x + 12, 10), f"{pose['pose']} actual hand {point_world[0]:.3f},{point_world[1]:.3f}; desired y {target_y:.3f}", font=font, fill='#14232d')
matte.save(OUT / 'shanks-external-hold-source-marked1004.png')

# Static pairing uses unchanged Luffy held pixels and only a hypothetical x
# offset. Vertical miss remains visible rather than relocating Shanks root.
legacy = ROOT / 'public/assets/characters/luffy/anime'
runtime_file = legacy / 'runtime.json'
runtime = json.loads(runtime_file.read_text(encoding='utf-8'))
name = 'luffy/held_leg_flip/0'
page = next(page for page in runtime['pages'] if page['id'] == runtime['framePages'][name])
atlas_file = legacy / page['data']
atlas = json.loads(atlas_file.read_text(encoding='utf-8'))
box = atlas['frames'][name]['frame']
with Image.open(legacy / page['image']) as sheet:
    victim = sheet.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h'])).convert('RGBA')
victim_geom = runtime['attachments'][name]
victim_scale = 4 / (2 * runtime['textureDensity'])
victim = victim.resize((round(victim.width * victim_scale), round(victim.height * victim_scale)), Image.Resampling.LANCZOS)
panel_list = []
for record in result['poses']:
    cx, cy, cw, ch = record['crop']
    pose_pixels = image.crop((cx, cy, cx + cw, cy + ch)).resize((round(cw * world * 4), round(ch * world * 4)), Image.Resampling.LANCZOS)
    rx, ry = record['sourceCropLocalGeometry']['root']
    for facing in [1, -1]:
        canvas = Image.new('RGBA', (1000, 580), '#edf3f5')
        brush = ImageDraw.Draw(canvas)
        origin = [240 if facing == 1 else 760, 455]
        brush.line((0, 455, 1000, 455), fill='#aebbc2', width=2)
        pixels = pose_pixels if facing == 1 else ImageOps.mirror(pose_pixels)
        prx = rx * world * 4 if facing == 1 else pixels.width - rx * world * 4
        canvas.alpha_composite(pixels, (round(origin[0] - prx), round(origin[1] - ry * world * 4)))
        target_origin = [origin[0] + facing * record['hypotheticalHorizontalOffsetOnly'] * 4, origin[1]]
        target = ImageOps.mirror(victim) if facing == 1 else victim
        vrx = victim_geom['root']['x'] * victim_scale
        if facing == 1:
            vrx = target.width - vrx
        canvas.alpha_composite(target, (round(target_origin[0] - vrx), round(target_origin[1] - victim_geom['root']['y'] * victim_scale)))
        brush = ImageDraw.Draw(canvas)
        hand = [origin[0] + facing * record['handGapWorld'][0] * 4, origin[1] + record['handGapWorld'][1] * 4]
        foot = [hand[0], origin[1] + target_y * 4]
        for point, color in [(hand, '#08a0b5'), (foot, '#c62c5c')]:
            brush.ellipse((point[0] - 6, point[1] - 6, point[0] + 6, point[1] + 6), outline=color, width=3)
        brush.text((16, 16), f"NOT ADOPTED {record['pose']} / facing{facing}: grounded rear sole, original pixels", font=font, fill='#15242b')
        brush.text((16, 495), f"Visible front shoe lift {record['frontShoeAboveGroundWorld']:.3f}world; hand vertical miss {record['handNeedsLowerWorld']:.3f}world", font=font, fill='#c62c5c')
        brush.text((16, 531), 'Hypothetical x-only pairing; no holdOffset/selector changes, no root vertical shift.', font=font, fill='#58636e')
        canvas.convert('RGB').save(OUT / (f"shanks-external-hold-{record['pose']}-face{facing}-static1004.png"))
        panel_list.append(canvas.convert('RGB'))
montage = Image.new('RGB', (2000, 1160), 'white')
for index, panel in enumerate(panel_list):
    montage.paste(panel, (index % 2 * 1000, index // 2 * 580))
montage.save(OUT / 'shanks-external-hold-static-pairs1004.jpg')
result['legacyHeldEvidence'] = {'runtimeSha256': hashlib.sha256(runtime_file.read_bytes()).hexdigest(), 'atlasSha256': hashlib.sha256(atlas_file.read_bytes()).hexdigest(), 'frame': name, 'kind': 'actual-unchanged-held-pixels-read-only-static-reference'}
result['conclusion'] = 'Preserve source; not adopted. Forefeet float7.7/9.27world and both hands are about-21.4world instead of-13.18. Require actual leg-joint/hand-height re-drawing, never actor root relocation or individual pose scale.'
with (OUT / 'shanks-external-hold-measurements1004.json').open('x', encoding='utf-8') as output:
    output.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'neutralAlpha8Height': neutral_height, 'edgeAlphaMax': result['outer12pxAlphaMax'], 'poses': [{k: pose[k] for k in ['pose', 'groundedSoleRoot', 'handGap', 'handGapWorld', 'frontShoeAboveGroundWorld', 'handNeedsLowerSourcePixels', 'hypotheticalHorizontalOffsetOnly']} for pose in result['poses']], 'adopted': False}, ensure_ascii=False))
