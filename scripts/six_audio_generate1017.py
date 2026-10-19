"""Export explicit new Japanese candidates through the already running local TTS queue.

Does not start/load a model, install, upload, process audio or adopt candidates.
Default validates the plan only; --generate explicitly submits up to four lines.
Old four voice identities cannot be reproduced by a CustomVoice preset, so this
tool never silently remakes them. Explicit Gear5 supplements retain the already
adopted Ono Anna synthetic profile and never claim original-actor identity.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014/candidate/audio1017')
CACHE = Path('D:/one-piece-fighter-crossover-0922/tools/game-voice1013/cache')
SPEAKERS = {'aokiji': 'Ryan', 'shanks': 'Uncle Fu', 'luffy': 'Ono Anna', 'akainu': 'Uncle Fu'}
SUPPLEMENT_EVENTS = {'luffy': {'sp_gatling', 'g5_awakening', 'g5_exit'},
                     'aokiji': {'ult_ice_age'}, 'shanks': {'sp_divine_departure', 'ult_red_hair_finale'},
                     'akainu': {'sp_inugami', 'sp_meigou', 'ult_meigou_end'}}
SUPPLEMENT_EVENTS['luffy'].update({'st_c', 'sp_rocket', 'sp_balloon', 'ult_red_hawk', 'g5_bounce_slam'})


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    with path.open('x', encoding='utf-8') as out:
        json.dump(value, out, ensure_ascii=False, indent=2)
        out.write('\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    assert ROOT == Path('D:/Projects/one-piece-fighter') and sys.dont_write_bytecode
    plan_path = args.plan.resolve()
    if not plan_path.is_relative_to(BASE.resolve()) or not (BASE / 'README.md').is_file():
        raise ValueError('Plan must live in candidate/audio1017 after its README exists')
    plan = json.loads(plan_path.read_text(encoding='utf-8-sig'))
    character = plan['character']
    if plan.get('language') != 'Japanese' or plan.get('speaker') != SPEAKERS.get(character):
        raise ValueError('Use the explicit Japanese character speaker profile, never an arbitrary fallback')
    if character in {'luffy', 'akainu'} and plan.get('voiceIdentityMode') != 'synthetic-supplement-not-original-actor':
        raise ValueError('Old OnePiece actor supplements require explicit identity disclosure; accepted original clips stay unchanged')
    lines = plan['lines']
    if not 1 <= len(lines) <= 4:
        raise ValueError('Explicit small sample batch must contain1..4 lines')
    for line in lines:
        if line['event'] not in {'select', 'attack', 'effort', 'hurt', 'ko', 'win', 'idle', 'move'} | SUPPLEMENT_EVENTS.get(character, set()):
            raise ValueError('Unknown game event')
        if not all(isinstance(line.get(key), str) and line[key].strip() for key in ('text', 'instruction')):
            raise ValueError('Original text and speaker instruction are mandatory')
        if len(line['text']) > 80:
            raise ValueError('Use short game phrases, not long narration')
    print(json.dumps({'planValidated': True, 'character': character, 'lines': len(lines),
                      'submitted': args.generate, 'modelLoads': 0, 'downloadOrInstall': False}))
    if not args.generate:
        return
    from gradio_client import Client
    import soundfile as sf
    client = Client('http://127.0.0.1:7863', download_files=False)
    out = BASE / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    out.mkdir()
    (out / 'README.md').write_text('# Explicit local TTS exports1017\nUnchanged original candidates and full requests. Not heard or adopted; no uploads or paid calls.\n', encoding='utf-8')
    save(out / 'input-plan.json', {'plan': plan, 'inputSha256': sha(plan_path)})
    clips = []
    for index, line in enumerate(lines, 1):
        save(out / f'input-{index:02}.json', line)
        result, status = client.predict(text=line['text'], lang_disp='Japanese', spk_disp=plan['speaker'],
                                        instruct=line['instruction'], api_name='/run_instruct')
        source = Path(result['path'] if isinstance(result, dict) else result).resolve()
        if not source.is_relative_to(CACHE.resolve()) or not source.is_file() or 'Finished' not in status:
            raise ValueError('Unexpected local generation response; preserve evidence and stop')
        target = out / f'{character}-{line["event"]}-{index:02}.wav'
        before = {'source': str(source), 'sha256': sha(source), 'bytes': source.stat().st_size}
        save(out / f'copy-before-{index:02}.json', before)
        shutil.copyfile(source, target)
        assert sha(target) == before['sha256']
        info = sf.info(str(target))
        eligible = info.duration <= line.get('maxDurationSeconds', 2.4)
        save(out / f'export-{index:02}.json', {**before, 'target': str(target), 'copiedSha256': sha(target),
             'speaker': plan['speaker'], 'language': 'Japanese', 'durationSeconds': info.duration,
             'sampleRate': info.samplerate, 'voiceIdentityMode': plan.get('voiceIdentityMode', 'established-synthetic-profile'),
             'timingEligible': eligible, 'maxDurationSeconds': line.get('maxDurationSeconds', 2.4),
             'heard': False, 'gameAdopted': False})
        if eligible:
            clips.extend([{'path': str(target), 'sha256': sha(target), 'reviewMode': mode}
                          for mode in ('content_and_quality', 'quality_only')])
    save(out / 'native-qa-catalog.json', {'clips': clips})
    print(json.dumps({'output': str(out), 'nativeQaCatalog': str(out / 'native-qa-catalog.json'),
                      'generated': len(lines), 'heard': False, 'adopted': False}))


if __name__ == '__main__':
    main()
