"""Adopt exact meaningful reuses with existing proof; no guessed old words/new voice match.

The1017 overlay preserves all original catalogs/files. New synthesis requires a
separate explicit exact-SHA content/quality/identity decision, never a directory scan.
"""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
from six_dialogue_store1017 import read_full, write_full

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')
QA = WORK / 'acceptance/audio1017/native/20261017T032414960848Z'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def evidence(path, role):
    return {'path': str(path), 'sha256': sha(path), 'role': role}


def native(file, content_index, quality_index, heard):
    cp, qp = QA / f'result-{content_index:02}.json', QA / f'result-{quality_index:02}.json'
    content, quality = json.loads(cp.read_bytes()), json.loads(qp.read_bytes())
    expected = sha(ROOT / 'public' / file)
    assert content['audioSha256'] == quality['audioSha256'] == expected
    assert not content['expectedTextProvided'] and not quality['expectedTextProvided']
    assert content['validAudioFeatureFrames'] > 0 and quality['validAudioFeatureFrames'] > 0
    assert heard in content['response']
    for result in (content, quality):
        assert hashlib.sha256(result['response'].encode()).hexdigest() == result['responseSha256']
    assert all(text in quality['response'] for text in ['开头和结尾完整', '没有被硬切断', '无不自然重复', '无背景音乐、杂音或明显失真'])
    return [evidence(cp, 'content'), evidence(qp, 'independent-quality')]


def main():
    assert ROOT == Path('D:/Projects/one-piece-fighter')
    manifest_path = ROOT / 'src/audio/semanticDialogue1017.json'
    previous = manifest_path.read_bytes()
    result = read_full()
    catalog = json.loads((ROOT / 'src/audio/sampleManifest.json').read_bytes())['cues']
    lines = json.loads((ROOT / 'src/audio/voiceLines0922.json').read_bytes())['lines']
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    out = WORK / 'acceptance/audio1017' / ('semantic-reuse-' + stamp)
    out.mkdir()
    (out / 'README.md').write_text('# Meaningful semantic reuse1017\nExact existing clips only. Intro/skill bindings and new blind-reviewed words are explicit. All accepted original WAV/MP3 files and base tables remain unchanged. No new synthesis is automatically accepted.\n', encoding='utf-8')
    (out / 'previous-semanticDialogue1017.json').write_bytes(previous)
    proof = {}
    for file, ci, qi, text, translation in [
        ('assets/audio/voice/luffy/daily-idle-1-0914.wav', 1, 2, 'よしやるか', '好，开打吧！'),
        ('assets/audio/voice/luffy/candidate-review-win-0912.wav', 5, 6, 'ぶっ飛ばしてやった', '把你打飞了！'),
        ('assets/audio/voice/akainu/daily-idle-2-0914.wav', 9, 10, '次はお前じゃ', '下一个就是你。'),
        ('assets/audio/voice/akainu/candidate-review-win-0912.wav', 11, 12, '敗北者が', '败者……'),
    ]:
        proof[file] = {'file': file, 'label': '1017原声台词盲核', 'original': text, 'translation': translation,
                       'transcriptVerified': True, 'nativeAudioReviewed': True, 'humanListened': False,
                       'audioSha256': sha(ROOT / 'public' / file), 'evidence': native(file, ci, qi, text)}
    existing_lines = {line['file']: line for line in lines}
    aliases = [
        ('luffy', 'intro', 'voice.luffy.select', None),
        ('luffy', 'attack', 'voice.luffy.select', None),
        ('akainu', 'select', 'voice.akainu.idle', 'assets/audio/voice/akainu/daily-idle-2-0914.wav'),
        ('akainu', 'intro', 'voice.akainu.idle', 'assets/audio/voice/akainu/daily-idle-2-0914.wav'),
        ('akainu', 'attack', 'voice.akainu.idle', 'assets/audio/voice/akainu/daily-idle-2-0914.wav'),
        ('labubu', 'intro', 'voice.labubu.idle', None),
        ('twinkle', 'intro', 'voice.twinkle.idle', None),
        ('twinkle', 'sp_tiny_star', 'voice.twinkle.attack', None),
        ('aokiji', 'intro', 'voice.aokiji.select', None),
        ('shanks', 'intro', 'voice.shanks.idle', None),
        ('labubu', 'attack', 'voice.labubu.attack', None),
        ('labubu', 'sp_pounce_rush', 'voice.labubu.select', None),
        ('labubu', 'sp_prank_flurry', 'voice.labubu.attack', None),
        ('labubu', 'ult_monster_mayhem', 'voice.labubu.idle', None),
        ('twinkle', 'attack', 'voice.twinkle.attack', None),
        ('twinkle', 'sp_falling_star', 'voice.twinkle.attack', None),
        ('twinkle', 'sp_starlight_push', 'voice.twinkle.attack', None),
        ('twinkle', 'ult_star_symphony', 'voice.twinkle.select', None),
        ('aokiji', 'attack', 'voice.aokiji.attack', None),
        ('aokiji', 'sp_ice_lance', 'voice.aokiji.attack', None),
        ('aokiji', 'sp_ice_spike', 'voice.aokiji.attack', None),
        ('aokiji', 'sp_ice_uplift', 'voice.aokiji.attack', None),
        ('shanks', 'attack', 'voice.shanks.move', None),
        ('shanks', 'st_c', 'voice.shanks.move', None),
        ('shanks', 'sp_step_thrust', 'voice.shanks.move', None),
        ('shanks', 'sp_rising_guard', 'voice.shanks.idle', None),
    ]
    for character, event, origin, chosen in aliases:
        cue = deepcopy(catalog[origin])
        cue['files'] = [chosen or cue['files'][0]]
        for file in cue['files']:
            line = proof.get(file) or existing_lines[file]
            assert line['transcriptVerified'] and line.get('original')
            expected = line.get('audioSha256') or line.get('sha256')
            assert expected == sha(ROOT / 'public' / file)
            proof.setdefault(file, {**line, 'semanticReuseEvidence': origin, 'newUtterance': False})
        cue.update(preserveSentence=True, priority=75, cooldownMs=0 if event in ('intro', 'select') else 4000,
                   meaningfulReuse=True, dedicatedRecording=False,
                   note=f'Exact meaningful reuse of {origin}; full accepted audio preserved. New1017 event placement, not a newly generated line or original-actor claim.',
                   source='docs/design/六人台词补齐1017.md')
        result['cues'][f'voice.{character}.{event}'] = cue
    # Add exact words for the existing select/win bytes too; no audio replacement.
    previous_by_file = {line['file']: line for line in result['lines']}
    previous_by_file.update(proof)
    result['lines'] = list(previous_by_file.values())
    for file in proof:
        path = ROOT / 'public' / file
        result['fileChecks'][file] = {'sha256': sha(path), 'bytes': path.stat().st_size}
    result['reuseAdoptionEvidence'] = str(out)
    write_full(result)
    data = manifest_path.read_bytes()
    (out / 'adoption-result.json').write_text(json.dumps({'output': str(manifest_path), 'beforeSha256': hashlib.sha256(previous).hexdigest(),
        'afterSha256': hashlib.sha256(data).hexdigest(), 'cueIds': list(result['cues']), 'exactFiles': result['fileChecks'],
        'newSynthesisAdopted': False, 'runtimePlaybackVerified': False}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(out), 'semanticCueIds': list(result['cues']), 'transcriptFiles': len(result['lines'])}))


if __name__ == '__main__':
    main()
