"""Fresh cached-model identity and bounded local resource checks; no model load."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
import time

PROJECT = Path(__file__).resolve().parents[1]
QA_ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()
MODEL_ROOT = QA_ROOT / 'models/qwen25-omni3b'
PRODUCTION_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/remaining-roster1004').resolve()
BUDGET_ROOT = PRODUCTION_ROOT / 'resource-budget1008'
REVISION = 'f75b40e3da2003cdd6e1829b1f420ca70797c34e'
GIB = 1024 ** 3
DISK_RESERVE = 2 * GIB
CACHE_LIMIT = 256 * 1024 ** 2
EVIDENCE_LIMIT = 8 * 1024 ** 2
AUDIT_LIMIT = 64 * 1024 ** 2
ALL_EVIDENCE_LIMIT = 64 * 1024 ** 2


def sha_file(path):
    value = hashlib.sha256()
    with path.open('rb') as handle:
        while block := handle.read(1024 ** 2):
            value.update(block)
    return value.hexdigest()


def tree_bytes(path):
    return sum(item.stat().st_size for item in path.rglob('*') if item.is_file())


def model_stat(path):
    info = path.stat()
    return {'bytes': info.st_size, 'mtimeNs': info.st_mtime_ns}


def weight_groups():
    index = json.loads((MODEL_ROOT / 'model.safetensors.index.json').read_bytes())
    groups = {}
    for shard in set(index['weight_map'].values()):
        path = (MODEL_ROOT / shard).resolve()
        if not path.is_relative_to(MODEL_ROOT):
            raise ValueError('Checkpoint shard escaped the fixed model root')
        with path.open('rb') as handle:
            length = struct.unpack('<Q', handle.read(8))[0]
            if length > 4 * 1024 ** 2:
                raise ValueError('Unexpected safetensors header length')
            header = json.loads(handle.read(length))
        for name, tensor in header.items():
            if not name.startswith('thinker.'):
                continue
            if tensor['dtype'] != 'BF16':
                raise ValueError('Require the original full BF16 thinker')
            stored = tensor['data_offsets'][1] - tensor['data_offsets'][0]
            for key in ('thinker', '.'.join(name.split('.')[:2])):
                groups[key] = groups.get(key, 0) + stored
    return groups


def snapshot():
    import psutil
    data = {'observedAtUtc': datetime.now(timezone.utc).isoformat(),
            'CfreeBytes': shutil.disk_usage('C:/').free,
            'DfreeBytes': shutil.disk_usage('D:/').free,
            'availablePhysicalMemoryBytes': psutil.virtual_memory().available,
            'totalPhysicalMemoryBytes': psutil.virtual_memory().total}
    gpu = subprocess.run(['nvidia-smi', '--query-gpu=memory.free,memory.total',
                          '--format=csv,noheader,nounits'], capture_output=True, text=True,
                         timeout=10, check=True)
    values = gpu.stdout.strip().splitlines()[0].split(',')
    data.update(freeGpuBytes=int(values[0]) * 1024 ** 2, totalGpuBytes=int(values[1]) * 1024 ** 2)
    return data


def write_new(path, value):
    encoded = value if isinstance(value, bytes) else (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if tree_bytes(BUDGET_ROOT) + len(encoded) > AUDIT_LIMIT:
        raise RuntimeError('The 64 MiB audit/source preservation budget is exhausted')
    with path.open('xb') as handle:
        handle.write(encoded)


def fresh_audit():
    receipt_path = QA_ROOT / 'evidence/model-download-after1003.json'
    receipt = json.loads(receipt_path.read_bytes())
    if (receipt.get('model') != 'Qwen/Qwen2.5-Omni-3B' or receipt.get('revision') != REVISION
            or receipt.get('allOfficialIdentitiesVerified') is not True or len(receipt['files']) != 17):
        raise ValueError('Require the complete fixed-revision original official identity receipt')
    folder = BUDGET_ROOT / 'audit' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    folder.mkdir(parents=True)
    write_new(folder / 'README.md', b'# Fresh cached-only identity/resource audit1008\nFull SHA of all 17 existing official files; no download, copies, model load or original audio upload. Preserve old partial shards and cache. This proof only permits the documented <=3-clip GPU6 plus CPU no-disk entry while stat identities remain unchanged.\n')
    before = snapshot()
    verified = []
    for row in receipt['files']:
        path = (MODEL_ROOT / row['file']).resolve()
        if not path.is_relative_to(MODEL_ROOT) or not path.is_file():
            raise ValueError('Official model file missing or outside its root')
        stat = model_stat(path)
        actual_sha = sha_file(path)
        if stat['bytes'] != row['bytes'] or actual_sha != row['sha256'] or model_stat(path) != stat:
            raise ValueError('Existing official model identity changed: ' + row['file'])
        verified.append({'file': row['file'], **stat, 'sha256': actual_sha})
        print(json.dumps({'status': 'cached-model-file-sha-verified', 'file': row['file'], 'bytes': stat['bytes']}), flush=True)
    cache = tree_bytes(QA_ROOT / 'cache')
    after = snapshot()
    proof = {'schema': 'fresh-cached-no-disk1008', 'verifiedAtUtc': datetime.now(timezone.utc).isoformat(),
             'model': receipt['model'], 'revision': REVISION, 'allFreshShaMatched': True,
             'officialReceiptSha256': sha_file(receipt_path), 'files': verified,
             'totalOfficialFileBytes': sum(row['bytes'] for row in verified),
             'weightGroupsBytes': weight_groups(), 'cacheBaselineBytes': cache,
             'budgets': {'DgameReserveBytes': DISK_RESERVE, 'CreserveBytes': DISK_RESERVE,
                         'cacheIncrementBytes': CACHE_LIMIT, 'perProcessEvidenceBytes': EVIDENCE_LIMIT,
                         'auditAndSourceBytes': AUDIT_LIMIT, 'all1008EvidenceBytes': ALL_EVIDENCE_LIMIT},
             'before': before, 'after': after, 'modelLoaded': False, 'audioUploads': 0,
             'newModelDownloadBytes': 0, 'diskOffloadBytes': 0, 'formalAdopted': 0}
    path = folder / 'cache-verified1008.json'
    write_new(path, proof)
    print(json.dumps({'status': 'fresh-cache-identity-complete', 'receipt': str(path),
                      'officialBytes': proof['totalOfficialFileBytes'], 'resource': after}, ensure_ascii=False), flush=True)
    return path


def verify_certificate(path):
    path = path.resolve()
    if not path.is_relative_to(BUDGET_ROOT / 'audit'):
        raise ValueError('Use the new independent audit certificate, not another model path')
    value = json.loads(path.read_bytes())
    age = time.time() - datetime.fromisoformat(value['verifiedAtUtc']).timestamp()
    if (value.get('schema') != 'fresh-cached-no-disk1008' or value.get('revision') != REVISION
            or value.get('allFreshShaMatched') is not True or not 0 <= age <= 6 * 3600):
        raise ValueError('Require fresh complete SHA identity proof from the last six hours')
    receipt_path = QA_ROOT / 'evidence/model-download-after1003.json'
    if sha_file(receipt_path) != value['officialReceiptSha256']:
        raise ValueError('Original official model receipt changed after the audit')
    original = json.loads(receipt_path.read_bytes())
    expected = {row['file']: row for row in original['files']}
    if len(value['files']) != 17 or {row['file'] for row in value['files']} != set(expected):
        raise ValueError('Cached proof must cover all official files exactly once')
    for row in value['files']:
        source = (MODEL_ROOT / row['file']).resolve()
        if (not source.is_relative_to(MODEL_ROOT) or row['sha256'] != expected[row['file']]['sha256']
                or model_stat(source) != {key: row[key] for key in ('bytes', 'mtimeNs')}):
            raise ValueError('Cached model changed since its fresh SHA proof: ' + row['file'])
    return value


def disk_budget(proof, evidence_folder=None):
    current_cache = tree_bytes(QA_ROOT / 'cache')
    cache_delta = current_cache - proof['cacheBaselineBytes']
    if cache_delta < 0:
        raise RuntimeError('Existing cache was removed; do not silently reuse this audit')
    evidence = sum(tree_bytes(folder) for folder in (PRODUCTION_ROOT / 'validation').glob('native-local-remaining-gpu6g1008-*'))
    audit = tree_bytes(BUDGET_ROOT)
    current_evidence = tree_bytes(evidence_folder) if evidence_folder else 0
    remaining = max(0, CACHE_LIMIT - cache_delta) + max(0, EVIDENCE_LIMIT - current_evidence) + max(0, AUDIT_LIMIT - audit)
    data = {'DfreeBytes': shutil.disk_usage('D:/').free, 'CfreeBytes': shutil.disk_usage('C:/').free,
            'cacheIncrementBytes': cache_delta, 'currentProcessEvidenceBytes': current_evidence,
            'all1008EvidenceBytes': evidence, 'auditAndSourceBytes': audit,
            'minimumDfreeBytes': DISK_RESERVE + remaining, 'minimumCfreeBytes': DISK_RESERVE,
            'cacheIncrementLimitBytes': CACHE_LIMIT, 'processEvidenceLimitBytes': EVIDENCE_LIMIT}
    data['passed'] = (cache_delta <= CACHE_LIMIT and current_evidence <= EVIDENCE_LIMIT
                      and evidence <= ALL_EVIDENCE_LIMIT and audit <= AUDIT_LIMIT
                      and data['DfreeBytes'] >= data['minimumDfreeBytes']
                      and data['CfreeBytes'] >= DISK_RESERVE)
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audit', action='store_true', help='Fresh full SHA audit, never load any model')
    parser.add_argument('--receipt', type=Path, help='Verify an existing fresh certificate and current disk budget')
    args = parser.parse_args()
    if args.audit == bool(args.receipt):
        parser.error('Choose either --audit or --receipt')
    if args.audit:
        fresh_audit()
    else:
        proof = verify_certificate(args.receipt)
        print(json.dumps({'cacheVerified': True, 'diskBudget': disk_budget(proof), 'resource': snapshot(),
                          'weightGroupsBytes': proof['weightGroupsBytes'], 'modelLoaded': False}, ensure_ascii=False, indent=2))
