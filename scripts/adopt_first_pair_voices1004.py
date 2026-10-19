"""Adopt the exact native-reviewed first-pair event voices; preserves every rejected candidate."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import shutil
import wave
from apply_voice_manifest import apply_voices

PROJECT = Path(__file__).resolve().parents[1]
MEDIA = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003')
OLD_QA = MEDIA/'validation/native-local-gpu6g1004-20261004T011524Z'
NEW_QA = MEDIA/'validation/native-local-clarity3-gpu6g1004-20261004T014732Z'
ORIGINAL_C = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/review-1002')
OLD_ACCEPTED = {1: '嘿', 3: '呃', 4: '别太着急', 5: '到此为止了', 6: '走吧',
                7: '那就开始吧', 8: '冷静一点', 12: '尽管放马过来', 13: '这次是你赢了',
                14: '走', 16: '下一次再见'}
NEW_ACCEPTED = {1: '看招', 2: '接住', 3: '大意了'}


def read(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def save_new(path, data):
    with path.open('x',encoding='utf-8') as out:
        out.write(json.dumps(data,ensure_ascii=False,indent=2)+'\n')


def evidence(path, role): return {'path':str(path),'sha256':sha(path),'role':role}


def reviewed_row(row, folder, transcript):
    result = read(folder/'native-result.json')
    response_path = folder/'response.txt'
    response = response_path.read_text(encoding='utf-8')
    assert result['request']['audioSha256'] == row['candidateSha256'] == sha(Path(row['candidate']))
    assert result['inputAudioAttached'] and result['validAudioFeatureFrames'] > 0
    assert result['modelRevision'] == 'f75b40e3da2003cdd6e1829b1f420ca70797c34e'
    assert result['responseSha256'] == sha(response_path) and result['response'] == response
    assert transcript in response, 'Only the actually heard text can own subtitles'
    assert ('没有截断' in response or '无截断' in response) and ('没有背景音乐' in response or '无背景音乐' in response)
    return {**row,'transcript':transcript,'nativeReview':{
        'kind':'agent_audio_model','status':'accepted','inputAudioAttached':True,'nativeAudioReviewed':True,
        'headTailComplete':True,'noUnexpectedNoiseOrDistortion':True,'humanListened':False,
        'audioSha256':row['candidateSha256'],'transcript':transcript,
        'provider':'local Qwen2.5-Omni-3B native encoder and multimodal generation',
        'modelRevision':result['modelRevision'],'expectedTextProvided':False,
        'meaning':'Main-agent post-review accepts exact content and model-reported completeness/noise for this game event; not human voice identity or game-mix acceptance.',
        'evidence':[evidence(response_path,'response'),evidence(folder/'native-result.json','native-result'),
                    evidence(folder/'request.json','request'),evidence(folder/'native-input-before-generation.json','audio-features')]}}


def main():
    assert (MEDIA/'README.md').is_file()
    old = read(PROJECT/'scripts/roster_voice_adoption1003.voices.json')['files']
    new = read(PROJECT/'scripts/roster_voice_clarity_candidates1004.json')['files']
    chosen = [reviewed_row(row,OLD_QA/('clip-'+str(row['index']).zfill(2)),OLD_ACCEPTED[row['index']])
              for row in old if row['index'] in OLD_ACCEPTED]
    chosen += [reviewed_row(row,NEW_QA/('clip-'+str(row['index']).zfill(2)),NEW_ACCEPTED[row['index']]) for row in new]
    attack = next(row for row in chosen if row['character']=='aokiji' and row['event']=='attack')
    chosen.append({**attack,'event':'effort','reuseNote':'Reuse this character exact reviewed 嘿 clip as ordinary effort; unverified 哈 clip remains unadopted.'})
    original = read(ORIGINAL_C/'clip-C-native-review1003.json')
    assert original['actualAudioAttachmentVerified'] and not original['expectedTranscriptProvided']
    assert original['sha256'] == sha(ORIGINAL_C/'clip-C.wav')
    assert original['responseSha256'] == sha(Path(original['responseEvidence']))
    assert original['transcript'] == '上がってこい' and '首尾完整' in original['response'] and '无背景音乐、杂音或失真' in original['response']
    with wave.open(str(ORIGINAL_C/'clip-C.wav'),'rb') as audio:
        duration = audio.getnframes()/audio.getframerate()
    chosen.append({'character':'shanks','event':'select','candidate':str(ORIGINAL_C/'clip-C.wav'),
        'candidateSha256':original['sha256'],'candidateDurationSeconds':duration,'transcript':original['transcript'],
        'originalSyntheticSpeech':False,'sourceFirstFrame':0,'sourceLastFrameExclusive':None,
        'sourceFile':str(ORIGINAL_C/'clip-C.wav'),'sourceSha256':original['sha256'],
        'nativeReview':{'kind':'agent_audio_model','status':'accepted','inputAudioAttached':True,'nativeAudioReviewed':True,
            'headTailComplete':True,'noUnexpectedNoiseOrDistortion':True,'humanListened':False,
            'audioSha256':original['sha256'],'transcript':original['transcript'],'expectedTextProvided':False,
            'provider':'Previously authorized official Qwen3-Omni Demo original-C review; no new upload',
            'evidence':[evidence(ORIGINAL_C/'clip-C-native-review1003.json','response'),
                        evidence(Path(original['responseEvidence']),'native-stream'),
                        evidence(Path(original['requestEvidence']),'request')]}})
    assert len(chosen)==16 and len({(row['character'],row['event']) for row in chosen})==16
    selection_path = PROJECT/'scripts/first_pair_voice_selection1004.json'
    assert not selection_path.exists(), 'Preserve prior adoption attempt'
    folder = MEDIA/'adoption'/('first-pair1004-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    folder.mkdir(parents=True)
    (folder/'README.md').write_text('首组16事件采用：仅已实际原生核验的14原创独立文件＋既有C原声；青雉effort明确复用attack。旧16全部原件/歧义/失败票据保留。复制前后SHA、正式清单改前副本、采用和字幕绑定均留证；不等于完整角色/公开发布或真人试听。\n',encoding='utf-8')
    before_files = [PROJECT/'src/audio/sampleManifest.json',PROJECT/'src/audio/voiceLines0922.json']
    backups = [{'source':str(path),'sha256':sha(path),'copy':str(folder/path.name)} for path in before_files]
    copies = []
    for row in chosen:
        if row['character']=='aokiji' and row['event']=='effort':
            filename = 'attack-kokoro-original1004.wav'
        else: filename = 'select-1003.wav' if not row['originalSyntheticSpeech'] else row['event']+'-kokoro-original1004.wav'
        row['runtimePath'] = 'public/assets/audio/voice/'+row['character']+'/'+filename
        copies.append({'source':row['candidate'],'destination':str(PROJECT/row['runtimePath']),
                       'sha256':row['candidateSha256'],'event':row['event'],'character':row['character']})
    save_new(folder/'copy-before.json',{'backups':backups,'runtimeCopies':copies})
    for entry in backups:
        shutil.copy2(entry['source'],entry['copy']); assert sha(Path(entry['copy']))==entry['sha256']
    for entry in copies:
        source,target = Path(entry['source']),Path(entry['destination'])
        assert sha(source)==entry['sha256']
        if target.exists(): assert sha(target)==entry['sha256'], 'Never overwrite differing runtime audio'
        else: shutil.copy2(source,target)
        assert sha(target)==entry['sha256']
    subtitles = read(PROJECT/'src/audio/voiceLines0922.json')
    lines = {line['file']:line for line in subtitles['lines']}
    cues = []
    for row in chosen:
        transcript = row['transcript']
        translation = '上来吧。' if not row['originalSyntheticSpeech'] else transcript + ('！' if row['event'] in ('attack','effort','hurt','move') else '。')
        logical = row['runtimePath'].removeprefix('public/')
        line = {'file':logical,'sha256':row['candidateSha256'],'label':('青雉' if row['character']=='aokiji' else '香克斯')+' · '+('本作原创配音' if row['originalSyntheticSpeech'] else '原声短句'),
            'original':transcript,'translation':translation,'transcriptVerified':True,'nativeAudioReviewed':True,
            'humanListened':False,'sourceKind':'original-synthetic' if row['originalSyntheticSpeech'] else 'original-actor-excerpt',
            'nativeReview':row['nativeReview']}
        if logical in lines: assert lines[logical]['sha256']==line['sha256'] and lines[logical]['original']==line['original']
        else: lines[logical]=line
        duration = row['candidateDurationSeconds']
        note = row.get('reuseNote','Original Chinese synthetic generic event phrase, never a dedicated original-actor move call.') if row['originalSyntheticSpeech'] else 'Previously reviewed Japanese original-C selection only; not original voice coverage for all skills.'
        cue = {'character':row['character'],'event':row['event'],'reviewStatus':'accepted',
            'evidence':'scripts/first_pair_voice_selection1004.json','note':note,
            'contentReview':{'actualContentReview':row['nativeReview']},
            'clips':[{'path':row['runtimePath'],'sha256':row['candidateSha256'],'transcript':transcript,
                'translation':translation,'source_start_seconds':0,'source_end_seconds':duration}],
            'playback':{'gain':.65 if row['event']=='hurt' else .62 if row['event'] in ('idle','move','effort') else .7 if row['event']=='select' else .85,
                'cooldownMs':0 if row['event'] in ('select','idle','move','win','ko') else math.ceil(duration*1000)+1}}
        cues.append(cue)
    selection = {'version':1,'status':'native-reviewed-generic-events','humanAuditioned':False,'cues':cues,
        'rejectedOldIndices':[2,9,10,11,15],'newSpeechIndices':[1,2,3],'formalCharacterAcceptanceUnchanged':True}
    save_new(selection_path,selection)
    review_lines = {'lines':list(lines.values())}
    subtitle_path = PROJECT/'scripts/first_pair_voice_subtitles1004.json'
    save_new(subtitle_path,review_lines)
    manifest = read(PROJECT/'src/audio/sampleManifest.json')
    updated = apply_voices(PROJECT,manifest['cues'],selection_path,subtitle_path)
    # Keep every preexisting cue byte-value intact, not merely its count.
    assert all(updated[key]==value for key,value in manifest['cues'].items())
    manifest['cues']=updated
    (PROJECT/'src/audio/sampleManifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    subtitles['lines']=list(lines.values())
    (PROJECT/'src/audio/voiceLines0922.json').write_text(json.dumps(subtitles,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    save_new(folder/'copy-after.json',{'runtimeCopiesVerified':copies,'voicesAdded':16,'uniqueAdoptedFiles':len({row['runtimePath'] for row in chosen}),
        'formalFilesAfter':[{ 'path':str(path),'sha256':sha(path)} for path in before_files],
        'priorCueValuesPreserved':True,'humanListened':False,'gameMixVerified':False,'published':False})
    print(json.dumps({'voicesAdded':16,'uniqueAdoptedFiles':len({row['runtimePath'] for row in chosen}),
        'evidence':str(folder),'formalCharacterAcceptanceUnchanged':True},ensure_ascii=False))


if __name__ == '__main__': main()
