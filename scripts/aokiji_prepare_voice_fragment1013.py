"""Prepare Aokiji-only reviewed/pending fragments; never write shared voice tables.

Optional --stage-reviewed-runtime copies only gate-passing exact whole WAVs into
Aokiji's namespace, then runs the existing apply_voices validator in memory.
The root integrator owns merging the narrow1013 ledger and shared subtitles/cues.
"""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import shutil
import wave

from apply_voice_manifest import apply_voices, validate_roster_content_review

PROJECT = Path(__file__).resolve().parents[1]
OWN = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/aokiji')
CLOSURE = OWN.parent
PILOT = CLOSURE / 'native-qa/20261013T065422613783Z'
COMPLETION = CLOSURE / 'native-qa-cpuvisual1013/20261013T075921968846Z'
NEW_EVENTS = ('select', 'attack', 'ko', 'win')
TRANSCRIPTS = {'select': 'さあ始めようか', 'attack': 'そこだ', 'ko': 'ここまでか', 'win': '少し冷静になれ'}
MEANINGS = {'select': '那么，开始吧。', 'attack': '就是那里！', 'ko': '到此为止了吗……', 'win': '稍微冷静一点吧。'}


def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def evidence(path, role): return {'path': Path(path).as_posix(), 'sha256': sha(path), 'role': role}
def save(path, value):
    with Path(path).open('x', encoding='utf-8') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)


def native_result(path, expected_sha):
    path = Path(path).resolve()
    if not path.is_relative_to(CLOSURE.resolve()):
        raise ValueError('Native evidence must remain under the declared D acceptance root')
    value = read(path)
    feature_shape = value.get('nativeFeatureShapes', {}).get('input_features')
    valid_frames = value.get('validAudioFeatureFrames')
    if (value.get('audioSha256') != expected_sha or value.get('expectedTextProvided') is not False
            or not isinstance(feature_shape, list) or not feature_shape or any(type(n) is not int or n <= 0 for n in feature_shape)
            or (valid_frames is not None and valid_frames <= 0)
            or value.get('hitTokenLimit') is True
            or hashlib.sha256(value['response'].encode()).hexdigest() != value.get('responseSha256')):
        raise ValueError('Native receipt is not bound to exact attached audio: ' + str(path))
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--quality-review', type=Path, help='Root-curated exact-SHA final quality decisions; no automated interpretation')
    parser.add_argument('--output-dir', type=Path, default=OWN / 'voice-adoption-fragments1013')
    parser.add_argument('--stage-reviewed-runtime', action='store_true', help='Copy only accepted exact WAVs; shared tables still untouched')
    args = parser.parse_args()
    if PROJECT != Path('D:/Projects/one-piece-fighter') or Path.cwd().resolve() != PROJECT:
        raise RuntimeError('Use the D workspace and run-d1013.ps1')
    out = args.output_dir.resolve()
    if not out.is_relative_to(OWN.resolve()):
        raise ValueError('Output must be inside Aokiji independent evidence directory')
    decisions = read(args.quality_review).get('events', {}) if args.quality_review else {}
    inventory = {item['event']: item for item in read(OWN / 'aokiji-seven-events1013.json')['events']}
    current = read(PROJECT / 'src/audio/sampleManifest.json')
    old = read(PROJECT / 'scripts/first_pair_voice_selection1004.json')
    old_subtitles = read(PROJECT / 'src/audio/voiceLines0922.json')
    overlay = read(PROJECT / 'scripts/first_pair_voice_selection1013.json')
    sources, cues, lines = [], [], []
    primary = {'select': PILOT / 'result-01.json', 'attack': PILOT / 'result-05.json',
               'ko': COMPLETION / 'result-03.json', 'win': COMPLETION / 'result-04.json'}
    for event in NEW_EVENTS:
        item = inventory[event]
        source = Path(item['candidate'])
        expected = item['sha256']
        if sha(source) != expected:
            raise ValueError('Original candidate changed: ' + event)
        heard = native_result(primary[event], expected)
        transcript = TRANSCRIPTS[event]
        if transcript not in heard['response']:
            raise ValueError('Actual wording is absent from native response: ' + event)
        with wave.open(str(source), 'rb') as audio:
            frames, rate = audio.getnframes(), audio.getframerate()
            pcm_hash = hashlib.sha256(audio.readframes(frames)).hexdigest()
        duration = frames / rate
        refs = [evidence(primary[event], 'response'), evidence(primary[event].parent / 'copy-after.json', 'audio-attachment'),
                evidence(primary[event].parent / 'model-identity.json', 'native-model')]
        complete = event == 'select'
        if event == 'select':
            first = CLOSURE / 'native-qa/20261013T045504347029Z/result-01.json'
            early = native_result(first, expected)
            if '首尾没有截断、重复或多余尾声' not in early['response']:
                raise ValueError('Same-file selection completeness evidence missing')
            refs.append(evidence(first, 'same-audio-completeness'))
        decision = decisions.get(event)
        if decision is not None:
            if (decision.get('audioSha256') != expected or decision.get('accepted') is not True
                    or decision.get('headTailComplete') is not True
                    or decision.get('noUnexpectedNoiseOrDistortion') is not True
                    or not decision.get('evidenceResults') or not decision.get('reviewNote')):
                raise ValueError('Final quality decision is incomplete or unapproved: ' + event)
            for path in decision['evidenceResults']:
                native_result(path, expected)
                refs.append(evidence(path, 'exact-audio-quality'))
            refs.append(evidence(args.quality_review, 'root-quality-decision'))
            complete = True
        target = f'public/assets/audio/voice/aokiji/{event}-qwen-japanese1013.wav'
        review = {'kind': 'agent_audio_model', 'status': 'accepted' if complete else 'pending-final-quality',
            'inputAudioAttached': True, 'nativeAudioReviewed': True, 'headTailComplete': True if complete else None,
            'noUnexpectedNoiseOrDistortion': True, 'humanListened': False, 'audioSha256': expected,
            'transcript': transcript, 'provider': 'local unchanged Qwen2.5-Omni-3B native audio encoder/generation',
            'modelRevision': heard['modelRevision'], 'expectedTextProvided': False, 'evidence': refs,
            'meaning': 'Exact native-heard text, not a certification of original actor voice or game mix. Missing head/tail evidence never becomes true from generation text.'}
        cue = {'character': 'aokiji', 'event': event, 'reviewStatus': 'accepted' if complete else 'pending-final-quality',
            'evidence': (out / 'selection-draft1013.json').as_posix(),
            'note': 'Original synthetic Japanese; exact whole WAV. Requested and heard wording remain separate.',
            'contentReview': {'actualContentReview': review},
            'clips': [{'path': target, 'sha256': expected, 'transcript': transcript, 'translation': MEANINGS[event],
                       'source_start_seconds': 0, 'source_end_seconds': duration}],
            'playback': {'gain': current['cues'][f'voice.aokiji.{event}']['gain'],
                         'cooldownMs': math.ceil(duration*1000)+1 if event == 'attack' else 0}}
        if complete:
            validate_roster_content_review(PROJECT, cue)
        cues.append(cue)
        lines.append({'file': target.removeprefix('public/'), 'label': '青雉 · 本作合成日语',
            'original': transcript, 'translation': MEANINGS[event], 'transcriptVerified': True,
            'sha256': expected, 'requestedText': item['requestedText'], 'nativeAudioReviewed': True,
            'headTailComplete': True if complete else None, 'humanListened': False,
            'sourceKind': 'original-synthetic-Japanese', 'evidence': cue['evidence']})
        sources.append({'event': event, 'source': source.as_posix(), 'destination': target, 'sha256': expected,
            'pcmSha256': pcm_hash, 'durationSeconds': duration, 'requestedText': item['requestedText'],
            'actualText': transcript, 'acceptedForStaging': complete,
            'sourceKind': 'original-synthetic-Japanese', 'provider': 'existing local official Qwen CustomVoice',
            'model': 'Qwen3-TTS-12Hz-1.7B-CustomVoice', 'speaker': 'Ryan', 'requestedLanguage': 'Japanese',
            'generationEvidence': evidence(
                Path('D:/one-piece-fighter-crossover-0922/tools/game-voice1013/logs/japanese-sample-result1013.json')
                if event=='select' else source.parent/f'aokiji-{event}-request1013.json', 'generation-request'),
            'processing': 'Exact original whole WAV bytes. No trim/resample/gain/pitch/filter/splice.'})
    # Fallback is an explicit proposal to retain Aokiji's own already-reviewed pain sound.
    hurt = deepcopy(next(item for item in old['cues'] if item['character']=='aokiji' and item['event']=='hurt'))
    validate_roster_content_review(PROJECT, hurt)
    if sha(PROJECT / hurt['clips'][0]['path']) != hurt['clips'][0]['sha256']:
        raise ValueError('Existing reviewed Aokiji hurt changed')
    cues.append(hurt)
    hurt_file = hurt['clips'][0]['path'].removeprefix('public/')
    lines.append(deepcopy(next(line for line in old_subtitles['lines'] if line['file']==hurt_file)))
    for event, source_event in (('idle','win'), ('move','attack'), ('effort','attack')):
        cue = deepcopy(next(item for item in cues if item['event']==source_event))
        cue['event'] = event
        cue['note'] = f'Explicit generic {event} reuse of reviewed {source_event} WAV, not a new line or distinct named skill call.'
        cue['playback'] = {'gain': current['cues'][f'voice.aokiji.{event}']['gain'],
                           'cooldownMs': math.ceil(cue['clips'][0]['source_end_seconds']*1000)+1 if event=='effort' else 0}
        cues.append(cue)
    assert len(cues)==8 and len(lines)==5
    out.mkdir(exist_ok=False)
    (out/'README.md').write_text('# Aokiji voice fragments1013\nSeven generic events/eight cues using five unique files: four new Japanese phrases plus the already-reviewed Aokiji pain sound. Idle/move/effort reuse is explicit; root owns deciding and merging the proposal. Missing quality remains pending and fails the existing gate. Shared voices/subtitles/1013 ledger are never written by this tool. Optional exact runtime staging is restricted to gate-passing Aokiji files; rejected candidates and old Chinese media/1004 ledger remain unchanged.\n',encoding='utf-8')
    save(out/'selection-draft1013.json', {'character':'aokiji','rootApprovedReusePlan':True,'sharedIntegrationPending':True,
        'readyForCompleteApply':all(c['reviewStatus']=='accepted' for c in cues),'cues':cues})
    save(out/'subtitles-draft1013.json', {'lines':lines})
    save(out/'sources1013.json', {'sources':sources,'retainedHurt':hurt['clips'][0],
        'note':'Retained hurt is from the earlier Aokiji synthesis, not Ryan. Do not claim one voice preset for all five files.'})
    proposed = [cue for cue in cues if cue['event']!='hurt']
    ready = [cue for cue in proposed if cue['reviewStatus']=='accepted']
    save(out/'selection-ready1013.json', {'character':'aokiji','status':'exact-reviewed-fragment-only','cues':ready})
    save(out/'overlay-merge-plan1013.json', {'existingLedger':'scripts/first_pair_voice_selection1013.json',
        'existingLedgerSha256':sha(PROJECT/'scripts/first_pair_voice_selection1013.json'),
        'existingCueIds':[f"voice.{c['character']}.{c['event']}" for c in overlay['cues']],
        'proposedAokijiCueIds':[f"voice.aokiji.{c['event']}" for c in proposed],
        'readyAokijiCueIds':[f"voice.aokiji.{c['event']}" for c in ready],
        'preserve':['all Shanks1013 entries','immutable1004 ledger','all old runtime WAVs','all old subtitle rows','existing Aokiji hurt'],
        'rootActions':['Merge only accepted Aokiji cue IDs into1013 override ledger; no edits to1004.','Append unique exact-file subtitle rows to1013 subtitle ledger and shared subtitles.','Replace only those same IDs in sampleManifest through apply_voices, never duplicate IDs.','Check default rebuild preserves both Shanks and Aokiji overrides, then verify IAB playback.']})
    if args.stage_reviewed_runtime:
        ready_files = {clip['path'] for cue in ready for clip in cue['clips']}
        copies = [row for row in sources if row['destination'] in ready_files]
        save(out/'copy-before1013.json', {'copies':copies})
        for row in copies:
            target=(PROJECT/row['destination']).resolve()
            if not target.is_relative_to((PROJECT/'public/assets/audio/voice/aokiji').resolve()):
                raise ValueError('Runtime staging escaped Aokiji namespace')
            target.parent.mkdir(parents=True,exist_ok=True)
            if target.exists():
                if sha(target)!=row['sha256']:raise ValueError('Never overwrite differing runtime audio')
            else:shutil.copyfile(row['source'],target)
            if sha(target)!=row['sha256']:raise ValueError('Runtime copy changed exact audio')
        save(out/'copy-after1013.json', {'copies':copies,'allExactBytes':True})
        merged_lines=deepcopy(old_subtitles)
        wanted={clip['path'].removeprefix('public/') for cue in ready for clip in cue['clips']}
        for line in lines:
            if line['file'] in wanted and not any(oldline['file']==line['file'] for oldline in merged_lines['lines']):
                merged_lines['lines'].append(line)
        save(out/'subtitles-candidate1013.json',merged_lines)
        owned={f"voice.aokiji.{cue['event']}" for cue in ready}
        candidate=deepcopy(current)
        candidate['cues']=apply_voices(PROJECT,{key:value for key,value in current['cues'].items() if key not in owned},
            out/'selection-ready1013.json',out/'subtitles-candidate1013.json')
        if any(candidate['cues'][key]!=value for key,value in current['cues'].items() if key not in owned):
            raise RuntimeError('Unrelated cue changed')
        save(out/'sampleManifest-candidate1013.json',candidate)
    save(out/'validation1013.json', {'createdAtUtc':datetime.now(timezone.utc).isoformat(),
        'acceptedOverrideCueIds':[f"voice.aokiji.{cue['event']}" for cue in ready],
        'pendingOverrideCueIds':[f"voice.aokiji.{cue['event']}" for cue in proposed if cue['reviewStatus']!='accepted'],
        'sevenEventsCoveredByProposal':True,'uniqueProposedFiles':5,'sharedTablesWritten':False,
        'runtimeStagingRequested':args.stage_reviewed_runtime,'newModelLoaded':False,'gamePlaybackVerified':False})
    print(out.as_posix())


if __name__=='__main__':main()
