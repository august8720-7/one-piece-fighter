"""Inspect original compact30 cells without authoring or runtime modification."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004/compact30-review1004')
SOURCE = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-compact30-1004.png'
EXPECTED = 'b639875afec46a55bc1e4b65f4264613b43d5300dd0d6d310babf5ec1a7459bb'


def main():
    assert (OUT / 'README.md').is_file()
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED
    image = Image.open(SOURCE).convert('RGBA')
    assert image.size == (2172, 724)
    rows = []
    for index, name in enumerate(['neutral', 'front-hold', 'back-hold']):
        crop = [index * 724, 0, 724, 724]
        body = image.crop((crop[0], 0, crop[0] + 724, 724))
        alpha = body.getchannel('A')
        bounds = {str(threshold): alpha.point(lambda value: 255 if value >= threshold else 0).getbbox()
                  for threshold in [1, 16, 64, 128]}
        rgba = OUT / f'{name}-original-cell1004.png'
        white = OUT / f'{name}-white-cell1004.png'
        assert not rgba.exists() and not white.exists()
        body.save(rgba)
        shown = Image.new('RGBA', body.size, 'white')
        shown.alpha_composite(body)
        shown.convert('RGB').save(white)
        rows.append({'name': name, 'crop': crop, 'excludeRects': [], 'bounds': bounds,
                     'alpha64Height': bounds['64'][3] - bounds['64'][1],
                     'alpha16EdgePixels': {
                         'left': sum(alpha.getpixel((0, y)) >= 16 for y in range(724)),
                         'right': sum(alpha.getpixel((723, y)) >= 16 for y in range(724)),
                         'top': sum(alpha.getpixel((x, 0)) >= 16 for x in range(724)),
                         'bottom': sum(alpha.getpixel((x, 723)) >= 16 for x in range(724)),
                     }, 'sourceHash': EXPECTED, 'imageScaled': False, 'runtimeModified': False})
    with (OUT / 'inspected-crops1004.json').open('x', encoding='utf8') as stream:
        json.dump(rows, stream, ensure_ascii=False, indent=2)
    print(json.dumps(rows, ensure_ascii=False))


if __name__ == '__main__':
    main()
