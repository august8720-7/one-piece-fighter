"""Append four exact Japanese cue overrides after separate content and quality reviews."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import wave

from apply_voice_manifest import apply_voices, validate_roster_content_review

ROOT=Path(__file__).resolve().parents[1]
ROSTER=Path('D:/one-piece-fighter-crossover-0922/roster-0929')
OWN=ROSTER/'acceptance/character-closure1013/shanks'
CONTENT=OWN.parent/'native-qa-cpuvisual1013/20261013T075921968846Z'
QUALITY=OWN.parent/'native-qa-cpuvisual1013/20261013T080407100050Z'
EVENTS=('ko','win','idle','move')
TARGETS={f'voice.shanks.{event}' for event in EVENTS}

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def encode(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
def save_new(p,x):
    with p.open('xb') as f:f.write(encode(x))
def record(p):return {'file':p.as_posix(),'sha256':sha(p),'bytes':p.stat().st_size}
def evidence(p,role):return {'path':p.as_posix(),'sha256':sha(p),'role':role}

def main():
    assert ROOT==Path('D:/Projects/one-piece-fighter') and Path.cwd().resolve()==ROOT
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    baseline=ROSTER/('baseline/shanks-four-voices1013-'+stamp)
    out=OWN/('four-voices-adoption-'+stamp)
    for path,text in [(baseline,'# Shanks four Japanese voice overrides rollback1013\nBefore/after copy receipts preserve current audio tables,1013 ledger/subtitles/source catalog, immutable1004 records and all existing Shanks voice files. No deletion or unrelated write.\n'),
                      (out,'# Shanks four Japanese voices adoption1013\nKO/win/idle/move only. Exact source bytes, native transcript and independent quality responses bind by SHA. Effort/attack/select/Chinese hurt and all unrelated cue values remain unchanged. Runtime playback of these four is pending root IAB.\n')]:
        path.mkdir(exist_ok=False);(path/'README.md').write_text(text,encoding='utf-8')
    paths={name:ROOT/name for name in ['src/audio/sampleManifest.json','src/audio/voiceLines0922.json','scripts/first_pair_voice_selection1013.json','scripts/first_pair_voice_subtitles1013.json','scripts/shanks_voice_sources1013.json']}
    backup_paths=list(paths.values())+[ROOT/'scripts/first_pair_voice_selection1004.json',ROOT/'scripts/first_pair_voice_subtitles1004.json']
    backup_paths += sorted((ROOT/'public/assets/audio/voice/shanks').glob('*.wav'))
    inventory=[{**record(p),'relative':p.relative_to(ROOT).as_posix()} for p in backup_paths]
    save_new(baseline/'copy-before1013.json',inventory)
    for row in inventory:
        dest=baseline/'files'/row['relative'];dest.parent.mkdir(parents=True,exist_ok=True)
        with dest.open('xb') as stream:stream.write(Path(row['file']).read_bytes())
        assert sha(dest)==row['sha256']
    save_new(baseline/'copy-after1013.json',[{**r,'equal':True} for r in inventory])

    before={name:read(p) for name,p in paths.items()}
    manifest=deepcopy(before['src/audio/sampleManifest.json'])
    subtitles=deepcopy(before['src/audio/voiceLines0922.json'])
    selection=deepcopy(before['scripts/first_pair_voice_selection1013.json'])
    reviewed_subs=deepcopy(before['scripts/first_pair_voice_subtitles1013.json'])
    sources=deepcopy(before['scripts/shanks_voice_sources1013.json'])
    old_override_ids={f"voice.{c['character']}.{c['event']}" for c in selection['cues']}
    assert old_override_ids=={'voice.shanks.effort','voice.shanks.attack'}
    draft=read(OWN/'voice-adoption-fragments1013/selection-draft1013.json')
    source_rows=read(OWN/'voice-adoption-fragments1013/sources1013.json')['sourceRows']
    new_cues=[];new_lines=[];new_sources=[];copies=[]
    for content_index,quality_index,event in [(6,3,'ko'),(7,4,'win'),(8,5,'idle'),(9,6,'move')]:
        row=next(x for x in source_rows if x['event']==event)
        src=Path(row['sourceFile']);cpath=CONTENT/f'result-{content_index:02}.json';qpath=QUALITY/f'result-{quality_index:02}.json'
        content,quality=read(cpath),read(qpath)
        expected=sha(src)
        assert content['audioSha256']==quality['audioSha256']==expected
        for result in (content,quality):
            assert result['expectedTextProvided'] is False and result['validAudioFeatureFrames']>0
            assert result['responseSha256']==hashlib.sha256(result['response'].encode()).hexdigest()
        assert all(x in quality['response'] for x in ['开头和结尾完整','没有被硬切断','无不自然重复','多余尾声','无背景音乐、杂音或明显失真'])
        cue=deepcopy(next(x for x in draft['cues'] if x['event']==event));transcript=cue['clips'][0]['transcript']
        assert transcript and transcript in content['response'] and '日语' in content['response']
        with wave.open(str(src),'rb') as wav:
            frames,rate=wav.getnframes(),wav.getframerate();pcm=wav.readframes(frames)
            assert wav.getnchannels()==1 and wav.getsampwidth()==2 and rate==24000
        dest=ROOT/cue['clips'][0]['path'];assert not dest.exists(), 'Do not overwrite an existing independent voice'
        cue['reviewStatus']='accepted';cue['evidence']='scripts/first_pair_voice_selection1013.json'
        cue['contentReview']['actualContentReview'].update(status='accepted',headTailComplete=True,noUnexpectedNoiseOrDistortion=True,
            evidence=[evidence(cpath,'response'),evidence(qpath,'quality-supplement')],
            meaning='Exact Japanese transcript is supported by the blind content response. Independent same-SHA quality-only response explicitly confirms complete ends/no repeat/no tail/no noise/distortion. Not human timbre or game playback acceptance.')
        cue['contentReview']['actualContentReview'].pop('missingEvidence',None)
        cue['playback']={'gain':manifest['cues'][f'voice.shanks.{event}']['gain'],'cooldownMs':manifest['cues'][f'voice.shanks.{event}']['cooldownMs']}
        cue['note']='Reviewed original synthetic Japanese generic event. Actual content and separate quality responses bind to these unchanged WAV bytes. Not original actor or dedicated move voice.'
        cue.pop('draftRequestedText',None);cue.pop('draftTranslation',None)
        validate_roster_content_review(ROOT,cue)
        source_id=f'shanks_qwen_{event}_jp1013'
        line={'file':dest.relative_to(ROOT/'public').as_posix(),'sha256':expected,'label':f'香克斯 · 日语{event}',
            'original':transcript,'translation':cue['clips'][0]['translation'],'transcriptVerified':True,'nativeAudioReviewed':True,
            'humanListened':False,'sourceKind':'original-synthetic-Japanese','sourceId':source_id,
            'evidence':'scripts/first_pair_voice_selection1013.json','nativeReview':cue['contentReview']['actualContentReview']}
        assert not any(x['file']==line['file'] for x in subtitles['lines'])
        new_cues.append(cue);new_lines.append(line)
        new_sources.append((source_id,{'status':'exact-original-runtime-clip-adopted','sourceFile':src.as_posix(),'sourceSha256':expected,
            'runtimeFile':dest.relative_to(ROOT).as_posix(),'runtimeSha256':expected,'sourcePcmSha256':hashlib.sha256(pcm).hexdigest(),
            'durationSeconds':frames/rate,'provider':'existing local Qwen3-TTS official CustomVoice','model':'Qwen3-TTS-12Hz-1.7B-CustomVoice',
            'speaker':'Uncle Fu','requestedLanguage':'Japanese','requestedText':row['requestedText'],'actualObservedText':transcript,
            'translation':line['translation'],'generationRequest':record(Path(row['generationRequest'])),
            'generationResponse':record(Path(row['generationResponse'])),'nativeContentReview':record(cpath),'nativeQualityReview':record(qpath),
            'processing':'Exact whole WAV bytes; no trim, splice, gain, filtering, pitch or sample-rate change.',
            'nativeAudioReviewed':True,'headTailComplete':True,'noUnexpectedNoiseOrDistortion':True,'humanListened':False,
            'gamePlaybackVerified':False,'originalActorVoice':False,'audioReferenceUploaded':False,'paidApiUsed':False}))
        copies.append({'source':record(src),'destination':dest.as_posix()})
    save_new(out/'copy-before1013.json',copies)
    for item in copies:
        dest=Path(item['destination']);src=Path(item['source']['file'])
        with dest.open('xb') as f:f.write(src.read_bytes())
        assert sha(dest)==item['source']['sha256']
    save_new(out/'copy-after1013.json',[{**c,'destinationSha256':sha(Path(c['destination'])),'equal':True} for c in copies])
    selection['cues'].extend(new_cues);selection['declaredCueOverrides']=sorted(old_override_ids|TARGETS)
    selection['languageScope']='Japanese primary: retain the already reviewed0.675s Chinese 大意了 hurt as an explicit transition, and the existing Japanese original select. Not fully Japanese or one uniform actor.'
    reviewed_subs['lines'].extend(new_lines)
    for key,value in new_sources:assert key not in sources['sources'];sources['sources'][key]=value
    sources['languageScope']=selection['languageScope']
    subtitles['lines'].extend(new_lines)
    # Stage the exact next ledger first. apply_voices below validates all newly
    # referenced runtime bytes, transcripts and both native evidence files.
    staged_selection=out/'selection-candidate1013.json';staged_subtitles=out/'subtitles-candidate1013.json'
    save_new(staged_selection,{'cues':new_cues});save_new(staged_subtitles,reviewed_subs)
    manifest['cues']=apply_voices(ROOT,{k:v for k,v in manifest['cues'].items() if k not in TARGETS},staged_selection,staged_subtitles)
    differences=[key for key,value in before['src/audio/sampleManifest.json']['cues'].items() if manifest['cues'][key]!=value]
    assert set(differences)==TARGETS and set(manifest['cues'])==set(before['src/audio/sampleManifest.json']['cues'])
    for key in TARGETS:
        for field in ('group','characterId','gain','priority','maxInstances','cooldownMs'):
            assert manifest['cues'][key][field]==before['src/audio/sampleManifest.json']['cues'][key][field]
    assert selection['cues'][:len(before['scripts/first_pair_voice_selection1013.json']['cues'])]==before['scripts/first_pair_voice_selection1013.json']['cues']
    assert subtitles['lines'][:-4]==before['src/audio/voiceLines0922.json']['lines']
    for row in inventory:assert sha(Path(row['file']))==row['sha256']
    # Publish the reviewed ledger, then perform one actual production default
    # rebuild against staged global subtitles before changing live cue tables.
    paths['scripts/first_pair_voice_selection1013.json'].write_bytes(encode(selection))
    paths['scripts/first_pair_voice_subtitles1013.json'].write_bytes(encode(reviewed_subs))
    paths['scripts/shanks_voice_sources1013.json'].write_bytes(encode(sources))
    global_subtitles=out/'global-subtitles-candidate1013.json';save_new(global_subtitles,subtitles)
    rebuilt=apply_voices(ROOT,manifest['cues'],subtitle_path=global_subtitles)
    assert rebuilt==manifest['cues'], 'Default rebuild diverged from four-cue candidate'
    for key in set(manifest['cues'])-TARGETS:
        assert rebuilt[key]==before['src/audio/sampleManifest.json']['cues'][key]
    paths['src/audio/sampleManifest.json'].write_bytes(encode(manifest))
    paths['src/audio/voiceLines0922.json'].write_bytes(encode(subtitles))
    for row in inventory:
        if row['file'] not in {p.as_posix() for p in paths.values()}:assert sha(Path(row['file']))==row['sha256']
    result={'status':'four-Japanese-cues-adopted-default-rebuild-passed-awaiting-game-events','createdAtUtc':datetime.now(timezone.utc).isoformat(),
        'baseline':baseline.as_posix(),'adoptionFolder':out.as_posix(),'changedCueIds':sorted(differences),'unchangedCueCount':len(manifest['cues'])-4,
        'newRuntimeFiles':[record(Path(x['destination'])) for x in copies],'totalCueCount':len(manifest['cues']),
        'effortAttackSelectHurtExactCueValuesPreserved':True,'allExistingSubtitleRowsUnchanged':True,'newSubtitleRows':4,
        'allTargetPlaybackSettingsPreserved':True,'old1004RecordsAndOldAudioUnchanged':True,'actualDefaultRebuildExact':True,
        'pendingHurtCandidateAdopted':False,'retainedHurt':{'transcript':'大意了','language':'Chinese','seconds':0.675,'nonlexical':False},
        'languageCoverage':'6 of7 unique event clips Japanese, retained Chinese hurt; attack reuses effort; not one actor',
        'newGamePlaybackVerified':False,'formalCharacterAccepted':False,'nativeQaRunByThisScript':False,
        'affectedFiles':list(paths)+[Path(x['destination']).relative_to(ROOT).as_posix() for x in copies]}
    save_new(out/'verification1013.json',result);save_new(OWN/'shanks-four-voices-adoption-result1013.json',result)
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
