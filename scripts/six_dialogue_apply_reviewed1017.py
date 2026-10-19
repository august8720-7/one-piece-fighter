"""Copy exact manually reviewed dialogue into the semantic overlay, preserving old audio.

Input decisions bind actual native content+independent quality results by full
audio/response SHA. Unknown timbre supplements cannot pass by a generation script.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys
from six_dialogue_store1017 import read_full, write_full

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('decisions', type=Path)
    args = parser.parse_args()
    assert ROOT == Path('D:/Projects/one-piece-fighter') and sys.dont_write_bytecode
    import soundfile as sf
    decisions = json.loads(args.decisions.read_text(encoding='utf-8-sig'))
    path = ROOT / 'src/audio/semanticDialogue1017.json'
    previous = path.read_bytes()
    result = read_full()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    out = WORK / 'acceptance/audio1017' / ('dialogue-adoption-' + stamp)
    out.mkdir()
    (out / 'README.md').write_text('# Exact reviewed meaningful dialogue1017\nOnly explicit accepted decisions bind native audio and two independent responses. Original accepted clips and base catalogs stay preserved. New files do not certify original actor or human timbre acceptance.\n', encoding='utf-8')
    (out / 'before-semanticDialogue1017.json').write_bytes(previous)
    shutil.copyfile(args.decisions, out / 'decisions.json')
    applied = []
    for row in decisions['clips']:
        assert row['decision'] == 'accepted' and row['continuityStatus'] in {
            'established-synthetic-profile', 'unchanged-original-actor-source',
            'same-accepted-synthetic-reference-source', 'native-compared-supplement-not-original-actor'}
        if row['continuityStatus'] == 'native-compared-supplement-not-original-actor':
            assert row.get('identityEvidence'), 'A new preset voice cannot claim continuity without actual evidence'
        source = Path(row['sourceFile']).resolve()
        assert source.is_relative_to((ROOT / 'public/assets/audio').resolve()) or source.is_relative_to((WORK / 'candidate/audio1017').resolve())
        expected = row['sourceSha256']
        assert sha(source) == expected
        content_path, quality_path = Path(row['contentResult']), Path(row['qualityResult'])
        assert content_path.is_relative_to((WORK / 'acceptance/audio1017/native').resolve())
        assert quality_path.is_relative_to((WORK / 'acceptance/audio1017/native').resolve())
        content, quality = json.loads(content_path.read_bytes()), json.loads(quality_path.read_bytes())
        assert content['audioSha256'] == quality['audioSha256'] == expected
        assert not content['expectedTextProvided'] and not quality['expectedTextProvided']
        assert content['validAudioFeatureFrames'] > 0 and quality['validAudioFeatureFrames'] > 0
        assert row['heard'] in content['response'] and quality['reviewMode'] == 'quality_only'
        for response in (content, quality):
            assert hashlib.sha256(response['response'].encode()).hexdigest() == response['responseSha256']
        assert all(word in quality['response'] for word in ['开头和结尾完整', '没有被硬切断', '无不自然重复', '无背景音乐、杂音或明显失真'])
        info = sf.info(str(source))
        assert 0 < info.duration <= row.get('maxDurationSeconds', 2.4)
        target = (ROOT / row['runtimeFile']).resolve()
        assert target.is_relative_to((ROOT / 'public/assets/audio/voice' / row['character']).resolve())
        before = {'source': str(source), 'target': str(target), 'sha256': expected, 'bytes': source.stat().st_size}
        (out / (row['id'] + '-copy-before.json')).write_text(json.dumps(before, indent=2), encoding='utf-8')
        if target.exists():
            assert sha(target) == expected, 'Never overwrite a distinct accepted runtime file'
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        assert sha(target) == expected
        file = target.relative_to(ROOT / 'public').as_posix()
        evidence = [{'path': str(p), 'sha256': sha(p), 'role': role} for p, role in [(content_path, 'content'), (quality_path, 'independent-quality')]]
        if row.get('identityEvidence'):
            for record in row['identityEvidence']:
                assert sha(Path(record['path'])) == record['sha256']
            evidence.extend(row['identityEvidence'])
        for event in row['events']:
            cue_id = f"voice.{row['character']}.{event}"
            result['cues'][cue_id] = {'files': [file], 'group': 'voice', 'characterId': row['character'],
                'gain': row.get('gain', 0.75), 'preserveSentence': True, 'priority': 75,
                'cooldownMs': 4000, 'maxInstances': 1, 'source': 'docs/design/六人台词补齐1017.md',
                'note': row['note'], 'meaningfulReuse': len(row['events']) > 1}
            result['cues'][cue_id]['dedicatedRecording'] = row.get('dedicatedRecording',
                len(row['events']) == 1 and row['sourceKind'] == 'original-synthetic-supplement')
        line = {'file': file, 'label': row['label'], 'original': row['heard'], 'translation': row['translation'],
                'transcriptVerified': True, 'nativeAudioReviewed': True, 'humanListened': False,
                'sha256': expected, 'sourceKind': row['sourceKind'], 'continuityStatus': row['continuityStatus'],
                'originalActorClaim': False if row['sourceKind'] == 'original-synthetic-supplement' else None, 'evidence': evidence}
        result['lines'] = [x for x in result['lines'] if x['file'] != file] + [line]
        result['fileChecks'][file] = {'sha256': expected, 'bytes': target.stat().st_size}
        result.setdefault('reviewedAdoptions', {})[row['id']] = {**row, 'durationSeconds': info.duration, 'evidence': evidence}
        applied.append({'id': row['id'], 'runtime': file, 'events': row['events'], 'sha256': expected, 'seconds': info.duration})
    write_full(result)
    data = path.read_bytes()
    (out / 'after.json').write_text(json.dumps({'manifestSha256': hashlib.sha256(data).hexdigest(), 'applied': applied,
        'newHumanAudition': False, 'browserPlaybackVerified': False}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(out), 'applied': applied}, ensure_ascii=False))


if __name__ == '__main__':
    main()
