"""Read-only release SFX selection, exact runtime/PCM binding and blind prompt.

The 18 actual move releases are selected from their runtime mapping. Identical
audio is deduplicated. No expected sound class enters the native model prompt.
"""
import hashlib
import json
from pathlib import Path
import wave

PROJECT = Path(__file__).resolve().parents[1]
FOLEY = PROJECT / 'scripts/roster_voice_adoption1003.foley.json'
INTEGRATION = PROJECT / 'scripts/roster_voice_adoption1003.integration.json'
RUNTIME = PROJECT / 'src/audio/rosterVoiceCandidates1003.json'
PROMPT = '请仅根据提供的音频客观听辨：一、是否有人声？如有人声，能确定的语言和内容是什么？二、实际听到的声音大类和变化是什么，可描述瞬态或连续、强弱、高低、尾声变化；来源或具体物体无法确定就明确写不确定，不强猜物体。三、是否有明显录音破音、失真、无关背景杂音、首尾截断或突兀点击？区分声音本身的冲击或宽带瞬态与录音问题；不能确定的写不确定。不要根据文件名、角色或用途猜测，不用ASR或波形统计替代实际音频理解。'
QUALITY_PROMPT = '请只凭这段音频直接听辨，简短按1至4逐项回答，无法判断写“不确定”：1实际听到什么声音？2有无明显无关背景杂音？3有无明显失真或破音？4首尾有无突兀截断或点击？不要猜来源、物体或用途，不参考文件名，不用ASR或波形统计代替听觉。'
PARENT_RELEASE_RUN = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003/validation/native-local-release-sfx-gpu6g1004-20261004T033259Z')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pcm(path):
    with wave.open(str(path), 'rb') as audio:
        parameters = (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getnframes(), audio.getcomptype())
        raw = audio.readframes(audio.getnframes())
    if parameters[0:3] != (1, 2, 44100) or parameters[4] != 'NONE':
        raise ValueError('Release SFX must be the existing unmodified mono PCM16/44100 WAV')
    return parameters, raw


def load_release_rows():
    foley_bytes, integration_bytes, runtime_bytes = FOLEY.read_bytes(), INTEGRATION.read_bytes(), RUNTIME.read_bytes()
    foley = json.loads(foley_bytes)
    integration = json.loads(integration_bytes)
    runtime = json.loads(runtime_bytes)['runtime']
    moves = runtime['moves']
    if set(moves) != {'aokiji', 'shanks'} or any(len(rows) != 9 for rows in moves.values()):
        raise ValueError('Only the first pair nine release events each are authorized')
    mapping = []
    unique = {}
    checked_sources = set()
    for character, profiles in moves.items():
        for move, profile in profiles.items():
            cue_id = profile['stages']['release']
            if foley['moves'][character][move]['stages']['release'] != cue_id:
                raise ValueError('Actual runtime move release differs from its explicit source contract')
            cue = runtime['cues'][cue_id]
            if cue['group'] != 'sfx' or len(cue['files']) != 1:
                raise ValueError('Release selection needs one explicit runtime SFX WAV per move')
            logical = cue['files'][0]
            target = (PROJECT / 'public' / logical).resolve()
            if not target.is_relative_to((PROJECT / 'public/assets/audio/sfx').resolve()):
                raise ValueError('Runtime SFX escapes the allowed local audio folder')
            reuse = integration.get('stageReuse', {}).get(cue_id)
            source_row = (next(row for row in foley['files'] if row['proposedRuntimeFile'] == reuse['runtimeFile'])
                          if reuse else next(row for row in foley['files'] if row['cueId'] == cue_id))
            candidate = Path(source_row['candidate']).resolve()
            if not candidate.is_relative_to(Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003/foley').resolve()):
                raise ValueError('Prepared SFX candidate escapes the declared evidence root')
            expected = source_row['sha256']
            if runtime['fileChecks'][logical]['sha256'] != expected or digest(target.read_bytes()) != expected or digest(candidate.read_bytes()) != expected:
                raise ValueError('Actual release runtime file and prepared candidate must be exact SHA copies')
            parameters, samples = pcm(target)
            candidate_parameters, candidate_samples = pcm(candidate)
            if parameters != candidate_parameters or samples != candidate_samples:
                raise ValueError('Actual runtime and source candidate decoded PCM differ')
            for recipe in source_row['recipes']:
                original = foley['sources'][recipe['source']]
                if original['sha256'] != recipe['sourceSha256'] or original.get('license') != 'CC0':
                    raise ValueError('The adopted recipe has no exact CC0 source binding')
                if recipe['source'] not in checked_sources:
                    if digest(Path(original['file']).read_bytes()) != original['sha256']:
                        raise ValueError('A referenced CC0 source original changed')
                    checked_sources.add(recipe['source'])
            pcm_sha = digest(samples)
            binding = {'character': character, 'moveId': move, 'cueId': cue_id, 'runtimeFile': str(target),
                       'logicalRuntimeFile': logical, 'audioSha256': expected, 'pcmSha256': pcm_sha,
                       'explicitStageReuse': bool(reuse), 'sourceCueId': source_row['cueId'],
                       'projectileRelease': profile['projectile'], 'stage': 'release'}
            mapping.append(binding)
            key = (parameters, pcm_sha)
            if key not in unique:
                unique[key] = {'index': len(unique) + 1, 'audio': str(target), 'audioSha256': expected,
                               'pcmSha256': pcm_sha, 'durationSeconds': parameters[3] / parameters[2],
                               'sampleRateHz': parameters[2], 'channels': parameters[0], 'sampleWidthBytes': parameters[1],
                               'sourceCandidate': str(candidate), 'sourceCandidateSha256': expected,
                               'sourceKind': 'original-game-sfx-design-from-CC0-recordings', 'bindings': []}
            unique[key]['bindings'].append(binding)
            binding['nativeReviewIndex'] = unique[key]['index']
    provenance = {'manifests': [{'path': str(path), 'sha256': digest(raw)} for path, raw in
                   ((FOLEY, foley_bytes), (INTEGRATION, integration_bytes), (RUNTIME, runtime_bytes))],
                  'actualReleaseMappings': mapping, 'actualMoveCount': len(mapping), 'uniqueAudioCount': len(unique),
                  'actualSourceShaAndDecodedPcmVerified': True, 'sourceCc0OriginalsChecked': sorted(checked_sources),
                  'priorSourceRecipesRetained': True, 'expectedClassProvidedToModel': False,
                  'sourceAndRuntimeManifestsModified': False}
    return list(unique.values()), provenance


def load_quality_gap_rows():
    """Exactly five prior unanswered quality items; no old response is returned."""
    selected = (1, 3, 5, 12, 14)
    sealed_bytes = (PARENT_RELEASE_RUN / 'sealed-release-sfx-receipt1004.json').read_bytes()
    sealed = json.loads(sealed_bytes)
    if sealed['qualityQuestionNotAddressedIndices'] != list(selected):
        raise ValueError('Only the five explicitly unresolved release files can be followed up')
    rows = []
    mappings = []
    for index in selected:
        request = json.loads((PARENT_RELEASE_RUN / f'clip-{index:02}' / 'request.json').read_bytes())
        target = Path(request['runtimeFile']).resolve()
        candidate = Path(request['sourceCandidate']).resolve()
        expected = request['audioSha256']
        if not target.is_relative_to((PROJECT / 'public/assets/audio/sfx').resolve()):
            raise ValueError('Quality follow-up runtime file escaped the local SFX folder')
        if digest(target.read_bytes()) != expected or digest(candidate.read_bytes()) != expected:
            raise ValueError('The quality follow-up cannot change any audio bytes')
        parameters, samples = pcm(target)
        candidate_parameters, candidate_samples = pcm(candidate)
        if parameters != candidate_parameters or samples != candidate_samples or digest(samples) != request['pcmSha256']:
            raise ValueError('Quality follow-up PCM changed since the first real input')
        row = {key: request[key] for key in ('index', 'audioSha256', 'pcmSha256', 'durationSeconds',
               'sampleRateHz', 'channels', 'sampleWidthBytes', 'sourceCandidate', 'sourceCandidateSha256', 'sourceKind', 'bindings')}
        row['audio'] = str(target)
        row['qualityFollowupOnly'] = True
        rows.append(row)
        mappings.extend(row['bindings'])
    provenance = {'actualReleaseMappings': mappings, 'actualMoveCount': len(mappings), 'uniqueAudioCount': len(rows),
                  'parentRun': str(PARENT_RELEASE_RUN), 'parentSealedReceiptSha256': digest(sealed_bytes),
                  'selectedUnansweredQualityIndices': list(selected), 'priorResponsesNotProvidedToModel': True,
                  'unchangedSourceAndRuntimeShaPcmVerified': True, 'noPreviouslyCompleteFileRepeated': True,
                  'expectedClassProvidedToModel': False, 'sourceAndRuntimeManifestsModified': False}
    return rows, provenance
