"""Bounded diagnostic of the guide-assisted C pose. Never writes runtime data."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/kizaru')
NEW_FILE = ROOT / 'public/assets/generated/source/roster-kizaru-opposite-guide-1013.png'
EXPECTED = '198ec3375e8842e39f4196cadf87751113c8d68e896894c3de431e50ad5cfd14'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert sha(NEW_FILE) == EXPECTED
    assert (OUT / 'README.md').is_file()
    source = Image.open(NEW_FILE).convert('RGBA')
    author = json.loads((ROOT / 'scripts/roster_kizaru_manifest0929.json').read_text(encoding='utf-8'))
    cfg = author['characters']['kizaru']
    baseline_file = ROOT / cfg['sources']['kizaru_locomotion_0929']['file']
    assert sha(baseline_file) == cfg['sources']['kizaru_locomotion_0929']['sha256']
    baseline = Image.open(baseline_file).convert('RGBA')
    neutral_bounds = source.getchannel('A').crop((0, 0, 887, 887)).point(lambda a: 255 if a >= 16 else 0).getbbox()
    height = neutral_bounds[3] - neutral_bounds[1]
    old_unit, new_unit = cfg['scale'] / cfg['textureDensity'], 102 / height
    new_crop = [887, 0, 887, 887]
    # Measured sole centers near x1156 and x1574; mean1365, actual sole boundary y860.
    # This is an explicit unaccepted diagnostic measurement, never a compensating runtime offset.
    new_absolute_root = [1365, 860]
    new_local_root = [new_absolute_root[0] - new_crop[0], new_absolute_root[1]]
    records = []
    for phase in range(4):
        if phase == 2:
            records.append({'phase': 'C-new-guide', 'image': source.crop((887, 0, 1774, 887)),
                            'root': new_local_root, 'worldUnit': new_unit})
        else:
            old = author['unusedReviewCrops'][f'walk_{phase}']
            x, y, w, h = old['crop']
            records.append({'phase': f'old-walk-{phase}', 'image': baseline.crop((x, y, x + w, y + h)),
                            'root': old['root'], 'worldUnit': old_unit})
    def draw_pose(record, root_x, title, width=1280):
        zoom = 4
        canvas = Image.new('RGB', (width, 550), '#e4e8eb')
        draw = ImageDraw.Draw(canvas)
        floor = 500
        for column in range(0, width, 40):
            draw.line((column, floor, column, 550), fill='#b7c0c6')
        draw.line((0, floor, width, floor), fill='#b53d37', width=2)
        scale = record['worldUnit'] * zoom
        image = record['image']
        resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
        canvas.paste(resized, (round(root_x - record['root'][0] * scale), round(floor - record['root'][1] * scale)), resized)
        draw.text((15, 14), title, fill='#17222b')
        draw.text((15, 31), 'DIAGNOSTIC ONLY | no accepted gait / no runtime writes', fill='#17222b')
        return canvas
    target_gif = OUT / 'kizaru-guided-c-vs-original-10fps-diagnostic1013.gif'
    target_montage = OUT / 'kizaru-guided-contact-A-C-1013.png'
    assert not target_gif.exists() and not target_montage.exists()
    output_manifest = {'source': str(NEW_FILE), 'sourceSha256': EXPECTED,
                       'targets': [str(target_gif), str(target_montage)], 'baselineSha256': sha(baseline_file)}
    (OUT / 'kizaru-guided-diagnostic-before1013.json').write_text(json.dumps(output_manifest, indent=2), encoding='utf-8')
    gif = [draw_pose(records[i % 4], 265 + i * 6 * 2.2 * 4,
                    f'{records[i % 4]["phase"]} | t={i/10:.1f}s | 10fps, 2.2px/tick; reset after 0.8s') for i in range(8)]
    gif[0].save(target_gif, save_all=True, append_images=gif[1:], duration=100, loop=0, disposal=2)
    a = draw_pose(records[0], 300, 'A: original real pose / original authored root', width=720)
    c = draw_pose(records[2], 300, 'C: new guide source / measured provisional sole root', width=720)
    montage = Image.new('RGB', (1440, 550), '#e4e8eb')
    montage.paste(a, (0, 0))
    montage.paste(c, (720, 0))
    montage.save(target_montage)
    receipt = {**output_manifest,
               'neutralAlpha16Bounds': neutral_bounds, 'sourceNeutralHeight': height,
               'baselineWorldUnit': old_unit, 'newSourceWorldUnit': new_unit,
               'candidateCrop': new_crop, 'candidateAbsoluteRoot': new_absolute_root, 'candidateLocalRoot': new_local_root,
               'rootBasis': 'Mean of visibly measured rear/front sole centers, ground at visible sole boundary. Not shifted to match the other frame.',
               'rootAcceptance': 'unaccepted-diagnostic-only', 'oldRootsModified': False,
               'newPixelsOrInbetweens': False, 'runtimeModified': False,
               'timing': {'fps': 10, 'ticksPerFrame': 6, 'walkWorldPixelsPerTick': 2.2, 'diagnosticZoom': 4},
               'outputs': [{'file': str(p), 'sha256': sha(p)} for p in [target_gif, target_montage]],
               'assessment': 'Static hip-to-knee overlap appears unchanged from A; original full-motion IAB check still needed before any final pass/fail on sliding. No adoption.',
               'nextGenerationAllowedInThisRoute': False}
    (OUT / 'kizaru-guided-diagnostic1013.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
