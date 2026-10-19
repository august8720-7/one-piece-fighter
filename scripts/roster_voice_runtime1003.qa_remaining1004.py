"""Exact bounded remaining-roster candidate input loader; never text hints."""
import hashlib
import json
from pathlib import Path
import wave
from datetime import datetime, timezone
import unicodedata
import re

PROJECT=Path(__file__).resolve().parents[1]
CATALOG=PROJECT/'scripts/remaining_roster_voice_sources1004.json'
PRODUCTION_ROOT=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/remaining-roster1004').resolve()
VALIDATION_ROOT=PRODUCTION_ROOT/'validation'


def load_batch(batch_id):
    raw=CATALOG.read_bytes();value=json.loads(raw)
    batches=[row for row in value['batches'] if row['id']==batch_id]
    if len(batches)!=1:raise ValueError('Use one exact explicitly prepared remaining-roster batch ID')
    selected=[row for row in value['files'] if row['batchId']==batch_id]
    if not 0<len(selected)<=14 or {row['index'] for row in selected}!=set(batches[0]['indices']):raise ValueError('Only the exact small prepared batch is allowed')
    result=[]
    for row in selected:
        if row['character'] not in value['characters'] or row['character'] in ('aokiji','shanks','luffy','akainu','labubu','twinkle') or not row['originalSyntheticSpeech']:
            raise ValueError('No old/first-pair/original-actor audio is included here')
        source=Path(row['sourceFile']).resolve();candidate=Path(row['candidate']).resolve()
        if not source.is_relative_to(PRODUCTION_ROOT/'originals') or not candidate.is_relative_to(PRODUCTION_ROOT/'candidates'):raise ValueError('Prepared audio escaped this independent remaining-roster root')
        if hashlib.sha256(source.read_bytes()).hexdigest()!=row['sourceSha256'] or hashlib.sha256(candidate.read_bytes()).hexdigest()!=row['candidateSha256']:raise ValueError('Exact source/candidate identity changed')
        with wave.open(str(source),'rb') as wav:
            if (wav.getnchannels(),wav.getsampwidth(),wav.getframerate(),wav.getcomptype())!=(1,2,24000,'NONE'):raise ValueError('Unexpected original PCM format')
            raw_pcm=wav.readframes(wav.getnframes())
        with wave.open(str(candidate),'rb') as wav:
            if (wav.getnchannels(),wav.getsampwidth(),wav.getframerate(),wav.getcomptype())!=(1,2,24000,'NONE'):raise ValueError('Unexpected candidate PCM format')
            selected_pcm=wav.readframes(wav.getnframes());duration=wav.getnframes()/24000
        if raw_pcm[row['sourceFirstFrame']*2:row['sourceLastFrameExclusive']*2]!=selected_pcm or hashlib.sha256(selected_pcm).hexdigest()!=row['candidatePcmSha256']:raise ValueError('Native QA must use the unmodified exact prepared PCM')
        result.append({'index':row['index'],'id':row['id'],'character':row['character'],'event':row['event'],'audio':str(candidate),'audioSha256':row['candidateSha256'],
            'pcmSha256':row['candidatePcmSha256'],'durationSeconds':duration,'sourceFile':str(source),'sourceSha256':row['sourceSha256'],
            'sourceFirstFrame':row['sourceFirstFrame'],'sourceLastFrameExclusive':row['sourceLastFrameExclusive'],
            'sourceKind':'original-Chinese-game-dialogue-not-original-actor-line','batchId':batch_id,'runtimeFile':None,'runtimeCopied':False})
    # Generation wording, preset names, character identity and event use do not
    # enter the native conversation. Catalog is for post-response comparison.
    return result, {'catalog':str(CATALOG),'catalogSha256':hashlib.sha256(raw).hexdigest(),'batchId':batch_id,
        'actualMoveCount':len(result),'actualClipCount':len(result),'exactPcmRangesVerified':True,
        'onlyNewPreparedAudio':True,'expectedTranscriptProvided':False,'sourceAndRuntimeManifestsModified':False}


def record_native_batch(batch_id, record_dir):
    """Post-response provenance/content comparison; no automatic use approval."""
    record_dir=Path(record_dir).resolve()
    if not record_dir.is_relative_to(VALIDATION_ROOT):raise ValueError('Remaining native result escaped the independent evidence root')
    summary=json.loads((record_dir/'batch-summary.json').read_bytes())
    raw=CATALOG.read_bytes();catalog=json.loads(raw)
    normalize=lambda text:''.join(char for char in text if not unicodedata.category(char).startswith(('P','Z')))
    compared=[]
    for result in summary['results']:
        request=result.get('request')
        if not request:continue
        row=next(row for row in catalog['files'] if row['index']==request['index'] and row['batchId']==batch_id)
        if request['audioSha256']!=row['candidateSha256'] or not result.get('inputAudioAttached') or not result.get('validAudioFeatureFrames',0):raise ValueError('Actual native audio is not the exact prepared file')
        response=result['response'];stable=result.get('resourceStable') is True
        matches=normalize(row['text']) in normalize(response)
        uncertain=any(word in response for word in ('不确定','无法确定','无法聆听','未提供音频'))
        quality=all(word in response for word in ('截断','杂音','失真'))
        clauses=re.split(r'[。\n；;]',response)
        quality_clean=(any('没有' in clause and '截断' in clause for clause in clauses)
            and any('没有' in clause and '杂音' in clause and '失真' in clause for clause in clauses)
            and not any(phrase in response for phrase in ('有明显杂音','有明显失真','有明显破音','有突兀截断','存在杂音','存在失真')))
        row.update(nativeAudioResponseProduced=True,nativeAudioReviewed=stable,
            nativeReviewStatus=('native-response-content-matches-pending-root-use-mix' if stable and matches and not uncertain and quality_clean else
                'native-response-content-or-quality-uncertain' if stable else 'native-response-low-resource-margin-pending-root-decision'),
            nativeContentMatchesGenerationAfterResponse=matches, nativeQualityAnswerPresent=quality,nativeQualityNoObviousIssueReported=quality_clean,
            nativeResponse=response,nativeEvidence=str(record_dir/f"clip-{row['index']:02}"/'native-result.json'),
            nativeResponseSha256=result['responseSha256'],humanListened=False,transcriptVerified=False,adopted=False)
        compared.append({'id':row['id'],'audioSha256':row['candidateSha256'],'sourceTextOnlyComparedAfterResponse':row['text'],
            'nativeResponse':response,'contentMatchesIgnoringPunctuationOnly':matches,'modelExpressedUncertainty':uncertain,
            'qualityAnswerPresent':quality,'noObviousQualityIssueReported':quality_clean,'resourceStable':stable,'status':row['nativeReviewStatus'],'formalAdopted':False})
    snapshot=PRODUCTION_ROOT/'catalog-history'/('before-native-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.json')
    with snapshot.open('xb') as file:file.write(raw)
    catalog['nativeReviews'].append({'batchId':batch_id,'recordDir':str(record_dir),'responseCount':len(compared),
        'requested':summary['requested'],'completedStable':summary['completed'],'formalAdopted':0})
    next(row for row in catalog['batches'] if row['id']==batch_id)['status']='native-responses-complete-pending-root' if summary['completed']==summary['requested'] else 'native-partial-pending-dependency'
    with (record_dir/'post-response-comparison.json').open('x',encoding='utf-8') as file:json.dump({'rows':compared,'automaticAdoption':False},file,ensure_ascii=False,indent=2)
    CATALOG.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return {'batchId':batch_id,'nativeResponses':len(compared),'contentAndQualityMatched':sum(row['status']=='native-response-content-matches-pending-root-use-mix' for row in compared),'uncertainOrLowResource':sum(row['status']!='native-response-content-matches-pending-root-use-mix' for row in compared),'formalAdopted':0}
