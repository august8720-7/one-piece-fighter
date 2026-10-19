"""Draw an abstract bone reference only; never runtime Shanks pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

out = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-running-1003')
assert (out / 'README.md').is_file()
destination = out / 'near-far-run-guide1003.png'
assert not destination.exists()
image = Image.new('RGB', (1000, 1000), 'white')
draw = ImageDraw.Draw(image)
font_path = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(font_path), 19) if font_path.exists() else ImageFont.load_default()
near, far = '#186be0', '#dc7a20'
poses = [
    ('0  CONTACT NEAR', ((290, 310), (370, 425)), ((170, 340), (110, 425))),
    ('1  PASSING FAR', ((245, 330), (250, 425)), ((310, 295), (280, 365))),
    ('2  CONTACT FAR', ((170, 340), (110, 425)), ((290, 310), (370, 425))),
    ('3  PASSING NEAR', ((310, 295), (280, 365)), ((245, 330), (250, 425))),
]
for index, (title, near_leg, far_leg) in enumerate(poses):
    ox, oy = (index % 2) * 500, (index // 2) * 500
    point = lambda xy: (xy[0] + ox, xy[1] + oy)
    draw.text((ox + 24, oy + 20), title, font=font, fill='#18232d')
    draw.text((ox + 24, oy + 49), 'BLUE = near/right; ORANGE = far/left', font=font, fill='#18232d')
    draw.line([point((60, 429)), point((450, 429))], fill='#b7bec5', width=2)
    draw.line([point((230, 250)), point((295, 165))], fill='#59616a', width=13)
    draw.ellipse((*point((293, 95)), *point((349, 151))), outline='#59616a', width=7)
    draw.line([point((350, 169)), point((410, 169))], fill='#59616a', width=5)
    draw.polygon([point((410, 169)), point((394, 159)), point((394, 179))], fill='#59616a')
    for color, leg in [(far, far_leg), (near, near_leg)]:
        draw.line([point((230, 250)), point(leg[0]), point(leg[1])], fill=color, width=12)
        for joint in [(230, 250), *leg]:
            x, y = point(joint)
            draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=color)
        x, y = point(leg[1])
        draw.line((x - 10, y, x + 24, y), fill=color, width=9)
    draw.text((ox + 24, oy + 465), 'Abstract guide only. Never runtime artwork.', font=font, fill='#59616a')
image.save(destination)
result = {'file': str(destination), 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'kind': 'program-drawn-abstract-pose-guide-not-character-source', 'runtimeAdopted': False}
(out / 'guide-metadata1003.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
