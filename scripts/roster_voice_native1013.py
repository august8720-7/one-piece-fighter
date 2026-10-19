"""Bounded native audio QA on the already-installed, unchanged Omni model."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import threading
import time

PROJECT = Path(__file__).resolve().parents[1]
QA = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003')
ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/native-qa')
REVISION = 'f75b40e3da2003cdd6e1829b1f420ca70797c34e'
PROMPT = '请直接聆听音频，简短回答三项。一、逐字写出实际听见的人声原文并注明语言，不能只给语言；若只是无词的呼气、呻吟、笑或喊声，请说明实际声音，不强行猜成某语言的词。二、首尾截断、重复或多余尾声。三、背景音乐、杂音、明显失真或发音异常。缺乏依据写不确定，不根据文件名推测，不用ASR或波形代替听觉判断。'

def sha_file(path):
    value = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()

def save(path, value):
    with Path(path).open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)

def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('catalog', type=Path)
    parser.add_argument('--probe-only', action='store_true')
    args = parser.parse_args()
    if not Path(sys.prefix).resolve().is_relative_to(QA.resolve()):
        raise RuntimeError('Use the existing native QA environment only')
    resources = load_module('resources1013', PROJECT / 'scripts/roster_voice_resources1008.py')
    snapshot = resources.snapshot()
    weight_bytes = resources.weight_groups()['thinker']
    # Calibrate against the completed pure-CUDA run, retaining a positive
    # margin above its measured worst peak (which included a 1024-token reply).
    # Never lower this from an unverified estimate or an incomplete run.
    measured = ROOT / '20261013T045504347029Z'
    verified_peak = None
    if (measured / 'completed.json').is_file() and (measured / 'runtime.json').is_file():
        runtime = json.loads((measured / 'runtime.json').read_text(encoding='utf-8'))
        trials = [json.loads(p.read_text(encoding='utf-8')) for p in measured.glob('result-*.json')]
        if (runtime.get('revision') == REVISION and runtime.get('cpuOffload') is False
                and runtime.get('quantized') is False and len(trials) == 8
                and all(r.get('modelRevision') == REVISION and r.get('nativeFeatureShapes')
                        and r.get('freeGpuBytes', 0) > 256 * 1024 ** 2 for r in trials)):
            verified_peak = max(r['peakAllocatedGpuBytes'] for r in trials)
    minimum_gpu = (max(weight_bytes + 256 * 1024 ** 2, verified_peak + 384 * 1024 ** 2)
                   if verified_peak is not None else weight_bytes + 800_000_000)
    limits = {'minimumFreeGpuBytes': minimum_gpu,
              'minimumAvailableRamBytes': 8 * 1024 ** 3,
              'minimumFreeDiskBytes': 2 * 1024 ** 3}
    preflight = {**snapshot, **limits, 'thinkerWeightBytes': weight_bytes,
                 'verifiedPreviousPeakAllocatedGpuBytes': verified_peak,
                 'calibratedGpuSafetyMarginBytes': 384 * 1024 ** 2 if verified_peak else None,
                 'mode': 'entire unchanged BF16 thinker on CUDA; no CPU/disk offload'}
    preflight['passed'] = (snapshot['freeGpuBytes'] >= limits['minimumFreeGpuBytes']
        and snapshot['availablePhysicalMemoryBytes'] >= limits['minimumAvailableRamBytes']
        and snapshot['DfreeBytes'] >= limits['minimumFreeDiskBytes'])
    print(json.dumps({'stage': 'preflight', **preflight}), flush=True)
    if args.probe_only:
        return
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    folder = ROOT / stamp
    folder.mkdir()
    save(folder / 'preflight.json', preflight)
    if not preflight['passed']:
        raise RuntimeError('Insufficient current resource margin; model was not loaded')
    identity = json.loads((QA / 'evidence/model-download-after1003.json').read_bytes())
    if identity['revision'] != REVISION or not identity['allOfficialIdentitiesVerified']:
        raise RuntimeError('Official model identity receipt mismatch')
    verified = []
    for row in identity['files']:
        path = (QA / 'models/qwen25-omni3b' / row['file']).resolve()
        if not path.is_relative_to((QA / 'models/qwen25-omni3b').resolve()):
            raise ValueError('Model file escaped root')
        if path.stat().st_size != row['bytes'] or sha_file(path) != row['sha256']:
            raise ValueError('Model file changed: ' + row['file'])
        verified.append(row)
    save(folder / 'model-identity.json', {'revision': REVISION, 'files': verified, 'freshShaMatched': True})
    rows = json.loads(args.catalog.read_text(encoding='utf-8-sig'))['clips']
    # Clips remain strictly sequential, releasing their tensors after each one.
    # A twelve-clip cap accommodates two five-event completions in one load.
    if not 1 <= len(rows) <= 12:
        raise ValueError('This batch is limited to 1..12 exact new candidates')
    manifest = []
    for index, row in enumerate(rows, 1):
        source = Path(row['path']).resolve()
        if not source.is_relative_to(ROOT.parent.resolve()) or sha_file(source) != row['sha256']:
            raise ValueError('Candidate identity or allowed root mismatch')
        manifest.append({'index': index, 'source': str(source), 'sha256': row['sha256'],
                         'target': str(folder / f'sound-{index:02}.wav')})
    save(folder / 'copy-before.json', manifest)
    for row in manifest:
        shutil.copyfile(row['source'], row['target'])
        if sha_file(row['target']) != row['sha256']:
            raise ValueError('Blind copy changed bytes')
    save(folder / 'copy-after.json', manifest)
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1',
        HF_HUB_DISABLE_IMPLICIT_TOKEN='1', HF_HOME=str(QA / 'cache/huggingface'),
        TORCH_HOME=str(QA / 'cache/torch'), TEMP=str(QA / 'cache/tmp'), TMP=str(QA / 'cache/tmp'))
    import psutil
    import torch
    import transformers
    from qwen_omni_utils import process_mm_info
    from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniProcessor
    done = threading.Event()
    state = {'stage': 'load', 'started': time.monotonic()}
    def watch():
        while not done.wait(1):
            ram = psutil.virtual_memory().available
            gpu_free = torch.cuda.mem_get_info()[0]
            if ram < 1.5 * 1024 ** 3 or gpu_free < 256 * 1024 ** 2:
                save(folder / 'resource-stop.json', {'stage': state['stage'], 'freeRam': ram,
                    'freeGpu': gpu_free, 'accepted': False, 'reason': 'Only own QA process stopped for resource margin'})
                os._exit(78)
    thread = threading.Thread(target=watch, daemon=True)
    thread.start()
    try:
        torch.cuda.reset_peak_memory_stats()
        model = Qwen2_5OmniForConditionalGeneration.from_pretrained(
            str(QA / 'models/qwen25-omni3b'), torch_dtype=torch.bfloat16,
            device_map={'': 'cuda:0'}, enable_audio_output=False, attn_implementation='sdpa',
            low_cpu_mem_usage=True, local_files_only=True, offload_state_dict=False)
        if model.has_talker or any(p.device.type != 'cuda' for p in model.parameters()):
            raise RuntimeError('Expected complete CUDA placement without talker')
        model.eval()
        processor = Qwen2_5OmniProcessor.from_pretrained(str(QA / 'models/qwen25-omni3b'), local_files_only=True)
        save(folder / 'runtime.json', {'torch': torch.__version__, 'transformers': transformers.__version__,
            'revision': REVISION, 'deviceMap': model.hf_device_map, 'dtype': str(model.dtype),
            'parameterBytes': sum(p.numel() * p.element_size() for p in model.parameters()),
            'loadSeconds': time.monotonic() - state['started'], 'cpuOffload': False,
            'quantized': False, 'audioUploads': 0})
        for row in manifest:
            state['stage'] = f"sound-{row['index']:02}"
            start = time.monotonic()
            messages = [
                {'role': 'system', 'content': [{'type': 'text', 'text': 'You are a careful audio understanding assistant. Report only what the audio supports.'}]},
                {'role': 'user', 'content': [{'type': 'audio', 'audio': row['target']}, {'type': 'text', 'text': PROMPT}]},
            ]
            text = processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
            audios, images, videos = process_mm_info(messages, use_audio_in_video=False)
            inputs = processor(text=text, audio=audios, images=images, videos=videos,
                return_tensors='pt', padding=True, use_audio_in_video=False)
            features = inputs.get('input_features')
            if features is None or not features.numel() or not torch.isfinite(features).all().item():
                raise RuntimeError('Native audio input features missing or invalid')
            shapes = {key: list(value.shape) for key, value in inputs.items() if hasattr(value, 'shape')}
            inputs = inputs.to(model.device).to(model.dtype)
            with torch.inference_mode():
                generated = model.generate(**inputs, return_audio=False,
                    thinker_do_sample=False, thinker_max_new_tokens=256)
            response = processor.batch_decode(generated[:, inputs.input_ids.shape[1]:],
                skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
            receipt = {'index': row['index'], 'audioSha256': row['sha256'], 'prompt': PROMPT,
                'expectedTextProvided': False, 'nativeFeatureShapes': shapes, 'response': response,
                'validAudioFeatureFrames': int(inputs['feature_attention_mask'].sum().item()),
                'generatedTokens': int(generated.shape[1] - inputs.input_ids.shape[1]),
                'hitTokenLimit': int(generated.shape[1] - inputs.input_ids.shape[1]) >= 256,
                'responseSha256': hashlib.sha256(response.encode()).hexdigest(),
                'modelRevision': REVISION, 'elapsedSeconds': time.monotonic()-start,
                'peakAllocatedGpuBytes': torch.cuda.max_memory_allocated(),
                'freeRamBytes': psutil.virtual_memory().available, 'freeGpuBytes': torch.cuda.mem_get_info()[0],
                'humanListened': False, 'adopted': False, 'status': 'native_response_requires_review'}
            save(folder / f"result-{row['index']:02}.json", receipt)
            print(json.dumps(receipt, ensure_ascii=False), flush=True)
            if not response.strip():
                raise RuntimeError('No native audio review response')
            if any(phrase in response for phrase in ('不能原生聆听', '无法聆听', '没有提供音频', '未提供音频')):
                raise RuntimeError('Model did not confirm an actual audio review; no further clips attempted')
            del inputs, generated
        save(folder / 'completed.json', {'recordDir': str(folder), 'responses': len(manifest), 'adopted': False})
    except Exception as error:
        save(folder / 'failure.json', {'stage': state['stage'], 'errorType': type(error).__name__,
                                     'error': str(error), 'adopted': False})
        raise
    finally:
        done.set()
        thread.join(timeout=2)

if __name__ == '__main__':
    main()
