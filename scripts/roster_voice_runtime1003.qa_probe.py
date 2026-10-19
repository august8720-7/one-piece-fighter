"""Record official native-audio model metadata and local constraints; no weights/install/uploads."""
from pathlib import Path
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import urllib.request

ALLOWED = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice').resolve()
MODELS = ('nvidia/audio-flamingo-2', 'nvidia/audio-flamingo-2-0.5B', 'Qwen/Qwen2-Audio-7B-Instruct', 'Qwen/Qwen2.5-Omni-3B')

def fetch(url):
    with urllib.request.urlopen(url, timeout=20) as response: return response.read()

def inspect(model):
    api = f'https://huggingface.co/api/models/{model}?blobs=true'
    raw = fetch(api)
    value = json.loads(raw)
    weights = [{'file': row['rfilename'], 'bytes': row.get('size'), 'lfs': row.get('lfs')}
        for row in value.get('siblings', []) if row['rfilename'].endswith(('.safetensors', '.bin', '.pt', '.pth'))]
    urls = {'README.md': f'https://huggingface.co/{model}/resolve/main/README.md'}
    names = {row['rfilename'] for row in value.get('siblings', [])}
    for name in ('LICENSE', 'LICENSE.md', 'config.json'):
        if name in names: urls[name] = f'https://huggingface.co/{model}/resolve/main/{name}'
    files, receipts = {'metadata.json': raw}, [{'file': 'metadata.json', 'url': api, 'sha256': hashlib.sha256(raw).hexdigest()}]
    for name, url in urls.items():
        try:
            data = fetch(url); files[name] = data
            receipts.append({'file': name, 'url': url, 'sha256': hashlib.sha256(data).hexdigest()})
        except Exception as error: receipts.append({'file': name, 'url': url, 'error': str(error)})
    return {'id': model, 'gated': value.get('gated'), 'metadataLicense': value.get('cardData', {}).get('license'),
        'weightBytes': sum(row['bytes'] or 0 for row in weights), 'weights': weights, 'weightLimitBytes': 7_000_000_000,
        'withinAuthorizedWeightLimit': sum(row['bytes'] or 0 for row in weights) <= 7_000_000_000,
        'nativeInferenceTested': False, 'receipts': receipts}, files

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record-dir', type=Path, required=True)
    args = parser.parse_args()
    folder = args.record_dir.resolve()
    if not folder.is_relative_to(ALLOWED) or folder == ALLOWED or folder.exists(): raise SystemExit('New child of declared D:/ audio evidence root required')
    folder.mkdir()
    (folder / 'README.md').write_text('# Native audio QA feasibility1003\nOfficial model metadata, license/README and local hardware/runtime evidence only. No model weights downloaded, environment installed, audio transmitted or native inference claimed. Preserve all receipts.\n', encoding='utf-8')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results = list(pool.map(inspect, MODELS))
    records = []
    for record, files in results:
        target = folder / record['id'].replace('/', '--')
        target.mkdir()
        (target / 'README.txt').write_text('Public official model metadata and card/license copies. Source URLs/SHA256 in model-review.json. No weight files.\n', encoding='utf-8')
        for name, data in files.items(): (target / name).write_bytes(data)
        (target / 'model-review.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        records.append(record)
    probe = """import importlib.metadata as m
import json
import sys
r = {'python': sys.version}
for n in ['torch', 'transformers', 'torchaudio', 'accelerate']:
    try: r[n] = m.version(n)
    except m.PackageNotFoundError: r[n] = None
print(json.dumps(r))
"""
    # Query known installed interpreters directly, without activating/changing PATH.
    local = {}
    for label, python in [('default', 'python'), ('asr', 'D:/one-piece-fighter-crossover-0922/tools/asr-0925/.venv/Scripts/python.exe')]:
        response = subprocess.run([python, '-c', probe], capture_output=True, text=True, encoding='utf-8')
        local[label] = {'exitCode': response.returncode, 'stdout': response.stdout, 'stderr': response.stderr}
    gpu = subprocess.run(['C:/Windows/System32/nvidia-smi.exe', '--query-gpu=name,memory.total,driver_version', '--format=csv,noheader'], capture_output=True, text=True, encoding='utf-8')
    local['gpu'] = {'exitCode': gpu.returncode, 'stdout': gpu.stdout, 'stderr': gpu.stderr}
    summary = {'scope': 'read-only local and official metadata feasibility', 'local': local, 'models': records,
        'decision': 'No evaluated official full bundle fits authorized 7 GB weight download limit; no install/download/inference undertaken.',
        'unverified': ['native inference on Windows', 'actual native content/noise/truncation review'], 'audioUploads': 0, 'weightDownloads': 0, 'globalChanges': 0}
    (folder / 'feasibility1003.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'recordDir': str(folder), 'models': [{'id': row['id'], 'weightBytes': row['weightBytes'], 'withinLimit': row['withinAuthorizedWeightLimit']} for row in records], 'gpu': local['gpu']}))
