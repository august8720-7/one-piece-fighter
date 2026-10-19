"""Prepare <=3 exact local TTS jobs; never load, synthesize, upload or adopt.

The original six-role executor keeps its allowlist. The separate export entry
defaults to dry-run and requires the current real six-role closure certificate.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_ROOT = Path('D:/Projects/one-piece-fighter')
ENVIRONMENT = Path('D:/feiyan-promo-video-0929/配音0929/.venv-tts')
PLAN = ROOT / 'scripts/roster_dialogue_plan1017.json'
QUEUE = ROOT / 'scripts/roster_queue1017.json'
OUTPUT_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014/candidate/audio1017/remaining17-jobs')


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_sha(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(payload).hexdigest()


def save(path: Path, value: object) -> None:
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n')


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8-sig'))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--character', required=True, help='One explicit remaining17 character ID')
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument('--keys', nargs='+', help='Exact event or <character>.<event> keys, maximum3')
    selection.add_argument('--limit', type=int, choices=(1, 2, 3), help='First1..3 of this role\'s explicit select/first-skill/win sample list')
    parser.add_argument('--dry-run', action='store_true', help='Explicit preparation label; every invocation is preparation-only')
    args = parser.parse_args()
    require(ROOT.resolve() == EXPECTED_ROOT.resolve() and sys.dont_write_bytecode, 'Use D workspace and Python -B')
    require(Path(sys.prefix).resolve().is_relative_to(ENVIRONMENT.resolve()), 'Use the existing D local TTS environment; no install/fallback')
    require(Path(os.environ.get('TEMP', '')).drive.upper() == 'D:', 'Run through run-d1013.ps1 with D-only process caches')
    plan, queue = read(PLAN), read(QUEUE)
    require(plan.get('schemaVersion') == 1 and plan.get('kind') == 'remaining17-meaningful-Japanese-dialogue-preparation-only', 'Unsupported exact input plan schema')
    roles = {role['id']: role for role in plan['characters']}
    require(args.character in roles and len(roles) == 17, 'Choose an explicit remaining17 role, never a six-role fallback')
    role = roles[args.character]
    moves = (ROOT / role['sourceMoves']['file']).resolve()
    require(moves.is_relative_to((ROOT / 'src/characters' / args.character).resolve()), 'Move snapshot path escaped this role')
    require(moves.is_file() and sha(moves) == role['sourceMoves']['sha256'], 'Actual role moves differ from the prepared source snapshot; reconcile before jobs')
    by_key = {line['lineId']: line for line in role['lines']}
    keys = args.keys if args.keys is not None else role['nextBatch']['sampleLineIds'][:args.limit]
    keys = [key if '.' in key else args.character + '.' + key for key in keys]
    require(1 <= len(keys) <= 3 and len(set(keys)) == len(keys), 'Select1..3 distinct explicit lines; no bulk or duplicate aliases')
    require(all(key in by_key for key in keys), 'Unknown key or key belongs to a different character')
    selected = [by_key[key] for key in keys]
    for line in selected:
        request = line['apiRequest']
        require(request.get('apiName') == '/run_instruct' and request.get('lang_disp') == 'Japanese', 'Only the existing local Japanese CustomVoice API is allowed')
        require(request.get('spk_disp') == role['voiceProfile']['speaker'], 'Speaker drift is not a permitted fallback')
        require(request.get('text') == line['textJa'] and request.get('instruct') == line['instruction'], 'Exact text/instruction drift')
        require(all(isinstance(line.get(key), str) and line[key].strip() for key in ('lineId', 'textJa', 'readingKana', 'subtitleZh', 'instruction')), 'Missing exact input fields')
        candidate = line.get('reuseCandidate')
        if candidate:
            original = Path(candidate['file']).resolve()
            require(original.drive.upper() == 'D:' and original.is_file() and sha(original) == candidate['sha256'], 'Reusable original missing or changed; do not silently synthesize over it')
    gate = queue.get('gate', {})
    # This preparation entry never runs a worker, even when the queue gate becomes complete.
    # Pending/unknown gates remain explicit blocked execution in each job.
    gate_complete = gate.get('status') == 'complete'
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    root_readme = OUTPUT_ROOT / 'README.md'
    if not root_readme.exists():
        root_readme.write_text('# Remaining17 prepared local dialogue jobs1017\n\nD-only dated request snapshots. No audio generation, model load, upload or adoption. Existing folders/failed jobs are preserved; only explicit <=3-line selections are prepared. Six-role queue gate must close before a separate actual exporter may consume requests.\n', encoding='utf-8')
    output = OUTPUT_ROOT / (stamp + '-' + args.character)
    output.mkdir(exist_ok=False)
    (output / 'README.md').write_text('# Prepared requests, not generated voices\n\nExact selected role/keys and input SHA are frozen in jobs.json and request files. This run does not import gradio/model packages, call a service, start a process, copy/adopt voice files or touch runtime. A current incomplete gate blocks actual execution; the preparation itself is safe to resume. Preserve any failure/originals.\n', encoding='utf-8')
    requests = output / 'requests'
    requests.mkdir()
    jobs = []
    for index, line in enumerate(selected, 1):
        request = dict(line['apiRequest'])
        # Map the plan's descriptive apiName to gradio_client's real keyword.
        predict = {key: request[key] for key in ('text', 'lang_disp', 'spk_disp', 'instruct')}
        predict['api_name'] = request['apiName']
        request_record = {'lineId': line['lineId'], 'planRequest': request, 'clientPredictKwargs': predict,
                          'readingKana': line['readingKana'], 'subtitleZh': line['subtitleZh'],
                          'trigger': line['trigger'], 'targetMaxDurationSeconds': line['targetMaxDurationSeconds'],
                          'requestCanonicalSha256': canonical_sha(request), 'predictCanonicalSha256': canonical_sha(predict)}
        target = requests / (f'{index:02}-' + line['event'] + '.json')
        save(target, request_record)
        jobs.append({'lineId': line['lineId'], 'event': line['event'], 'requestFile': target.relative_to(output).as_posix(),
                     'requestFileSha256': sha(target), 'requestCanonicalSha256': canonical_sha(request),
                     'action': 'reuse-reviewed-original-after-gate-and-role-sample' if line.get('reuseCandidate') else 'local-generate-after-gate-and-role-sample',
                     'reuseCandidate': line.get('reuseCandidate'), 'endpoint': 'http://127.0.0.1:7863',
                     'futureAudioName': args.character + '-' + line['event'] + '-qwen-' + stamp + '.wav',
                     'state': 'prepared-waiting-explicit-exporter' if gate_complete else 'prepared-execution-blocked-by-six-role-gate',
                     'audioGenerated': False, 'heard': False, 'adopted': False})
    manifest = {'schemaVersion': 1, 'kind': 'prepared-local-roster-dialogue-jobs', 'preparedAtUtc': datetime.now(timezone.utc).isoformat(),
                'character': args.character, 'keys': keys, 'jobs': jobs,
                'sourcePlan': {'file': PLAN.relative_to(ROOT).as_posix(), 'sha256': sha(PLAN)},
                'sourceMoves': role['sourceMoves'], 'sourceQueue': {'file': QUEUE.relative_to(ROOT).as_posix(), 'sha256': sha(QUEUE),
                     'plannedQueueSha256': plan['sourceQueue']['sha256'], 'changedSincePlan': sha(QUEUE) != plan['sourceQueue']['sha256']},
                'gate': {'observed': gate, 'complete': gate_complete, 'actualExecutionBlocked': not gate_complete,
                         'rule': 'Only current queue gate status complete may release a future explicit exporter; a prepared file is never a closure certificate.'},
                'execution': {'mode': 'prepare-only', 'workerInvoked': False, 'modelLoads': 0, 'audioGenerated': 0, 'uploads': 0, 'paidCalls': 0, 'installs': 0,
                         'supportedByThisCommand': False,
                         'existingSixExecutorCompatible': False,
                         'exporter': {'file': 'scripts/export_roster_dialogue_jobs1017.py', 'defaultMode': 'dry-run', 'realGateCertificateRequired': True, 'liveExportVerified': False},
                         'remainingAdapterGap': 'Controlled export entry now exists; real gate/service export and auditory review remain unverified. Old six executor still rejects remaining17 IDs/events; preparation never generates audio.',
                         'safetyContract': 'No local-service reachability, generated WAV, auditory acceptance, game adoption or completed six-role gate is implied by this dry preparation.'}}
    save(output / 'jobs.json', manifest)
    print(json.dumps({'prepared': True, 'mode': 'prepare-only', 'character': args.character, 'keys': keys,
                      'jobs': len(jobs), 'output': output.as_posix(), 'manifestSha256': sha(output / 'jobs.json'),
                      'planSha256': sha(PLAN), 'currentGateStatus': gate.get('status', 'unknown'),
                      'actualExecutionBlocked': not gate_complete, 'modelLoads': 0, 'audioGenerated': 0, 'adopted': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
