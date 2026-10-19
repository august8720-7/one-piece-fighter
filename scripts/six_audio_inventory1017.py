"""Read-only six-character delivery inventory; optional immutable pre-edit audio backup.

Run with the existing D TTS Python through run-d1013.ps1. This never generates,
edits, adopts, deletes or uploads media. Soundfile measures decoding/duration only.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import re
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')
IDS = ('luffy', 'akainu', 'labubu', 'twinkle', 'aokiji', 'shanks')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf-8') as out:
        json.dump(value, out, ensure_ascii=False, indent=2)
        out.write('\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', action='store_true')
    args = parser.parse_args()
    assert ROOT == Path('D:/Projects/one-piece-fighter') and sys.dont_write_bytecode
    import soundfile as sf
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    out = WORK / 'acceptance/audio1017' / stamp
    for directory, text in [
        (WORK / 'candidate/audio1017', '# Audio candidates1017\nOriginal new candidates and generation inputs only; no automatic adoption. Existing accepted six-character audio is reused unchanged.\n'),
        (out.parent, '# Six audio acceptance1017\nDated read-only inventories, event mapping checks and playback evidence. Decode/duration/hash checks do not certify listening quality.\n'),
        (out, '# Read-only inventory1017\nSoundfile decodes current explicitly adopted files. Art inventory counts actual atlas frames/animations without altering or visually certifying them.\n'),
    ]:
        directory.mkdir(parents=True, exist_ok=True)
        if not (directory / 'README.md').exists():
            (directory / 'README.md').write_text(text, encoding='utf-8')
    manifest = json.loads((ROOT / 'src/audio/sampleManifest.json').read_bytes())
    cues = {key: value for key, value in manifest['cues'].items()
            if value.get('characterId') in IDS or not value.get('characterId')}
    files = sorted({ROOT / 'public' / file for cue in cues.values() for file in cue['files']})
    rows = []
    for path in files:
        row = {'file': path.relative_to(ROOT).as_posix(), 'exists': path.is_file()}
        if path.is_file():
            row.update(bytes=path.stat().st_size, sha256=sha(path))
            try:
                info = sf.info(str(path))
                with sf.SoundFile(str(path)) as audio:
                    decoded_frames = sum(len(block) for block in audio.blocks(blocksize=65536))
                if decoded_frames != info.frames:
                    raise ValueError('Full decoded frame count differs from the file header')
                row.update(durationSeconds=info.duration, frames=info.frames,
                           decodedFrames=decoded_frames, sampleRate=info.samplerate,
                           channels=info.channels, decode='passed')
            except Exception as exc:
                row.update(decode='failed', error=str(exc))
        rows.append(row)
    byfile = {row['file'].removeprefix('public/'): row for row in rows}
    timing_path = ROOT / 'src/audio/voiceTiming.ts'
    timing = re.search(r"characterId === 'twinkle' \? (\d+) : (\d+)", timing_path.read_text(encoding='utf-8')) if timing_path.exists() else None
    voice = []
    for key, cue in cues.items():
        if cue['group'] != 'voice' or cue.get('characterId') not in IDS:
            continue
        durations = [byfile[file].get('durationSeconds') for file in cue['files']]
        trigger = int(timing.group(1 if cue['characterId'] == 'twinkle' else 2)) if timing else 40
        voice.append({'cueId': key, **cue, 'durationSeconds': durations,
                      'winTriggerFrame': trigger if key.endswith('.win') else None,
                      'winWindowSeconds': (150 - trigger) / 60 if key.endswith('.win') else None,
                      'winWindowFit': all(d is not None and d <= (150 - trigger) / 60 for d in durations)
                      if key.endswith('.win') else None})
    art = []
    for character in IDS:
        directory = ROOT / 'public/assets/characters' / character / 'anime'
        jsons = []
        for path in sorted(directory.glob('*.json')):
            value = json.loads(path.read_bytes())
            jsons.append({'file': path.relative_to(ROOT).as_posix(), 'sha256': sha(path),
                          'frames': len(value.get('frames', {})),
                          'animations': sorted(value.get('anims', {})),
                          'keys': sorted(value)})
        art.append({'character': character, 'jsons': jsons,
                    'gear5RuntimeExists': (ROOT / 'public/assets/characters/luffy/forms/gear5/runtime.json').is_file()
                    if character == 'luffy' else None})
    evidence = {}
    def check_evidence(value):
        if isinstance(value, dict):
            name, expected = value.get('path'), value.get('sha256')
            if isinstance(name, str) and isinstance(expected, str) and len(expected) == 64:
                path = Path(name) if Path(name).is_absolute() else ROOT / name
                key = str(path)
                evidence[key] = {'path': key, 'expectedSha256': expected, 'exists': path.is_file(),
                                 'shaMatched': path.is_file() and sha(path) == expected}
            for child in value.values():
                check_evidence(child)
        elif isinstance(value, list):
            for child in value:
                check_evidence(child)
    check_evidence(json.loads((ROOT / 'scripts/first_pair_voice_selection1013.json').read_bytes()))
    result = {'atUtc': stamp, 'root': str(ROOT), 'sampleManifestSha256': sha(ROOT / 'src/audio/sampleManifest.json'),
              'voiceCueCount': len(voice), 'files': rows, 'voice': voice, 'artReadOnly': art,
              'voiceTimingSourceSha256': sha(timing_path) if timing_path.exists() else None,
              'adopted1013Evidence': list(evidence.values()),
              'doesNotCertify': 'Listening, human timbre acceptance, real browser mix, continuous animation or physical contact.'}
    save(out / 'inventory.json', result)
    if args.baseline:
        baseline = WORK / 'baseline' / (stamp + '-audio')
        baseline.mkdir()
        (baseline / 'README.md').write_text('# Audio pre-edit baseline1017\nCopy-before inventory and unchanged original files; no deletion or overwrite.\n', encoding='utf-8')
        originals = sorted(set(files + list((ROOT / 'src/audio').glob('*'))
                               + [ROOT / 'scripts/first_pair_voice_selection1013.json', ROOT / 'scripts/first_pair_voice_subtitles1013.json']))
        original_rows = [{'file': p.relative_to(ROOT).as_posix(), 'sha256': sha(p), 'bytes': p.stat().st_size}
                         for p in originals if p.is_file()]
        save(baseline / 'copy-before.json', original_rows)
        copied = []
        for row in original_rows:
            target = baseline / 'files' / row['file']
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / row['file'], target)
            assert sha(target) == row['sha256']
            copied.append({**row, 'equal': True})
        save(baseline / 'copy-after.json', copied)
        result['baseline'] = str(baseline)
    print(json.dumps({'inventory': str(out / 'inventory.json'), 'voiceCueCount': len(voice),
                      'missingFiles': [r['file'] for r in rows if not r['exists']],
                      'decodeFailed': [r['file'] for r in rows if r.get('decode') == 'failed'],
                      'adopted1013Evidence': len(evidence),
                      'evidenceProblems': [r for r in evidence.values() if not r['shaMatched']],
                      'overlongWin': [r for r in voice if r['winWindowFit'] is False],
                      'baseline': result.get('baseline')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
