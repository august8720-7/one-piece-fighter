"""Stage/compare first, then apply only the reviewed Zoro knockdown replacement."""
from pathlib import Path
import argparse
import hashlib
import io
import json
from PIL import Image, ImageDraw
import build_anime_atlas as builder

ROOT = Path(__file__).resolve().parent.parent
BASE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro')
LIVE = ROOT / 'scripts/roster_zoro_manifest0929.json'
RUNTIME = ROOT / 'public/assets/characters/zoro/anime'


def sha_bytes(raw):
    return hashlib.sha256(raw).hexdigest()


def write_new(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def frame_from(name, runtime, read):
    page = next(item for item in runtime['pages'] if item['id'] == runtime['framePages'][name])
    meta = json.loads(read(page['data']))
    entry = meta['frames'][name]
    if entry.get('rotated') or entry.get('trimmed'):
        raise ValueError('Unexpected transformed frame.')
    rect = entry['frame']
    image = Image.open(io.BytesIO(read(page['image']))).convert('RGBA')
    crop = image.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h']))
    return crop, entry['pivot']


def stage_candidate(stage):
    expected = json.loads((stage / 'copy-before.json').read_text(encoding='utf-8'))['sha256']
    if sha_bytes(LIVE.read_bytes()) != expected:
        raise ValueError('Shared author manifest changed; preserve and rebase candidate manually.')
    raw = (stage / 'candidate-manifest.json').read_bytes()
    manifest = json.loads(raw)
    outputs, report = builder.build_character('zoro', manifest['characters']['zoro'], sha_bytes(raw))
    old_runtime = json.loads((RUNTIME / 'runtime.json').read_bytes())
    new_runtime = json.loads(outputs['runtime.json'])
    if old_runtime['anims'] != new_runtime['anims'] or set(old_runtime['framePages']) != set(new_runtime['framePages']):
        raise ValueError('Animation contract or frame key set changed.')
    preserved = []
    for name in old_runtime['framePages']:
        if name == 'zoro/knockdown/0':
            continue
        old, old_pivot = frame_from(name, old_runtime, lambda file: (RUNTIME / file).read_bytes())
        new, new_pivot = frame_from(name, new_runtime, outputs.__getitem__)
        pixel_equal = old.size == new.size and old.tobytes() == new.tobytes()
        root_equal = old_pivot == new_pivot and old_runtime['attachments'][name] == new_runtime['attachments'][name]
        if not pixel_equal or not root_equal:
            raise ValueError(f'Unrelated prepared frame/root changed: {name}')
        preserved.append({'frame': name, 'size': old.size, 'rgbaSha256': sha_bytes(old.tobytes()),
                          'pixelsExact': pixel_equal, 'pivotAndAttachmentsExact': root_equal})
    old_down, old_pivot = frame_from('zoro/knockdown/0', old_runtime, lambda file: (RUNTIME / file).read_bytes())
    new_down, new_pivot = frame_from('zoro/knockdown/0', new_runtime, outputs.__getitem__)
    if old_down.size == new_down.size and old_down.tobytes() == new_down.tobytes():
        raise ValueError('Knockdown pixels unexpectedly unchanged.')
    target = stage / 'staged-runtime'
    target.mkdir()
    (target / 'README.md').write_text('# Reviewed Zoro staging\nBuild outputs only. All other existing prepared frame pixels/pivots/attachments were compared exactly before writing this staging. Not publicly released or IAB accepted.\n', encoding='utf-8')
    for name, content in outputs.items():
        (target / name).write_bytes(content)
    compare = Image.new('RGB', (1520, 460), '#e6eaed')
    draw = ImageDraw.Draw(compare)
    for col, (im, pivot, label) in enumerate([(old_down, old_pivot, 'Before: existing authored pose/root'), (new_down, new_pivot, 'After: real new source / measured support root')]):
        root_x, root_y = col * 760 + 350, 400
        draw.line((col * 760, root_y, (col + 1) * 760 - 1, root_y), fill='#b6312b', width=2)
        compare.paste(im, (round(root_x - pivot['x'] * im.width), round(root_y - pivot['y'] * im.height)), im)
        draw.text((col * 760 + 16, 15), label, fill='#17222b')
    compare.save(stage / 'zoro-knockdown-prepared-before-after1013.png')
    result = {'baselineManifestSha256': expected, 'candidateManifestSha256': sha_bytes(raw),
        'baselineRuntimeFiles': [{'file': p.name, 'sha256': sha_bytes(p.read_bytes())} for p in RUNTIME.iterdir() if p.is_file()],
        'outputs': [{'file': name, 'sha256': sha_bytes(content), 'bytes': len(content)} for name, content in outputs.items()],
        'preservedFrameCount': len(preserved), 'preservedFrames': preserved,
        'animationContractsExact': True, 'frameKeysExact': True, 'changedFrame': 'zoro/knockdown/0',
        'oldDownSize': old_down.size, 'newDownSize': new_down.size,
        'oldDownPivot': old_pivot, 'newDownPivot': new_pivot, 'buildReport': report,
        'liveWritten': False, 'IabGameplayAccepted': False}
    write_new(stage / 'staged-integrity1013.json', result)
    print(json.dumps({'stage': str(stage), 'preservedFrames': len(preserved), 'changedFrame': 'zoro/knockdown/0',
                      'comparison': str(stage / 'zoro-knockdown-prepared-before-after1013.png'), 'liveWritten': False}))


def apply_candidate(stage):
    integrity = json.loads((stage / 'staged-integrity1013.json').read_text(encoding='utf-8'))
    raw = (stage / 'candidate-manifest.json').read_bytes()
    if sha_bytes(LIVE.read_bytes()) != integrity['baselineManifestSha256'] or sha_bytes(raw) != integrity['candidateManifestSha256']:
        raise ValueError('Manifest changed after staging.')
    for row in integrity['baselineRuntimeFiles']:
        if sha_bytes((RUNTIME / row['file']).read_bytes()) != row['sha256']:
            raise ValueError('Runtime changed after staging; do not overwrite.')
    for row in integrity['outputs']:
        if sha_bytes((stage / 'staged-runtime' / row['file']).read_bytes()) != row['sha256']:
            raise ValueError('Staged output SHA mismatch.')
    backup = builder.backup_candidate(RUNTIME, 'zoro', stage / 'runtime-backups')
    write_new(stage / 'apply-before1013.json', {'backup': str(backup), 'manifestBefore': integrity['baselineManifestSha256'],
                                              'manifestAfter': integrity['candidateManifestSha256'], 'outputs': integrity['outputs']})
    for row in integrity['outputs']:
        destination = RUNTIME / row['file']
        destination.write_bytes((stage / 'staged-runtime' / row['file']).read_bytes())
        if sha_bytes(destination.read_bytes()) != row['sha256']:
            raise ValueError('Written runtime hash mismatch.')
    LIVE.write_bytes(raw)
    if sha_bytes(LIVE.read_bytes()) != integrity['candidateManifestSha256']:
        raise ValueError('Written author manifest hash mismatch.')
    result = {'status': 'applied-local-zoro-knockdown-only', 'backup': str(backup),
        'manifestSha256': sha_bytes(raw), 'unchangedPreparedFrames': integrity['preservedFrameCount'],
        'allOutputHashesVerified': True, 'otherFramesPivotsAttachmentsPreserved': True,
        'animationContractsPreserved': True, 'sourceImagesModified': False,
        'oldCharactersCoreCentralRegistrationModified': False, 'IabGameplayAccepted': False,
        'publiclyReleased': False}
    write_new(stage / 'apply-after1013.json', result)
    print(json.dumps(result))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['stage', 'apply'])
    parser.add_argument('--stage', required=True, type=Path)
    args = parser.parse_args()
    stage = args.stage.resolve()
    if ROOT.drive.upper() != 'D:' or not stage.is_relative_to(BASE.resolve()) or not (stage / 'README.md').is_file():
        raise ValueError('D-only documented Zoro stage required.')
    if args.mode == 'stage':
        stage_candidate(stage)
    else:
        apply_candidate(stage)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        raise SystemExit(str(error)) from error
