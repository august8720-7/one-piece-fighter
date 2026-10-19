"""Abstract compact-body guide plus unchanged real held-leg reference only."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
out = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-low-hold-1003')
assert (out / 'README.md').is_file()
target = out / 'compact-held-leg-pair-guide1004.png'
assert not target.exists()
old = ROOT / 'public/assets/characters/luffy/anime'
runtime_path = old / 'runtime.json'
runtime = json.loads(runtime_path.read_text(encoding='utf-8'))
name = 'luffy/held_leg_flip/0'
page = next(p for p in runtime['pages'] if p['id'] == runtime['framePages'][name])
atlas_path = old / page['data']
atlas = json.loads(atlas_path.read_text(encoding='utf-8'))
box = atlas['frames'][name]['frame']
with Image.open(old / page['image']) as sheet:
    victim = sheet.crop((box['x'], box['y'], box['x'] + box['w'], box['y'] + box['h'])).convert('RGBA')
geo = runtime['attachments'][name]
scale = 4 / (2 * runtime['textureDensity'])
victim = victim.resize((round(victim.width * scale), round(victim.height * scale)), Image.Resampling.LANCZOS)
image = Image.new('RGB', (1600, 670), 'white')
draw = ImageDraw.Draw(image)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
world_hand = [16.032786885245905, -13.180327868852459]
records = []
for index, turn in enumerate(['FORWARD HOLD', 'BACK HOLD / TORSO TURN']):
    ox = index * 800
    origin = [ox + 290, 555]
    point = lambda xy: (origin[0] + xy[0] * 4, origin[1] + xy[1] * 4)
    draw.text((ox + 18, 18), turn + ' / fixed logical roots30 apart', font=font, fill='#14232d')
    draw.text((ox + 18, 48), 'Gray bones are posture guides. Real Luffy is an existing reaction reference.', font=small, fill='#58636e')
    draw.line((ox + 35, origin[1], ox + 770, origin[1]), fill='#afb9c2', width=2)
    # Existing real victim pose: face left toward the right-facing actor.
    vp = ImageOps.mirror(victim)
    vx = vp.width - geo['root']['x'] * scale
    vy = geo['root']['y'] * scale
    victim_origin = [origin[0] + 30 * 4, origin[1]]
    image.paste(vp.convert('RGB'), (round(victim_origin[0] - vx), round(victim_origin[1] - vy)), vp.getchannel('A'))
    hip = [-4, -31 if index else -30]
    shoulder = [3 if index else 5, -47 if index else -48]
    head = [5 if index else 7, -60 if index else -59]
    near = [[7 if index else 5, -19 if index else -18], [6, -1]]
    far = [[-10, -21 if index else -20], [-6, -1]]
    draw.line([point(hip), point(shoulder)], fill='#515e69', width=15)
    hx, hy = point(head)
    draw.ellipse((hx - 31, hy - 31, hx + 31, hy + 31), outline='#515e69', width=7)
    draw.line((hx + 26, hy, hx + 66, hy), fill='#515e69', width=3)
    draw.polygon([(hx + 66, hy), (hx + 55, hy - 7), (hx + 55, hy + 7)], fill='#515e69')
    for joints, color in [(far, '#db8429'), (near, '#186ecb')]:
        draw.line([point(hip), *[point(j) for j in joints]], fill=color, width=12)
        for j in [hip, *joints]:
            x, y = point(j)
            draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=color)
        x, y = point(joints[-1])
        draw.line((x - 12, y + 3, x + 16, y + 3), fill=color, width=8)
    # Only one right arm; C gap is on the actual other-character ankle.
    arm = [[7 if not index else 5, -44], [11, -29 if not index else -28], [17, -17], world_hand]
    draw.line([point(j) for j in arm], fill='#515e69', width=9)
    gx, gy = point(world_hand)
    draw.arc((gx - 11, gy - 13, gx + 11, gy + 13), 45, 315, fill='#515e69', width=5)
    draw.ellipse((gx - 6, gy - 6, gx + 6, gy + 6), outline='#08a5be', width=2)
    for root, label in [(origin, 'actor root'), (victim_origin, 'other actor root')]:
        draw.line((root[0] - 6, root[1], root[0] + 6, root[1]), fill='#c72b56', width=3)
        draw.line((root[0], root[1] - 6, root[0], root[1] + 6), fill='#c72b56', width=3)
        draw.text((root[0] - 42, root[1] + 17), label, font=small, fill='#c72b56')
    draw.text((ox + 18, 610), 'Actor shoes narrow +/-6; hand C gap +16.0328,-13.1803, outside own shin.', font=small, fill='#14232d')
    draw.text((ox + 18, 640), 'No guide pixels become runtime Shanks art. Preserve real limb length/proportions.', font=small, fill='#58636e')
    records.append({'turn': turn, 'actorRoot': [0, 0], 'victimRoot': [30, 0], 'handWorld': world_hand, 'shoeCenters': [[-6, 0], [6, 0]], 'hipGuide': hip, 'armGuide': arm, 'kind': 'abstract-joints-not-proportion-fit-or-character-pixels'})
image.save(target)
metadata = {'file': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'kind': 'abstract-compact-hand-and-actual-existing-held-reference-only', 'runtimeAdopted': False, 'legacyRuntimeSha256': hashlib.sha256(runtime_path.read_bytes()).hexdigest(), 'legacyAtlasSha256': hashlib.sha256(atlas_path.read_bytes()).hexdigest(), 'states': records, 'note': 'Gray knees/limbs only specify topology/contact zones. Final character retains real human leg/arm lengths and neutral-scale proportions; never shrink or draw this guide as art.'}
with (out / 'compact-held-leg-pair-metadata1004.json').open('x', encoding='utf-8') as output:
    output.write(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'guide': str(target), 'sha256': metadata['sha256'], 'runtimeAdopted': False}))
