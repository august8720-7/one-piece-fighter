"""Validate by default; explicitly export <=3 local Japanese candidates after real six-role closure.

Does not start a service/model, install, upload, adopt or edit a runtime table.
Successful exports and partial source checkpoints are reused on later attempts.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import sys

import prepare_roster_dialogue_jobs1017 as prep

BASE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')
CACHE = Path('D:/one-piece-fighter-crossover-0922/tools/game-voice1013/cache')
OVERLAY = prep.ROOT / 'src/audio/semanticDialogue1017.json'
FROZEN_OVERLAY_SHA = '53c5cf5dc4d3edf02dc392ee5e011625c35298dedd2b1aac1c11fc18626bb4af'
GATE_KIND = 'six-person-real-closure-gate1017'


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def owned_file(value: str | Path, roots: tuple[Path, ...]) -> Path:
    path = Path(value).resolve()
    prep.require(path.drive.upper() == 'D:' and any(path.is_relative_to(root.resolve()) for root in roots), 'File escaped its explicit D scope')
    prep.require(path.is_file(), 'Missing exact input/evidence file: ' + str(path))
    return path


def validate_jobs(path: Path) -> tuple[Path, dict, list[dict]]:
    path = owned_file(path, (prep.OUTPUT_ROOT,))
    prep.require(path.name == 'jobs.json', 'Use one prepared jobs.json, not the whole dialogue plan')
    manifest = prep.read(path)
    plan = prep.read(prep.PLAN)
    prep.require(manifest.get('schemaVersion') == 1 and manifest.get('kind') == 'prepared-local-roster-dialogue-jobs', 'Unsupported prepared jobs schema')
    prep.require(manifest['sourcePlan']['file'] == 'scripts/roster_dialogue_plan1017.json' and manifest['sourcePlan']['sha256'] == prep.sha(prep.PLAN), 'Input plan changed; reconcile/reprepare, never silently substitute text')
    roles = {role['id']: role for role in plan['characters']}
    character = manifest['character']
    prep.require(character in roles and len(roles) == 17, 'Only explicit remaining17 IDs are allowed')
    role = roles[character]
    moves = owned_file(prep.ROOT / role['sourceMoves']['file'], (prep.ROOT / 'src/characters' / character,))
    prep.require(prep.sha(moves) == role['sourceMoves']['sha256'] and manifest['sourceMoves'] == role['sourceMoves'], 'Role move snapshot drift')
    expected = {line['lineId']: line for line in role['lines']}
    jobs = manifest['jobs']
    prep.require(1 <= len(jobs) <= 3 and [job['lineId'] for job in jobs] == manifest['keys'], 'One explicit1..3-request role batch is required')
    prep.require(len(set(manifest['keys'])) == len(jobs) and all(key in expected for key in manifest['keys']), 'Duplicate/foreign line IDs')
    validated = []
    for job in jobs:
        line = expected[job['lineId']]
        request_file = owned_file(path.parent / job['requestFile'], (path.parent / 'requests',))
        prep.require(prep.sha(request_file) == job['requestFileSha256'], 'Prepared request bytes changed')
        request = prep.read(request_file)
        params = line['apiRequest']
        predict = {key: params[key] for key in ('text', 'lang_disp', 'spk_disp', 'instruct')}
        predict['api_name'] = params['apiName']
        prep.require(params['apiName'] == '/run_instruct' and params['lang_disp'] == 'Japanese', 'Only existing Japanese local CustomVoice API')
        prep.require(params['spk_disp'] == role['voiceProfile']['speaker'], 'No alternate speaker fallback')
        prep.require(request['lineId'] == line['lineId'] and request['planRequest'] == params and request['clientPredictKwargs'] == predict, 'Request does not exactly match the bound plan')
        prep.require(request['requestCanonicalSha256'] == job['requestCanonicalSha256'] == prep.canonical_sha(params), 'Exact request SHA mismatch')
        prep.require(request['predictCanonicalSha256'] == prep.canonical_sha(predict), 'Client parameter SHA mismatch')
        prep.require(request['targetMaxDurationSeconds'] == line['targetMaxDurationSeconds'] and request['readingKana'] == line['readingKana'] and request['subtitleZh'] == line['subtitleZh'] and request['trigger'] == line['trigger'], 'Target/reading/subtitle/event drift')
        prep.require(job['endpoint'] == 'http://127.0.0.1:7863' and job.get('reuseCandidate') == line.get('reuseCandidate'), 'Only local endpoint and exact reuse evidence are allowed')
        name = job['futureAudioName']
        prep.require(Path(name).name == name and name.startswith(character + '-' + line['event'] + '-qwen-') and name.endswith('.wav'), 'Unsafe or foreign candidate output name')
        if line.get('reuseCandidate'):
            original = owned_file(line['reuseCandidate']['file'], (BASE.parent,))
            prep.require(prep.sha(original) == line['reuseCandidate']['sha256'], 'Reusable original changed; no automatic regeneration')
        validated.append({'job': job, 'line': line, 'request': request})
    prep.require(prep.sha(OVERLAY) == FROZEN_OVERLAY_SHA, 'Six-role frozen audio overlay changed; reconcile before exporting')
    return path, manifest, validated


def real_gate(certificate: Path | None) -> dict:
    """A queue label alone, a dry run or source-file count cannot release export."""
    queue = prep.read(prep.QUEUE)
    plan = prep.read(prep.PLAN)
    gate = queue.get('gate', {})
    required = set(plan['sourceQueue']['gateSnapshot']['required'])
    errors = []
    if gate.get('status') != 'complete' or gate.get('owner') != 'root':
        errors.append('current six-role queue gate is not root-owned complete')
    if set(gate.get('required', [])) != required or len(required) != 5:
        errors.append('required real acceptance checkpoints changed or are incomplete')
    certificate_sha = None
    if certificate is None:
        errors.append('missing root real-closure certificate; never infer it from prepared jobs')
    else:
        try:
            cert_path = owned_file(certificate, (BASE / 'handoff', BASE / 'acceptance', BASE / 'publish'))
            cert = prep.read(cert_path)
            prep.require(cert.get('schemaVersion') == 1 and cert.get('kind') == GATE_KIND and cert.get('status') == 'complete' and cert.get('owner') == 'root', 'Real gate certificate identity/status is not complete')
            prep.require(Path(cert['sourceRoot']).resolve() == prep.ROOT.resolve(), 'Certificate is for a different workspace')
            prep.require(cert.get('queueSha256') == prep.sha(prep.QUEUE) and cert.get('audioOverlaySha256') == FROZEN_OVERLAY_SHA == prep.sha(OVERLAY), 'Certificate does not bind current queue and frozen audio')
            prep.require(cert.get('realGameAcceptance') is True and cert.get('openBlockingItems') == [], 'Real game acceptance or blocking-item closure missing')
            checks = cert.get('checks', [])
            prep.require(len(checks) == len(required) and {row['id'] for row in checks} == required, 'Certificate must cover all five required checkpoints once')
            for row in checks:
                prep.require(row.get('status') == 'passed' and row.get('verificationClass') == 'real' and row.get('synthetic') is False, 'Candidate/mock/unknown check cannot release generation')
                prep.require(bool(row.get('artifacts')), 'Every acceptance check needs exact real evidence')
                for artifact in row['artifacts']:
                    file = owned_file(artifact['file'], (BASE, prep.ROOT))
                    prep.require(prep.sha(file) == artifact['sha256'], 'Real evidence missing or SHA changed')
            snapshot = cert.get('sourceSnapshot', [])
            prep.require(bool(snapshot), 'Certificate needs the accepted source snapshot, not HEAD alone')
            for row in snapshot:
                file = owned_file(prep.ROOT / row['file'], (prep.ROOT,))
                prep.require(prep.sha(file) == row['sha256'], 'Accepted source snapshot changed')
            certificate_sha = prep.sha(cert_path)
        except (ValueError, KeyError, TypeError, OSError) as error:
            errors.append(str(error))
    return {'satisfied': not errors, 'currentQueueStatus': gate.get('status', 'unknown'),
            'queueSha256': prep.sha(prep.QUEUE), 'certificate': str(certificate) if certificate else None,
            'certificateSha256': certificate_sha, 'errors': errors}


@contextmanager
def serial_export_lock():
    """Windows process lock; the lock file is preserved rather than deleted."""
    import msvcrt
    lock = prep.OUTPUT_ROOT / 'export-serial1017.lock'
    with lock.open('a+b') as handle:
        if handle.tell() == 0:
            handle.write(b'0'); handle.flush()
        handle.seek(0)
        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        try:
            yield
        finally:
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)


def matching_records(folder: Path, prefix: str, line_id: str, request_sha: str) -> list[dict]:
    result = []
    for file in sorted(folder.glob('runs/*/' + prefix + '-*.json')):
        row = prep.read(file)
        if row.get('lineId') == line_id and row.get('requestCanonicalSha256') == request_sha:
            row['_recordFile'] = file.as_posix()
            result.append(row)
    return result


def export(validated: list[dict], batch: Path, output: Path, certificate: Path | None, plan_sha: str) -> list[dict]:
    client = None
    results = []
    for index, item in enumerate(validated, 1):
        gate = real_gate(certificate)
        prep.require(gate['satisfied'], 'Real gate changed: ' + '; '.join(gate['errors']))
        job, line, request = item['job'], item['line'], item['request']
        identity = {'lineId': job['lineId'], 'requestCanonicalSha256': job['requestCanonicalSha256'], 'sourcePlanSha256': plan_sha}
        old = matching_records(batch, 'receipt', job['lineId'], job['requestCanonicalSha256'])
        if old:
            prep.require(len({row['audioSha256'] for row in old}) == 1, 'Conflicting successful exports require manual choice; no silent regeneration')
            row = old[0]
            audio = owned_file(row['audioFile'], (batch / 'runs',))
            prep.require(row['sourcePlanSha256'] == plan_sha and prep.sha(audio) == row['audioSha256'], 'Resumed output missing/changed; preserve and reconcile')
            prep.require(row['timingEligible'] is True, 'Existing over-duration candidate remains blocked; revise explicit input instead of regenerating automatically')
            resumed = {**identity, 'status': 'resumed-existing-export', 'receipt': row['_recordFile'], 'audioFile': str(audio), 'audioSha256': row['audioSha256'], 'generatedThisAttempt': False, 'heard': False, 'adopted': False}
            prep.save(output / f'resumed-{index:02}.json', resumed); results.append(resumed)
            continue
        checkpoints = matching_records(batch, 'source', job['lineId'], job['requestCanonicalSha256'])
        if checkpoints:
            prep.require(len({row['sourceSha256'] for row in checkpoints}) == 1, 'Conflicting source checkpoints; inspect original evidence')
            source_record = checkpoints[0]
            source = owned_file(source_record['sourceFile'], (BASE.parent, CACHE))
            prep.require(source_record['sourcePlanSha256'] == plan_sha and prep.sha(source) == source_record['sourceSha256'], 'Known returned source changed/missing; do not rerun TTS')
            origin = 'resumed-source-checkpoint'
        elif line.get('reuseCandidate'):
            source = owned_file(line['reuseCandidate']['file'], (BASE.parent,))
            prep.require(prep.sha(source) == line['reuseCandidate']['sha256'], 'Reviewed reuse bytes changed')
            origin = 'existing-reviewed-reuse-candidate'
        else:
            pending = matching_records(batch, 'submitted', job['lineId'], job['requestCanonicalSha256'])
            prep.require(not pending, 'Prior submitted request has no returned-source checkpoint; inspect local queue/cache before any manual retry, never duplicate automatically')
            # Deferred import/call: dry runs and blocked gates never connect or invoke inference.
            if client is None:
                from gradio_client import Client
                client = Client('http://127.0.0.1:7863', download_files=False)
            prep.save(output / f'submitted-{index:02}.json', {**identity, 'submittedAtUtc': now(), 'predictCanonicalSha256': request['predictCanonicalSha256']})
            response = client.predict(**request['clientPredictKwargs'])
            prep.save(output / f'response-{index:02}.json', {**identity, 'receivedAtUtc': now(), 'response': response})
            prep.require(isinstance(response, (list, tuple)) and len(response) == 2, 'Unexpected local response; retain it and stop')
            result, status = response
            prep.require(isinstance(status, str) and 'Finished' in status, 'Local queue did not report Finished')
            source = owned_file(result['path'] if isinstance(result, dict) else result, (CACHE,))
            prep.require(source.suffix.lower() == '.wav', 'Unexpected source format; no conversion/fallback')
            origin = 'local-customvoice-new-candidate'
        source_record = {**identity, 'sourceFile': source.as_posix(), 'sourceSha256': prep.sha(source), 'sourceBytes': source.stat().st_size, 'origin': origin, 'recordedAtUtc': now()}
        prep.save(output / f'source-{index:02}.json', source_record)
        target = output / job['futureAudioName']
        prep.require(not target.exists(), 'Never overwrite a prior output')
        shutil.copy2(source, target)
        prep.require(prep.sha(target) == source_record['sourceSha256'], 'Copied original bytes differ')
        import soundfile as sf
        info = sf.info(target)
        prep.require(info.frames > 0 and info.samplerate > 0, 'No valid returned audio frames')
        eligible = info.duration <= line['targetMaxDurationSeconds']
        receipt = {**identity, 'status': 'exported-candidate-not-heard-or-adopted', 'sourceFile': str(source), 'audioFile': target.as_posix(), 'audioSha256': prep.sha(target),
                   'bytes': target.stat().st_size, 'durationSeconds': info.duration, 'sampleRate': info.samplerate, 'channels': info.channels,
                   'targetMaxDurationSeconds': line['targetMaxDurationSeconds'], 'timingEligible': eligible, 'origin': origin,
                   'generatedThisAttempt': origin == 'local-customvoice-new-candidate', 'gateCertificateSha256': gate['certificateSha256'],
                   'heard': False, 'adopted': False, 'sourceUnprocessed': True, 'metadataIsNotAuditoryAcceptance': True}
        prep.save(output / f'receipt-{index:02}.json', receipt); results.append(receipt)
        prep.require(eligible, 'Candidate exceeds its planned window; raw original retained, no trim/speed/core change and no expansion')
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jobs', required=True, type=Path)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true', help='Default: validate only, no local service/model import')
    mode.add_argument('--execute', action='store_true', help='Explicitly consume <=3 requests only after verified real gate')
    parser.add_argument('--gate-certificate', type=Path, help='Root real-acceptance evidence receipt; required for execute')
    args = parser.parse_args()
    prep.require(prep.ROOT.resolve() == prep.EXPECTED_ROOT.resolve() and sys.dont_write_bytecode, 'Use D workspace with Python -B')
    prep.require(Path(sys.prefix).resolve().is_relative_to(prep.ENVIRONMENT.resolve()) and Path(os.environ.get('TEMP', '')).drive.upper() == 'D:', 'Use existing D TTS environment via run-d1013.ps1')
    jobs_path, manifest, validated = validate_jobs(args.jobs)
    gate = real_gate(args.gate_certificate)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    runs = jobs_path.parent / 'runs'; runs.mkdir(exist_ok=True)
    if not (runs / 'README.md').exists():
        (runs / 'README.md').write_text('# Preserved per-attempt validation and exports1017\nNo deletion/overwrite. Dry runs never import/connect TTS. Actual exports need explicit execute plus root real gate/evidence SHA. Source/submit checkpoints prevent duplicate automatic generation.\n', encoding='utf-8')
    output = runs / (stamp + ('-execute' if args.execute else '-dry-run')); output.mkdir()
    (output / 'README.md').write_text('# Exact request attempt, not adoption\nPreserve input/gate validation, returned sources, unprocessed WAVs and partial failure. No runtime/voice-table writes, actor identity claim or auditory acceptance.\n', encoding='utf-8')
    report = {'schemaVersion': 1, 'kind': 'controlled-roster-dialogue-export', 'observedAtUtc': now(), 'mode': 'execute' if args.execute else 'dry-run',
              'jobsFile': jobs_path.as_posix(), 'jobsFileSha256': prep.sha(jobs_path), 'sourcePlanSha256': prep.sha(prep.PLAN),
              'exporterFile': str(Path(__file__).relative_to(prep.ROOT)), 'exporterSha256': prep.sha(Path(__file__)),
              'selected': manifest['keys'], 'requestsValidated': len(validated), 'gate': gate,
              'serviceConnected': False, 'newAudioGenerated': 0, 'heard': False, 'adopted': False, 'runtimeModified': False, 'results': []}
    prep.save(output / 'validation.json', report)
    if not args.execute:
        print(json.dumps({'output': str(output), 'mode': 'dry-run', 'requestsValidated': len(validated), 'gateSatisfied': gate['satisfied'], 'executionBlocked': not gate['satisfied'], 'gateErrors': gate['errors'], 'serviceConnected': False, 'modelLoads': 0, 'audioGenerated': 0, 'adopted': False}, ensure_ascii=False))
        return
    entered_export = False
    try:
        prep.require(gate['satisfied'], 'Actual export blocked: ' + '; '.join(gate['errors']))
        with serial_export_lock():
            entered_export = True
            results = export(validated, jobs_path.parent, output, args.gate_certificate, manifest['sourcePlan']['sha256'])
        report['results'] = results
        report['newAudioGenerated'] = sum(row.get('generatedThisAttempt', False) for row in results)
        report['serviceConnected'] = report['newAudioGenerated'] > 0
        prep.save(output / 'completed.json', report)
        print(json.dumps({'output': str(output), 'candidateResults': len(results), 'newAudioGenerated': report['newAudioGenerated'], 'heard': False, 'adopted': False}, ensure_ascii=False))
    except Exception as error:
        prep.save(output / 'failure.json', {**report, 'serviceConnected': None if entered_export else False,
                  'newAudioGenerated': None if entered_export else 0, 'errorType': type(error).__name__, 'error': str(error),
                  'note': 'Partial submit/source/receipt files preserved; no automatic retry, cleanup or adoption. Null counters mean unknown on partial failure; inspect exact per-job records, never interpret them as zero.'})
        raise


if __name__ == '__main__':
    main()
