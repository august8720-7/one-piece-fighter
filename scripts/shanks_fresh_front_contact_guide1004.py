"""Annotate observed source and the real compact30 ankle target; no pixel moves."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/first-pair-independent-shanks-1004-081851')
REF = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-low-hold-1003')
assert (OUT / 'README.md').is_file() and (REF / 'README.md').is_file()
source = ROOT / 'public/assets/generated/source/roster-shanks-fresh-front-hold-1004.png'
expected = '1458dfaacce84b6d2f88904984fa5090cb0ada786528477ae03fc641e31c0d59'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
image = Image.open(source).convert('RGBA')
assert image.size == (1536, 1024)
alpha = image.getchannel('A')
mask = alpha.point(lambda v: 255 if v >= 8 else 0)
neutral_bounds = mask.crop((0, 0, 783, 1024)).getbbox()
assert neutral_bounds is not None
height = neutral_bounds[3] - neutral_bounds[1]
world = 94 / height
# Approximate anatomical contacts are explicitly uncertain; they are not an
# adopted frame registration. Keep the original source and runtime untouched.
rear, front, hand = [1125, 957], [1285, 932], [1200, 815]
root = [(rear[0] + front[0]) / 2, rear[1]]
target_world = [16.0327868852459, -13.180327868852459]
target = [root[i] + target_world[i] / world for i in (0, 1)]
actual = [(hand[i] - root[i]) * world for i in (0, 1)]
pose_bounds = (750, 280, 1536, 1000)
crop = image.crop(pose_bounds)
view = Image.alpha_composite(Image.new('RGBA', crop.size, 'white'), crop).convert('RGB')
draw = ImageDraw.Draw(view)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
point = lambda p: (p[0] - pose_bounds[0], p[1] - pose_bounds[1])
for label, p, color in [('rear sole', rear, '#2284a6'), ('front sole', front, '#2284a6')]:
    x, y = point(p)
    draw.ellipse((x-7, y-7, x+7, y+7), outline=color, width=3)
    draw.text((x-42, y+11), label, fill=color, font=small)
x, y = point(hand)
draw.ellipse((x-15, y-15, x+15, y+15), outline='#cf4667', width=3)
draw.text((x-88, y+28), 'Old C position: between own feet', fill='#ad2b4d', font=small)
gx, gy = point(target)
draw.ellipse((gx-16, gy-16, gx+16, gy+16), fill='#33cf83', outline='#067e43', width=3)
draw.line((gx-22, gy, gx+22, gy), fill='#067e43', width=2)
draw.line((gx, gy-22, gx, gy+22), fill='#067e43', width=2)
draw.text((gx-118, gy-53), 'GREEN: other ankle / new C center', fill='#067e43', font=small)
draw.line((x+20, y, gx-24, gy), fill='#32986b', width=3)
draw.polygon([(gx-20,gy),(gx-33,gy-7),(gx-33,gy+7)],fill='#32986b')
rx, ry = point(root)
draw.line((0, ry, view.width, ry), fill='#93adb7', width=2)
draw.line((rx-7,ry,rx+7,ry),fill='#ca3667',width=3)
draw.line((rx,ry-7,rx,ry+7),fill='#ca3667',width=3)
draw.text((18,15), 'Current real source is unshifted and unscaled. Markers are only references.',font=font,fill='#193441')
draw.text((18,40), 'Re-draw the one right arm toward green. Do not translate the character or crop pixels.',font=small,fill='#4c6470')
guide = REF / 'shanks-fresh-front-green-ankle-guide1004.png'
assert not guide.exists()
view.save(guide)
runtime = ROOT / 'public/assets/characters/shanks/anime/runtime.json'
result = {'kind':'source-intake-and-uncertain-contact-diagnostic-not-adopted', 'sourceSha256':expected,
          'sourceSize':list(image.size), 'alphaRange':list(alpha.getextrema()),
          'neutralAlpha8Bounds':list(neutral_bounds),'neutralAlpha8Height':height,
          'worldUnitsPerSourcePixel':world,'rearSole':rear,'frontSole':front,
          'rootFromActualRearSolidSoleAndSoleCenterMidpoint':root,'handGap':hand,
          'currentCInteriorAlpha':alpha.getpixel(tuple(hand)),
          'noteCInterior':'Current C position has opaque dark cape behind it, not an external transparent gap.',
          'handWorld':actual,'targetHandWorld':target_world,'targetHandSource':target,
          'frontSoleHeightDifferenceWorld':(rear[1]-front[1])*world,
          'neutralSoleHeightDifferenceExampleWorld':(995-976)*world,
          'manualHandSourceUncertaintyPixels':5,'manualSoleCenterSourceUncertaintyPixels':10,
          'manualSolidGroundSourceUncertaintyPixels':3,
          'outer12pxAlphaMax':{k:alpha.crop(b).getextrema()[1] for k,b in {'top':(0,0,1536,12),'bottom':(0,1012,1536,1024),'left':(0,0,12,1024),'right':(1524,0,1536,1024)}.items()},
          'referenceGuide':str(guide),'referenceGuideSha256':hashlib.sha256(guide.read_bytes()).hexdigest(),
          'guidePixelEdits':'Cropped unscaled original over white with markers only; not character art.',
          'runtimeSha256Unchanged':hashlib.sha256(runtime.read_bytes()).hexdigest(),
          'runtimeAdopted':False,'movesChanged':False,'sourcePixelsChanged':False,
          'conclusion':'Preserve real squat and forearm. Re-draw shoulder/elbow/wrist/hand to green outside screen-front shoe/shin, with clear C hole and cape behind. No actor-root relocation or one-pose scaling.'}
with (OUT/'shanks-fresh-front-measurements1004.json').open('x',encoding='utf-8') as output:
    json.dump(result,output,ensure_ascii=False,indent=2)
with (REF/'shanks-fresh-front-green-ankle-guide1004.json').open('x',encoding='utf-8') as output:
    json.dump(result,output,ensure_ascii=False,indent=2)
print(json.dumps({key:result[key] for key in ['neutralAlpha8Height','handWorld','targetHandSource','currentCInteriorAlpha','referenceGuide','referenceGuideSha256','runtimeAdopted']},ensure_ascii=False))
