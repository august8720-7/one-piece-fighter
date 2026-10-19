"""Bounded native audio QA: unchanged visual on CPU, active thinker modules on CUDA.

Official empty initialization plus owned per-tensor BF16 buffers avoid the
failing safetensors-to-CUDA storage path. No dispatch/offload hooks exist.
No automatic mapping, disk offload, quantization, removed understanding module,
image/video input, new environment or model download is permitted.
"""
import argparse
from datetime import datetime, timezone
import faulthandler
import gc
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import sys
import struct
import threading
import time

PROJECT = Path(__file__).resolve().parents[1]
QA = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003')
CLOSURE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013')
OUTPUT = CLOSURE / 'native-qa-cpuvisual1013'
REVISION = 'f75b40e3da2003cdd6e1829b1f420ca70797c34e'
DEVICE_MAP = {'thinker.audio_tower': 'cuda:0', 'thinker.visual': 'cpu',
              'thinker.model': 'cuda:0', 'thinker.lm_head': 'cuda:0'}
_STDERR_HANDLE = None


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def sha_file(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def save(path, data):
    with Path(path).open('x', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def persist_stderr(folder):
    """Capture Python/native stderr and fatal traces even when no exception is raised."""
    global _STDERR_HANDLE
    _STDERR_HANDLE = (folder / 'stderr.log').open('x', encoding='utf-8', buffering=1)
    sys.stderr.flush()
    os.dup2(_STDERR_HANDLE.fileno(), 2)
    sys.stderr = _STDERR_HANDLE
    faulthandler.enable(file=_STDERR_HANDLE, all_threads=True)


def append_record(path, value):
    with Path(path).open('a', encoding='utf-8') as handle:
        handle.write(json.dumps(value, ensure_ascii=False) + '\n')
        handle.flush()
        os.fsync(handle.fileno())


def bf16_header_plan(model_root, index):
    """Read the public safetensors header only; offsets are relative to its data section."""
    if sys.byteorder != 'little':
        raise RuntimeError('Raw original BF16 loading requires a little-endian host')
    expected = {name for name in index['weight_map'] if name.startswith('thinker.')}
    if len(expected) != 1442:
        raise RuntimeError('Fixed official revision must contain all1442 thinker keys')
    seen, plan, total_bytes = set(), [], 0
    for shard in sorted(set(index['weight_map'].values())):
        path = (model_root / shard).resolve()
        if not path.is_relative_to(model_root):
            raise RuntimeError('Shard escaped the verified model root')
        with path.open('rb') as handle:
            length_data = handle.read(8)
            if len(length_data) != 8:
                raise RuntimeError('Truncated safetensors header length')
            length = struct.unpack('<Q', length_data)[0]
            if not 0 < length <= 4 * 1024 ** 2:
                raise RuntimeError('Unexpected safetensors header length')
            header_bytes = handle.read(length)
            if len(header_bytes) != length:
                raise RuntimeError('Truncated safetensors JSON header')
            header = json.loads(header_bytes)
        data_start = 8 + length
        payload_bytes = path.stat().st_size - data_start
        declared = {name for name, file in index['weight_map'].items() if file == shard}
        if set(header) - {'__metadata__'} != declared:
            raise RuntimeError('Original shard header and verified index disagree')
        rows = []
        for name in sorted(declared, key=lambda key: header[key]['data_offsets'][0]):
            if not name.startswith('thinker.'):
                continue  # Officially disabled output-audio keys, not understanding modules.
            item = header[name]
            shape, offsets = item.get('shape'), item.get('data_offsets')
            if (item.get('dtype') != 'BF16' or not isinstance(shape, list)
                    or any(type(value) is not int or value <= 0 for value in shape)
                    or not isinstance(offsets, list) or len(offsets) != 2
                    or any(type(value) is not int for value in offsets)):
                raise RuntimeError('Invalid original BF16 tensor description: ' + name)
            start, end = offsets
            size = 2 * math.prod(shape)
            if not 0 <= start < end <= payload_bytes or end - start != size or name in seen:
                raise RuntimeError('Invalid/duplicate BF16 tensor byte range: ' + name)
            target = next((device for prefix, device in DEVICE_MAP.items()
                           if name == prefix or name.startswith(prefix + '.')), None)
            if target is None:
                raise RuntimeError('No explicit tensor device: ' + name)
            if rows and start < rows[-1]['dataOffsets'][1]:
                raise RuntimeError('Overlapping understanding tensor byte ranges')
            rows.append({'name': name, 'shape': shape, 'dtype': 'BF16', 'bytes': size,
                         'dataOffsets': [start, end], 'target': target})
            seen.add(name)
            total_bytes += size
        plan.append({'file': shard, 'dataStart': data_start, 'tensors': rows,
                     'disabledOutputAudioKeys': len(declared)-len(rows)})
    if seen != expected or total_bytes != 9_406_928_896:
        raise RuntimeError('Complete original thinker keys/bytes differ from the fixed revision')
    return plan


def load_direct(model_root, index, folder, state, torch, psutil):
    """One owned original BF16 tensor at a time; no safetensors tensor accessor."""
    from accelerate import init_empty_weights
    from accelerate.utils import set_module_tensor_to_device
    from transformers import GenerationConfig, Qwen2_5OmniConfig, Qwen2_5OmniForConditionalGeneration

    def progress(stage, **details):
        state['stage'] = stage
        record = {'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'stage': stage,
                  'availableRamBytes': psutil.virtual_memory().available,
                  'processMemory': psutil.Process().memory_info()._asdict(),
                  'freeGpuBytes': torch.cuda.mem_get_info()[0], **details}
        append_record(folder / 'load-progress.jsonl', record)
        print(json.dumps(record, ensure_ascii=False), flush=True)

    progress('empty-model-before')
    config = Qwen2_5OmniConfig.from_pretrained(str(model_root), local_files_only=True)
    # Same official output-audio switch as the already-verified QA route; all
    # audio/visual/text understanding modules are constructed intact.
    config.enable_audio_output = False
    with init_empty_weights(include_buffers=False):
        model = Qwen2_5OmniForConditionalGeneration._from_config(
            config, torch_dtype=torch.bfloat16, attn_implementation='sdpa')
    model.tie_weights()
    expected = {key for key in index['weight_map'] if key.startswith('thinker.')}
    actual = set(dict(model.named_parameters()))
    if actual != expected:
        raise RuntimeError(f'Empty thinker keys differ: missing={sorted(expected-actual)[:4]}, extra={sorted(actual-expected)[:4]}')
    progress('empty-model-ready', metaParameterCount=sum(p.device.type == 'meta' for p in model.parameters()))
    shard_plan = bf16_header_plan(model_root, index)
    save(folder / 'direct-shard-plan.json', {'method': 'owned raw BF16 buffers plus official set_module_tensor_to_device',
        'deviceMap': DEVICE_MAP, 'dispatchModelCalled': False, 'automaticOffload': False,
        'fullOfficialIdentityPreviouslyVerified': True, 'shards': shard_plan,
        'maxSingleTensorBytes': max(row['bytes'] for shard in shard_plan for row in shard['tensors']),
        'transientBufferBound': 'One parameter at a time: one source bytearray and one owning CPU clone; never a full shard/model dictionary.',
        'note': 'All original files remain unchanged. All1442 thinker tensors/9406928896 BF16 bytes are loaded. Only official enable_audio_output=False output-audio keys are not materialized. Each CPU clone must round-trip to exactly the original tensor byte SHA before placement.'})
    loaded, loaded_bytes = set(), 0
    for number, row in enumerate(shard_plan, 1):
        if not row['tensors']:
            progress(f'shard-{number}-verified-output-audio-only', file=row['file'])
            continue
        progress(f'shard-{number}-load-before', file=row['file'], tensors=len(row['tensors']))
        with (model_root / row['file']).open('rb') as handle:
            for tensor in row['tensors']:
                name, size = tensor['name'], tensor['bytes']
                state['stage'] = 'tensor:' + name
                parameter = model.get_parameter(name)
                if name in loaded or list(parameter.shape) != tensor['shape'] or parameter.dtype != torch.bfloat16:
                    raise RuntimeError('Exact model tensor name/shape/dtype mismatch: ' + name)
                handle.seek(row['dataStart'] + tensor['dataOffsets'][0])
                raw = bytearray(size)
                raw_view = memoryview(raw)
                consumed = 0
                while consumed < size:
                    read = handle.readinto(raw_view[consumed:])
                    if not read:
                        raise RuntimeError('Incomplete original tensor payload: ' + name)
                    consumed += read
                original_sha = hashlib.sha256(raw_view).hexdigest()
                # clone() owns the storage; it cannot outlive an mmap/safetensors
                # Python storage handle. No numeric cast or quantization occurs.
                cpu_tensor = torch.frombuffer(raw, dtype=torch.bfloat16).clone().reshape(tensor['shape'])
                byte_view = cpu_tensor.view(torch.uint8).reshape(-1).numpy()
                roundtrip_sha = hashlib.sha256(memoryview(byte_view)).hexdigest()
                if roundtrip_sha != original_sha or cpu_tensor.numel() * cpu_tensor.element_size() != size:
                    raise RuntimeError('Original BF16 CPU byte round-trip failed: ' + name)
                set_module_tensor_to_device(model, name, tensor['target'], value=cpu_tensor, dtype=torch.bfloat16)
                placed = model.get_parameter(name)
                wanted_type = 'cpu' if tensor['target'] == 'cpu' else 'cuda'
                if (placed.device.type != wanted_type or placed.dtype != torch.bfloat16
                        or list(placed.shape) != tensor['shape']):
                    raise RuntimeError('Exact tensor placement failed: ' + name)
                append_record(folder / 'tensor-byte-identities.jsonl', {
                    'name': name, 'shard': row['file'], 'dataOffsets': tensor['dataOffsets'],
                    'shape': tensor['shape'], 'dtype': 'BF16', 'bytes': size, 'target': tensor['target'],
                    'originalPayloadSha256': original_sha, 'cpuRoundtripSha256': roundtrip_sha,
                    'matched': True, 'sourceMutated': False})
                loaded.add(name)
                loaded_bytes += size
                del byte_view, cpu_tensor, raw_view, raw, placed, parameter
                if len(loaded) % 64 == 0:
                    progress(f'shard-{number}-tensor-progress', tensorsLoaded=len(loaded), bytesLoaded=loaded_bytes)
        gc.collect()
        progress(f'shard-{number}-load-after', file=row['file'], tensorsLoaded=len(loaded), bytesLoaded=loaded_bytes,
                 remainingMetaParameters=sum(p.device.type == 'meta' for p in model.parameters()))
    if loaded != expected or len(loaded) != 1442 or loaded_bytes != 9_406_928_896:
        raise RuntimeError('Raw loading did not preserve the complete thinker')
    if any(p.device.type == 'meta' for p in model.parameters()):
        raise RuntimeError('Direct load left an understanding parameter on meta')
    # init_empty_weights leaves the small nonpersistent buffers real on CPU;
    # place each whole module once to align those buffers with its parameters.
    for name, target in DEVICE_MAP.items():
        child = model.get_submodule(name)
        child.to(target)
        if any(buffer.device.type != ('cpu' if target == 'cpu' else 'cuda') for buffer in child.buffers()):
            raise RuntimeError('Static module buffer placement mismatch: ' + name)
    if any(getattr(child, '_hf_hook', None) is not None for child in model.modules()):
        raise RuntimeError('Direct load unexpectedly installed device/offload hooks')
    model.hf_device_map = dict(DEVICE_MAP)  # Records asserted physical placement, never dispatches modules.
    model.generation_config = GenerationConfig.from_pretrained(str(model_root), local_files_only=True)
    model.load_speakers(str(model_root / 'spk_dict.pt'))
    progress('direct-static-load-complete')
    return model


def configure_caches():
    values = {'HF_HOME': 'huggingface', 'TORCH_HOME': 'torch', 'TEMP': 'tmp', 'TMP': 'tmp',
              'CUDA_CACHE_PATH': 'cuda', 'TRITON_CACHE_DIR': 'triton', 'NUMBA_CACHE_DIR': 'numba',
              'PYTHONPYCACHEPREFIX': 'pyc', 'XDG_CACHE_HOME': 'general'}
    for key, child in values.items():
        path = QA / 'cache' / child
        path.mkdir(parents=True, exist_ok=True)
        os.environ[key] = str(path)
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1',
                      HF_HUB_DISABLE_IMPLICIT_TOKEN='1', PYTHONDONTWRITEBYTECODE='1',
                      TOKENIZERS_PARALLELISM='false')


def parameter_layout(model, torch, groups, expected_visual_count):
    """Actual tensors, not hf_device_map or meta placeholders, are the acceptance source."""
    totals = {'cpu': 0, 'cuda': 0}
    counts = {'cpu': 0, 'cuda': 0}
    for name, parameter in model.named_parameters():
        if not name.startswith('thinker.') or parameter.dtype != torch.bfloat16:
            raise RuntimeError(f'Unexpected understanding parameter or dtype: {name}')
        expected = 'cpu' if name.startswith('thinker.visual.') else 'cuda'
        if parameter.device.type != expected or (expected == 'cuda' and parameter.device.index != 0):
            raise RuntimeError(f'Non-static or wrong parameter placement: {name}: {parameter.device}')
        totals[expected] += parameter.numel() * parameter.element_size()
        counts[expected] += 1
    if (totals['cpu'] != groups['thinker.visual'] or counts['cpu'] != expected_visual_count
            or sum(totals.values()) != groups['thinker']):
        raise RuntimeError('Complete original thinker/visual tensor identity size mismatch')
    if any(buffer.device.type != 'cpu' for buffer in model.thinker.visual.buffers()):
        raise RuntimeError('Visual buffer is not resident on CPU')
    if any(getattr(child, '_hf_hook', None) is not None for child in model.thinker.visual.modules()):
        raise RuntimeError('Visual retains an Accelerate execution/offload hook')
    return {'parameterBytesByDevice': totals, 'parameterCountByDevice': counts,
            'visualBuffersOnCpu': True, 'visualAccelerateHooksRemaining': 0,
            'metaParameterCount': 0, 'completeThinkerParameterBytes': sum(totals.values())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('catalog', type=Path)
    parser.add_argument('--probe-only', action='store_true')
    parser.add_argument('--quality-only', action='store_true', help='Blind completeness/noise review without asking for a transcript')
    args = parser.parse_args()
    if PROJECT.resolve().drive.lower() != 'd:' or not sys.dont_write_bytecode:
        raise RuntimeError('Run the D workspace via run-d1013.ps1 with Python -B')
    if not Path(sys.prefix).resolve().is_relative_to((QA / 'environment').resolve()):
        raise RuntimeError('Use the unchanged existing native QA environment only')
    configure_caches()
    shared = module('native_rules_cpuvisual1013', PROJECT / 'scripts/roster_voice_native1013.py')
    quality_prompt = ('只聆听这段音频本身，逐项回答以下三项，不要转写台词。'
        '1. 人声开头和结尾是否完整，有无被硬切断？'
        '2. 有无不自然重复、多余尾声或明显发音异常？'
        '3. 有无背景音乐、杂音或明显失真？'
        '每项必须单独回答；没有依据就写不确定。'
        '不根据文件名推测，不用ASR或波形代替听觉判断。')
    resources = module('resources_cpuvisual1013', PROJECT / 'scripts/roster_voice_resources1008.py')
    groups = resources.weight_groups()
    active_bytes = groups['thinker'] - groups['thinker.visual']
    snapshot = resources.snapshot()
    preflight = {**snapshot, 'mode': 'complete unchanged visual static CPU; audio/text/lm_head static CUDA',
        'thinkerWeightBytes': groups['thinker'], 'visualWeightBytes': groups['thinker.visual'],
        'activeCudaWeightBytes': active_bytes, 'minimumFreeGpuBytes': active_bytes + 800_000_000,
        'minimumAvailableRamBytes': 8 * 1024 ** 3, 'minimumFreeDiskBytes': 2 * 1024 ** 3,
        'gpuSafetyMarginBytes': 800_000_000, 'usesPreviousPureGpuCalibration': False}
    preflight['passed'] = (snapshot['freeGpuBytes'] >= preflight['minimumFreeGpuBytes']
        and snapshot['availablePhysicalMemoryBytes'] >= preflight['minimumAvailableRamBytes']
        and snapshot['DfreeBytes'] >= preflight['minimumFreeDiskBytes'])
    print(json.dumps({'stage': 'preflight', **preflight}), flush=True)
    if args.probe_only:
        return
    OUTPUT.mkdir(exist_ok=True)
    readme = OUTPUT / 'README.md'
    if not readme.exists():
        readme.write_text('# Static CPU visual native audio QA1013\n\nEach dated child records a complete verified unchanged thinker. Only its unused visual module resides on CPU; audio tower, text model and lm_head reside on CUDA. Explicit Accelerate loader hooks on visual are removed through the official API, then all visual tensors/buffers and all active CUDA parameters are asserted. No auto mapping, disk offload, quantization, deleted understanding modules or image/video inputs. Every result keeps native input features, exact audio SHA and blind prompt. Responses are not formal adoption or human audition. Pure-GPU calibration does not certify this route.\n', encoding='utf-8')
    folder = OUTPUT / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    folder.mkdir()
    (folder / 'README.md').write_text(
        '# Direct-device static-visual QA attempt1013\n\n'
        'This dated attempt uses official init_empty_weights, original safetensors header offsets, owned raw BF16 CPU buffers and official set_module_tensor_to_device. '
        'It does not use safetensors.get_tensor, the earlier mixed-device loaders or dispatch/offload hooks. '
        'All17 official files are freshly SHA-verified, including disabled output-audio weights that remain untouched on disk. '
        'Every understanding parameter is checked; visual is static CPU and active audio/text modules static CUDA. '
        'startup.json and loader-source.py preserve the exact program before loading; stderr.log includes faulthandler, '
        'load-progress.jsonl records shard/tensor progress, tensor-byte-identities.jsonl records exact original/CPU-roundtrip SHA for all1442 tensors, and resource-samples.jsonl records available RAM/GPU once per second. '
        'No response constitutes formal game adoption.\n', encoding='utf-8')
    persist_stderr(folder)
    source_snapshot = folder / 'loader-source.py'
    shutil.copyfile(Path(__file__), source_snapshot)
    save(folder / 'startup.json', {
        'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'script': str(Path(__file__).resolve()),
        'scriptSha256': sha_file(Path(__file__)), 'sourceSnapshot': str(source_snapshot),
        'sourceSnapshotSha256': sha_file(source_snapshot), 'catalog': str(args.catalog.resolve()),
        'catalogSha256': sha_file(args.catalog), 'pythonExecutable': sys.executable,
        'pythonPrefix': sys.prefix, 'deviceMap': DEVICE_MAP,
        'loadMethod': 'official empty initialization, owned raw BF16 buffers by verified header offsets, official set_module_tensor_to_device; no safetensors.get_tensor or dispatch',
        'stderr': str(folder / 'stderr.log'), 'fatalHandlerEnabled': True,
        'modelLoadedAtThisRecord': False})
    save(folder / 'preflight.json', preflight)
    if not preflight['passed']:
        raise RuntimeError('Insufficient current resource margin; no model loaded')
    identity_path = QA / 'evidence/model-download-after1003.json'
    identity = json.loads(identity_path.read_bytes())
    if (identity.get('revision') != REVISION or not identity.get('allOfficialIdentitiesVerified')
            or len(identity.get('files', [])) != 17):
        raise RuntimeError('Require the complete official 17-file identity receipt')
    model_root = (QA / 'models/qwen25-omni3b').resolve()
    verified = []
    for row in identity['files']:
        path = (model_root / row['file']).resolve()
        if (not path.is_relative_to(model_root) or path.stat().st_size != row['bytes']
                or sha_file(path) != row['sha256']):
            raise ValueError('Official checkpoint file identity mismatch: ' + row['file'])
        verified.append(row)
    save(folder / 'model-identity.json', {'revision': REVISION, 'files': verified,
         'freshShaMatched': True, 'officialReceiptSha256': sha_file(identity_path)})
    index = json.loads((model_root / 'model.safetensors.index.json').read_bytes())
    expected_visual_count = sum(name.startswith('thinker.visual.') for name in index['weight_map'])
    rows = json.loads(args.catalog.read_text(encoding='utf-8-sig'))['clips']
    if not 1 <= len(rows) <= 12:
        raise ValueError('This sequential batch is limited to 1..12 exact audio clips')
    manifest = []
    for number, row in enumerate(rows, 1):
        source = Path(row['path']).resolve()
        if (not source.is_relative_to(CLOSURE.resolve()) or source.suffix.lower() != '.wav'
                or sha_file(source) != row['sha256']):
            raise ValueError('Candidate WAV identity or allowed D root mismatch')
        review_mode = 'quality_only' if args.quality_only else row.get('reviewMode', 'content_and_quality')
        if review_mode not in ('content_and_quality', 'quality_only'):
            raise ValueError('Only the two fixed blind review prompts are supported')
        manifest.append({'index': number, 'source': str(source), 'sha256': row['sha256'], 'reviewMode': review_mode,
                         'target': str(folder / f'sound-{number:02}.wav')})
    save(folder / 'copy-before.json', manifest)
    for row in manifest:
        shutil.copyfile(row['source'], row['target'])
        if sha_file(row['target']) != row['sha256']:
            raise ValueError('Blind copy changed audio bytes')
    save(folder / 'copy-after.json', manifest)
    import psutil
    import torch
    import transformers
    from qwen_omni_utils import process_mm_info
    from transformers import Qwen2_5OmniProcessor
    done = threading.Event()
    state = {'stage': 'load', 'started': time.monotonic()}
    def watch():
        while not done.wait(1):
            ram, gpu_free = psutil.virtual_memory().available, torch.cuda.mem_get_info()[0]
            append_record(folder / 'resource-samples.jsonl', {
                'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'stage': state['stage'],
                'availableRamBytes': ram, 'freeGpuBytes': gpu_free,
                'processMemory': psutil.Process().memory_info()._asdict()})
            if ram < 1.5 * 1024 ** 3 or gpu_free < 256 * 1024 ** 2:
                save(folder / 'resource-stop.json', {'stage': state['stage'], 'freeRam': ram,
                    'freeGpu': gpu_free, 'accepted': False, 'reason': 'Only own QA process stopped for resource margin'})
                os._exit(78)
    thread = threading.Thread(target=watch, daemon=True)
    thread.start()
    try:
        torch.cuda.reset_peak_memory_stats()
        model = load_direct(model_root, index, folder, state, torch, psutil)
        if model.has_talker or model.hf_device_map != DEVICE_MAP:
            raise RuntimeError('Unexpected official audio-output or explicit loader map')
        layout = parameter_layout(model, torch, groups, expected_visual_count)
        visual_forward_calls = [0]
        def forbid_visual(_module, _inputs):
            visual_forward_calls[0] += 1
            raise RuntimeError('Visual forward attempted during audio-only QA')
        model.thinker.visual.register_forward_pre_hook(forbid_visual)
        model.eval()
        processor = Qwen2_5OmniProcessor.from_pretrained(str(model_root), local_files_only=True)
        env_lib = Path(sys.prefix) / 'Lib/site-packages'
        basis_files = [Path(__file__), PROJECT / 'scripts/roster_voice_native1013.py',
            PROJECT / 'scripts/roster_voice_resources1008.py',
            env_lib / 'accelerate/big_modeling.py', env_lib / 'accelerate/utils/modeling.py',
            env_lib / 'transformers/models/qwen2_5_omni/modeling_qwen2_5_omni.py']
        save(folder / 'basis.json', {'deviceMap': DEVICE_MAP, 'weightGroupsBytes': groups,
            'visualTensorCountFromOfficialIndex': expected_visual_count,
            'placementMethod': 'official init_empty_weights, one original BF16 tensor buffer at a time, exact CPU byte roundtrip SHA, official set_module_tensor_to_device with fixed map; no safetensors.get_tensor or dispatch/offload hooks',
            'sourceFiles': [{'path': str(path), 'sha256': sha_file(path)} for path in basis_files]})
        save(folder / 'runtime.json', {'torch': torch.__version__, 'transformers': transformers.__version__,
            'revision': REVISION, 'deviceMap': model.hf_device_map, 'dtype': str(model.dtype), **layout,
            'loadSeconds': time.monotonic() - state['started'], 'staticCpuVisual': True,
            'cpuOffload': False, 'automaticDeviceMapping': False, 'diskOffload': False,
            'loaderTemporarilyUsedExplicitCpuBacking': False, 'visualHooksRemovedBeforeInference': False,
            'visualHooksNeverInstalled': True, 'perShardDirectDeviceInitialization': True,
            'ownedOriginalBf16Buffers': True, 'expectedThinkerTensors': 1442,
            'quantized': False, 'audioUploads': 0, 'visualForwardCalls': 0})
        for row in manifest:
            state['stage'] = f"sound-{row['index']:02}"
            start = time.monotonic()
            review_prompt = quality_prompt if row['reviewMode'] == 'quality_only' else shared.PROMPT
            messages = [
                {'role': 'system', 'content': [{'type': 'text', 'text': 'You are a careful audio understanding assistant. Report only what the audio supports.'}]},
                {'role': 'user', 'content': [{'type': 'audio', 'audio': row['target']}, {'type': 'text', 'text': review_prompt}]},
            ]
            text = processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
            audios, images, videos = process_mm_info(messages, use_audio_in_video=False)
            if images is not None or videos is not None:
                raise RuntimeError('Image/video input is forbidden')
            inputs = processor(text=text, audio=audios, images=None, videos=None,
                return_tensors='pt', padding=True, use_audio_in_video=False)
            if any(inputs.get(key) is not None for key in ('pixel_values', 'pixel_values_videos', 'image_grid_thw', 'video_grid_thw')):
                raise RuntimeError('Processor produced forbidden visual inputs')
            features = inputs.get('input_features')
            if features is None or not features.numel() or not torch.isfinite(features).all().item():
                raise RuntimeError('Native audio input features missing or invalid')
            shapes = {key: list(value.shape) for key, value in inputs.items() if hasattr(value, 'shape')}
            inputs = inputs.to('cuda:0').to(model.dtype)
            with torch.inference_mode():
                generated = model.generate(**inputs, return_audio=False,
                    thinker_do_sample=False, thinker_max_new_tokens=256)
            if visual_forward_calls[0] != 0:
                raise RuntimeError('Visual path was executed unexpectedly')
            response = processor.batch_decode(generated[:, inputs.input_ids.shape[1]:],
                skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
            receipt = {'index': row['index'], 'audioSha256': row['sha256'], 'prompt': review_prompt,
                'reviewMode': row['reviewMode'],
                'expectedTextProvided': False, 'nativeFeatureShapes': shapes, 'response': response,
                'validAudioFeatureFrames': int(inputs['feature_attention_mask'].sum().item()),
                'generatedTokens': int(generated.shape[1] - inputs.input_ids.shape[1]),
                'hitTokenLimit': int(generated.shape[1] - inputs.input_ids.shape[1]) >= 256,
                'responseSha256': hashlib.sha256(response.encode()).hexdigest(), 'modelRevision': REVISION,
                'elapsedSeconds': time.monotonic()-start, 'peakAllocatedGpuBytes': torch.cuda.max_memory_allocated(),
                'freeRamBytes': psutil.virtual_memory().available, 'freeGpuBytes': torch.cuda.mem_get_info()[0],
                'staticCpuVisual': True, 'visualForwardCalls': visual_forward_calls[0],
                'humanListened': False, 'adopted': False, 'status': 'native_response_requires_review'}
            save(folder / f"result-{row['index']:02}.json", receipt)
            print(json.dumps(receipt, ensure_ascii=False), flush=True)
            if not response.strip() or any(phrase in response for phrase in ('不能原生聆听', '无法聆听', '没有提供音频', '未提供音频')):
                raise RuntimeError('No confirmed native audio review response; no further clips attempted')
            del inputs, generated, features, audios, images, videos
        final_layout = parameter_layout(model, torch, groups, expected_visual_count)
        save(folder / 'completed.json', {'recordDir': str(folder), 'responses': len(manifest), 'adopted': False,
            'staticCpuVisual': True, 'visualForwardCalls': visual_forward_calls[0], **final_layout})
    except Exception as error:
        save(folder / 'failure.json', {'stage': state['stage'], 'errorType': type(error).__name__,
            'error': str(error), 'adopted': False})
        raise
    finally:
        done.set()
        thread.join(timeout=2)


if __name__ == '__main__':
    main()
