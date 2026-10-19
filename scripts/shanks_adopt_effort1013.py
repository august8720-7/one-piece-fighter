"""Adopt exactly one reviewed WAV for two Shanks cues; preserve all other audio."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import wave
from unittest.mock import patch

from apply_voice_manifest import apply_voices, validate_roster_content_review

ROOT=Path(__file__).resolve().parents[1]
OWN=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/shanks')
TARGET_IDS={'voice.shanks.effort','voice.shanks.attack'}

def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def encode(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
def save_new(path,value):
    with path.open('xb') as out:out.write(encode(value))
def ref(path):return {'file':path.as_posix(),'sha256':sha(path),'bytes':path.stat().st_size}

def main():
    assert ROOT==Path('D:/Projects/one-piece-fighter') and Path.cwd().resolve()==ROOT
    baseline_info=read(OWN/'shanks-voice-effort-baseline1013.json')
    baseline=Path(baseline_info['baseline'])
    manifest_path=ROOT/'src/audio/sampleManifest.json'
    subtitles_path=ROOT/'src/audio/voiceLines0922.json'
    before_manifest=read(baseline/'files/src/audio/sampleManifest.json')
    before_subtitles=read(baseline/'files/src/audio/voiceLines0922.json')
    assert manifest_path.read_bytes()==(baseline/'files/src/audio/sampleManifest.json').read_bytes()
    assert subtitles_path.read_bytes()==(baseline/'files/src/audio/voiceLines0922.json').read_bytes()
    for row in baseline_info['files']:
        if row['relative'] not in ('scripts/apply_voice_manifest.py','tests/audio/rosterVoiceAdoption1003.test.py'):
            assert sha(ROOT/row['relative'])==row['sha256']
    source=OWN/'voice-20261013T033431410339Z/shanks-effort-qwen-japanese1013.wav'
    expected='bae4b92a168b55dc84e317d27c2b09f7c9b9d08584834d061a919e1c56320e31'
    assert sha(source)==expected
    with wave.open(str(source),'rb') as wav:
        frames,rate=wav.getnframes(),wav.getframerate();pcm=wav.readframes(frames)
        assert wav.getnchannels()==1 and wav.getsampwidth()==2 and rate==24000 and frames==17280
    target_rel='public/assets/audio/voice/shanks/effort-qwen-japanese1013.wav'
    target=ROOT/target_rel
    selection_path=ROOT/'scripts/first_pair_voice_selection1013.json'
    new_subtitle_path=ROOT/'scripts/first_pair_voice_subtitles1013.json'
    source_catalog=ROOT/'scripts/shanks_voice_sources1013.json'
    assert not selection_path.exists() and not new_subtitle_path.exists() and not source_catalog.exists()
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    out=OWN/('effort-adoption-'+stamp);out.mkdir()
    (out/'README.md').write_text('# Shanks exact effort adoption1013\nOnly voice.shanks.effort and voice.shanks.attack change to the same reviewed WAV. Old files, select, all unrelated cue values and subtitle rows remain unchanged. Actual default rebuild runs with both immutable1004 and narrow1013 ledgers. No pending audio, new native review, public release or model run.\n',encoding='utf-8')
    save_new(out/'copy-before1013.json',{'source':ref(source),'destination':target.as_posix(),'destinationExisted':target.exists(),'baseline':baseline.as_posix()})
    if target.exists():assert sha(target)==expected
    else:
        with target.open('xb') as file:file.write(source.read_bytes())
    assert target.read_bytes()==source.read_bytes()
    save_new(out/'copy-after1013.json',{'source':ref(source),'destination':ref(target),'exactBytesEqual':True,'pcmSha256':hashlib.sha256(pcm).hexdigest()})

    draft=read(OWN/'voice-adoption-fragments1013/selection-draft1013.json')
    cues=[]
    for event in ('effort','attack'):
        cue=deepcopy(next(row for row in draft['cues'] if row['event']==event))
        cue['evidence']='scripts/first_pair_voice_selection1013.json'
        cue['clips'][0]['path']=target_rel
        cue['playback']={'gain':before_manifest['cues'][f'voice.shanks.{event}']['gain'],'cooldownMs':721}
        cue['note']='Same exact reviewed Japanese generic effort WAV; requested 来い！, observed こおい. Explicit attack/effort reuse, no original-actor or per-move shout claim.'
        validate_roster_content_review(ROOT,cue)
        cues.append(cue)
    assert {f"voice.{c['character']}.{c['event']}" for c in cues}==TARGET_IDS
    selection={'version':1,'status':'accepted-explicit-cue-overrides','baseLedger':'scripts/first_pair_voice_selection1004.json',
        'baseLedgerSha256':sha(ROOT/'scripts/first_pair_voice_selection1004.json'),'declaredCueOverrides':sorted(TARGET_IDS),
        'humanAuditioned':False,'formalCharacterAcceptanceUnchanged':True,'cues':cues}
    line=deepcopy(next(x for x in read(OWN/'voice-adoption-fragments1013/subtitles-draft1013.json')['lines'] if x['original']=='こおい'))
    line.update(file=target_rel.removeprefix('public/'),evidence='scripts/first_pair_voice_selection1013.json',
                sourceKind='original-synthetic-Japanese',sourceId='shanks_qwen_effort_jp1013')
    assert not any(x['file']==line['file'] for x in before_subtitles['lines'])
    save_new(selection_path,selection)
    save_new(new_subtitle_path,{'lines':[line],'status':'exact-reviewed-overlay-subtitle-only'})
    qa=OWN.parent/'native-qa/20261013T045504347029Z/result-04.json'
    save_new(source_catalog,{'schemaVersion':1,'sources':{'shanks_qwen_effort_jp1013':{
        'status':'one-exact-original-runtime-clip-adopted-two-cues','sourceFile':source.as_posix(),'sourceSha256':expected,
        'runtimeFile':target_rel,'runtimeSha256':expected,'sourcePcmSha256':hashlib.sha256(pcm).hexdigest(),
        'provider':'existing local Qwen3-TTS official CustomVoice','model':'Qwen3-TTS-12Hz-1.7B-CustomVoice',
        'modelLocation':'D:/feiyan-promo-video-0929/配音0929/models/Qwen3-TTS-12Hz-1.7B-CustomVoice',
        'speaker':'Uncle Fu','requestedLanguage':'Japanese','requestedText':'来い！','actualObservedText':'こおい','translation':'来吧！',
        'nativeReview':ref(qa),'generationRequest':ref(source.parent/'effort-request.json'),'generationResponse':ref(source.parent/'effort-response.json'),
        'processing':'Exact whole original WAV bytes; no trim, gain, filtering, resampling, pitch change or speech splice.',
        'runtimeCueIds':sorted(TARGET_IDS),'nativeAudioReviewed':True,'humanListened':False,'gamePlaybackVerified':False,
        'originalActorVoice':False,'audioReferenceUploaded':False,'paidApiUsed':False,
        'licenseNote':'Existing official Qwen3-TTS code/model Apache-2.0 provenance retained; generated game speech is original synthetic content, not a claim of actor or character-IP authorization.'}}})
    manifest=deepcopy(before_manifest)
    manifest['cues']=apply_voices(ROOT,{k:v for k,v in before_manifest['cues'].items() if k not in TARGET_IDS},selection_path,new_subtitle_path)
    assert set(manifest['cues'])==set(before_manifest['cues'])
    differences=[key for key,value in before_manifest['cues'].items() if manifest['cues'][key]!=value]
    assert set(differences)==TARGET_IDS
    for key in TARGET_IDS:
        assert manifest['cues'][key]['files']==[target_rel.removeprefix('public/')]
        for property_ in ('group','characterId','gain','priority','maxInstances'):
            assert manifest['cues'][key][property_]==before_manifest['cues'][key][property_]
    subtitles=deepcopy(before_subtitles);subtitles['lines'].append(line)
    staged_subtitles=out/'subtitles-after-candidate1013.json';save_new(staged_subtitles,subtitles)
    # One targeted verification pass: actual production inputs, complete default
    # rebuild, empty-catalog reconstruction and the required-ledger failure gate.
    rebuilt=apply_voices(ROOT,manifest['cues'],subtitle_path=staged_subtitles)
    assert rebuilt==manifest['cues'], 'Default rebuild changed a cue or restored old speech'
    from_empty=apply_voices(ROOT,{},subtitle_path=staged_subtitles)
    assert all(from_empty[key]==manifest['cues'][key] for key in TARGET_IDS)
    actual_is_file=Path.is_file
    with patch.object(Path,'is_file',lambda p:False if p==selection_path else actual_is_file(p)):
        try:apply_voices(ROOT,manifest['cues'],subtitle_path=staged_subtitles)
        except FileNotFoundError as error:
            assert 'first_pair_voice_selection1013.json' in str(error)
        else:raise AssertionError('Missing1013 ledger silently reverted speech')
    for row in baseline_info['files']:
        if row['relative'] not in ('scripts/apply_voice_manifest.py','tests/audio/rosterVoiceAdoption1003.test.py'):
            assert sha(ROOT/row['relative'])==row['sha256']
    manifest_path.write_bytes(encode(manifest));subtitles_path.write_bytes(encode(subtitles))
    assert read(manifest_path)==manifest and read(subtitles_path)==subtitles
    assert subtitles['lines'][:-1]==before_subtitles['lines']
    checks={'status':'narrow-adoption-and-targeted-rebuild-passed-awaiting-IAB-playback','baseline':baseline.as_posix(),
        'adoptionFolder':out.as_posix(),'changedCueIds':sorted(differences),'unchangedCueCount':len(before_manifest['cues'])-2,
        'totalCueCount':len(manifest['cues']),'oneNewRuntimeFile':ref(target),'oldMediaAnd1004LedgersUnchanged':True,
        'allOldSubtitleRowsUnchanged':True,'newSubtitleRows':1,'gainsPrioritiesAndMaxInstancesUnchanged':True,
        'cooldownMs':721,'fullDefaultRebuildExact':True,'emptyCatalogKeepsJapaneseOverride':True,'missing1013LedgerRefused':True,
        'formalCharacterAccepted':False,'nativeQaRerun':False,'IABPlaybackVerified':False,'pendingFiveClipsAdopted':0,
        'manifestAfter':ref(manifest_path),'subtitlesAfter':ref(subtitles_path),
        'affectedFiles':['scripts/apply_voice_manifest.py','tests/audio/rosterVoiceAdoption1003.test.py','scripts/first_pair_voice_selection1013.json','scripts/first_pair_voice_subtitles1013.json','scripts/shanks_voice_sources1013.json',target_rel,'src/audio/sampleManifest.json','src/audio/voiceLines0922.json']}
    save_new(out/'verification1013.json',checks)
    save_new(OWN/'shanks-effort-adoption-result1013.json',checks)
    print(json.dumps(checks,ensure_ascii=False))

if __name__=='__main__':main()
