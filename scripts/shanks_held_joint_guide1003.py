"""Abstract joint geometry for Shanks held reactions; never runtime pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

out = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-held-1003')
assert (out / 'README.md').is_file()
destination = out / 'held-joint-geometry-guide1003.png'
assert not destination.exists(), 'Preserve any existing reference'
im = Image.new('RGB', (1100, 1100), 'white')
draw = ImageDraw.Draw(im)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
poses = [
    {'name': 'IDLE / HEIGHT 100', 'hip': (0, -47), 'shoulder': (0, -76), 'head': (0, -91), 'near': [(8, -24), (8, -1)], 'far': [(-8, -24), (-8, -1)], 'grip': None},
    {'name': 'LEG FLIP / GRIP +14 -13', 'hip': (-15, -47), 'shoulder': (-31, -72), 'head': (-31, -84), 'near': [(8, -40), (14, -13)], 'far': [(-23, -45), (-34, -63)], 'grip': (14, -13)},
    {'name': 'LABUBU / GRIP +19.4 -26.6', 'hip': (-17, -52), 'shoulder': (-34, -79), 'head': (-36, -91), 'near': [(11, -50), (19.4, -26.6)], 'far': [(-3, -77), (5, -55)], 'grip': (19.4, -26.6)},
    {'name': 'TWINKLE / GRIP +22.75 -34.25', 'hip': (-14, -57), 'shoulder': (-32, -79), 'head': (-36, -91), 'near': [(12, -61), (22.75, -34.25)], 'far': [(-26, -42), (-35, -62)], 'grip': (22.75, -34.25)},
]
for i, pose in enumerate(poses):
    ox, oy = i % 2 * 550, i // 2 * 550
    scale, root = 3.65, (ox + 300, oy + 458)
    def p(pt):
        return root[0] + pt[0] * scale, root[1] + pt[1] * scale
    draw.text((ox + 18, oy + 15), pose['name'], font=font, fill='#14232d')
    draw.text((ox + 18, oy + 40), 'Fixed root/floor; joints change; whole body scale fixed', font=font, fill='#58636e')
    draw.line((ox + 45, root[1], ox + 515, root[1]), fill='#bac1c8', width=2)
    draw.line([p(pose['hip']), p(pose['shoulder'])], fill='#515d69', width=15)
    hx, hy = p(pose['head'])
    draw.ellipse((hx - 31, hy - 31, hx + 31, hy + 31), outline='#515d69', width=7)
    draw.line((hx + 25, hy - 2, hx + 72, hy - 2), fill='#515d69', width=3)
    draw.polygon([(hx + 72, hy - 2), (hx + 60, hy - 10), (hx + 60, hy + 6)], fill='#515d69')
    # Sole right arm and a simple line indicating held saber; no left arm.
    shoulder = pose['shoulder']
    arm = [shoulder, (shoulder[0] + 2, shoulder[1] + 20), (shoulder[0] - 11, shoulder[1] + 32)]
    draw.line([p(j) for j in arm], fill='#58636e', width=9)
    wrist = arm[-1]
    draw.line([p(wrist), p((wrist[0] - 34, wrist[1] + 18))], fill='#58636e', width=4)
    for key, color in [('far', '#e68129'), ('near', '#176ed4')]:
        draw.line([p(pose['hip']), *[p(j) for j in pose[key]]], fill=color, width=12)
        for joint in [pose['hip'], *pose[key]]:
            x, y = p(joint)
            draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=color)
        x, y = p(pose[key][-1])
        draw.line((x - 7, y + 3, x + 21, y + 3), fill=color, width=9)
    rx, ry = root
    draw.line((rx - 8, ry, rx + 8, ry), fill='#d42757', width=3)
    draw.line((rx, ry - 8, rx, ry + 8), fill='#d42757', width=3)
    if pose['grip']:
        gx, gy = p(pose['grip'])
        draw.ellipse((gx - 13, gy - 13, gx + 13, gy + 13), outline='#05a2be', width=3)
    draw.text((ox + 18, oy + 497), 'Abstract posture reference only. No runtime character pixels.', font=font, fill='#58636e')
im.save(destination)
metadata = {'file': str(destination), 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'kind': 'abstract-joint-guide-not-character-art', 'runtimeAdopted': False, 'poses': poses, 'basis': 'Previously measured existing held-reaction sockets; fixed virtual floor axes specified before generation.'}
with (out / 'held-joint-geometry-metadata1003.json').open('x', encoding='utf-8') as f:
    f.write(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: metadata[key] for key in ['file', 'sha256', 'kind', 'runtimeAdopted']}))
