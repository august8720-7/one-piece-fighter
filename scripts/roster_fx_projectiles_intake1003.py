"""Record inspected source crops only; never draw, filter or repair FX pixels."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/first-pair-1733-1003')
SOURCE_KEY = 'aokiji_fx_projectiles_1003'
CROPS = {
    'spike_start': [0, 0, 362, 361],
    'spike_live': [362, 0, 362, 361],
    'spike_break': [724, 0, 362, 361],
    'mirror_start': [55, 375, 244, 349],
    'mirror_live': [420, 369, 245, 376],
    'mirror_break': [744, 368, 320, 369],
    'bird_break': [724, 739, 360, 348],
    'vapor_start': [0, 1094, 362, 354],
    'vapor_live': [363, 1094, 372, 354],
    'vapor_end': [735, 1094, 351, 354],
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    page = sys.argv[1] if len(sys.argv) > 1 else 'projectiles'
    assert page in ('projectiles', 'blade-field', 'bird-spacing', 'shanks-rfgz', 'shanks-xcv', 'ground-field')
    character = 'shanks' if page.startswith('shanks-') else 'aokiji'
    source_key = SOURCE_KEY if page == 'projectiles' else 'aokiji_fx_blade_field_1003'
    crops = CROPS if page == 'projectiles' else {
        'uplift_start': [0, 0, 418, 506], 'uplift_live': [418, 0, 418, 506], 'uplift_break': [836, 0, 418, 506],
        'blade_start': [0, 506, 418, 328], 'blade_live': [418, 506, 458, 328], 'blade_break': [876, 506, 378, 328],
        'field_start': [0, 850, 418, 404], 'field_live': [418, 850, 418, 404], 'field_break': [836, 850, 418, 404],
    }
    size = (1086, 1448) if page in ('projectiles', 'shanks-rfgz') else (1254, 1254)
    if page == 'bird-spacing':
        source_key, size = 'aokiji_fx_bird_spacing_1003', (1774, 887)
        crops = {'bird_up': [0, 0, 887, 887], 'bird_down': [887, 0, 887, 887]}
    elif page == 'shanks-rfgz':
        source_key = 'shanks_fx_rfgz_1003'
        crops = {'r_start': [0, 0, 345, 360], 'r_live': [345, 0, 379, 360], 'r_end': [724, 0, 362, 360],
                 'f_start': [0, 362, 340, 362], 'f_live': [340, 362, 396, 362], 'f_end': [736, 362, 350, 362],
                 'g_start': [0, 724, 332, 362], 'g_live': [332, 724, 402, 362], 'g_end': [734, 724, 352, 362],
                 'z_start': [0, 1086, 350, 362], 'z_live': [350, 1086, 380, 362], 'z_end': [730, 1086, 356, 362]}
    elif page == 'shanks-xcv':
        source_key, size = 'shanks_fx_xcv_1003', (1254, 1254)
        names = ['x_start', 'x_live', 'x_end', 'v_start', 'v_live', 'v_end', 'c_horizontal', 'c_down', 'c_final']
        crops = {name: [(index % 3) * 418, (index // 3) * 418, 418, 418] for index, name in enumerate(names)}
    elif page == 'ground-field':
        crops = {'field_live': [418, 899, 418, 277]}
    assert EVIDENCE.joinpath('README.md').is_file(), 'Evidence directory must already have its rule.'
    review_path = EVIDENCE / f'{character}-fx-{page.removeprefix("shanks-")}-alpha-crop-review.json'
    assert not review_path.exists(), 'Do not overwrite a review receipt.'
    catalog_path = ROOT / 'scripts/roster_fx_sources1003.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    entry = catalog['sources'][source_key]
    image_path = ROOT / entry['file']
    assert sha(image_path.read_bytes()) == entry['sha256']
    image = Image.open(image_path)
    image.load()
    assert image.mode == 'RGBA' and image.size == size
    frame_reviews = {}
    seen = set()
    for name, (x, y, w, h) in crops.items():
        cropped = image.crop((x, y, x + w, y + h))
        alpha = cropped.getchannel('A')
        edge = max(alpha.crop(box).getextrema()[1] for box in
                   [(0, 0, w, 1), (0, h - 1, w, h), (0, 0, 1, h), (w - 1, 0, w, h)])
        assert edge <= 4, f'{name}: visible clipped edge {edge}'
        rgba_hash = sha(cropped.tobytes())
        assert rgba_hash not in seen, 'Duplicate source pixels do not add independent stages.'
        seen.add(rgba_hash)
        frame_reviews[name] = {'crop': [x, y, w, h], 'rgbaSha256': rgba_hash,
                              'edgeMaxAlpha': edge,
                              'visibleAlpha4Bounds': alpha.point(lambda value: 255 if value > 4 else 0).getbbox(),
                              'pixelPolicy': 'exact source RGBA including hidden RGB; no filtering, recoloring or per-frame image manufacture'}
    unused = {'bird_up': 'Rectangular separation between two wing drawings leaves max alpha6 at the shared edge; not packed.',
              'bird_down': 'Same separation issue; will use a dedicated official-web repair source.'} if page == 'projectiles' else {}
    observation = ('Actual downloaded PNG inspected: three genuinely distinct ice spike, mirror and vapor stages; three bird states have different wing shapes. No person/hand or scenario. Bird break safely separates. Clear first ten crops keep all visible RGBA; this is not a normal-speed or projectile-contact pass.'
                   if page == 'projectiles' else 'Actual downloaded second PNG inspected: three distinct upward crystalline arcs, three horizontal blade traces and three glacier field stages. Blade live source crosses its nominal column by a few pixels, so its real crop extends into transparent separation before the third phase. All nine crops preserve original RGBA with no neighboring visible marks. Static source review only; actual contact and normal-speed FX still required.')
    if page == 'bird-spacing':
        observation = 'Two actual independent wing phases: up and down, same right-facing head/body, full feathers/tail/beak. Each full887-square crop preserves raw pixels; generous clear separation, edge alpha1. Initial blob download matches the final named original byte-for-byte. Native projectile travel/contact still required.'
    elif page == 'shanks-rfgz':
        observation = 'Actual red-white source viewed: upward cut, horizontal thrust, low curved slash and empty-centered sidestep trails; each has three distinct real phases. No human or solid weapon. Nonuniform column separators preserve all complete visible boundaries. Twelve exact RGBA crops, no image transforms; actual body-blade overlay and normal-speed review still required.'
    elif page == 'shanks-xcv':
        observation = 'Actual downloaded original viewed: X and V are three genuinely different downward cut phases; C contains three distinct horizontal/downward slash directions. V retains red-black short arcs and white core, no opaque full-screen blast. Nine full418-square source crops preserve all RGBA with edge alpha1 and different exact hashes. These effects follow the measured blade rectangles and do not add a second damage field. Normal-speed overlay/contact still required.'
    elif page == 'ground-field':
        observation = 'The original field_live full-cell bottom padding would float its opaque ground edge about20world above the declared rectangle bottom. Tighten transparent top/bottom space only, retain its full418px width and every alpha>4 pixel; the new277px height puts the actual base within about1.1world of the rectangle bottom. Original source and prior review remain unchanged. Gameplay grounding still requires visual review.'
    review = {'schemaVersion': 1, 'sourceKey': source_key, 'sourceSha256': entry['sha256'],
              'status': 'static-FX-stage-review-before-gameplay', 'frames': frame_reviews,
              'unused': unused, 'visualObservation': observation}
    write_json(review_path, review)
    entry['adoptionStatus'] = 'shape_reviewed_candidate'
    if 'visualReview' in entry:
        entry.setdefault('visualReviewHistory', []).append(entry['visualReview'])
    entry['visualReview'] = {'file': review_path.as_posix(), 'sha256': sha(review_path.read_bytes())}
    write_json(catalog_path, catalog)
    print(json.dumps({'review': str(review_path), 'crops': len(frame_reviews), 'unpacked': len(unused)}))


if __name__ == '__main__':
    main()
