"""Check/copy the explicit first-pair release-only SFX selection, never integrate.

Keeps old candidates, sources and uncertain/negative native reviews. Copies
exact WAV bytes only; does not edit AudioEngine, src manifests or playback.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import wave

ROOT = Path(__file__).resolve().parents[1]
SELECTION = ROOT / 'scripts/first_pair_sfx_selection1004.json'
TARGET_ROOT = (ROOT / 'public/assets/audio/sfx/roster-adopted1004').resolve()
EVIDENCE_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice').resolve()
ALLOWED_NATIVE_INDICES = {1, 2, 4, 6, 7, 8, 9, 10, 11, 13, 15, 16, 17}
REPLACEMENTS = {3: 2, 5: 2, 12: 13, 14: 13}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encoded(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def new_file(path: Path, data: bytes):
    with path.open('xb') as output:
        output.write(data)


def pcm(path: Path):
    with wave.open(str(path), 'rb') as audio:
        shape = {'channels': audio.getnchannels(), 'sampleWidthBytes': audio.getsampwidth(),
                 'sampleRateHz': audio.getframerate(), 'frames': audio.getnframes(), 'compression': audio.getcomptype()}
        samples = audio.readframes(audio.getnframes())
    if (shape['channels'], shape['sampleWidthBytes'], shape['sampleRateHz'], shape['compression']) != (1, 2, 44100, 'NONE'):
        raise ValueError('Only existing unchanged mono PCM16/44100 release WAVs are allowed')
    return shape, samples


def verified_evidence(record):
    path = Path(record['path']).resolve()
    if not path.is_relative_to(EVIDENCE_ROOT):
        raise ValueError('Native evidence escaped its existing local voice evidence root')
    data = path.read_bytes()
    if digest(data) != record['sha256']:
        raise ValueError('Native listening evidence bytes changed')
    return data


def prepare():
    raw = SELECTION.read_bytes()
    value = json.loads(raw)
    if value['adoptedStage'] != 'release' or value['uniqueAdoptedFiles'] != 13 or value['actualReleaseMappings'] != 18:
        raise ValueError('Only root selected 13 files for 18 release mappings are allowed')
    if value['centralIntegration']['newStages'] != ['release'] or not value['centralIntegration']['startEndUseExistingSharedAudio']:
        raise ValueError('Unheard new start/end stages must not be adopted')
    for record in value['evidenceReceipts']:
        verified_evidence(record)
    files = {}
    copies = []
    for item in value['files']:
        if item['id'] in files or item['selectedNativeIndex'] not in ALLOWED_NATIVE_INDICES:
            raise ValueError('Duplicate file or unresolved/flagged source selected')
        character = item['character']
        if character not in ('aokiji', 'shanks'):
            raise ValueError('Only the first pair can be copied')
        source = Path(item['sourceRuntimeFile']).resolve()
        candidate = Path(item['sourceCandidate']).resolve()
        target = (ROOT / item['target']).resolve()
        if (not source.is_relative_to((ROOT / 'public/assets/audio/sfx/roster-preview1003' / character).resolve())
                or not candidate.is_relative_to(EVIDENCE_ROOT)
                or not target.is_relative_to(TARGET_ROOT / character) or target.suffix != '.wav'
                or target.relative_to(ROOT / 'public').as_posix() != item['runtimeFile']):
            raise ValueError('Invalid exact source/candidate/role-independent output path')
        data = source.read_bytes()
        if digest(data) != item['sha256'] or digest(candidate.read_bytes()) != item['sha256'] or len(data) != item['bytes']:
            raise ValueError('Selected source and original prepared candidate are not exact review bytes')
        shape, samples = pcm(source)
        candidate_shape, candidate_samples = pcm(candidate)
        if (shape != candidate_shape or samples != candidate_samples or digest(samples) != item['pcmSha256']
                or any(shape[key] != item[key] for key in ('channels', 'sampleWidthBytes', 'sampleRateHz', 'frames'))):
            raise ValueError('Selected PCM identity or shape differs')
        review = item['qualityReview']
        if (review['kind'] != 'agent_audio_model' or review['rootSelectionStatus'] != 'selected-for-release'
                or review['inputAudioAttached'] is not True or review['nativeAudioReviewed'] is not True
                or not review['modelReportedNoObviousNoiseOrDistortion']
                or not review['modelReportedNoObviousBoundaryClickOrTruncation']
                or review['audioSha256'] != item['sha256'] or review['pcmSha256'] != item['pcmSha256']):
            raise ValueError('Only an exact native listening assessment can support release selection')
        evidence = {record['role']: verified_evidence(record) for record in review['evidence']}
        response = evidence['response'].decode('utf-8')
        request = json.loads(evidence['request'])
        actual = json.loads(evidence['native-result'])
        features = json.loads(evidence['native-input'])
        if (digest(evidence['response']) != review['responseSha256'] or response != review['response']
                or actual['response'] != response or actual['responseSha256'] != review['responseSha256']
                or request['audioSha256'] != item['sha256'] or actual['request']['audioSha256'] != item['sha256']
                or features['audioSha256'] != item['sha256'] or features['inputAudioAttached'] is not True
                or features['validAudioFeatureFrames'] <= 0 or actual['resourceStable'] is not True
                or request['expectedSoundClassProvided'] is not False):
            raise ValueError('Listening response/real input is not bound to the selected exact WAV')
        if item['selectedNativeIndex'] == 1:
            if any(not re.search(rf'(?m)^{number}\.\s*无\s*$', response) for number in (2, 3, 4)):
                raise ValueError('The one follow-up must explicitly answer no noise/distortion/abrupt boundary')
        elif not (all(word in response for word in ('破音', '失真', '杂音', '截断', '点击'))
                  and ('没有明显' in response or '没有录音' in response)):
            raise ValueError('Missing explicit native recording-quality answer')
        for original in item['licenseSources']:
            path = Path(original['file']).resolve()
            if (original['license'] != 'CC0' or not path.is_relative_to((ROOT / 'public/assets/audio/sources').resolve())
                    or digest(path.read_bytes()) != original['sha256']):
                raise ValueError('Exact CC0 original source identity changed')
        source_hashes = {original['sourceKey']: original['sha256'] for original in item['licenseSources']}
        if any(source_hashes.get(recipe['source']) != recipe['sourceSha256'] for recipe in item['recipes']):
            raise ValueError('Processing recipe is not bound to its licensed original')
        if target.exists() and digest(target.read_bytes()) != item['sha256']:
            raise FileExistsError('Never replace an existing differing adoption file')
        files[item['id']] = item
        copies.append({'source': str(source), 'target': str(target), 'sha256': item['sha256'],
                       'pcmSha256': item['pcmSha256'], 'bytes': len(data), 'alreadyExists': target.exists()})
    if {item['selectedNativeIndex'] for item in files.values()} != ALLOWED_NATIVE_INDICES or len(copies) != 13:
        raise ValueError('The selected native source set changed')
    seen = set()
    for mapping in value['mappings']:
        key = (mapping['character'], mapping['moveId'])
        if key in seen or mapping['stage'] != 'release':
            raise ValueError('Duplicate/non-release mapping')
        seen.add(key)
        item = files[mapping['fileId']]
        if (item['character'] != mapping['character'] or item['sha256'] != mapping['sha256']
                or item['pcmSha256'] != mapping['pcmSha256'] or item['runtimeFile'] != mapping['runtimeFile']
                or item['selectedNativeIndex'] != mapping['selectedNativeIndex']
                or mapping['selectedNativeIndex'] != REPLACEMENTS.get(mapping['previousNativeIndex'], mapping['previousNativeIndex'])):
            raise ValueError('Root replacement or same-character source mapping changed')
        cue = value['centralIntegration']['cues'][mapping['cueId']]
        if cue['files'] != [item['runtimeFile']] or cue['group'] != 'sfx':
            raise ValueError('Central merge payload and copied WAV mapping differ')
    if len(seen) != 18 or any(sum(character == row[0] for row in seen) != 9 for character in ('aokiji', 'shanks')):
        raise ValueError('The first-pair nine release mappings each are incomplete')
    if {row['nativeIndex'] for row in value['rejectedOriginalCandidates']} != set(REPLACEMENTS):
        raise ValueError('Original uncertain/flagged candidates must remain documented')
    return value, raw, copies


def execute(value, raw, copies, record_dir: Path):
    record_dir = record_dir.resolve()
    if not record_dir.is_relative_to(EVIDENCE_ROOT) or record_dir == EVIDENCE_ROOT or record_dir.exists():
        raise ValueError('Use a new unique D:/ voice evidence child directory')
    if shutil.disk_usage('D:/').free < 15_000_000_000:
        raise RuntimeError('Retain 15 GB for game work')
    record_dir.mkdir()
    new_file(record_dir / 'README.md', b'# First-pair release SFX adoption copies1004\nExact reviewed WAV bytes only; copy-before/after SHA and decoded PCM. 18 release mappings, 13 unique files with explicit same-character reuse. Original failed/unknown candidates remain. No new start/end acceptance, no AudioEngine/src edits, model rerun, upload or public release.\n')
    new_file(record_dir / 'selection-snapshot.json', raw)
    new_file(record_dir / 'copy-before.json', encoded(copies))
    for folder in (TARGET_ROOT, TARGET_ROOT / 'aokiji', TARGET_ROOT / 'shanks'):
        if not folder.exists():
            folder.mkdir()
            new_file(folder / 'README.md', b'# Adopted first-pair release SFX1004\nOnly exact SHA/PCM-verified CC0-derived release WAV copies. Multiple same-character cues may share a file explicitly. Not original anime/exclusive named-move sounds; no new start/end quality claim. Sources, rejected candidates and private evidence remain separately preserved. Central integration/publication is performed by root.\n')
    after = []
    for copy in copies:
        source, target = Path(copy['source']), Path(copy['target'])
        if not target.exists():
            new_file(target, source.read_bytes())
        target_shape, target_pcm = pcm(target)
        if digest(source.read_bytes()) != copy['sha256'] or digest(target.read_bytes()) != copy['sha256'] or digest(target_pcm) != copy['pcmSha256']:
            raise ValueError('Source or adoption copy changed; central integration is not permitted')
        after.append({**copy, 'copyVerified': True, 'pcmVerified': True, 'frames': target_shape['frames']})
    new_file(record_dir / 'copy-after.json', encoded(after))
    new_file(record_dir / 'central-integration-data.json', encoded(value['centralIntegration']))
    new_file(record_dir / 'result.json', encoded({'completedAtUtc': datetime.now(timezone.utc).isoformat(),
        'selectionSha256': digest(raw), 'uniqueCopiedOrVerifiedFiles': len(after), 'releaseMappings': len(value['mappings']),
        'centralFilesModified': False, 'oldCandidatesPreserved': True, 'newStartEndStagesAdopted': False,
        'modelsRerun': 0, 'audioUploads': 0, 'gamePlaybackAndMixVerifiedByCopyTool': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='Validate selection/source/native evidence without creating files')
    mode.add_argument('--execute', action='store_true', help='Copy exact adopted WAV bytes, keeping all old files')
    parser.add_argument('--record-dir', type=Path, help='New unique D:/ voice evidence child for copy manifest/receipts')
    args = parser.parse_args()
    value, raw, copies = prepare()
    if args.execute:
        if args.record_dir is None:
            parser.error('--execute requires an explicit new --record-dir')
        execute(value, raw, copies, args.record_dir)
    print(json.dumps({'checkOnly': args.check, 'uniqueFiles': len(copies), 'releaseMappings': len(value['mappings']),
                      'modelsRerun': 0, 'sharedSrcChanged': False, 'newStages': ['release']}, ensure_ascii=False))
