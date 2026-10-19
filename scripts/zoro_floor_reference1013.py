"""D-only diagnostic references; never change original source or runtime pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro')
SOURCE = ROOT / 'public/assets/generated/source/roster-zoro-down-getup-repair-1003.png'
EXPECTED = '5c704a879238d0873c77b76f25acffeaed0dc4aaf6102bfd20eee57d610ee581'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert ROOT.drive.upper() == 'D:' and OUT.drive.upper() == 'D:'
    assert (OUT / 'README.md').is_file()
    assert sha(SOURCE) == EXPECTED
    original = Image.open(SOURCE).convert('RGBA')
    ruler = OUT / 'zoro-standing-ruler-reference1013.png'
    annotated = OUT / 'zoro-knockdown-floor-annotation1013.png'
    manifest = OUT / 'zoro-floor-references1013.json'
    for path in [ruler, annotated, manifest]:
        assert not path.exists(), path
    ruler_rect = [40, 5, 715, 575]
    before = {'source': str(SOURCE), 'sourceSha256': EXPECTED,
              'outputs': [str(ruler), str(annotated)],
              'rulerCropSourceRect': ruler_rect,
              'purpose': 'Upload references only. Original retained unchanged. No runtime usage.'}
    with (OUT / 'zoro-floor-reference-before1013.json').open('x', encoding='utf-8') as handle:
        json.dump(before, handle, ensure_ascii=False, indent=2)
    original.crop(tuple(ruler_rect)).save(ruler)
    canvas = Image.new('RGB', (original.width, original.height + 80), '#e6eaed')
    canvas.paste(original, (0, 80), original)
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.load_default(size=21)
        small = ImageFont.load_default(size=18)
    except TypeError:
        font = small = ImageFont.load_default()
    draw.text((18, 14), 'REFERENCE ONLY: original source at 1:1 + annotation. Do not paint labels into the result.', fill='#17222b', font=font)
    draw.text((18, 44), 'Only redraw the mouth-held sword / necessary head-neck grip. Keep body support and all three swords.', fill='#17222b', font=small)
    ground = 514 + 80
    draw.line((794, ground, 1508, ground), fill='#bc302a', width=4)
    draw.text((1030, ground + 13), 'Existing body ground line: source y=514', fill='#9c201e', font=small)
    mouth_rect = [880, 410 + 80, 980, 546 + 80]
    draw.rectangle(tuple(mouth_rect), outline='#d82d25', width=5)
    draw.ellipse((946, 531 + 80, 964, 549 + 80), outline='#d82d25', width=4)
    draw.line((974, 540 + 80, 1080, 661), fill='#d82d25', width=3)
    draw.text((1030, 666), 'Mouth blade extends 29 source pixels', fill='#9c201e', font=small)
    draw.text((1030, 691), 'below the existing support line.', fill='#9c201e', font=small)
    draw.text((900, 757), 'Do not lift, rotate or shrink the whole body.', fill='#17222b', font=font)
    draw.text((900, 794), 'Keep the mouth gripping one blade;', fill='#17222b', font=font)
    draw.text((900, 828), 'one separate blade remains in each hand.', fill='#17222b', font=font)
    draw.text((900, 879), 'Left upper neutral is the shared size ruler.', fill='#17222b', font=font)
    draw.text((900, 913), 'Existing get-up pose does not need another redraw.', fill='#17222b', font=small)
    canvas.save(annotated)
    assert sha(SOURCE) == EXPECTED, 'Original changed unexpectedly.'
    result = {**before,
              'sourceUnmodifiedAfter': True,
              'references': [
                  {'role': 'original-source-with-standing-ruler', 'file': str(SOURCE), 'sha256': EXPECTED},
                  {'role': 'exact-neutral-ruler-crop-no-retouch', 'file': str(ruler), 'sha256': sha(ruler), 'crop': ruler_rect},
                  {'role': 'annotation-comparison-reference-not-artwork', 'file': str(annotated), 'sha256': sha(annotated), 'sourceDrawOffset': [0, 80], 'sourceDrawScale': 1}
              ],
              'proposedIabUpload': [str(SOURCE), str(annotated)],
              'additionalRulerIfNeeded': str(ruler),
              'sessionUrl': 'https://chatgpt.com/c/6abbe218-2044-83e8-b500-931a2779e800',
              'currentWorkflow': 'root uses IAB only; worker generates no art and changes no central manifest',
              'runtimeModified': False}
    with manifest.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
