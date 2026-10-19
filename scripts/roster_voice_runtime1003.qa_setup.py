"""Create an isolated D:/ native-audio QA environment; no global/default Python changes."""
from pathlib import Path
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
import shutil
import subprocess
import urllib.request

QA_ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()
PYTHON = Path('C:/Users/august/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe')
MODEL = 'Qwen/Qwen2.5-Omni-3B'
METADATA = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/native-model-eval1003/Qwen--Qwen2.5-Omni-3B/metadata.json')

def write_new(path, data):
    with path.open('xb') as handle: handle.write(data)

def encoded(value): return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')

def env():
    settings = os.environ.copy()
    settings.update(TEMP=str(QA_ROOT/'cache/tmp'), TMP=str(QA_ROOT/'cache/tmp'), HF_HOME=str(QA_ROOT/'cache/huggingface'),
        TORCH_HOME=str(QA_ROOT/'cache/torch'), PIP_CACHE_DIR=str(QA_ROOT/'cache/pip'), PIP_CONFIG_FILE=os.devnull,
        HF_HUB_DISABLE_IMPLICIT_TOKEN='1', HF_HUB_DISABLE_XET='1', PYTHONPYCACHEPREFIX=str(QA_ROOT/'cache/pyc'),
        CUDA_CACHE_PATH=str(QA_ROOT/'cache/cuda'), TRITON_CACHE_DIR=str(QA_ROOT/'cache/triton'))
    settings.pop('PIP_EXTRA_INDEX_URL', None)
    return settings

def run(command, label):
    if shutil.disk_usage('D:/').free < 15_000_000_000: raise RuntimeError('D:/ below mandatory 15 GB game reserve')
    log = QA_ROOT/'evidence'/f'{label}.log'
    if log.exists(): raise FileExistsError('Preserve prior environment logs; use a new label')
    with log.open('w', encoding='utf-8') as output:
        result = subprocess.run(command, env=env(), stdout=output, stderr=subprocess.STDOUT)
    if result.returncode: raise RuntimeError(f'{label} failed with exit {result.returncode}; see {log}')

def prepare():
    if QA_ROOT.exists(): raise FileExistsError('Native QA root already exists; preserve it')
    # Reuse the just-fetched official frozen metadata instead of repeating a
    # flaky network request before any environment files exist.
    raw = METADATA.read_bytes()
    receipts = json.loads((METADATA.parent/'model-review.json').read_text(encoding='utf-8'))['receipts']
    expected = next(row['sha256'] for row in receipts if row['file']=='metadata.json')
    if hashlib.sha256(raw).hexdigest() != expected: raise ValueError('Official metadata receipt changed')
    metadata = json.loads(raw)
    if metadata.get('id') != MODEL or metadata.get('gated') is not False: raise ValueError('Unexpected or gated model identity')
    model_bytes = sum(row.get('size', 0) for row in metadata['siblings'])
    free = shutil.disk_usage('D:/').free
    # Work budgets, not measured installed dependency sizes. Metadata-derived
    # model bytes are exact; the game reserve is the parent's stated constraint.
    plan = {'observedAtUtc':datetime.now(timezone.utc).isoformat(),'model':MODEL,'revision':metadata['sha'],
        'officialMetadataUrl':'https://huggingface.co/api/models/'+MODEL+'?blobs=true', 'officialMetadataSha256':hashlib.sha256(raw).hexdigest(),
        'modelRepositoryBytes':model_bytes,'weightBytes':sum(row.get('size',0) for row in metadata['siblings'] if row['rfilename'].endswith(('.safetensors','.pt'))),
        'actualDiskFreeBytes':free,'plannedEnvironmentAndPipCacheReserveBytes':8_000_000_000,
        'plannedTemporaryPeakReserveBytes':3_000_000_000,'mandatoryGameReserveBytes':15_000_000_000,
        'remainingAfterPlanningReservesBytes':free-model_bytes-8_000_000_000-3_000_000_000,
        'license':'Qwen Research License: local noncommercial research/evaluation only; no model redistribution or service',
        'scope':'One original synthetic WAV native QA trial first; no original actor audio sent; inference local only',
        'priorSevenGbCriterion':'Earlier agent working suggestion, superseded by the parent current ~12 GB official bundle decision'}
    if plan['remainingAfterPlanningReservesBytes'] < plan['mandatoryGameReserveBytes']: raise RuntimeError('Space budget cannot preserve 15 GB for game outputs')
    QA_ROOT.mkdir()
    write_new(QA_ROOT/'README.md', b'# Isolated native audio QA1003\nD:/ only: environment/ Python virtual environment; models/ official Qwen package; cache/ pip/temp/HF/torch; evidence/ immutable probes/download/inference receipts. Preserve previous files. No global Python/system/extension settings. One local original WAV trial before candidate batches. Never publish model weights or raw evidence.\n')
    for name in ('environment','models','cache','evidence','cache/tmp','cache/pip','cache/huggingface','cache/torch','cache/pyc'):
        folder = QA_ROOT/name
        folder.mkdir(exist_ok=True)
        write_new(folder/'README.md', f'# Native QA {name}\nTask-owned isolated files only. Keep evidence, sources and model weights; not part of game runtime publication.\n'.encode())
    write_new(QA_ROOT/'evidence/budget-before1003.json', encoded(plan))
    write_new(QA_ROOT/'evidence/official-model-metadata1003.json', raw)
    run([str(PYTHON), '-m', 'venv', '--copies', str(QA_ROOT/'environment')], 'create-environment1003')
    print(json.dumps(plan,ensure_ascii=False),flush=True)

def install():
    python = QA_ROOT/'environment/Scripts/python.exe'
    if not python.is_file(): raise FileNotFoundError('Create the explicit isolated environment first')
    run([str(python), '-m', 'pip', 'install', '--index-url','https://download.pytorch.org/whl/cu128',
        'torch==2.7.1','torchvision==0.22.1','torchaudio==2.7.1'], 'install-pytorch-cu128-1003')
    run([str(python), '-m', 'pip', 'install', '--index-url','https://pypi.org/simple',
        'transformers==4.57.6','accelerate','qwen-omni-utils','librosa','soundfile','safetensors'], 'install-omni-1003')
    print(json.dumps({'status':'isolated-dependencies-installed','environment':str(python),'DfreeBytes':shutil.disk_usage('D:/').free}),flush=True)

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=('prepare','install'))
    args=parser.parse_args()
    prepare() if args.mode=='prepare' else install()
