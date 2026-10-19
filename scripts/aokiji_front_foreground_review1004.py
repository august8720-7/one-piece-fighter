"""Read-only original near-hand foreground split and real held-ankle pairs."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from aokiji_throw_static_pairs1004 import frame as victim_frame, paste as victim_paste, checks

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-low-hold1004/fresh-front-joint3-review1004/layer-check1004')
SOURCE = ROOT / 'public/assets/generated/source/roster-aokiji-low-hold-front-joint3-1004.png'
EXPECTED = '5cc59be048e6d2cb4a5341f7c348638b848b06fd74f33fa722708495bfe48462'
NEAR_POLYGON = [[558,695],[571,688],[583,685],[597,680],[611,678],[626,679],
                [640,684],[648,686],[650,690],[648,694],[643,696],[630,694],
                [621,695],[613,700],[610,706],[611,713],[616,721],[626,728],
                [638,732],[652,733],[667,728],[677,730],[680,734],[677,739],
                [665,746],[651,749],[636,752],[619,751],[604,747],[589,738],
                [575,728],[565,717],[559,707],[556,700]]
FAR_KNUCKLES_EXCLUDE = [[626,715],[641,713],[655,715],[665,725],[668,732],
                        [652,735],[635,734],[626,728]]
ZOOM = 4


def sha(value):
    return hashlib.sha256(value).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)


def paste_caster(canvas, part, axis, facing):
    scale = 100 / 822 * ZOOM
    shown = part.resize((round(part.width * scale), round(part.height * scale)), Image.Resampling.LANCZOS)
    rx, ry = 466 * scale, 815 * scale
    if facing == -1:
        shown = ImageOps.mirror(shown)
        rx = shown.width - rx
    canvas.alpha_composite(shown, (round(axis[0] - rx), round(axis[1] - ry)))


def main():
    assert (OUT / 'README.md').is_file()
    assert not (OUT / 'layer-review1004.json').exists()
    protected = [ROOT / 'public/assets/characters/aokiji/anime/runtime.json',
                 ROOT / 'scripts/roster_aokiji_manifest0929.json']
    before = {str(path): sha(path.read_bytes()) for path in protected}
    assert sha(SOURCE.read_bytes()) == EXPECTED
    image = Image.open(SOURCE).convert('RGBA').crop((887, 0, 1774, 887))
    pixels = np.asarray(image).copy()
    region = Image.new('L', image.size, 0)
    drawing = ImageDraw.Draw(region)
    drawing.polygon(NEAR_POLYGON, fill=255)
    drawing.polygon(FAR_KNUCKLES_EXCLUDE, fill=0)
    allowed = np.asarray(region) > 0
    rgb = pixels[..., :3].astype(np.int16)
    skin = (rgb[..., 0] >= 60) & (rgb[..., 0] > rgb[..., 1] + 12) & (rgb[..., 0] > rgb[..., 2] + 25)
    selected_skin = allowed & skin & (pixels[..., 3] > 0)
    neighbour = np.asarray(Image.fromarray(np.uint8(selected_skin) * 255).filter(ImageFilter.MaxFilter(3))) > 0
    skin_outline = (rgb[..., 0] <= 80) & (rgb[..., 1] <= 70) & (rgb[..., 2] <= 80) & (rgb[..., 0] + 5 >= rgb[..., 1]) & (rgb[..., 0] + 8 >= rgb[..., 2])
    mask = selected_skin | (allowed & neighbour & skin_outline & (pixels[..., 3] > 0))
    assert mask.any()
    body = pixels.copy()
    foreground = np.zeros_like(pixels)
    foreground[mask] = pixels[mask]
    body[mask] = 0
    reconstructed = np.uint8(body.astype(np.uint16) + foreground.astype(np.uint16))
    assert np.array_equal(reconstructed, pixels) and reconstructed.tobytes() == pixels.tobytes()
    assert np.array_equal(body[~mask], pixels[~mask]) and np.array_equal(foreground[mask], pixels[mask])
    assert not np.any((body[..., 3] > 0) & (foreground[..., 3] > 0))
    grey = (slice(694, 712), slice(633, 651))
    # This inspection rectangle also contains a real thumb edge: protect its
    # actual grey-blue pixels, not an incorrectly assumed all-background box.
    grey_colour = (rgb[..., 2] > rgb[..., 0] + 8) & (rgb[..., 1] >= rgb[..., 0] - 3) & (pixels[..., 3] >= 64)
    protected_grey = np.zeros(mask.shape, dtype=bool)
    protected_grey[grey] = grey_colour[grey]
    assert protected_grey.any() and not mask[protected_grey].any()
    assert np.array_equal(body[protected_grey], pixels[protected_grey])
    assert body[701,644].tolist() == pixels[701,644].tolist() and not mask[701,644]
    body_image = Image.fromarray(body)
    foreground_image = Image.fromarray(foreground)
    body_image.save(OUT / 'original-body-layer1004.png')
    foreground_image.save(OUT / 'original-near-hand-layer1004.png')
    Image.fromarray(reconstructed).save(OUT / 'reconstructed-original1004.png')
    Image.fromarray(np.uint8(mask) * 255).save(OUT / 'near-hand-binary-mask1004.png')
    white = Image.new('RGBA', image.size, 'white')
    white.alpha_composite(image)
    overlay = np.asarray(white).copy()
    overlay[mask, :3] = np.uint8(overlay[mask, :3].astype(np.float32) * .5 + np.array([20, 160, 95]) * .5)
    Image.fromarray(overlay).convert('RGB').save(OUT / 'foreground-selection-overlay1004.png')
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
    rows, panels = [], []
    for victim_id in ['labubu', 'luffy', 'akainu']:
        victim = victim_frame(victim_id, 'held_leg_flip')
        for facing in [1, -1]:
            canvas = Image.new('RGBA', (1000, 650), '#f5f4ef')
            draw = ImageDraw.Draw(canvas)
            axis = (340 if facing == 1 else 660, 520)
            victim_axis = (axis[0] + facing * 30 * ZOOM, 520)
            draw.text((20, 14), f'ACTUAL ORIGINAL AOKIJI / {victim_id} / {"R" if facing == 1 else "L"}', font=font, fill='#263d4b')
            draw.text((20, 42), 'Only real NEAR palm/fingers in front. Grey cape stays in body. Fixed roots, H=100, hold30.', font=small, fill='#60717b')
            draw.line((20, 520, 980, 520), fill='#82929a', width=2)
            paste_caster(canvas, body_image, axis, facing)
            victim_paste(canvas, victim['body'], victim['density'], victim_axis, -facing)
            paste_caster(canvas, foreground_image, axis, facing)
            palm = [facing * (594 - 466) * 100 / 822, (714 - 815) * 100 / 822]
            target = [facing * 16.0327868852459, -13.180327868852459]
            draw.text((20, 563), f'near palm({palm[0]:.4f},{palm[1]:.4f}); real ankle({target[0]:.4f},{target[1]:.4f})', font=font, fill='#263d4b')
            draw.text((20, 592), 'READ-ONLY OCCLUSION EXPERIMENT. No active atlas/data/selector change or automatic adoption.', font=small, fill='#263d4b')
            path = OUT / f'layer-pair-{victim_id}-{"R" if facing == 1 else "L"}1004.png'
            canvas.convert('RGB').save(path)
            panels.append(canvas.convert('RGB'))
            rows.append({'victim': victim_id, 'facing': facing, 'casterRoot': [466, 815], 'worldScale': 100 / 822,
                         'holdOffset': 30, 'nearPalmWorld': palm, 'actualVictimAnkleWorld': target,
                         'nearPalmDistanceWorld': math.hypot(palm[0] - target[0], palm[1] - target[1]),
                         'victimRuntimeHash': victim['runtimeHash'], 'file': path.as_posix()})
    montage = Image.new('RGB', (2000, 1950), 'white')
    for i, panel in enumerate(panels):
        montage.paste(panel, (i % 2 * 1000, i // 2 * 650))
    montage.save(OUT / 'layer-pair-montage1004.jpg', quality=94)
    for path, expected in checks.items():
        assert sha(Path(path).read_bytes()) == expected
    assert sha(SOURCE.read_bytes()) == EXPECTED
    for path in protected:
        assert sha(path.read_bytes()) == before[str(path)]
    result = {'checkedAtUtc': datetime.now(timezone.utc).isoformat(), 'sourceHash': EXPECTED,
              'sourceStandingHeight64': 822, 'sourceCrop': [887, 0, 887, 887], 'groundRoot': [466, 815],
              'originalCropRGBAHash': sha(pixels.tobytes()), 'reconstructedRGBAHash': sha(reconstructed.tobytes()),
              'reconstructionEveryRGBAByteEqual': True, 'greyPixelsInBodyUnchanged': True,
              'protectedGreyPixelCount': int(protected_grey.sum()), 'greyInspectionRectangleAlsoContainsOriginalThumbEdge': True,
              'foregroundOnlyOriginalSelectedRGBA': True, 'foregroundPixelCount': int(mask.sum()),
              'nearHandPolygon': NEAR_POLYGON, 'farKnucklesExclude': FAR_KNUCKLES_EXCLUDE,
              'selectionMethod': 'explicit observed near-hand outline + source skin/ink colour; no invented pixels',
              'pairs': rows, 'runtimeAndAuthoringBeforeAndAfter': before,
              'runtimeOrDataOrRootOrSelectorChanged': False, 'newIndependentPoseCount': 0,
              'status': 'read-only-real-layer-pair-visual-review-required-not-auto-adopted'}
    save(OUT / 'layer-review1004.json', result)
    print(json.dumps({'foregroundPixelCount': int(mask.sum()), 'reconstructionExact': True,
                      'greyOriginalRGBAUnchanged': True, 'pairCount': len(rows), 'runtimeChanged': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
