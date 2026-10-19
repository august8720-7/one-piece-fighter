"""CPU-only exact-trim native QA; one clip trial before the same-process 16.

The 3B label is not used as a memory estimate. Verified safetensors headers
determine the actual thinker BF16 bytes. No GPU, quantization, audio upload,
standalone ASR, system changes, or automatic adoption is allowed here.
"""
from datetime import datetime, timezone
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import struct
import sys
import threading
import time

PROJECT = Path(__file__).resolve().parents[1]
QA_ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()
EVIDENCE_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003/validation').resolve()
ACTIVITY_MARGIN = 512 * 1024 * 1024
PHYSICAL_RESERVE = 1_000_000_000
ACTIVE_FOLDER = None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    data = value if isinstance(value, bytes) else (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    with path.open('xb') as handle:
        handle.write(data)


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    imported = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(imported)
    return imported


def actual_weight_bytes():
    model_root = QA_ROOT / 'models/qwen25-omni3b'
    index = json.loads((model_root / 'model.safetensors.index.json').read_bytes())
    groups = {}
    for shard in set(index['weight_map'].values()):
        with (model_root / shard).open('rb') as file:
            header_length = struct.unpack('<Q', file.read(8))[0]
            header = json.loads(file.read(header_length))
        for name, tensor in header.items():
            if name == '__metadata__':
                continue
            count = 1
            for dimension in tensor['shape']:
                count *= dimension
            keys = [name.split('.')[0]]
            if name.startswith('thinker.'):
                keys.append('.'.join(name.split('.')[:2]))
                pieces = name.split('.')
                if pieces[1:3] == ['model', 'layers']:
                    keys.append('.'.join(pieces[:4]))
                elif pieces[1] == 'model':
                    keys.append('.'.join(pieces[:3]))
            for key in keys:
                group = groups.setdefault(key, {'tensorCount': 0, 'parameterCount': 0, 'storedBytes': 0})
                group['tensorCount'] += 1
                group['parameterCount'] += count
                group['storedBytes'] += tensor['data_offsets'][1] - tensor['data_offsets'][0]
            if name.startswith('thinker.') and tensor['dtype'] != 'BF16':
                raise ValueError('The CPU thinker budget requires actual original BF16 tensors')
    return groups


def main(offload_visual=False, offload_text=False):
    global ACTIVE_FOLDER
    if sys.prefix == sys.base_prefix or not Path(sys.prefix).resolve().is_relative_to(QA_ROOT):
        raise RuntimeError('Use only the already installed isolated D:/ native QA environment')
    single = module(Path(__file__).with_name('roster_voice_runtime1003.qa_infer.py'), 'qa_single')
    batch = module(Path(__file__).with_name('roster_voice_runtime1003.qa_batch.py'), 'qa_inventory')
    single.setup_paths()
    os.environ['CUDA_VISIBLE_DEVICES'] = ''
    os.environ['OMP_NUM_THREADS'] = '10'
    if shutil.disk_usage('D:/').free < 15_000_000_000:
        raise RuntimeError('Retain 15 GB for game outputs')
    receipt_path = QA_ROOT / 'evidence/model-download-after1003.json'
    receipt = json.loads(receipt_path.read_bytes())
    if not receipt.get('allOfficialIdentitiesVerified') or receipt.get('revision') != 'f75b40e3da2003cdd6e1829b1f420ca70797c34e':
        raise RuntimeError('The complete fixed-revision official model receipt is required')
    rows, catalog_sha = batch.load_rows()
    mode_prefix = 'native-local-cpu-text-disk1004-' if offload_text else 'native-local-cpu-visual-disk1004-' if offload_visual else 'native-local-cpu1004-'
    folder = EVIDENCE_ROOT / (mode_prefix + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    folder.mkdir()
    ACTIVE_FOLDER = folder
    save(folder / 'README.md', b'# CPU-only exact-trim native QA1004\nFirst clip-07 is a real exact runtime WAV CPU trial. Only after nonempty native text and stable memory may the same process review the remaining first-pair clips with separate blind conversations. Full original BF16 thinker, same official revision, explicit CPU map. No GPU/quantization/audio upload/ASR substitute/system or other-process changes. 25-second progress is instrumentation for this bounded running process, never a recurring monitor. Responses need separate content/use review; no automatic adoption or human audition claims.\n')
    if offload_visual:
        save(folder / 'visual-offload-rule.md', b'# Explicit existing visual module disk placement\nthinker.visual is kept on disk via Accelerate. No model module is removed or replaced. Native audio/text execution remains CPU with original BF16 tensors; the separate text rule describes any requested decoder disk hooks. No image/video inputs are permitted; visual forward calls are counted and must remain zero. Full official checkpoints and old cache/evidence remain untouched.\n')
    if offload_text:
        save(folder / 'text-offload-rule.md', b'# Standard Accelerate CPU plus disk text placement\nAudio tower remains CPU. Visual is disk and unused. CPU-resident original BF16 weight budget is min(4 GiB, measured available physical RAM minus 2 GiB). Original embedding/lm_head and remaining full decoder layers use Accelerate disk hooks, executing temporarily on CPU. No deletion/replacement/quantization, CUDA initialization, own forward rewrite, ASR or external audio submission. Complete original checkpoints remain unchanged.\n')
    save(folder / 'inventory-before.json', {'catalogSha256': catalog_sha, 'clips': rows,
         'firstTrialIndex': 7, 'expectedTranscriptProvided': False, 'audioUploads': 0, 'formalAdopted': 0})
    print(json.dumps({'status': 'cpu-native-preflight-start', 'recordDir': str(folder)}, ensure_ascii=False), flush=True)
    import psutil
    import torch
    import torch.nn.functional as functional
    import transformers
    from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniProcessor, StoppingCriteria, StoppingCriteriaList
    from qwen_omni_utils import process_mm_info
    torch.set_num_threads(10)
    torch.set_num_interop_threads(1)
    with torch.inference_mode():
        sample = torch.randn(256, 256, dtype=torch.bfloat16, device='cpu')
        product = sample @ sample
        attention_sample = torch.randn(1, 2, 16, 64, dtype=torch.bfloat16, device='cpu')
        attention = functional.scaled_dot_product_attention(attention_sample, attention_sample, attention_sample)
        if not torch.isfinite(product).all().item() or not torch.isfinite(attention).all().item():
            raise RuntimeError('Actual CPU BF16/SDPA support probe failed')
    del sample, product, attention_sample, attention
    groups = actual_weight_bytes()
    original_thinker_bytes = groups['thinker']['storedBytes']
    visual_bytes = groups['thinker.visual']['storedBytes']
    weight_bytes = original_thinker_bytes - visual_bytes if offload_visual else original_thinker_bytes
    available = psutil.virtual_memory().available
    commit_free = psutil.swap_memory().free
    budget = available - PHYSICAL_RESERVE
    device_map = {'': 'cpu'}
    temporary_module_bytes = 0
    if offload_text:
        budget = min(4 * 1024 ** 3, available - 2 * 1024 ** 3)
        base_cpu_bytes = groups['thinker.audio_tower']['storedBytes'] + groups['thinker.model.norm']['storedBytes']
        if budget < base_cpu_bytes:
            save(folder / 'resource-stop.json', {'status': 'cannot-fit-native-audio-tower-plus-2GiB-real-headroom',
                 'availablePhysicalMemoryBytes': available, 'budgetBytes': budget, 'nativeAudioTowerAndNormBytes': base_cpu_bytes,
                 'nativeResponsesProduced': 0, 'modelStarted': False})
            print(json.dumps({'status': 'cannot-fit-native-audio-tower-plus-2GiB-real-headroom', 'modelStarted': False}), flush=True)
            return
        device_map = {'thinker.audio_tower': 'cpu', 'thinker.visual': 'disk',
                      'thinker.model.embed_tokens': 'disk', 'thinker.model.norm': 'cpu', 'thinker.lm_head': 'disk'}
        cpu_bytes = base_cpu_bytes
        layer_names = sorted((name for name in groups if name.startswith('thinker.model.layers.')), key=lambda name: int(name.rsplit('.', 1)[1]))
        for name in layer_names:
            size = groups[name]['storedBytes']
            resident = cpu_bytes + size <= budget
            device_map[name] = 'cpu' if resident else 'disk'
            if resident:
                cpu_bytes += size
        weight_bytes = cpu_bytes
        temporary_module_bytes = max(groups[name]['storedBytes'] for name, device in device_map.items()
                                     if device == 'disk' and name != 'thinker.visual')
    preflight = {'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'components': groups,
        'actualOriginalThinkerBfloat16Bytes': original_thinker_bytes,
        'actualInactiveVisualBfloat16Bytes': visual_bytes, 'visualOffloadedToDisk': offload_visual,
        'actualActiveCpuBfloat16Bytes': weight_bytes, 'availablePhysicalMemoryBytes': available,
        'textOffloadedToDisk': offload_text, 'plannedDeviceMap': device_map,
        'largestTemporarilyLoadedCpuModuleBytes': temporary_module_bytes,
        'freeSwapBytes': commit_free, 'physicalReserveBytes': PHYSICAL_RESERVE,
        'activityMarginBytes': ACTIVITY_MARGIN, 'maxMemoryCpuArgumentBytes': budget,
        'minimumAvailablePhysicalMemoryBytes': weight_bytes + ACTIVITY_MARGIN + PHYSICAL_RESERVE if not offload_text else None,
        'passedCpuBfloat16Matmul': True, 'passedCpuSdpa': True, 'torchCudaInitialized': torch.cuda.is_initialized(),
        'explicitCpuMapMaxMemoryIsNotAnOsHardLimit': True,
        'basis': 'For text disk mode, resident weights <= min(4 GiB, available RAM minus 2 GiB); the largest temporary text module is recorded and normal Accelerate hooks run it on CPU. Other modes retain the earlier full-resident working margin.',
        'sameModelRevision': receipt['revision'], 'noGpuRequired': True, 'systemChanges': False}
    save(folder / 'resource-before.json', preflight)
    print(json.dumps({'status': 'cpu-preflight', **preflight}, ensure_ascii=False), flush=True)
    if not offload_text and available < preflight['minimumAvailablePhysicalMemoryBytes']:
        save(folder / 'resource-stop.json', {'status': 'no-model-load-insufficient-current-cpu-headroom',
             'preflight': preflight, 'nativeResponsesProduced': 0, 'formalAdopted': 0})
        print(json.dumps({'status': 'no-model-load-insufficient-current-cpu-headroom', 'modelStarted': False}), flush=True)
        return
    if torch.cuda.is_initialized():
        raise RuntimeError('CPU QA must not initialize CUDA')
    loading_options = {}
    offload_folder = None
    if offload_visual:
        cache_root = QA_ROOT / ('cache/offload-cpu-text1004' if offload_text else 'cache/offload-cpu1004')
        if not cache_root.exists():
            cache_root.mkdir()
            save(cache_root / 'README.md', b'# CPU native QA explicit disk placement1004\nUnique timestamp children store Accelerate offload metadata/cache. Visual stays disk. When text disk mode is requested, original text modules also have CPU-execution disk hooks; audio tower remains CPU. Original complete checkpoints remain in models/qwen25-omni3b. No deletion/replacement/quantization. Preserve previous children; not a game runtime or public asset. Retain 15 GB for game work.\n')
        offload_folder = cache_root / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        offload_folder.mkdir()
        save(offload_folder / 'README.md', b'# One Accelerate CPU/disk placement\nAudio tower remains CPU. Visual stays disk and unused. With text disk mode, explicit remaining original text modules use normal Accelerate disk hooks and execute temporarily on CPU. Safetensors may be referenced directly; preserve all original files and metadata. No image input or quantization.\n')
        disk_bytes = original_thinker_bytes - weight_bytes if offload_text else visual_bytes
        if shutil.disk_usage('D:/').free - disk_bytes < 15_000_000_000:
            raise RuntimeError('Declared disk offload copy budget cannot preserve 15 GB game space')
        if not offload_text:
            device_map = {'thinker.audio_tower': 'cpu', 'thinker.model': 'cpu', 'thinker.lm_head': 'cpu', 'thinker.visual': 'disk'}
        loading_options = {'offload_folder': str(offload_folder), 'offload_state_dict': False}
        save(folder / 'visual-offload-before.json', {'deviceMap': device_map, 'offloadFolder': str(offload_folder),
             'sourceCheckpointReceiptSha256': digest(receipt_path.read_bytes()), 'visualBytes': visual_bytes, 'allDiskPlacedBytes': disk_bytes,
             'DfreeBytes': shutil.disk_usage('D:/').free, 'noCpuStateDictSpillRequested': True})
    process = psutil.Process()
    state = {'phase': 'model-loading', 'index': None, 'started': time.monotonic(), 'peakRssBytes': process.memory_info().rss,
             'minimumAvailablePhysicalMemoryBytes': available, 'resourceStop': False}
    done = threading.Event()
    heartbeat_lines = folder / 'progress.jsonl'

    def snapshot():
        info = process.memory_info()
        free = psutil.virtual_memory().available
        state['peakRssBytes'] = max(state['peakRssBytes'], info.rss, getattr(info, 'peak_wset', info.rss))
        state['minimumAvailablePhysicalMemoryBytes'] = min(state['minimumAvailablePhysicalMemoryBytes'], free)
        return {'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'status': 'cpu-native-progress',
                'phase': state['phase'], 'index': state['index'], 'elapsedSeconds': time.monotonic() - state['started'],
                'processRssBytes': info.rss, 'processPrivateBytes': getattr(info, 'private', None),
                'availablePhysicalMemoryBytes': free, 'torchCudaInitialized': torch.cuda.is_initialized()}

    def heartbeat():
        while not done.wait(25):
            data = snapshot()
            if data['availablePhysicalMemoryBytes'] < 500_000_000:
                state['resourceStop'] = True
            with heartbeat_lines.open('a', encoding='utf-8') as output:
                output.write(json.dumps(data, ensure_ascii=False) + '\n')
            print(json.dumps(data, ensure_ascii=False), flush=True)

    watcher = threading.Thread(target=heartbeat, daemon=True)
    watcher.start()
    loaded_at = time.monotonic()
    try:
        model = Qwen2_5OmniForConditionalGeneration.from_pretrained(str(QA_ROOT / 'models/qwen25-omni3b'),
            torch_dtype=torch.bfloat16, device_map=device_map, max_memory={'cpu': budget},
            enable_audio_output=False, attn_implementation='sdpa', low_cpu_mem_usage=True, local_files_only=True,
            **loading_options)
        def planned_device(name):
            matches = [prefix for prefix in device_map if prefix == '' or name == prefix or name.startswith(prefix + '.')]
            return device_map[max(matches, key=len)]
        active = [(name, parameter) for name, parameter in model.named_parameters() if planned_device(name) == 'cpu']
        if model.has_talker or any(parameter.device.type != 'cpu' for _, parameter in active):
            raise RuntimeError('Unused audio output/GPU components must not enter CPU QA')
        if any(parameter.device.type not in ('cpu', 'meta') for parameter in model.parameters()):
            raise RuntimeError('CPU/disk dispatch must never place weights on CUDA')
        visual_forward_calls = [0]
        def observe_visual(_module, _inputs):
            visual_forward_calls[0] += 1
        model.thinker.visual.register_forward_pre_hook(observe_visual)
        model.eval()
        processor = Qwen2_5OmniProcessor.from_pretrained(str(QA_ROOT / 'models/qwen25-omni3b'), local_files_only=True)
        runtime = {'officialModel': 'Qwen/Qwen2.5-Omni-3B', 'modelRevision': receipt['revision'],
                   'torch': torch.__version__, 'transformers': transformers.__version__,
                   'deviceMap': model.hf_device_map, 'allActiveParametersCpu': True, 'dtype': str(model.dtype),
                   'modelParameterBytes': sum(p.numel() * p.element_size() for p in model.parameters()),
                   'activeCpuParameterBytes': sum(p.numel() * p.element_size() for _, p in active),
                   'textOffloadedToDisk': offload_text, 'cpuResidentBudgetBytes': budget,
                   'visualOffloadedToDisk': offload_visual, 'offloadFolder': str(offload_folder) if offload_folder else None,
                   'visualParameterDevices': sorted({p.device.type for name, p in model.named_parameters() if name.startswith('thinker.visual.')}),
                   'loadSeconds': time.monotonic() - loaded_at, 'cpuThreads': torch.get_num_threads(),
                   'torchCudaInitialized': torch.cuda.is_initialized(), 'snapshot': snapshot(),
                   'audioUploads': 0, 'humanListened': False, 'formalAdopted': 0}
        save(folder / 'model-runtime.json', runtime)
        if state['resourceStop'] or psutil.virtual_memory().available < PHYSICAL_RESERVE:
            save(folder / 'resource-stop-after-load.json', {'status': 'cpu-loaded-but-no-audio-run-insufficient-headroom', 'runtime': runtime})
            print(json.dumps({'status': 'cpu-loaded-but-no-audio-run-insufficient-headroom'}), flush=True)
            return

        class StopForResourcePressure(StoppingCriteria):
            def __call__(self, input_ids, scores, **kwargs):
                free_now = psutil.virtual_memory().available
                state['minimumAvailablePhysicalMemoryBytes'] = min(state['minimumAvailablePhysicalMemoryBytes'], free_now)
                if free_now < 500_000_000:
                    state['resourceStop'] = True
                return state['resourceStop']

        order = [next(row for row in rows if row['index'] == 7)] + [row for row in rows if row['index'] != 7]
        summary = []
        for position, row in enumerate(order):
            if state['resourceStop'] or psutil.virtual_memory().available < PHYSICAL_RESERVE:
                save(folder / f"resource-stop-before-clip-{row['index']:02}.json", {'status': 'insufficient-current-cpu-headroom', 'snapshot': snapshot()})
                break
            clip_dir = folder / f"clip-{row['index']:02}"
            clip_dir.mkdir()
            save(clip_dir / 'README.md', b'# One exact-trim CPU native blind review\nNew isolated conversation; no expected text. Runtime WAV identity is checked. Native model response is pending separate review; no formal adoption. Preserve all files.\n')
            request = {**row, 'prompt': single.PROMPT, 'expectedTranscriptProvided': False, 'audioUploads': 0,
                       'firstCpuTrial': position == 0, 'allNativeInferenceOnCpu': True}
            save(clip_dir / 'request.json', request)
            state.update(phase='clip-native-generation', index=row['index'], started=time.monotonic())
            before = snapshot()
            if digest(Path(row['audio']).read_bytes()) != row['audioSha256']:
                raise ValueError('Exact candidate audio changed before native input')
            conversation = [
                {'role': 'system', 'content': [{'type': 'text', 'text': 'You are a careful audio understanding assistant. Report only what the audio supports.'}]},
                {'role': 'user', 'content': [{'type': 'audio', 'audio': row['audio']}, {'type': 'text', 'text': single.PROMPT}]},
            ]
            text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
            audios, images, videos = process_mm_info(conversation, use_audio_in_video=False)
            if images is not None or videos is not None:
                raise RuntimeError('No image/video input is permitted for visual-offloaded native audio QA')
            inputs = processor(text=text, audio=audios, images=images, videos=videos, return_tensors='pt', padding=True, use_audio_in_video=False)
            if any(key in inputs for key in ('pixel_values', 'pixel_values_videos', 'image_grid_thw', 'video_grid_thw')):
                raise RuntimeError('Unexpected visual features would invalidate inactive visual disk placement')
            features = inputs.get('input_features')
            mask = inputs.get('feature_attention_mask')
            if features is None or features.numel() == 0 or mask is None or mask.sum().item() == 0 or not torch.isfinite(features).all().item():
                raise RuntimeError('The actual native audio features and active frames are required')
            shapes = {key: list(value.shape) for key, value in inputs.items() if hasattr(value, 'shape')}
            valid_frames = int(mask.sum().item())
            inputs = inputs.to('cpu').to(model.dtype)
            with torch.inference_mode():
                output = model.generate(**inputs, return_audio=False, max_new_tokens=256, do_sample=False,
                                        stopping_criteria=StoppingCriteriaList([StopForResourcePressure()]))
            generated = output[:, inputs.input_ids.shape[1]:]
            response = processor.batch_decode(generated, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
            if visual_forward_calls[0] != 0:
                raise RuntimeError('The visual module was unexpectedly invoked by an audio-only request')
            save(clip_dir / 'response.txt', response.encode('utf-8'))
            after = snapshot()
            stable = not state['resourceStop'] and after['availablePhysicalMemoryBytes'] >= PHYSICAL_RESERVE
            eos_ids = {processor.tokenizer.eos_token_id}
            thinker_generation = getattr(model.thinker, 'generation_config', None)
            configured_eos = getattr(thinker_generation, 'eos_token_id', None)
            eos_ids.update([configured_eos] if isinstance(configured_eos, int) else configured_eos or [])
            terminal_token = int(generated[0, -1].item()) if generated.shape[1] else None
            completed = bool(response.strip()) and stable and terminal_token in eos_ids
            result = {'status': 'native-model-response-requires-review' if completed else 'incomplete-or-memory-unstable-native-response-not-accepted',
                      'request': request, 'inputAudioAttached': True, 'nativeAudioFeatureShapes': shapes,
                      'validAudioFeatureFrames': valid_frames, 'modelRevision': receipt['revision'],
                      'response': response, 'responseSha256': digest(response.encode('utf-8')),
                      'generatedTokenCount': generated.shape[1], 'terminalTokenId': terminal_token,
                      'configuredEosTokenIds': sorted(token for token in eos_ids if token is not None),
                      'elapsedSeconds': time.monotonic() - state['started'], 'resourceBefore': before, 'resourceAfter': after,
                      'processPeakRssBytes': state['peakRssBytes'], 'minimumAvailablePhysicalMemoryBytes': state['minimumAvailablePhysicalMemoryBytes'],
                      'resourceStable': stable, 'torchCudaInitialized': torch.cuda.is_initialized(),
                      'visualOffloadedToDisk': offload_visual, 'visualForwardCalls': visual_forward_calls[0],
                      'textOffloadedToDisk': offload_text,
                      'humanListened': False, 'gamePlaybackVerified': False, 'formalAdopted': 0, 'audioUploads': 0}
            save(clip_dir / 'native-result.json', result)
            summary.append(result)
            print(json.dumps({'index': row['index'], 'status': result['status'], 'seconds': result['elapsedSeconds'],
                              'response': response, 'availablePhysicalMemoryBytes': after['availablePhysicalMemoryBytes']}, ensure_ascii=False), flush=True)
            del inputs, output, generated, features, mask
            if not completed or any(phrase in response for phrase in ('不能原生聆听', '无法聆听', '没有提供音频')):
                break
            if position == 0:
                save(folder / 'cpu-exact-trim-trial.json', result)
                print(json.dumps({'status': 'exact-trim-cpu-trial-produced-native-response-memory-stable',
                                  'continueSameProcessToFirstPair16': True}), flush=True)
        completed_count = sum(row['status'] == 'native-model-response-requires-review' for row in summary)
        save(folder / 'batch-summary.json', {'status': 'native-responses-ready-for-separate-review' if completed_count == 16 else 'cpu-native-batch-incomplete',
             'runtime': runtime, 'completed': completed_count, 'requested': 16, 'results': summary,
             'totalSeconds': time.monotonic() - loaded_at, 'processPeakRssBytes': state['peakRssBytes'],
             'minimumAvailablePhysicalMemoryBytes': state['minimumAvailablePhysicalMemoryBytes'],
             'allInferenceCpu': True, 'formalAdopted': 0, 'audioUploads': 0})
        print(json.dumps({'status': 'cpu-native-process-finished', 'completed': completed_count, 'recordDir': str(folder)}, ensure_ascii=False), flush=True)
    finally:
        done.set()
        watcher.join(timeout=2)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offload-visual', action='store_true', help='Keep the existing unused visual module on D:/ disk; native audio/text weights remain CPU')
    parser.add_argument('--offload-text', action='store_true', help='Use normal CPU-execution disk hooks for text weights above min(4 GiB, available RAM - 2 GiB)')
    args = parser.parse_args()
    if args.offload_text and not args.offload_visual:
        parser.error('--offload-text requires explicit --offload-visual')
    try:
        main(args.offload_visual, args.offload_text)
    except Exception as error:
        failure = {'status': 'cpu-native-failed-not-audio-approval', 'errorKind': type(error).__name__,
                   'error': str(error), 'audioUploads': 0, 'formalAdopted': 0}
        if ACTIVE_FOLDER is not None:
            save(ACTIVE_FOLDER / 'native-failure.json', failure)
        print(json.dumps(failure, ensure_ascii=False), flush=True)
        raise
