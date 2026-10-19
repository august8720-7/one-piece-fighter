"""Create an abstract pose instruction diagram, never a character or runtime asset."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DEST = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference')
if not (DEST / 'README.md').is_file():
    raise SystemExit('Reference directory rules required')

poses = [
    ('1 LEFT/NEAR LEG FRONT', [(295, 330), (355, 430), (415, 538), (449, 550)], [(305, 330), (251, 438), (205, 538), (235, 550)]),
    ('2 LEFT SUPPORT / RIGHT PASS', [(295, 330), (300, 438), (300, 538), (335, 550)], [(305, 330), (355, 419), (320, 492), (354, 500)]),
    ('3 RIGHT/FAR LEG FRONT', [(295, 330), (248, 438), (205, 538), (235, 550)], [(305, 330), (355, 430), (415, 538), (449, 550)]),
    ('4 RIGHT SUPPORT / LEFT PASS', [(295, 330), (350, 419), (315, 492), (349, 500)], [(305, 330), (300, 438), (300, 538), (335, 550)]),
]
im = Image.new('RGB', (1200, 1200), '#f7f5ef')
d = ImageDraw.Draw(im)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#f7f5ef"/>']
for n, (label, near, far) in enumerate(poses):
    ox, oy = (n % 2) * 600, (n // 2) * 600
    def line(points, color, width):
        pts = [(x + ox, y + oy) for x, y in points]
        d.line(pts, fill=color, width=width, joint='curve')
        for x, y in pts:
            d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=color)
        svg.append('<polyline points="'+ ' '.join(f'{x},{y}' for x,y in pts)+f'" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')
    d.text((ox+22,oy+16), label, font=font, fill='#172c36')
    d.text((ox+22,oy+45),'Facing RIGHT. RED = same near leg. BLUE = same far leg.',font=small,fill='#172c36')
    line([(150, 557), (470,557)], '#b5bec3', 3)
    line(far, '#236ba9', 15)
    line(near, '#d94943', 18)
    line([(300,330),(305,258),(315,190)],'#303c48',22)
    line([(315,190),(275 if n<2 else 365,255),(256 if n<2 else 402,311)],'#738592',12)
    line([(315,190),(362 if n<2 else 272,256),(399 if n<2 else 250,310)],'#303c48',14)
    d.ellipse((ox+291,oy+101,ox+367,oy+181),outline='#303c48',width=6)
    line([(354,135),(376,145),(354,150)],'#303c48',5)
    svg.append(f'<circle cx="{ox+329}" cy="{oy+141}" r="39" fill="none" stroke="#303c48" stroke-width="6"/>')
    svg.append(f'<text x="{ox+22}" y="{oy+34}" font-family="Arial" font-size="19">{label}</text>')
    d.text((ox+22,oy+578),'GUIDE ONLY - redraw costume and anatomy; do not copy colored sticks.',font=small,fill='#657782')
svg.append('</svg>')
for name, content in [('walk-pose-guide0929.svg',''.join(svg))]:
    path=DEST/name
    if path.exists(): raise SystemExit('Preserve existing guide')
    path.write_text(content,encoding='utf-8')
png=DEST/'walk-pose-guide0929.png'
if png.exists(): raise SystemExit('Preserve existing guide')
im.save(png)
print(png)
