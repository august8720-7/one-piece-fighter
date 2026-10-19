"""Register real Shanks foot sockets once and draw source-only pair diagnostics.

No generated character pixels, dynamic positioning, core edits or publication.
The paired illustrations are static material reviews, not gameplay acceptance.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-completion-1003-1509')
assert (OUT / 'README.md').is_file()
CATALOG = json.loads((ROOT / 'scripts/roster_pirate_sources0929.json').read_text(encoding='utf-8'))['sources']
REFERENCE_FILE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-held-1003/held-reference-metadata1003.json')
reference = json.loads(REFERENCE_FILE.read_text(encoding='utf-8'))
contracts = {item['state']: item['worldGripR'] for item in reference['states']}
assert sys.argv[1:] in [[], ['--twinkle-face-clear'], ['--twinkle-cape-repair']], 'Only explicit measured variant allowed'
face_clear = sys.argv[1:] == ['--twinkle-face-clear']
cape_repair = sys.argv[1:] == ['--twinkle-cape-repair']
suffix = '-cape-repair' if cape_repair else '-face-clear' if face_clear else ''
source_configs = {
    'shanks_held_joint_repair_1003': {'height': 501, 'neutralBounds': [54, 13, 543, 514]},
    'shanks_held_twinkle_focus_1003': {'height': 779, 'neutralBounds': [16, 136, 672, 915]},
}
poses = [
    {'anim': 'held_leg_flip', 'source': 'shanks_held_joint_repair_1003', 'crop': [776, 33, 681, 457], 'foot': [1370, 443], 'footKind': 'visible bare ankle just above sandal strap', 'attacker': 'labubu', 'move': 'sp_leg_flip', 'hold': 30},
    {'anim': 'held_labubu_throw', 'source': 'shanks_held_joint_repair_1003', 'crop': [67, 556, 769, 407], 'foot': [751, 884], 'footKind': 'visible bare ankle above rear sandal strap', 'attacker': 'labubu', 'move': 'throw_fwd', 'hold': 31},
    {'anim': 'held_twinkle_throw', 'source': 'shanks_held_twinkle_focus_1003', 'crop': [736, 195, 787, 576], 'foot': [1460, 733], 'footKind': 'visible lower plantar sole near midfoot; other shoe is higher', 'attacker': 'twinkle', 'move': 'throw_fwd', 'hold': 32},
]
if face_clear:
    source_configs = {'shanks_held_twinkle_face_clear_1003': {'height': 746, 'neutralBounds': [15, 160, 644, 906]}}
    poses = [{'anim': 'held_twinkle_throw', 'source': 'shanks_held_twinkle_face_clear_1003', 'crop': [729, 222, 779, 587], 'foot': [1450, 657], 'footKind': 'actual visible underside sole edge at midfoot, alpha251; lower-knee new drawing', 'attacker': 'twinkle', 'move': 'throw_fwd', 'hold': 32}]
if cape_repair:
    source_configs = {'shanks_held_twinkle_cape_repair_1003': {'height': 752, 'neutralBounds': [29, 164, 676, 916]}}
    poses = [{'anim': 'held_twinkle_throw', 'source': 'shanks_held_twinkle_cape_repair_1003', 'crop': [700, 226, 825, 596], 'foot': [1460, 666], 'footKind': 'actual visible lower plantar edge near midfoot, inside source alpha; low knee and folded-back cape', 'attacker': 'twinkle', 'move': 'throw_fwd', 'hold': 32}]
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
sources = {}
measurement = {
    'schemaVersion': 1, 'characterId': 'shanks',
    'status': 'true-foot-fixed-held-contract-static-pair-review-before-game',
    'rootRegistrationContract': 'Held root is a virtual floor axis registered once from observed ankle/sole and existing fixed world hold contract. Source-tile idle coordinates do not define every airborne pose axis. No image translation/rotation, pose-specific scaling, or runtime root adjustment.',
    'referenceEvidence': {'file': str(REFERENCE_FILE), 'sha256': hashlib.sha256(REFERENCE_FILE.read_bytes()).hexdigest(), 'kind': reference['kind']},
    'sources': {}, 'frames': {}, 'anims': {}, 'registrations': [],
}
for key, config in source_configs.items():
    path = ROOT / CATALOG[key]['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == CATALOG[key]['sha256']
    sources[key] = Image.open(path).convert('RGBA')
    measurement['sources'][key] = {'unitScale': 380 / config['height'], 'scaleBasis': f"One actual neutral alpha>=8 height{config['height']}px. Uniform380/{config['height']} for every adopted drawing from this page; no per-pose fitting.", 'neutralVisibleAlpha8Bounds': config['neutralBounds'], 'sourceSha256': CATALOG[key]['sha256']}

def legacy_frame(cid, anim):
    directory = ROOT / 'public/assets/characters' / cid / 'anime'
    runtime_path = directory / 'runtime.json'
    runtime = json.loads(runtime_path.read_text(encoding='utf-8'))
    contract = runtime['anims'][anim]
    index = contract.get('throwExposures', contract['exposures'])[0]['frame']
    name = f'{cid}/{anim}/{index}'
    def part(frame_name):
        page_id = runtime['framePages'][frame_name]
        page = next(page for page in runtime['pages'] if page['id'] == page_id)
        atlas_path = directory / page['data']
        png_path = directory / page['image']
        atlas = json.loads(atlas_path.read_text(encoding='utf-8'))
        box = atlas['frames'][frame_name]['frame']
        with Image.open(png_path) as image:
            pixels = image.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h'])).convert('RGBA')
        hashes = {'runtime': hashlib.sha256(runtime_path.read_bytes()).hexdigest(), 'atlas': hashlib.sha256(atlas_path.read_bytes()).hexdigest(), 'png': hashlib.sha256(png_path.read_bytes()).hexdigest()}
        return pixels, runtime['attachments'][frame_name], hashes
    body = part(name)
    foreground_name = runtime.get('foregroundFrames', {}).get(name)
    foreground = part(foreground_name) if foreground_name else None
    return body, foreground, runtime['textureDensity'], name

def paste_runtime(canvas, part, density, origin, facing):
    pixels, geometry, _ = part
    scale = 4 / (2 * density)
    pixels = pixels.resize((round(pixels.width * scale), round(pixels.height * scale)), Image.Resampling.LANCZOS)
    rx, ry = geometry['root']['x'] * scale, geometry['root']['y'] * scale
    if facing == -1:
        pixels = ImageOps.mirror(pixels)
        rx = pixels.width - rx
    canvas.alpha_composite(pixels, (round(origin[0] - rx), round(origin[1] - ry)))

pair_records, panels = [], []
for pose in poses:
    key = pose['source']
    x, y, width, height = pose['crop']
    sx, sy = pose['foot']
    world_scale = 94 / source_configs[key]['height']
    wx, wy = contracts[pose['anim']]
    root_absolute = [sx - wx / world_scale, sy - wy / world_scale]
    root_local = [root_absolute[0] - x, root_absolute[1] - y]
    socket_local = [sx - x, sy - y]
    assert sources[key].getpixel((sx, sy))[3] >= 8, 'Foot marking must touch actual visible pixels'
    pixels = sources[key].crop((x, y, x + width, y + height))
    visible = pixels.getchannel('A').point(lambda value: 255 if value >= 8 else 0).getbbox()
    bounds = [(visible[0] - root_local[0]) * world_scale, (visible[1] - root_local[1]) * world_scale, (visible[2] - root_local[0]) * world_scale, (visible[3] - root_local[1]) * world_scale]
    assert bounds[3] < 0, 'No body or other shoe may pass below virtual ground'
    frame_name = pose['anim'] + '_1003'
    measurement['frames'][frame_name] = {'source': key, 'crop': pose['crop'], 'root': root_local, 'sockets': {'grip': socket_local}, 'transparency': {'mode': 'source-alpha'}}
    measurement['anims'][pose['anim']] = {'frames': [frame_name], 'loop': False, 'exposures': [{'frame': 0, 'ticks': 12}]}
    registration = {'anim': pose['anim'], 'source': key, 'sourceFoot': pose['foot'], 'footKind': pose['footKind'], 'worldUnitPerSourcePixel': world_scale, 'targetWorldGripFacingRight': [wx, wy], 'sourceVirtualRootAbsolute': root_absolute, 'cropLocalRoot': root_local, 'formula': 'sourceVirtualRoot = measuredFoot - targetWorldGrip/worldUnitPerSourcePixel', 'worldVisibleAlpha8Bounds': bounds, 'lowestVisiblePixelAboveFloor': -bounds[3], 'runtimePoseTranslation': False, 'individualPoseScaling': False}
    measurement['registrations'].append(registration)
    diagnostic = Image.new('RGB', (width + 36, math.ceil(max(height, root_local[1])) + 118), 'white')
    diagnostic.paste(pixels.convert('RGB'), (18, 18), pixels.getchannel('A'))
    draw = ImageDraw.Draw(diagnostic)
    px, py = socket_local[0] + 18, socket_local[1] + 18
    rx, ry = root_local[0] + 18, root_local[1] + 18
    draw.line((0, ry, diagnostic.width, ry), fill='#cccccc', width=2)
    draw.ellipse((px - 7, py - 7, px + 7, py + 7), outline='#039bc1', width=3)
    draw.line((rx - 7, ry, rx + 7, ry), fill='#ce2453', width=3)
    draw.line((rx, ry - 7, rx, ry + 7), fill='#ce2453', width=3)
    draw.text((18, diagnostic.height - 90), f"{pose['anim']} / source foot {sx},{sy}", font=font, fill='#16232d')
    draw.text((18, diagnostic.height - 61), f'World grip {wx:.5f},{wy:.5f}; lowest visible y {bounds[3]:.3f}', font=small, fill='#16232d')
    draw.text((18, diagnostic.height - 34), 'One static author registration; diagnostic only, never runtime pixels.', font=small, fill='#58636e')
    diagnostic.save(OUT / (pose['anim'] + suffix + '-source-registration1003.png'))
    body, foreground, density, legacy_name = legacy_frame(pose['attacker'], pose['move'])
    legacy_geometry = body[1]
    palm = legacy_geometry['sockets']['grip_gap']
    legacy_grip = [(palm[axis] - legacy_geometry['root'][axis]) / (2 * density) for axis in ['x', 'y']]
    pair_delta = [pose['hold'] - wx - legacy_grip[0], wy - legacy_grip[1]]
    for facing in [1, -1]:
        canvas = Image.new('RGBA', (900, 560), '#eef3f5')
        draw = ImageDraw.Draw(canvas)
        root1 = [230 if facing == 1 else 670, 450]
        root2 = [root1[0] + facing * pose['hold'] * 4, root1[1]]
        draw.line((0, 450, 900, 450), fill='#acbbc4', width=2)
        paste_runtime(canvas, body, density, root1, facing)
        target = pixels.resize((round(width * world_scale * 4), round(height * world_scale * 4)), Image.Resampling.LANCZOS)
        trx, try_ = root_local[0] * world_scale * 4, root_local[1] * world_scale * 4
        if -facing == -1:
            target = ImageOps.mirror(target)
            trx = target.width - trx
        canvas.alpha_composite(target, (round(root2[0] - trx), round(root2[1] - try_)))
        if foreground:
            paste_runtime(canvas, foreground, density, root1, facing)
        point1 = [root1[0] + facing * legacy_grip[0] * 4, root1[1] + legacy_grip[1] * 4]
        point2 = [root2[0] - facing * wx * 4, root2[1] + wy * 4]
        draw = ImageDraw.Draw(canvas)
        for point, color in [(point1, '#ea7327'), (point2, '#009ebd')]:
            draw.ellipse((point[0] - 5, point[1] - 5, point[0] + 5, point[1] + 5), outline=color, width=2)
        draw.text((18, 16), f"{pose['attacker']}/{pose['move']} -> Shanks/{pose['anim']} / face {facing}", font=font, fill='#14232d')
        draw.text((18, 487), f'Fixed hold {pose["hold"]}; true grip delta {pair_delta[0]:.5f},{pair_delta[1]:.5f}; floor clearance {-bounds[3]:.3f}', font=font, fill='#14232d')
        draw.text((18, 519), 'Static actual-source pairing only. No core step, wall, release or gameplay acceptance.', font=small, fill='#58636e')
        path = OUT / (pose['anim'] + suffix + f'-paired-face{facing}-1003.png')
        canvas.convert('RGB').save(path)
        panels.append(canvas.convert('RGB'))
        pair_records.append({'reaction': pose['anim'], 'attackerFrame': legacy_name, 'attackerHashes': body[2], 'attackerFacing': facing, 'holdOffset': pose['hold'], 'legacyTrueWorldGrip': legacy_grip, 'socketPairDeltaWorld': pair_delta, 'worldVisibleAlpha8Bounds': bounds, 'image': str(path), 'kind': 'static-source-pair-not-gameplay-acceptance'})

measurement['observations'] = ['Three independently drawn joint poses from two actual web sources. Original unsuitable twinkle poses are preserved and not mapped.', 'First two are distinct ankle-grab postures; third source is newly drawn low-front-shoe posture with the other shoe higher.', 'Root registration is measured true foot plus canonical held contract, not a mechanical tile-idle origin. Actual pairing is still subject to real game review.']
if face_clear:
    measurement['observations'] = ['One independently drawn official-web lower-knee posture fixes the previously observed eye occlusion; full sole right arm and saber preserved.', 'Front knee is near hips, lower leg reaches forward almost horizontally; both shoes and whole body remain above the virtual floor.', 'Actual source sole edge1450,657 has alpha251. Uniform94/746 world scale and fixed22.75,-34.25 hold contract define one static author registration. No dynamic position/rotation, pose-specific scale or pixel deletion. Real game acceptance remains separate.']
if cape_repair:
    measurement['observations'] = ['One real official-web cape-direction correction preserves the true low-knee posture, sole right arm and complete saber.', 'Forward cape tip is naturally folded behind the body, not erased/cropped, shifted or locally rescaled. Both shoes and full art stay above virtual floor.', 'Actual source midsole edge1460,666; uniform94/752=0.125world/source and fixed22.75,-34.25 hold contract define one static registration. Real game acceptance remains separate.']
destination = ROOT / ('docs/assets/shanks-held-twinkle-cape-repair-measurements1003.json' if cape_repair else 'docs/assets/shanks-held-twinkle-face-clear-measurements1003.json' if face_clear else 'docs/assets/shanks-held-registration-measurements1003.json')
with destination.open('x', encoding='utf-8') as output:
    output.write(json.dumps(measurement, ensure_ascii=False, indent=2) + '\n')
with (OUT / ('shanks-held' + suffix + '-static-pairs1003.json')).open('x', encoding='utf-8') as output:
    output.write(json.dumps({'kind': 'static-source-pair-review-before-game', 'measurementSha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'pairs': pair_records}, ensure_ascii=False, indent=2) + '\n')
montage = Image.new('RGB', (1800, 560 * math.ceil(len(panels) / 2)), 'white')
for index, panel in enumerate(panels):
    montage.paste(panel, (index % 2 * 900, index // 2 * 560))
montage.save(OUT / ('shanks-held' + suffix + '-static-pair-montage1003.jpg'))
print(json.dumps({'measurement': str(destination), 'poses': [{'anim': item['anim'], 'foot': item['sourceFoot'], 'worldBounds': item['worldVisibleAlpha8Bounds'], 'floorClearance': item['lowestVisiblePixelAboveFloor']} for item in measurement['registrations']], 'staticPairs': len(pair_records), 'runtimeChanged': False}, ensure_ascii=False))
