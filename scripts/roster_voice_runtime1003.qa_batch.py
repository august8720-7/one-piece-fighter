"""Blind local native audio review of the first pair's exact 16 prepared trims.

Loads the verified Qwen model once. No expected transcript enters a request,
no standalone ASR is used, no audio leaves the machine, and no adoption files
are modified. Raw responses need a separate content/use decision.
"""
from datetime import datetime, timezone
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import threading
import time
import wave

PROJECT = Path(__file__).resolve().parents[1]
QA_ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()
CATALOG = PROJECT / 'scripts/roster_voice_adoption1003.voices.json'
CLARITY_CATALOG = PROJECT / 'scripts/roster_voice_clarity_candidates1004.json'
EVIDENCE_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003/validation').resolve()
ACTIVE_FOLDER = None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    data = value if isinstance(value, bytes) else (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    with path.open('xb') as output:
        output.write(data)


def load_rows():
    catalog_bytes = CATALOG.read_bytes()
    rows = json.loads(catalog_bytes)['files']
    if len(rows) != 16 or {row['index'] for row in rows} != set(range(1, 17)):
        raise ValueError('The authorized first-pair 16-clip catalog changed')
    result = []
    for row in sorted(rows, key=lambda entry: entry['index']):
        if row['character'] not in ('aokiji', 'shanks') or row['originalSyntheticSpeech'] is not True:
            raise ValueError('Only the first pair original synthetic clips are in this local batch')
        path = Path(row['candidate']).resolve()
        if not path.is_relative_to(EVIDENCE_ROOT.parent / 'candidates') or digest(path.read_bytes()) != row['candidateSha256']:
            raise ValueError('The exact prepared candidate audio identity changed')
        runtime = PROJECT / 'public/assets/audio/voice' / row['character'] / f"preview-{row['event']}-kokoro-original1003.wav"
        if not runtime.is_file() or digest(runtime.read_bytes()) != row['candidateSha256']:
            raise ValueError('Runtime candidate and reviewed trim must be the same audio bytes')
        with wave.open(str(path), 'rb') as audio:
            if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth(), audio.getcomptype()) != (24000, 1, 2, 'NONE'):
                raise ValueError('Unexpected prepared PCM WAV format')
            duration = audio.getnframes() / audio.getframerate()
        # Expected text and generation metadata deliberately never enter this
        # returned request inventory or any model conversation.
        result.append({'index': row['index'], 'character': row['character'], 'event': row['event'],
                       'audio': str(path), 'audioSha256': row['candidateSha256'],
                       'runtimeFile': str(runtime), 'durationSeconds': duration})
    return result, digest(catalog_bytes)


def load_clarity_rows():
    """Only the three explicitly supplied new synthetic trims, never text hints."""
    expected = {
        1: '2b552c1c06b197d15dd799671a63f5ad90d0fe67f2c26b58f85c6ac7ab1d76b0',
        2: '4b0ce0d4ea9a8d8738069e8ee67eb8a1359a8563a52891abfd8a76e688e981a9',
        3: '6460845d22bd08838ada6ecface6d64c61c95c016130c42742232bd38b9524ca',
    }
    raw = CLARITY_CATALOG.read_bytes()
    rows = json.loads(raw)['files']
    if len(rows) != 3 or {row['index'] for row in rows} != set(expected):
        raise ValueError('Only the three explicitly supplied revised clips are authorized here')
    result = []
    for row in sorted(rows, key=lambda entry: entry['index']):
        if row['character'] != 'shanks' or row['originalSyntheticSpeech'] is not True:
            raise ValueError('Clarity review is limited to these new original synthetic Shanks clips')
        path = Path(row['candidate']).resolve()
        if (not path.is_relative_to(EVIDENCE_ROOT.parent / 'candidates')
                or row['candidateSha256'] != expected[row['index']]
                or digest(path.read_bytes()) != expected[row['index']]):
            raise ValueError('Exact revised candidate audio identity changed')
        source = Path(row['sourceFile']).resolve()
        if not source.is_relative_to(PROJECT / 'public/assets/audio/sources/roster-1003') or digest(source.read_bytes()) != row['sourceSha256']:
            raise ValueError('The original synthetic source identity changed')
        with wave.open(str(path), 'rb') as audio:
            if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth(), audio.getcomptype()) != (24000, 1, 2, 'NONE'):
                raise ValueError('Unexpected revised candidate PCM format')
            candidate_pcm = audio.readframes(audio.getnframes())
            duration = audio.getnframes() / audio.getframerate()
        with wave.open(str(source), 'rb') as original:
            if (original.getframerate(), original.getnchannels(), original.getsampwidth(), original.getcomptype()) != (24000, 1, 2, 'NONE'):
                raise ValueError('Unexpected original PCM format')
            source_pcm = original.readframes(original.getnframes())
        first, last = row['sourceFirstFrame'], row['sourceLastFrameExclusive']
        if (not isinstance(first, int) or not isinstance(last, int) or first < 0 or last <= first
                or source_pcm[first * 2:last * 2] != candidate_pcm):
            raise ValueError('Prepared trim does not match the exact original PCM range')
        result.append({'index': row['index'], 'character': row['character'], 'event': row['event'],
                       'audio': str(path), 'audioSha256': expected[row['index']], 'durationSeconds': duration,
                       'runtimeFile': None, 'runtimeCopied': False, 'sourceSha256': row['sourceSha256'],
                       'sourceFirstFrame': first, 'sourceLastFrameExclusive': last, 'originalPcmRangeVerified': True})
    # Neither the generated text nor role/purpose descriptions enter model text.
    return result, digest(raw)


def main(gpu_gib=8, clarity_three=False, release_sfx=False, sfx_quality_gaps=False, remaining_batch=None):
    global ACTIVE_FOLDER
    if sys.prefix == sys.base_prefix or not Path(sys.prefix).resolve().is_relative_to(QA_ROOT):
        raise RuntimeError('Run only with the existing isolated D:/ native QA Python')
    spec = importlib.util.spec_from_file_location('qa_single', Path(__file__).with_name('roster_voice_runtime1003.qa_infer.py'))
    single = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(single)
    single.setup_paths()
    if shutil.disk_usage('D:/').free < 15_000_000_000:
        raise RuntimeError('Preserve at least 15 GB game output space')
    if not (QA_ROOT / 'evidence/model-download-after1003.json').is_file():
        raise RuntimeError('Require the existing complete official model identity receipt')
    sfx = None
    provenance = None
    evidence_root = EVIDENCE_ROOT
    if remaining_batch:
        remaining_spec=importlib.util.spec_from_file_location('qa_remaining',Path(__file__).with_name('roster_voice_runtime1003.qa_remaining1004.py'))
        remaining=importlib.util.module_from_spec(remaining_spec);remaining_spec.loader.exec_module(remaining)
        rows,provenance=remaining.load_batch(remaining_batch)
        catalog=remaining.CATALOG;catalog_sha=digest(catalog.read_bytes());evidence_root=remaining.VALIDATION_ROOT
    elif release_sfx or sfx_quality_gaps:
        sfx_spec = importlib.util.spec_from_file_location('qa_release_sfx', Path(__file__).with_name('roster_voice_runtime1003.qa_sfx1004.py'))
        sfx = importlib.util.module_from_spec(sfx_spec)
        sfx_spec.loader.exec_module(sfx)
        rows, provenance = sfx.load_quality_gap_rows() if sfx_quality_gaps else sfx.load_release_rows()
        catalog = sfx.RUNTIME
        catalog_sha = digest(catalog.read_bytes())
    else:
        rows, catalog_sha = load_clarity_rows() if clarity_three else load_rows()
        catalog = CLARITY_CATALOG if clarity_three else CATALOG
    prefix = (f'native-local-remaining-gpu{gpu_gib}g1004-' if remaining_batch else
              f'native-local-release-sfx-quality5-gpu{gpu_gib}g1004-' if sfx_quality_gaps else
              f'native-local-release-sfx-gpu{gpu_gib}g1004-' if release_sfx else
              f'native-local-clarity3-gpu{gpu_gib}g1004-' if clarity_three else f'native-local-gpu{gpu_gib}g1004-')
    folder = evidence_root / (prefix + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    folder.mkdir()
    ACTIVE_FOLDER = folder
    save(folder / 'README.md', b'# Exact-trim local native QA1004\nOnly the declared requested clips, each with a separate blind conversation. No expected text or character/purpose description supplied. Request/response/runtime receipts are immutable and bound to exact candidate WAV SHA256. New clarity candidates are not yet runtime copies; adoption must copy their same bytes later. Native model assessment is not human audition, game playback/mixing, voice identity approval, or automatic adoption. No audio uploads/server. Preserve all old files and results.\n')
    if release_sfx or sfx_quality_gaps or remaining_batch:
        save(folder / ('remaining-batch-before.json' if remaining_batch else 'release-mapping-before.json'), provenance)
        blind = folder / 'blind-inputs'
        blind.mkdir()
        save(blind / 'README.md', b'# Exact-byte blind SFX copies\nNumbered copies hide character/move/source descriptions from model filenames. SHA and decoded PCM remain exactly the actual runtime WAV bytes. No gain, filtering, looping, padding, resampling or game file changes. Mapping/provenance are separate and never provided as model text.\n')
        before = [{'index': row['index'], 'source': row['audio'], 'target': str(blind/f"sound-{row['index']:02}.wav"),
                   'sha256': row['audioSha256'], 'pcmSha256': row['pcmSha256']} for row in rows]
        save(folder / 'blind-copy-before.json', before)
        for row, copy in zip(rows, before):
            shutil.copyfile(copy['source'], copy['target'])
            if digest(Path(copy['target']).read_bytes()) != copy['sha256']:
                raise ValueError('Blind runtime SFX copy changed bytes')
            if remaining_batch:
                row['exactPreparedFile'] = row['audio']
                row['runtimeFile'] = None
            else:
                row['runtimeFile'] = row['audio']
            row['audio'] = copy['target']
        save(folder / 'blind-copy-after.json', before)
        if sfx is not None: single.PROMPT = sfx.QUALITY_PROMPT if sfx_quality_gaps else sfx.PROMPT
    first_index = 7 if any(row['index'] == 7 for row in rows) else rows[0]['index']
    save(folder / 'inventory-before.json', {'catalog': str(catalog), 'catalogSha256': catalog_sha, 'clips': rows,
                                           'firstTrialIndex': first_index, 'gpuBudgetGiB': gpu_gib, 'requested': len(rows),
                                           'releaseSfxOnly': release_sfx or sfx_quality_gaps,
                                           'qualityFollowupOnly': sfx_quality_gaps,
                                           'actualMappedReleases': provenance['actualMoveCount'] if provenance else None,
                                           'expectedTranscriptProvided': False, 'audioUploads': 0, 'formalAdopted': 0})
    print(json.dumps({'status': 'native-local-exact-trim-batch-start', 'requested': len(rows), 'recordDir': str(folder)}, ensure_ascii=False), flush=True)
    import torch
    import transformers
    import psutil
    from qwen_omni_utils import process_mm_info
    from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniProcessor
    if not torch.cuda.is_available():
        raise RuntimeError('Actual CUDA unavailable')
    free_gpu, total_gpu = torch.cuda.mem_get_info()
    header_spec = importlib.util.spec_from_file_location('qa_headers', Path(__file__).with_name('roster_voice_runtime1003.qa_cpu1004.py'))
    headers = importlib.util.module_from_spec(header_spec)
    header_spec.loader.exec_module(headers)
    groups = headers.actual_weight_bytes()
    gpu_budget = gpu_gib * 1024 ** 3
    available_ram = psutil.virtual_memory().available
    cpu_reserve = 2 * 1024 ** 3
    cpu_budget = available_ram - cpu_reserve
    # This guide is computed from actual checkpoint bytes, not the 3B name.
    # Auto placement is checked after loading; no disk placement is allowed.
    cpu_weight_guide = max(0, groups['thinker']['storedBytes'] - gpu_budget + groups['thinker.lm_head']['storedBytes'])
    preflight = {'observedAtUtc': datetime.now(timezone.utc).isoformat(),
                 'freeGpuBytes': free_gpu, 'totalGpuBytes': total_gpu,
                 'availablePhysicalMemoryBytes': available_ram, 'gpuResidentBudgetBytes': gpu_budget,
                 'gpuActivityAndSafetyMarginBytes': 600_000_000,
                 'cpuBudgetBytes': cpu_budget, 'cpuPhysicalReserveBytes': cpu_reserve,
                 'actualThinkerBfloat16Bytes': groups['thinker']['storedBytes'],
                 'cpuWeightPlacementGuideBytes': cpu_weight_guide,
                 'minimumFreeGpuBytes': gpu_budget + 600_000_000,
                 'minimumAvailablePhysicalMemoryBytes': cpu_weight_guide + cpu_reserve,
                 'basis': 'Requested GPU GiB plus 0.6 GB activity/safety margin; remaining original BF16 CPU placement uses current RAM minus 2 GiB. No disk, quantization or CPU-only retry.',
                 'changesSystemOrOtherProcesses': False}
    save(folder / 'resource-before.json', preflight)
    if free_gpu < preflight['minimumFreeGpuBytes'] or preflight['availablePhysicalMemoryBytes'] < preflight['minimumAvailablePhysicalMemoryBytes']:
        raise RuntimeError('Insufficient current GPU/RAM headroom; do not load the model or change other processes/system settings')
    torch.cuda.reset_peak_memory_stats()
    state = {'phase': 'model-loading', 'index': None, 'started': time.monotonic(), 'stop': False}
    done = threading.Event()
    process = psutil.Process()
    def resource_snapshot():
        info = process.memory_info()
        free, _ = torch.cuda.mem_get_info()
        ram = psutil.virtual_memory().available
        return {'observedAtUtc': datetime.now(timezone.utc).isoformat(), 'phase': state['phase'], 'index': state['index'],
                'elapsedSeconds': time.monotonic() - state['started'], 'availablePhysicalMemoryBytes': ram,
                'freeGpuBytes': free, 'processRssBytes': info.rss, 'processPrivateBytes': getattr(info, 'private', None),
                'processPeakWorkingSetBytes': getattr(info, 'peak_wset', None)}
    def heartbeat():
        while not done.wait(25):
            snapshot = resource_snapshot()
            if snapshot['freeGpuBytes'] < 256 * 1024 ** 2 or snapshot['availablePhysicalMemoryBytes'] < 500_000_000:
                state['stop'] = True
            with (folder / 'progress.jsonl').open('a', encoding='utf-8') as log:
                log.write(json.dumps(snapshot, ensure_ascii=False) + '\n')
            print(json.dumps({'status': 'native-gpu-cpu-progress', **snapshot}, ensure_ascii=False), flush=True)
    watcher = threading.Thread(target=heartbeat, daemon=True)
    watcher.start()
    try:
        return run_native_batch(folder, rows, single, gpu_gib, cpu_budget, state, resource_snapshot)
    finally:
        done.set()
        watcher.join(timeout=2)


def run_native_batch(folder, rows, single, gpu_gib, cpu_budget, state, resource_snapshot):
    import torch
    import psutil
    import transformers
    from qwen_omni_utils import process_mm_info
    from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniProcessor, StoppingCriteria, StoppingCriteriaList
    loaded_at = time.monotonic()
    model = Qwen2_5OmniForConditionalGeneration.from_pretrained(str(QA_ROOT / 'models/qwen25-omni3b'),
        torch_dtype=torch.bfloat16, device_map='auto', max_memory={0: f'{gpu_gib}GiB', 'cpu': cpu_budget},
        enable_audio_output=False, attn_implementation='sdpa', low_cpu_mem_usage=True, local_files_only=True,
        offload_state_dict=False)
    if model.has_talker:
        raise RuntimeError('Do not load unused audio generation components')
    if 'disk' in model.hf_device_map.values():
        raise RuntimeError('This GPU plus CPU trial must not use disk offload')
    # CPU offload in Accelerate legitimately leaves meta placeholders in the
    # module while keeping its real BF16 tensors in an in-memory state_dict.
    # Check that actual backing; meta alone is not evidence of disk placement.
    sources = {}
    for name, module in model.named_modules():
        hook = getattr(module, '_hf_hook', None)
        hooks = getattr(hook, 'hooks', [hook])
        for current_hook in hooks:
            backing = getattr(current_hook, 'weights_map', None)
            while backing is not None and hasattr(backing, 'dataset'):
                backing = backing.dataset
            if backing is None or id(backing) in sources:
                continue
            memory = getattr(backing, 'state_dict', None)
            if (not isinstance(memory, dict) or not memory
                    or getattr(backing, 'index', {}) or getattr(backing, 'save_folder', None)
                    or any(not isinstance(tensor, torch.Tensor) or tensor.device.type != 'cpu' for tensor in memory.values())):
                raise RuntimeError('CPU offload must be backed by actual in-memory CPU tensors with no disk index/folder')
            sources[id(backing)] = {'firstModule': name, 'tensorCount': len(memory),
                                    'bytes': sum(t.numel() * t.element_size() for t in memory.values()),
                                    'allTensorsCpu': True, 'diskIndexEmpty': True, 'diskFolder': None}
    meta_count = 0
    for name, parameter in model.named_parameters():
        if parameter.device.type != 'meta':
            continue
        prefixes = [key for key in model.hf_device_map if key == '' or name == key or name.startswith(key + '.')]
        placement = model.hf_device_map[max(prefixes, key=len)]
        if placement != 'cpu' or not sources:
            raise RuntimeError('Unexpected meta parameter without verified CPU RAM backing')
        meta_count += 1
    cpu_backing = {'sourceCount': len(sources), 'sources': list(sources.values()),
                   'cpuMetaParameterCount': meta_count, 'metaIsCpuRamOffloadPlaceholder': meta_count > 0}
    model.eval()
    processor = Qwen2_5OmniProcessor.from_pretrained(str(QA_ROOT / 'models/qwen25-omni3b'), local_files_only=True)
    revision = json.loads((QA_ROOT / 'evidence/budget-before1003.json').read_bytes())['revision']
    runtime = {'officialModel': 'Qwen/Qwen2.5-Omni-3B', 'modelRevision': revision,
               'torch': torch.__version__, 'transformers': transformers.__version__,
               'GPU': torch.cuda.get_device_name(0), 'totalGpuBytes': torch.cuda.get_device_properties(0).total_memory,
               'deviceMap': model.hf_device_map, 'loadSeconds': time.monotonic() - loaded_at,
               'gpuBudgetGiB': gpu_gib, 'cpuBudgetBytes': cpu_budget, 'diskOffloadUsed': False,
               'dtype': str(model.dtype), 'gpuParameterBytes': sum(p.numel()*p.element_size() for p in model.parameters() if p.device.type == 'cuda'),
               'cpuParameterBytes': sum(p.numel()*p.element_size() for p in model.parameters() if p.device.type == 'cpu'),
               'cpuOffloadBacking': cpu_backing,
               'resourceAfterLoad': resource_snapshot(),
               'audioUploads': 0, 'humanListened': False, 'formalAdopted': 0}
    save(folder / 'model-runtime.json', runtime)
    summary = []
    class StopForResourcePressure(StoppingCriteria):
        def __call__(self, input_ids, scores, **kwargs):
            if state.get('cachedBudgetGuard') is not None:
                state['cachedBudgetGuard']()
            return state['stop']
    first_index = 7 if any(row['index'] == 7 for row in rows) else rows[0]['index']
    order = [next(row for row in rows if row['index'] == first_index)] + [row for row in rows if row['index'] != first_index]
    for position, row in enumerate(order):
        if state['stop']:
            break
        clip_dir = folder / f"clip-{row['index']:02}"
        clip_dir.mkdir()
        save(clip_dir / 'README.md', b'# Exact trim blind review\nOne audio clip, fresh independent model conversation, no transcript hints. Response is unapproved native model assessment. Preserve request, response and result.\n')
        request = {**row, 'prompt': single.PROMPT, 'expectedTranscriptProvided': False,
                   'audioUploads': 0, 'originalSyntheticAudio': row.get('sourceKind') != 'original-game-sfx-design-from-CC0-recordings',
                   'expectedSoundClassProvided': False, 'characterOrMoveDescriptionsProvidedAsModelText': False,
                   'firstExactTrimTrial': position == 0,
                   'gpuBudgetGiB': gpu_gib, 'diskOffloadUsed': False}
        save(clip_dir / 'request.json', request)
        start = time.monotonic()
        state.update(phase='clip-native-generation', index=row['index'], started=start)
        resource_before = resource_snapshot()
        try:
            if digest(Path(row['audio']).read_bytes()) != row['audioSha256']:
                raise ValueError('Audio bytes changed after the inventory')
            conversation = [
                {'role': 'system', 'content': [{'type': 'text', 'text': 'You are a careful audio understanding assistant. Report only what the audio supports.'}]},
                {'role': 'user', 'content': [{'type': 'audio', 'audio': row['audio']}, {'type': 'text', 'text': single.PROMPT}]},
            ]
            text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
            save(clip_dir / 'model-text-template.txt', text.encode('utf-8'))
            audios, images, videos = process_mm_info(conversation, use_audio_in_video=False)
            inputs = processor(text=text, audio=audios, images=images, videos=videos, return_tensors='pt', padding=True, use_audio_in_video=False)
            features = inputs.get('input_features')
            mask = inputs.get('feature_attention_mask')
            if features is None or features.numel() == 0 or mask is None or mask.sum().item() == 0:
                raise RuntimeError('No real native audio features and active feature frames')
            if not torch.isfinite(features).all().item():
                raise RuntimeError('Invalid audio features')
            shapes = {key: list(value.shape) for key, value in inputs.items() if hasattr(value, 'shape')}
            valid_frames = int(mask.sum().item())
            save(clip_dir / 'native-input-before-generation.json', {'audioSha256': row['audioSha256'],
                'inputAudioAttached': True, 'nativeAudioFeatureShapes': shapes, 'validAudioFeatureFrames': valid_frames,
                'expectedTranscriptProvided': False, 'audioUploads': 0})
            inputs = inputs.to(model.device).to(model.dtype)
            torch.cuda.reset_peak_memory_stats()
            with torch.inference_mode():
                generated = model.generate(**inputs, return_audio=False, max_new_tokens=384, do_sample=False,
                                           stopping_criteria=StoppingCriteriaList([StopForResourcePressure()]))
            generated = generated[:, inputs.input_ids.shape[1]:]
            response = processor.batch_decode(generated, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
            if not response.strip():
                raise RuntimeError('Native model returned an empty QA response')
            save(clip_dir / 'response.txt', response.encode('utf-8'))
            resource_after = resource_snapshot()
            stable = not state['stop'] and resource_after['availablePhysicalMemoryBytes'] >= 1_000_000_000 and resource_after['freeGpuBytes'] >= 256 * 1024 ** 2
            result = {'status': 'native-model-response-requires-review' if stable else 'native-response-resource-unstable-not-accepted', 'request': request,
                      'inputAudioAttached': True, 'nativeAudioFeatureShapes': shapes, 'validAudioFeatureFrames': valid_frames,
                      'modelRevision': revision, 'responseSha256': digest(response.encode('utf-8')), 'response': response,
                      'elapsedSeconds': time.monotonic() - start, 'peakAllocatedGpuBytes': torch.cuda.max_memory_allocated(),
                      'resourceBefore': resource_before, 'resourceAfter': resource_after, 'resourceStable': stable,
                      'humanListened': False, 'gamePlaybackVerified': False, 'formalAdopted': 0, 'audioUploads': 0}
            save(clip_dir / 'native-result.json', result)
            summary.append(result)
            print(json.dumps({'index': row['index'], 'status': result['status'], 'seconds': result['elapsedSeconds'], 'response': response}, ensure_ascii=False), flush=True)
            del inputs, generated
            if not stable or any(phrase in response for phrase in ('不能原生聆听', '无法聆听', '没有提供音频')):
                break
            if position == 0:
                save(folder / 'exact-trim-gpu-cpu-trial.json', result)
                print(json.dumps({'status': 'exact-trim-native-response-memory-stable', 'continueSameProcessToRequestedClips': len(rows)}), flush=True)
        except Exception as error:
            failure = {'index': row['index'], 'status': 'native-inference-failed-not-an-audio-review',
                       'errorKind': type(error).__name__, 'error': str(error), 'formalAdopted': 0, 'audioUploads': 0}
            save(clip_dir / 'native-failure.json', failure)
            summary.append(failure)
            print(json.dumps(failure, ensure_ascii=False), flush=True)
            break
    completed = sum(row['status'] == 'native-model-response-requires-review' for row in summary)
    report = {'status': 'native-responses-ready-for-separate-review' if completed == len(rows) else 'batch-incomplete-not-accepted',
              'runtime': runtime, 'completed': completed, 'requested': len(rows), 'results': summary,
              'DfreeBytes': shutil.disk_usage('D:/').free, 'formalAdopted': 0, 'audioUploads': 0,
              'totalSeconds': time.monotonic() - loaded_at}
    save(folder / 'batch-summary.json', report)
    print(json.dumps({'status': report['status'], 'completed': completed, 'recordDir': str(folder), 'totalSeconds': report['totalSeconds']}, ensure_ascii=False), flush=True)
    if completed != len(rows):
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gpu-gib', type=int, choices=(6, 8), default=8, help='Explicit BF16 GPU resident budget in GiB')
    parser.add_argument('--gpu-gib6', action='store_const', const=6, dest='gpu_gib', help='Use the authorized 6 GiB GPU plus CPU path')
    parser.add_argument('--clarity-three', action='store_true', help='Review only the three exact new synthetic candidates supplied in roster_voice_clarity_candidates1004.json')
    parser.add_argument('--release-sfx', action='store_true', help='Review only actual first-pair skill release WAVs, deduplicated by exact PCM; no expected sound class supplied')
    parser.add_argument('--release-sfx-quality-gaps', action='store_true', help='One short neutral quality follow-up only for prior indices 1/3/5/12/14; never repeat complete files')
    parser.add_argument('--remaining-roster-batch', help='One exact explicitly prepared small batch from remaining_roster_voice_sources1004.json')
    args = parser.parse_args()
    if sum((args.clarity_three, args.release_sfx, args.release_sfx_quality_gaps,bool(args.remaining_roster_batch))) > 1:
        parser.error('Select either new-three speech or actual release SFX, never mix them')
    try:
        main(args.gpu_gib, args.clarity_three, args.release_sfx, args.release_sfx_quality_gaps,args.remaining_roster_batch)
    except Exception as error:
        failure = {'status': 'native-batch-failed-not-an-audio-review', 'errorKind': type(error).__name__,
                   'error': str(error), 'audioUploads': 0, 'formalAdopted': 0}
        if ACTIVE_FOLDER is not None:
            save(ACTIVE_FOLDER / 'batch-failure.json', failure)
        print(json.dumps(failure, ensure_ascii=False), flush=True)
        raise
