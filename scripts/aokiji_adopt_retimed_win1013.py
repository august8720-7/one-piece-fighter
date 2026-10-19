"""Adopt only Aokiji win after exact atempo-output native reviews; preserve all else."""
from copy import deepcopy
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import wave
from apply_voice_manifest import apply_voices,validate_roster_content_review

ROOT=Path(__file__).resolve().parents[1]
ROSTER=Path('D:/one-piece-fighter-crossover-0922/roster-0929')
OWN=ROSTER/'acceptance/character-closure1013/aokiji'
PROCESS=OWN/'win-retime1013'
QA=OWN.parent/'native-qa-cpuvisual1013/20261013T085300541678Z'
EXPECTED='87e3f51fb2b6e154dba02ee3187b7b47b75041ec39ae2746c5bad6f695d792e2'
OLD_SOURCE='8addf39bfc2499745111531372da4a1098020eb031593f2fd1b3b243c9e6cde1'
SOURCE=PROCESS/'aokiji-win-atempo1p4-japanese1013.wav'
TARGET_REL='public/assets/audio/voice/aokiji/win-qwen-atempo1p4-japanese1013.wav'

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def enc(v):return (json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
def new(p,v):
    with p.open('xb') as f:f.write(enc(v))
def rec(p):return {'file':p.as_posix(),'sha256':sha(p),'bytes':p.stat().st_size}
def evidence(p,role):return {'path':p.as_posix(),'sha256':sha(p),'role':role}

def main():
    assert ROOT==Path('D:/Projects/one-piece-fighter') and Path.cwd().resolve()==ROOT
    assert sha(SOURCE)==EXPECTED
    with wave.open(str(SOURCE),'rb') as wav:
        assert (wav.getframerate(),wav.getnchannels(),wav.getsampwidth(),wav.getnframes())==(24000,1,2,41299)
        pcm=wav.readframes(wav.getnframes());duration=wav.getnframes()/wav.getframerate()
    assert duration==1.7207916666666667 and duration<110/60
    processing=read(PROCESS/'processing-after1013.json')
    assert processing['sourceSha256']==OLD_SOURCE and processing['outputFacts']['sha256']==EXPECTED
    assert processing['sourceBytesUnchanged'] and not processing['trimOrCutFiltersUsed']
    content,quality=read(QA/'result-01.json'),read(QA/'result-02.json')
    for row in (content,quality):
        assert row['audioSha256']==EXPECTED and row['expectedTextProvided'] is False
        assert row['validAudioFeatureFrames']>0 and row['responseSha256']==hashlib.sha256(row['response'].encode()).hexdigest()
    assert content['reviewMode']=='content_and_quality' and quality['reviewMode']=='quality_only'
    assert '少し冷静になれ' in content['response'] and '日语' in content['response']
    assert all(text in quality['response'] for text in ['开头和结尾完整','没有被硬切断','无不自然重复','多余尾声','无背景音乐、杂音或明显失真'])

    paths={s:ROOT/s for s in ['src/audio/sampleManifest.json','src/audio/voiceLines0922.json','scripts/first_pair_voice_selection1013.json','scripts/first_pair_voice_subtitles1013.json','scripts/aokiji_voice_sources1013.json']}
    protected=[ROOT/'scripts/first_pair_voice_selection1004.json',ROOT/'scripts/first_pair_voice_subtitles1004.json',
        OWN/'voice-completion1013/aokiji-win-ryan-japanese1013.wav',ROOT/'public/assets/audio/voice/aokiji/win-qwen-japanese1013.wav',
        ROOT/'public/assets/audio/voice/aokiji/win-kokoro-original1004.wav']
    assert sha(protected[2])==sha(protected[3])==OLD_SOURCE
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    baseline=ROSTER/('baseline/aokiji-retimed-win1013-'+stamp);out=PROCESS/('adoption-'+stamp)
    for folder,text in [(baseline,'# Aokiji retimed win rollback1013\nExact current shared audio tables,1013/source metadata, immutable1004 ledgers, original2.40s source/idle file and old win. Copy-before then exact copy-after; no deletion.\n'),
                        (out,'# Aokiji one-cue retimed win adoption1013\nOnly win changes to the independently reviewed full atempo1.4 output. All other cue values and old media remain. No new synthesis/QA/rate processing. Real victory-window playback pending root.\n')]:
        folder.mkdir(exist_ok=False);(folder/'README.md').write_text(text,encoding='utf-8')
    inventory=[]
    for i,p in enumerate(list(paths.values())+protected):inventory.append({**rec(p),'copy':(baseline/f'before-{i:02}-{p.name}').as_posix()})
    new(baseline/'copy-before1013.json',inventory)
    for row in inventory:
        dest=Path(row['copy'])
        with dest.open('xb') as f:f.write(Path(row['file']).read_bytes())
        assert sha(dest)==row['sha256']
    new(baseline/'copy-after1013.json',[{**row,'equal':True} for row in inventory])
    before={name:read(p) for name,p in paths.items()}
    manifest=deepcopy(before['src/audio/sampleManifest.json']);subtitles=deepcopy(before['src/audio/voiceLines0922.json'])
    ledger=deepcopy(before['scripts/first_pair_voice_selection1013.json']);ledger_subs=deepcopy(before['scripts/first_pair_voice_subtitles1013.json']);sources=deepcopy(before['scripts/aokiji_voice_sources1013.json'])
    current=manifest['cues']['voice.aokiji.win'];assert current['files']==['assets/audio/voice/aokiji/win-kokoro-original1004.wav']
    old_entry=next(x for x in ledger['cues'] if x['character']=='aokiji' and x['event']=='win')
    translation='稍微冷静一点吧。'
    review={'kind':'agent_audio_model','status':'accepted','inputAudioAttached':True,'nativeAudioReviewed':True,
        'headTailComplete':True,'noUnexpectedNoiseOrDistortion':True,'humanListened':False,'audioSha256':EXPECTED,
        'transcript':'少し冷静になれ','provider':'local unchanged Qwen2.5-Omni-3B native audio encoder/generation',
        'modelRevision':content['modelRevision'],'expectedTextProvided':False,
        'evidence':[evidence(QA/'result-01.json','response'),evidence(QA/'result-02.json','quality-supplement'),evidence(PROCESS/'processing-after1013.json','exact-audio-processing')],
        'meaning':'Fresh content and quality responses reviewed the exact full atempo1.4 output. No inheritance from the2.40s source native review; not human preference or actual victory-window playback certification.'}
    cue={'character':'aokiji','event':'win','reviewStatus':'accepted','evidence':'scripts/first_pair_voice_selection1013.json',
        'note':'Full original Japanese calm line processed once with pitch-preserving ffmpeg atempo1.4, no syllable trimming; new1.720791667s bytes independently native-reviewed. Original2.40s remains idle only.',
        'contentReview':{'actualContentReview':review},'clips':[{'path':TARGET_REL,'sha256':EXPECTED,'transcript':'少し冷静になれ','translation':translation,
            'source_start_seconds':0,'source_end_seconds':duration}],
        'playback':{'gain':current['gain'],'cooldownMs':current['cooldownMs']}}
    validate_roster_content_review(ROOT,cue)
    target=ROOT/TARGET_REL;assert not target.exists()
    new(out/'audio-copy-before1013.json',{'source':rec(SOURCE),'destination':target.as_posix()})
    with target.open('xb') as f:f.write(SOURCE.read_bytes())
    assert target.read_bytes()==SOURCE.read_bytes()
    new(out/'audio-copy-after1013.json',{'source':rec(SOURCE),'destination':rec(target),'exactBytesEqual':True})
    ledger['cues']=[cue if x['character']=='aokiji' and x['event']=='win' else x for x in ledger['cues']]
    assert len(ledger['cues'])==len(before['scripts/first_pair_voice_selection1013.json']['cues'])
    assert all(x==y for x,y in zip(ledger['cues'],before['scripts/first_pair_voice_selection1013.json']['cues']) if x['character']!='aokiji' or x['event']!='win')
    ledger['declaredCueOverrides']=sorted(f"voice.{x['character']}.{x['event']}" for x in ledger['cues'])
    if 'aokiji1013' in ledger:
        info=ledger['aokiji1013'];info['actualChangedCueIds']=sorted(set(info['actualChangedCueIds'])|{'voice.aokiji.win'})
        info.update(temporaryWinPreserved1004=False,uniqueRuntimeFiles=6,
            winPolicy='Use independently native-reviewed1.720791667s complete atempo1.4 derived Japanese output; original2.40s file stays idle. Actual victory playback pending.')
    line={'file':TARGET_REL.removeprefix('public/'),'sha256':EXPECTED,'label':'青雉 · 日语胜利','original':'少し冷静になれ','translation':translation,
        'transcriptVerified':True,'nativeAudioReviewed':True,'humanListened':False,'sourceKind':'original-synthetic-Japanese-tempo-derived',
        'sourceId':'aokiji_qwen_win_atempo1p4_jp1013','nativeReview':review,'evidence':'scripts/first_pair_voice_selection1013.json'}
    assert not any(x['file']==line['file'] for x in subtitles['lines'])
    subtitles['lines'].append(line);ledger_subs['lines'].append(line)
    source_key='aokiji_qwen_win_atempo1p4_jp1013';assert source_key not in sources['sources']
    sources['sources'][source_key]={'event':'win','source':SOURCE.as_posix(),'runtimeFile':TARGET_REL,'runtimeSha256':EXPECTED,'sha256':EXPECTED,
        'sourcePcmSha256':hashlib.sha256(pcm).hexdigest(),'durationSeconds':duration,'originalFullSentenceSource':protected[2].as_posix(),
        'originalFullSentenceSourceSha256':OLD_SOURCE,'originalSourceRetainedAsIdle':True,'actualText':'少し冷静になれ','translation':translation,
        'provider':'existing local official Qwen CustomVoice plus existing local ffmpeg','model':'Qwen3-TTS-12Hz-1.7B-CustomVoice','speaker':'Ryan',
        'sourceKind':'original-synthetic-Japanese-tempo-derived','processing':{'filter':'atempo=1.4','pitchPreserving':True,'wholeInputProcessed':True,
            'trimOrCutFilters':False,'sourceBytesUnchanged':True,'nominalVictoryWindowSeconds':110/60,'nominalMarginSeconds':110/60-duration,
            'beforeReceipt':rec(PROCESS/'processing-before1013.json'),'afterReceipt':rec(PROCESS/'processing-after1013.json')},
        'nativeReview':review,'sourceNativeReviewInherited':False,'runtimeCueIds':['voice.aokiji.win'],'humanListened':False,'IABPlaybackVerified':False}
    sources['temporaryWinPreserved1004']=False
    sources['retimedWinPolicy']='Fresh same-SHA native-reviewed1.720791667s full atempo1.4 output used only for win; original2.40s idle and old short win files retained.'
    if 'aokiji_retained_win1004' in sources['sources']:
        sources['sources']['aokiji_retained_win1004']['currentRuntimeUse']='Preserved old file/receipt; no longer active for win after reviewed atempo candidate adoption.'
    staged_selection=out/'win-selection-candidate1013.json';staged_subs=out/'subtitles-candidate1013.json'
    new(staged_selection,{'cues':[cue]});new(staged_subs,ledger_subs)
    manifest['cues']=apply_voices(ROOT,{k:v for k,v in manifest['cues'].items() if k!='voice.aokiji.win'},staged_selection,staged_subs)
    changed=[k for k,v in before['src/audio/sampleManifest.json']['cues'].items() if manifest['cues'][k]!=v]
    assert changed==['voice.aokiji.win']
    for field in ('group','characterId','gain','priority','maxInstances','cooldownMs'):assert manifest['cues']['voice.aokiji.win'][field]==current[field]
    for row in inventory:assert sha(Path(row['file']))==row['sha256']
    paths['scripts/first_pair_voice_selection1013.json'].write_bytes(enc(ledger))
    paths['scripts/first_pair_voice_subtitles1013.json'].write_bytes(enc(ledger_subs))
    paths['scripts/aokiji_voice_sources1013.json'].write_bytes(enc(sources))
    global_subs=out/'global-subtitles-candidate1013.json';new(global_subs,subtitles)
    rebuilt=apply_voices(ROOT,manifest['cues'],subtitle_path=global_subs)
    assert rebuilt==manifest['cues']
    assert all(rebuilt[k]==v for k,v in before['src/audio/sampleManifest.json']['cues'].items() if k!='voice.aokiji.win')
    paths['src/audio/sampleManifest.json'].write_bytes(enc(manifest));paths['src/audio/voiceLines0922.json'].write_bytes(enc(subtitles))
    assert subtitles['lines'][:-1]==before['src/audio/voiceLines0922.json']['lines']
    for p in protected:assert sha(p)==next(r['sha256'] for r in inventory if r['file']==p.as_posix())
    result={'status':'only-aokiji-win-adopted-default-rebuild-passed-IAB-playback-pending','createdAtUtc':datetime.now(timezone.utc).isoformat(),
        'baseline':baseline.as_posix(),'adoptionFolder':out.as_posix(),'changedCueIds':changed,'otherCueValuesUnchanged':len(manifest['cues'])-1,
        'totalCueCount':len(manifest['cues']),'runtime':rec(target),'actualDurationSeconds':duration,'tempoFactor':1.4,
        'pitchPreservingProcessing':True,'noExplicitTrimming':True,'nominalWindowMarginSeconds':110/60-duration,
        'freshNativeContentAndQuality':True,'sourceReviewInherited':False,'gainPriorityAndSchedulingUnchanged':True,
        'originalSourceIdleFileOldWinAnd1004LedgersUnchanged':True,'bad34SecondCandidateUsed':False,'allOldSubtitleRowsUnchanged':True,
        'defaultRebuildExact':True,'IABPlaybackVerified':False,'newQAOrSynthesisOrRateProcessing':False,'formalCharacterAccepted':False,
        'affectedFiles':list(paths)+[TARGET_REL]}
    new(out/'verification1013.json',result);new(PROCESS/'aokiji-retimed-win-adoption-result1013.json',result)
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
