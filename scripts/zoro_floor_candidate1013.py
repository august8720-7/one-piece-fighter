"""Prepare a Zoro-only knockdown manifest candidate and immutable rollback.

No shared manifest, source image or runtime atlas is changed by any subcommand.
The root agent decides whether to run the emitted existing-builder commands.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BASE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/zoro')
LIVE = ROOT / 'scripts/roster_zoro_manifest0929.json'
PYTHON = 'D:/feiyan-promo-video-0929/配音0929/.venv-tts/Scripts/python.exe'


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path: Path, data: object) -> None:
    with path.open('x', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write('\n')


def stage_path(raw: str) -> Path:
    path = Path(raw).resolve()
    if not path.is_relative_to(BASE.resolve()) or not (path / 'README.md').is_file():
        raise ValueError('Use an existing documented stage under the Zoro D output directory.')
    return path


def commands(stage: Path, manifest_name: str) -> dict:
    manifest = str(stage / manifest_name).replace('\\', '/')
    backup = str(stage / 'runtime-backups').replace('\\', '/')
    prefix = f"& ./run-d1013.ps1 -Program '{PYTHON}' -CommandArguments @('scripts/build_anime_atlas.py','zoro','--manifest','{manifest}'"
    return {'workdir': str(ROOT), 'checkOnly': prefix + ",'--check')",
            'rootOnlyBuildWithBackup': prefix + f",'--replace','--backup-dir','{backup}')"}


def snapshot() -> Path:
    if ROOT.drive.upper() != 'D:' or BASE.drive.upper() != 'D:':
        raise ValueError('D-only task.')
    if not (BASE / 'README.md').is_file():
        raise ValueError('Missing Zoro directory rules.')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    stage = BASE / ('zoro-floor-candidate1013-' + stamp)
    stage.mkdir()
    (stage / 'README.md').write_text(
        '# Zoro floor repair candidate\nOnly this candidate may change one knockdown mapping and add its verified source. '
        'rollback-manifest.json is an exact pre-change copy. No command here promotes the character or deletes files. '
        'New source, provenance, manual three-sword/ground/scale review must pass before prepare. '
        'Existing-builder runtime writes remain an explicit root action; they must use the D backup directory.\n', encoding='utf-8')
    before = {'file': str(LIVE), 'sha256': sha(LIVE), 'bytes': LIVE.stat().st_size,
              'rollbackFile': str(stage / 'rollback-manifest.json')}
    write_new(stage / 'copy-before.json', before)
    shutil.copyfile(LIVE, stage / 'rollback-manifest.json')
    if sha(stage / 'rollback-manifest.json') != before['sha256']:
        raise ValueError('Rollback manifest hash mismatch.')
    write_new(stage / 'copy-after.json', {**before, 'verified': True})
    write_new(stage / 'review-template.json', {
        'status': 'awaiting-new-image-not-approved', 'sourceKey': None, 'source': None,
        'review': {'threeDistinctSwords': False, 'headHandsAndTipsComplete': False,
                   'sameBodyProportions': False, 'bodySupportedAtGround': False,
                   'noPerPoseScalingRotationOrCompensatingRootShift': False},
        'measurements': {'neutralCell': None, 'crop': None, 'supportRootAbsolute': None,
                         'bodySupportGroundY': None, 'mouthBladeLowestSourceY': None,
                         'supportRootBasis': None},
    })
    write_new(stage / 'rollback-commands.json', commands(stage, 'rollback-manifest.json'))
    print(json.dumps({'stage': str(stage), 'baselineSha256': before['sha256'], 'sharedOrRuntimeChanged': False}, ensure_ascii=False))
    return stage


def prepare(stage: Path, review_path: Path) -> None:
    expected = json.loads((stage / 'copy-before.json').read_text(encoding='utf-8'))['sha256']
    if sha(LIVE) != expected or sha(stage / 'rollback-manifest.json') != expected:
        raise ValueError('Baseline changed; preserve this stage and create a fresh snapshot.')
    review = json.loads(review_path.read_text(encoding='utf-8-sig'))
    if review.get('status') != 'visual-review-passed-not-game-accepted':
        raise ValueError('New image visual review has not passed; no manifest candidate emitted.')
    required = ['threeDistinctSwords', 'headHandsAndTipsComplete', 'sameBodyProportions',
                'bodySupportedAtGround', 'noPerPoseScalingRotationOrCompensatingRootShift']
    if any(review.get('review', {}).get(key) is not True for key in required):
        raise ValueError('Incomplete visual review; no candidate emitted.')
    source = copy.deepcopy(review['source'])
    source_path = (ROOT / source['file']).resolve()
    if not source_path.is_relative_to((ROOT / 'public/assets/generated/source').resolve()):
        raise ValueError('Source must be an explicit D project original, not an arbitrary external file.')
    if sha(source_path) != source['sha256']:
        raise ValueError('New source SHA mismatch.')
    image = Image.open(source_path)
    image.load()
    if image.mode != 'RGBA' or image.getchannel('A').getextrema()[0] != 0:
        raise ValueError('Expected a real RGBA image with transparent pixels.')
    measure = review['measurements']
    nx, ny, nw, nh = measure['neutralCell']
    x, y, w, h = measure['crop']
    for rect in [(nx, ny, nw, nh), (x, y, w, h)]:
        if any(not isinstance(v, int) for v in rect) or rect[0] < 0 or rect[1] < 0 or rect[2] <= 0 or rect[3] <= 0 or rect[0] + rect[2] > image.width or rect[1] + rect[3] > image.height:
            raise ValueError('Invalid measured source rectangle.')
    neutral = image.getchannel('A').crop((nx, ny, nx + nw, ny + nh)).point(lambda a: 255 if a >= 8 else 0).getbbox()
    if neutral is None:
        raise ValueError('Empty neutral ruler.')
    neutral_height = neutral[3] - neutral[1]
    sx, sy = measure['supportRootAbsolute']
    ground_y = measure['bodySupportGroundY']
    if sy != ground_y or not x <= sx <= x + w or not y <= sy <= y + h:
        raise ValueError('Root must be the measured body support root inside the crop.')
    blade_y = measure.get('mouthBladeLowestSourceY', measure.get('mouthBladeLowestUpperBoundSourceY'))
    if not isinstance(blade_y, (int, float)) or not math.isfinite(blade_y):
        raise ValueError('Provide a finite measured mouth-blade lower extent or conservative lower bound.')
    if blade_y > ground_y:
        raise ValueError('Mouth blade still extends below body support; root displacement is not a repair.')
    if not isinstance(measure['supportRootBasis'], str) or len(measure['supportRootBasis'].strip()) < 12:
        raise ValueError('Explain the actual body support measurement.')
    candidate = json.loads((stage / 'rollback-manifest.json').read_text(encoding='utf-8-sig'))
    character = candidate['characters']['zoro']
    if not math.isclose(character['scale'] * 379 / character['textureDensity'], 94, abs_tol=1e-8):
        raise ValueError('Existing character scale changed; re-evaluate instead of applying old assumptions.')
    key = review['sourceKey']
    if not isinstance(key, str) or not key.startswith('zoro_') or key in character['sources']:
        raise ValueError('Use a new explicit Zoro source key; never overwrite an existing source.')
    source['unitScale'] = 379 / neutral_height
    source['scaleBasis'] = f'Actual neutral alpha>=8 height{neutral_height}px; entire source uses379/{neutral_height}. No per-pose scale or compensating root shift.'
    frame = {'source': key, 'crop': [x, y, w, h], 'root': [sx - x, sy - y],
             'sockets': {}, 'transparency': {'mode': 'source-alpha'},
             'rootReview': 'Measured body support; three-sword/floor/scale static review passed. Normal-speed FightScene review remains pending.'}
    character['sources'][key] = source
    character['frames']['knockdown'] = frame
    patch = [{'op': 'add', 'path': '/characters/zoro/sources/' + key, 'value': source},
             {'op': 'replace', 'path': '/characters/zoro/frames/knockdown', 'value': frame}]
    write_new(stage / 'candidate-manifest.json', candidate)
    write_new(stage / 'manifest-patch.json', {'baseSha256': expected, 'patch': patch})
    write_new(stage / 'accepted-source-review.json', review)
    write_new(stage / 'candidate-commands.json', commands(stage, 'candidate-manifest.json'))
    write_new(stage / 'candidate-receipt.json', {'sourceSha256': source['sha256'], 'baselineSha256': expected,
        'candidateSha256': sha(stage / 'candidate-manifest.json'), 'neutralAlpha8BoundsWithinCell': neutral,
        'neutralHeight': neutral_height, 'sourceUnitScale': source['unitScale'], 'knockdownRoot': frame['root'],
        'knockdownAnimationUnchanged': True, 'otherFramesUnchanged': True, 'gameAccepted': False,
        'sharedManifestChanged': False, 'runtimeChanged': False})
    print(json.dumps({'candidate': str(stage / 'candidate-manifest.json'), 'patch': str(stage / 'manifest-patch.json'), 'commands': commands(stage, 'candidate-manifest.json')}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['snapshot', 'prepare', 'rollback-info'])
    parser.add_argument('--stage')
    parser.add_argument('--review', type=Path)
    args = parser.parse_args()
    if args.mode == 'snapshot':
        snapshot()
        return
    if not args.stage:
        raise ValueError('--stage is required.')
    stage = stage_path(args.stage)
    if args.mode == 'prepare':
        if args.review is None or args.review.resolve().drive.upper() != 'D:':
            raise ValueError('Provide an explicit D review JSON.')
        prepare(stage, args.review)
    else:
        record = json.loads((stage / 'copy-before.json').read_text(encoding='utf-8'))
        if sha(stage / 'rollback-manifest.json') != record['sha256']:
            raise ValueError('Rollback manifest hash mismatch.')
        print(json.dumps({'verifiedRollback': record, 'commands': commands(stage, 'rollback-manifest.json'),
                          'note': 'Info only. Rebuild does not delete surplus candidate files; source and prior packs remain.'}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        raise SystemExit(str(error)) from error
