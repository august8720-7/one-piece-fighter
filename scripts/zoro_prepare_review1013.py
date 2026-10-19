"""Read existing Zoro sources/runtime and prepare diagnostics without new artwork."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert (OUT / 'README.md').is_file()
    author = json.loads((ROOT / 'scripts/roster_zoro_manifest0929.json').read_text(encoding='utf-8'))['characters']['zoro']
    runtime_file = ROOT / 'public/assets/characters/zoro/anime/runtime.json'
    runtime = json.loads(runtime_file.read_text(encoding='utf-8'))
    atlas_json = ROOT / 'public/assets/characters/zoro/anime/atlas.json'
    atlas_png = ROOT / 'public/assets/characters/zoro/anime/atlas.png'
    atlas = json.loads(atlas_json.read_text(encoding='utf-8'))
    page = Image.open(atlas_png).convert('RGBA')
    sources = []
    for source_key, record in author['sources'].items():
        path = ROOT / record['file']
        actual = sha(path)
        assert actual == record['sha256'], source_key
        with Image.open(path) as original:
            original.verify()
        original = Image.open(path)
        original.load()
        sources.append({'id': source_key, 'file': record['file'], 'sha256': actual,
                        'size': original.size, 'mode': original.mode, 'fullDecode': True})
    anim_text = (ROOT / 'src/render/animations.ts').read_text(encoding='utf-8')
    anim_section = anim_text.split('export const DEFAULT_ANIMS: AnimTable = {', 1)[1].split('\n};', 1)[0]
    states = [x for x in re.findall(r'^  (\w+): \{', anim_section, re.M) if x != 'portrait']
    moves_text = (ROOT / 'src/characters/zoro/moves.ts').read_text(encoding='utf-8')
    moves = re.findall(r"id: '([^']+)'", moves_text)
    def_text = (ROOT / 'src/characters/zoro/def.ts').read_text(encoding='utf-8')
    skills = re.findall(r"'([^']+)'", def_text.split('skillSlots: [', 1)[1].split(']', 1)[0])
    existing = set(runtime['anims'])
    chosen = ['idle/0', 'walk_fwd/0', 'walk_fwd/1', 'walk_fwd/2', 'walk_fwd/3', 'st_a/1', 'hit_stand/0', 'knockdown/0', 'getup/0']
    cell_w, cell_h = 720, 470
    canvas = Image.new('RGB', (cell_w * 3, cell_h * 3), '#e4e8eb')
    draw = ImageDraw.Draw(canvas)
    for index, name in enumerate(chosen):
        record = atlas['frames']['zoro/' + name]
        frame, pivot = record['frame'], record['pivot']
        sprite = page.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
        col, row = index % 3, index // 3
        root_x, root_y = col * cell_w + 300, row * cell_h + 420
        draw.line((col * cell_w, root_y, (col + 1) * cell_w - 1, root_y), fill='#b33c39', width=2)
        draw.line((root_x, row * cell_h + 28, root_x, (row + 1) * cell_h - 1), fill='#a9b4bd')
        canvas.paste(sprite, (round(root_x - pivot['x'] * frame['w']), round(root_y - pivot['y'] * frame['h'])), sprite)
        draw.text((col * cell_w + 12, row * cell_h + 8), name + ' | existing atlas, authored root', fill='#18202a')
    montage = OUT / 'zoro-existing-atlas-contact-sheet1013.png'
    assert not montage.exists()
    canvas.save(montage)
    down = author['frames']['knockdown']
    down_source = Image.open(ROOT / author['sources'][down['source']]['file']).convert('RGBA')
    # Read the actual mouth-blade region; this crop creates no modified runtime pixels.
    mouth_region = [880, 410, 980, 546]
    region_alpha = down_source.getchannel('A').crop(tuple(mouth_region)).point(lambda x: 255 if x >= 16 else 0)
    region_bounds = region_alpha.getbbox()
    source_floor_y = down['crop'][1] + down['root'][1]
    lowest_y = mouth_region[1] + region_bounds[3] - 1
    world_factor = author['scale'] / author['textureDensity'] * author['sources'][down['source']]['unitScale']
    active = author['frames']['st_a_active']
    factor = author['scale'] / author['textureDensity'] * author['sources'][active['source']]['unitScale']
    points = {key: [(point[i] - active['root'][i]) * factor for i in range(2)] for key, point in active['sockets'].items()}
    body = {
        'date': '2026-10-13', 'recordedAtUtc': datetime.now(timezone.utc).isoformat(), 'characterId': 'zoro',
        'runtimeSha256': sha(runtime_file), 'atlasSha256': sha(atlas_png), 'authorManifestSha256': sha(ROOT / 'scripts/roster_zoro_manifest0929.json'),
        'independentCrops': len(author['frames']), 'mappedFrames': len(runtime['framePages']),
        'animations': list(runtime['anims']), 'sources': sources,
        'missing': {'states': [x for x in states if x not in existing], 'moves': [x for x in moves if x not in existing],
                    'skills': [x for x in skills if x not in existing],
                    'conditionalReactions': [x for x in ['held_leg_flip', 'held_labubu_throw', 'held_twinkle_throw'] if x not in existing]},
        'fourMotionPreparation': {'idle': 'existing', 'walk': 'four real source frames; normal-speed review pending',
                                 'st_a': 'three real source phases; contact calibration required', 'hit': 'existing',
                                 'normalSpeedBrowserPassed': False, 'montage': str(montage)},
        'stA': {'source': active['source'], 'sourceSha256': author['sources'][active['source']]['sha256'],
                'crop': active['crop'], 'root': active['root'], 'sockets': active['sockets'],
                'worldUnitsPerSourcePixel': factor, 'worldPoints': points, 'oldBox': [9, -62, 34, 21]},
        'knockdownFloor': {'source': down['source'], 'mouthBladeRegion': mouth_region,
                           'alpha16BoundsInRegion': region_bounds, 'authoredSourceFloorY': source_floor_y,
                           'lowestVisibleRegionY': lowest_y, 'visiblePixelsBelowFloor': lowest_y - source_floor_y,
                           'worldUnitsBelowFloor': (lowest_y - source_floor_y) * world_factor,
                           'note': 'Mouth-held blade extends below body ground root. Needs visual redraw review, no root displacement or rotation workaround.'},
        'runtimeModified': False, 'publiclyAccepted': False,
    }
    target = OUT / 'zoro-inventory1013.json'
    with target.open('x', encoding='utf-8') as handle:
        json.dump(body, handle, ensure_ascii=False, indent=2)
    print(json.dumps({'file': str(target), 'uniqueCrops': body['independentCrops'], 'mappedFrames': body['mappedFrames'],
                      'animations': len(existing), 'missing': {key: len(value) for key, value in body['missing'].items()},
                      'stA': body['stA'], 'knockdownFloor': body['knockdownFloor']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
