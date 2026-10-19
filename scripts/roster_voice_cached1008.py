"""One to three exact remaining-roster clips using the freshly verified cached GPU6/no-disk route."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import threading
import time

if not sys.dont_write_bytecode:
    raise RuntimeError('Run this cached-only entry with -B before importing local QA modules')

from roster_voice_resources1008 import (QA_ROOT, PRODUCTION_ROOT, GIB, DISK_RESERVE, EVIDENCE_LIMIT,
                                       ALL_EVIDENCE_LIMIT, disk_budget, sha_file, snapshot, tree_bytes,
                                       verify_certificate)


def module(filename, name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def chosen_rows(batch_id, indices):
    if not 1 <= len(indices) <= 3 or len(indices) != len(set(indices)):
        raise ValueError('Explicitly choose one to three distinct prepared indices per process')
    remaining = module('roster_voice_runtime1003.qa_remaining1004.py', 'remaining_exact')
    rows, provenance = remaining.load_batch(batch_id)
    chosen = [row for row in rows if row['index'] in indices]
    if {row['index'] for row in chosen} != set(indices):
        raise ValueError('Each selected index must belong to the supplied original batch')
    catalog = json.loads(remaining.CATALOG.read_bytes())
    if any(row.get('nativeAudioResponseProduced') for row in catalog['files'] if row['index'] in indices):
        raise ValueError('Do not rerun unchanged previously reviewed or ambiguous audio')
    provenance.update(selectedIndices=indices, actualMoveCount=len(chosen), actualClipCount=len(chosen),
                      originalPreparedBatchClipCount=len(rows), resourcePolicy='cached-no-disk1008')
    return chosen, provenance


def preflight(proof):
    resource = snapshot()
    disk = disk_budget(proof)
    cpu_guide = max(0, proof['weightGroupsBytes']['thinker'] - 6 * GIB + proof['weightGroupsBytes']['thinker.lm_head'])
    data = {**resource, 'diskBudget': disk, 'gpuResidentBudgetBytes': 6 * GIB,
            'minimumFreeGpuBytes': 6 * GIB + 600_000_000,
            'cpuWeightPlacementGuideBytes': cpu_guide,
            'minimumAvailablePhysicalMemoryBytes': max(cpu_guide + 2 * GIB, 16_333_516_800 + 2 * GIB),
            'observed1008ProcessPeakPrivateBytes': 16_333_516_800,
            'observed1008ProcessPeakWorkingSetBytes': 10_587_197_440,
            'physicalRamBasis': 'The real1008 single trial exhausted physical headroom despite a smaller resident-weight guide. Cover its measured private allocation peak plus 2 GiB; forward execution cannot be interrupted mid-token.',
            'fullCpuNoDiskAssessmentMinimumBytes': proof['weightGroupsBytes']['thinker'] + 512 * 1024 ** 2 + 2 * GIB,
            'cpuTrialAuthorizedHere': False, 'oldCpuDllFailurePreserved': True,
            'modelLoaded': False, 'audioUploads': 0, 'diskOffloadUsed': False}
    data['passed'] = (disk['passed'] and resource['freeGpuBytes'] >= data['minimumFreeGpuBytes']
                      and resource['availablePhysicalMemoryBytes'] >= data['minimumAvailablePhysicalMemoryBytes'])
    return data


def run(receipt, batch_id, indices, resources_released=False):
    if (not sys.dont_write_bytecode or sys.prefix == sys.base_prefix
            or Path(sys.prefix).resolve() != QA_ROOT / 'environment'):
        raise RuntimeError('Use the existing isolated Python with -B; no installation or bytecode writes')
    proof = verify_certificate(receipt)
    rows, provenance = chosen_rows(batch_id, indices)
    before = preflight(proof)
    if not resources_released or not before['passed']:
        print(json.dumps({'status': 'not-loaded-waiting-resource-release' if not resources_released else 'not-loaded-resource-preflight-failed',
                          'selectedIndices': indices, 'preflight': before}, ensure_ascii=False, indent=2), flush=True)
        return None
    batch = module('roster_voice_runtime1003.qa_batch.py', 'existing_gpu6_native')
    single = module('roster_voice_runtime1003.qa_infer.py', 'existing_native_prompt')
    single.setup_paths()
    os.environ.update(CUDA_CACHE_MAXSIZE=str(32 * 1024 ** 2),
                      TORCH_EXTENSIONS_DIR=str(QA_ROOT / 'cache/torch'),
                      NUMBA_CACHE_DIR=str(QA_ROOT / 'cache/torch'), TOKENIZERS_PARALLELISM='false')
    folder = PRODUCTION_ROOT / 'validation' / ('native-local-remaining-gpu6g1008-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    folder.mkdir()

    def save(path, value):
        if not path.resolve().is_relative_to(folder):
            raise ValueError('New review evidence escaped this independent process folder')
        raw = value if isinstance(value, bytes) else (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
        used = tree_bytes(folder)
        all_used = sum(tree_bytes(item) for item in folder.parent.glob('native-local-remaining-gpu6g1008-*'))
        if used + len(raw) > EVIDENCE_LIMIT or all_used + len(raw) > ALL_EVIDENCE_LIMIT:
            raise RuntimeError('Bounded native evidence byte budget exceeded; no further writes')
        with path.open('xb') as handle:
            handle.write(raw)

    batch.save = save
    save(folder / 'README.md', b'# Cached GPU6 no-disk exact native review1008\nOne to three predeclared original synthetic clips, separate blind conversations, complete verified cached BF16 model. No actor upload, download, quantization, disk offload, transcript hints, game adoption or human audition claim. Exact numbered copies retain candidate/PCM identities. Old catalog and evidence remain unchanged. Bounded per-process evidence 8 MiB; cache increment 256 MiB; C/D reserves each 2 GiB.\n')
    save(folder / 'cache-and-resource-before.json', {'cacheReceipt': str(receipt.resolve()), 'cacheReceiptSha256': sha_file(receipt),
                                                   'preflight': before, 'provenance': provenance})
    blind = folder / 'blind-inputs'
    blind.mkdir()
    save(blind / 'README.md', b'# Numbered exact-byte blind copies\nNo character, event, expected transcript or preset enters the model filename/text. Prepared original SHA and PCM remain unchanged.\n')
    copies = [{'index': row['index'], 'source': row['audio'], 'target': str(blind / f"sound-{row['index']:03}.wav"),
               'bytes': Path(row['audio']).stat().st_size, 'sha256': row['audioSha256']} for row in rows]
    save(folder / 'blind-copy-before.json', copies)
    for row, copy in zip(rows, copies):
        save(Path(copy['target']), Path(copy['source']).read_bytes())
        if sha_file(Path(copy['target'])) != copy['sha256']:
            raise ValueError('Blind copy bytes changed')
        row.update(exactPreparedFile=row['audio'], audio=copy['target'], runtimeFile=None, runtimeCopied=False)
    save(folder / 'blind-copy-after.json', copies)
    save(folder / 'inventory-before.json', {'clips': rows, 'requested': len(rows), 'firstTrialIndex': rows[0]['index'],
                                           'expectedTranscriptProvided': False, 'audioUploads': 0, 'formalAdopted': 0,
                                           'resourcePolicy': 'cached-no-disk1008', 'gpuBudgetGiB': 6})
    print(json.dumps({'status': 'bounded-cached-native-start', 'selectedIndices': indices, 'recordDir': str(folder)}, ensure_ascii=False), flush=True)
    import psutil
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError('Actual CUDA unavailable')
    free_gpu, _ = torch.cuda.mem_get_info()
    if free_gpu < before['minimumFreeGpuBytes'] or psutil.virtual_memory().available < before['minimumAvailablePhysicalMemoryBytes']:
        save(folder / 'resource-stop.json', {'status': 'not-loaded-resource-changed-before-load', 'modelLoaded': False})
        return folder
    process = psutil.Process()
    state = {'phase': 'model-loading', 'index': None, 'started': time.monotonic(), 'stop': False}
    done = threading.Event()
    latest_disk = [disk_budget(proof, folder)]
    next_check = [time.monotonic()]

    def resource_snapshot():
        free, _ = torch.cuda.mem_get_info()
        memory = process.memory_info()
        return {'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'phase': state['phase'], 'index': state['index'],
                'elapsedSeconds': time.monotonic() - state['started'], 'freeGpuBytes': free,
                'availablePhysicalMemoryBytes': psutil.virtual_memory().available,
                'processRssBytes': memory.rss, 'processPrivateBytes': getattr(memory, 'private', None),
                'processPeakWorkingSetBytes': getattr(memory, 'peak_wset', None)}

    def guard():
        current = resource_snapshot()
        if (current['availablePhysicalMemoryBytes'] < 2 * GIB or current['freeGpuBytes'] < 256 * 1024 ** 2
                or shutil.disk_usage('D:/').free < DISK_RESERVE or shutil.disk_usage('C:/').free < DISK_RESERVE):
            state['stop'] = True
        if time.monotonic() >= next_check[0]:
            latest_disk[0] = disk_budget(proof, folder)
            next_check[0] = time.monotonic() + 10
            if not latest_disk[0]['passed']:
                state['stop'] = True
        return state['stop']

    state['cachedBudgetGuard'] = guard

    def heartbeat():
        count = 0
        while not done.wait(25):
            guard()
            count += 1
            current = resource_snapshot()
            save(folder / f'progress-{count:03}.json', {**current, 'diskBudget': latest_disk[0], 'resourceStop': state['stop']})
            print(json.dumps({'status': 'bounded-native-progress', **current, 'resourceStop': state['stop']}), flush=True)

    watcher = threading.Thread(target=heartbeat, daemon=True)
    watcher.start()
    exit_kind = 'finished'
    try:
        torch.cuda.reset_peak_memory_stats()
        batch.run_native_batch(folder, rows, single, 6, psutil.virtual_memory().available - 2 * GIB, state, resource_snapshot)
    except (Exception, SystemExit) as error:
        exit_kind = 'stopped-or-failed'
        save(folder / 'batch-failure1008.json', {'status': 'native-process-incomplete-not-adopted',
                                              'errorKind': type(error).__name__, 'error': str(error),
                                              'modelResponseIsNotHumanAudition': True, 'formalAdopted': 0})
        print(json.dumps({'status': exit_kind, 'errorKind': type(error).__name__, 'error': str(error)}), flush=True)
    finally:
        done.set()
        watcher.join(timeout=3)
        after = {'exitKind': exit_kind, 'resource': resource_snapshot(), 'diskBudget': disk_budget(proof, folder),
                 'cacheReceiptStillValid': verify_certificate(receipt)['allFreshShaMatched'],
                 'audioUploads': 0, 'formalAdopted': 0}
        save(folder / 'cache-and-resource-after.json', after)
        print(json.dumps({'status': 'bounded-native-process-ending', 'recordDir': str(folder), 'after': after}, ensure_ascii=False), flush=True)
    return folder


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--batch-id', required=True)
    parser.add_argument('--indices', required=True, help='One to three explicit comma-separated original indices')
    parser.add_argument('--resources-released', action='store_true', help='Only after root explicitly hands over the game resource slot')
    args = parser.parse_args()
    selected = [int(value) for value in args.indices.split(',')]
    result_folder = run(args.receipt, args.batch_id, selected, args.resources_released)
    if args.resources_released:
        if result_folder is None or not (result_folder / 'batch-summary.json').is_file():
            raise SystemExit(1)
        summary = json.loads((result_folder / 'batch-summary.json').read_bytes())
        after = json.loads((result_folder / 'cache-and-resource-after.json').read_bytes())
        if summary['completed'] != len(selected) or not after['diskBudget']['passed']:
            raise SystemExit(1)
