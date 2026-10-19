"""Extract existing public held poses as read-only reference, never new Shanks art."""
from pathlib import Path
import json
import hashlib
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
directory = root / 'public/assets/characters/luffy/anime'
runtime_file = directory / 'runtime.json'
runtime = json.loads(runtime_file.read_text(encoding='utf-8'))
out = Path('D:/one-piece-fighter-crossover-0922/roster-0929/reference/shanks-held-1003')
assert (out / 'README.md').is_file()
image = Image.new('RGB', (1230, 520), 'white')
draw = ImageDraw.Draw(image)
font_path = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(font_path), 17) if font_path.exists() else ImageFont.load_default()
notes = []
for index, state in enumerate(['held_leg_flip', 'held_labubu_throw', 'held_twinkle_throw']):
    frame_name = 'luffy/' + state + '/0'
    page_id = runtime['framePages'][frame_name]
    page = next(item for item in runtime['pages'] if item['id'] == page_id)
    atlas_file = directory / page['data']
    atlas = json.loads(atlas_file.read_text(encoding='utf-8'))
    rect = atlas['frames'][frame_name]['frame']
    with Image.open(directory / page['image']) as sheet:
        pose = sheet.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h'])).convert('RGBA')
    geometry = runtime['attachments'][frame_name]
    cx, cy = index * 410 + 20, 54
    image.paste(pose.convert('RGB'), (cx, cy), pose.getchannel('A'))
    draw.text((index * 410 + 16, 16), state, font=font, fill='#202a33')
    for label, point, color in [('root', geometry['root'], '#bd2949'), ('grip', geometry['sockets']['grip'], '#177ea0')]:
        x, y = cx + point['x'], cy + point['y']
        draw.ellipse((x - 5, y - 5, x + 5, y + 5), outline=color, width=2)
        draw.text((x + 8, y - 8), label, font=font, fill=color)
    density = runtime['textureDensity']
    world_grip = [(geometry['sockets']['grip'][axis] - geometry['root'][axis]) / (2 * density) for axis in ['x', 'y']]
    draw.text((index * 410 + 16, 486), 'R-facing grip: %.2f, %.2f' % tuple(world_grip), font=font, fill='#202a33')
    notes.append({'state': state, 'frame': frame_name, 'runtimeGeometry': geometry, 'worldGripR': world_grip, 'sourceRuntimeSha256': hashlib.sha256(runtime_file.read_bytes()).hexdigest(), 'sourceAtlasSha256': hashlib.sha256(atlas_file.read_bytes()).hexdigest()})
destination = out / 'existing-held-pose-guide1003.png'
assert not destination.exists()
image.save(destination)
(out / 'held-reference-metadata1003.json').write_text(json.dumps({'kind':'existing-game-pose-reference-only-not-shanks-art', 'guideSha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'states':notes}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'guide':str(destination), 'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(), 'worldGripTargets':{n['state']:n['worldGripR'] for n in notes}}, ensure_ascii=False))
