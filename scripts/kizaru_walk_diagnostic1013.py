"""Offline diagnostic only: four existing real crops, unchanged authored roots.

Uses the declared 10 fps and 2.2 world pixels/tick. No root edits, no new pose,
no runtime writes. The new two-cell source remains a separate unregistered card.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/kizaru')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    author_file = ROOT / 'scripts/roster_kizaru_manifest0929.json'
    data = json.loads(author_file.read_text(encoding='utf-8'))
    author = data['characters']['kizaru']
    source = ROOT / author['sources']['kizaru_locomotion_0929']['file']
    incoming = ROOT / 'public/assets/generated/source/roster-kizaru-opposite-contact-1013-1242.png'
    assert digest(source) == author['sources']['kizaru_locomotion_0929']['sha256']
    png = Image.open(source).convert('RGBA')
    targets = [OUT / 'kizaru-original-walk-10fps-diagnostic1013.gif', OUT / 'kizaru-new-contact-static-card1013.png']
    assert not any(path.exists() for path in targets)
    before = {'sources': [{'file': str(p), 'sha256': digest(p)} for p in [source, incoming, author_file]],
              'outputs': list(map(str, targets)), 'purpose': 'diagnostic replay only, not adopted game assets'}
    (OUT / 'kizaru-walk-diagnostic-before1013.json').write_text(json.dumps(before, ensure_ascii=False, indent=2), encoding='utf-8')
    diagnostic_zoom = 4
    unit = author['scale'] / author['textureDensity']
    pixel_scale = unit * diagnostic_zoom
    frames = []
    for index in range(8):
        pose = data['unusedReviewCrops'][f'walk_{index % 4}']
        x, y, w, h = pose['crop']
        sprite = png.crop((x, y, x + w, y + h))
        sprite = sprite.resize((round(w * pixel_scale), round(h * pixel_scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGB', (1280, 540), '#e4e8eb')
        draw = ImageDraw.Draw(frame)
        floor = 495
        draw.line((0, floor, 1280, floor), fill='#b53d37', width=2)
        for column in range(0, 1280, 40):
            draw.line((column, floor, column, 540), fill='#b7c0c6')
        root_x = 265 + index * 6 * 2.2 * diagnostic_zoom
        root_y = floor
        frame.paste(sprite, (round(root_x - pose['root'][0] * pixel_scale), round(root_y - pose['root'][1] * pixel_scale)), sprite)
        draw.text((18, 15), f'DIAGNOSTIC ONLY | real crop walk_{index % 4} | t={index / 10:.1f}s | unchanged root | 10fps / 2.2px per tick', fill='#17222b')
        draw.text((18, 33), 'Replay resets after 0.8s. No acceptance claim; no synthetic in-between poses.', fill='#17222b')
        frames.append(frame)
    frames[0].save(targets[0], save_all=True, append_images=frames[1:], duration=100, loop=0, disposal=2)
    new_image = Image.open(incoming).convert('RGBA')
    static = Image.new('RGB', new_image.size, '#e4e8eb')
    static.paste(new_image, (0, 0), new_image)
    static.save(targets[1])
    result = {**before, 'outputs': [{'file': str(p), 'sha256': digest(p)} for p in targets],
              'fps': 10, 'logicalTicksPerFrame': 6, 'walkSpeedWorldPixelsPerTick': 2.2,
              'diagnosticZoom': diagnostic_zoom, 'sourcePixelToWorld': unit,
              'authoredRootsChanged': False, 'newCandidateAddedToLoop': False,
              'reasonForSeparateNewCard': 'New image has no accepted root/author mapping. No temporary per-pose root is invented to improve continuity.',
              'assessmentRule': 'Trace hip-knee-ankle occlusion and alternate support/swing feet at speed; brightness is only a secondary cue.',
              'runtimeModified': False, 'browserGameReviewed': False}
    (OUT / 'kizaru-walk-diagnostic1013.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
