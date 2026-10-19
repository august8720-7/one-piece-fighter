"""Reference-only static failed pair plus abstract lower-knee correction."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

directory = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-held-1003')
assert (directory / 'README.md').is_file()
pair = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-completion-1003-1509/held_twinkle_throw-paired-face1-1003.png')
target = directory / 'held-twinkle-face-clear-guide1003.png'
assert pair.is_file() and not target.exists()
image = Image.new('RGB', (1900, 600), 'white')
image.paste(Image.open(pair).convert('RGB'), (0, 40))
draw = ImageDraw.Draw(image)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
draw.text((18, 10), 'REJECTED: front knee / vertical shin hides the other actor right eye.', font=font, fill='#ce2453')
draw.rectangle((192, 240, 303, 325), outline='#ce2453', width=3)
draw.text((945, 15), 'NEW JOINTS: low knee next to hips; lower shin almost horizontal.', font=font, fill='#14232d')
draw.text((945, 43), 'Abstract guide only. No source Shanks pixels are changed or moved.', font=font, fill='#58636e')
root, scale = (1450, 490), 3.7
def p(xy):
    return root[0] + xy[0] * scale, root[1] + xy[1] * scale
hip, shoulder, head = (-17, -56), (-32, -78), (-36, -91)
near = [(-2, -42), (22.75, -34.25)]
far = [(-24, -46), (-40, -66)]
# Red box is the real nearby actor face region, never part of the new art.
ax, ay = p((16, -76))
bx, by = p((48, -48))
draw.rectangle((ax, ay, bx, by), outline='#ce2453', width=3)
draw.text((bx + 12, ay + 15), 'Keep leg out', font=font, fill='#ce2453')
draw.line([p(hip), p(shoulder)], fill='#58636e', width=15)
hx, hy = p(head)
draw.ellipse((hx - 32, hy - 32, hx + 32, hy + 32), outline='#58636e', width=7)
draw.line((hx + 28, hy, hx + 73, hy), fill='#58636e', width=3)
draw.polygon([(hx + 73, hy), (hx + 60, hy - 7), (hx + 60, hy + 7)], fill='#58636e')
arm = [shoulder, (-34, -57), (-46, -40)]
draw.line([p(j) for j in arm], fill='#58636e', width=9)
draw.line([p(arm[-1]), p((-77, -22))], fill='#58636e', width=4)
for points, color in [(far, '#e68129'), (near, '#176ed4')]:
    draw.line([p(hip), *[p(j) for j in points]], fill=color, width=13)
    for joint in [hip, *points]:
        x, y = p(joint)
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=color)
    x, y = p(points[-1])
    draw.line((x - 7, y + 3, x + 21, y + 3), fill=color, width=9)
gx, gy = p(near[-1])
draw.ellipse((gx - 12, gy - 12, gx + 12, gy + 12), outline='#05a2be', width=3)
draw.line((980, root[1], 1830, root[1]), fill='#c4cbd1', width=2)
draw.line((root[0] - 8, root[1], root[0] + 8, root[1]), fill='#ce2453', width=3)
draw.line((root[0], root[1] - 8, root[0], root[1] + 8), fill='#ce2453', width=3)
draw.text((945, 540), 'Blue = held front leg; orange = other folded leg. Both shoes above ground.', font=font, fill='#14232d')
draw.text((945, 571), 'Runtime art must come from a real new official-web drawing; guide counts zero.', font=font, fill='#58636e')
image.save(target)
metadata = {'file': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'kind': 'source-pair-and-abstract-joint-reference-only', 'runtimeAdopted': False, 'pairedSource': str(pair), 'pairedSourceSha256': hashlib.sha256(pair.read_bytes()).hexdigest(), 'root': [0, 0], 'hip': hip, 'nearLeg': near, 'farLeg': far, 'fix': 'Front knee lower and nearer hips, lower leg reaches forward almost horizontally beneath other actor eye region.'}
with (directory / 'held-twinkle-face-clear-metadata1003.json').open('x', encoding='utf-8') as output:
    output.write(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(metadata))
