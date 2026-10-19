"""Prepare only Shanks-owned voice fragments; pending native reviews remain closed."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from apply_voice_manifest import validate_roster_content_review

ROOT = Path(__file__).resolve().parents[1]
OWN = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/shanks')
QA = OWN.parent/'native-qa/20261013T045504347029Z'

def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def evidence(p, role): return {'path':p.as_posix(),'sha256':sha(p),'role':role}
def save(p, value):
    with p.open('x',encoding='utf-8') as out:json.dump(value,out,ensure_ascii=False,indent=2)

def main():
    assert ROOT == Path('D:/Projects/one-piece-fighter') and Path.cwd().resolve() == ROOT
    source_rows=[]; cues=[]; subtitles=[]
    old=read(ROOT/'scripts/first_pair_voice_selection1004.json')
    select=deepcopy(next(x for x in old['cues'] if x['character']=='shanks' and x['event']=='select'))
    assert sha(ROOT/select['clips'][0]['path'])==select['clips'][0]['sha256']
    validate_roster_content_review(ROOT,select)
    cues.append(select)
    old_subtitles=read(ROOT/'scripts/first_pair_voice_subtitles1004.json')['lines']
    select_path=select['clips'][0]['path'].removeprefix('public/')
    subtitles.append(deepcopy(next(x for x in old_subtitles if x['file']==select_path)))
    source_rows.append({'event':'select','kind':'existing-reviewed-Japanese-original','runtimeFile':select['clips'][0]['path'],'sha256':select['clips'][0]['sha256'],'action':'preserve-existing-exact-file','nativeReviewed':True,'humanAuditioned':False})

    effort_file=OWN/'voice-20261013T033431410339Z/shanks-effort-qwen-japanese1013.wav'
    effort_result=QA/'result-04.json';heard=read(effort_result)
    assert heard['audioSha256']==sha(effort_file)
    assert heard['responseSha256']==hashlib.sha256(heard['response'].encode()).hexdigest()
    assert heard['expectedTextProvided'] is False and 'こおい' in heard['response']
    review={'kind':'agent_audio_model','status':'accepted','inputAudioAttached':True,'nativeAudioReviewed':True,
       'headTailComplete':True,'noUnexpectedNoiseOrDistortion':True,'humanListened':False,
       'audioSha256':sha(effort_file),'transcript':'こおい','provider':'local Qwen2.5-Omni-3B native encoder and multimodal generation',
       'modelRevision':heard['modelRevision'],'expectedTextProvided':False,
       'meaning':'Observed こおい is compatible with an elongated 来い generic challenge shout. Actual heard wording retained; no claim of exact requested orthography, named move, original actor, human timbre approval or completed game mix.',
       'evidence':[evidence(effort_result,'response'),evidence(QA/'copy-after.json','audio-attachment'),evidence(QA/'model-identity.json','native-model')]}
    effort={'character':'shanks','event':'effort','reviewStatus':'accepted','evidence':'D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/shanks/shanks-native-pilot-review1013.json',
       'note':'Original synthetic generic effort; requested来い and observedこおい remain separate; same exact clip may serve generic attack.',
       'contentReview':{'actualContentReview':review},'clips':[{'path':'public/assets/audio/voice/shanks/effort-qwen-japanese1013.wav','sha256':sha(effort_file),'transcript':'こおい','translation':'来吧！','source_start_seconds':0,'source_end_seconds':0.72}],
       'playback':{'gain':0.72,'cooldownMs':800}}
    validate_roster_content_review(ROOT,effort)
    cues.append(effort)
    attack=deepcopy(effort);attack['event']='attack';attack['note']='Explicit reuse of this Shanks effort clip for generic skill start, not nine distinct named moves.';attack['playback']={'gain':0.8,'cooldownMs':800};cues.append(attack)
    subtitles.append({'file':effort['clips'][0]['path'].removeprefix('public/'),'label':'香克斯 · 出力','original':'こおい','translation':'来吧！','transcriptVerified':True,'sha256':sha(effort_file),'requestedText':'来い！','humanListened':False,'nativeAudioReviewed':True,'evidence':effort['evidence']})
    source_rows.append({'event':'effort','kind':'original-synthetic-Japanese','sourceFile':effort_file.as_posix(),'sha256':sha(effort_file),'generationRequest':(effort_file.parent/'effort-request.json').as_posix(),'actualTranscript':'こおい','requestedText':'来い！','nativeResult':effort_result.as_posix(),'nativeReviewed':True,'humanAuditioned':False,'adopted':False})

    batch=OWN/'voice-20261013T070618356982Z';rows=read(batch/'batch-result.json')['files']
    plan=read(OWN/'shanks-voice-five-events1013.json')
    for event in ['ko','win','idle','move','hurt']:
        row=next(x for x in rows if x['event']==event);planned=next(x for x in plan['events'] if x['event']==event);path=Path(row['destination']);assert sha(path)==row['sha256']
        target=f'public/assets/audio/voice/shanks/{event}-qwen-japanese1013.wav'
        if event=='hurt':target='public/assets/audio/voice/shanks/hurt-nonlexical-qwen1013.wav'
        clip={'path':target,'sha256':row['sha256'],'transcript':None,'translation':None,'source_start_seconds':0,'source_end_seconds':row['technical']['seconds']}
        cues.append({'character':'shanks','event':event,'reviewStatus':'pending-native-review','evidence':(batch/(event+'-request.json')).as_posix(),'note':'DRAFT ONLY. Generation input is not certified output wording; do not apply until root native result is reviewed.','contentReview':{'actualContentReview':{'status':'pending','nativeAudioReviewed':False,'humanListened':False}},'clips':[clip],
            'draftRequestedText':planned['text'],'draftTranslation':planned['translation'],'nonlexical':planned.get('nonlexical',False),'playback':{'gain':0.65 if event=='hurt' else 0.7,'cooldownMs':max(800,round(row['technical']['seconds']*1000)+100)}})
        subtitles.append({'file':target.removeprefix('public/'),'label':f'香克斯 · {event}','original':None,'translation':'','transcriptVerified':False,'sha256':row['sha256'],'nativeAudioReviewed':False,'humanListened':False,'draftRequestedText':planned['text'],'draftTranslation':planned['translation'],'nonlexical':planned.get('nonlexical',False)})
        source_rows.append({'event':event,'kind':'original-synthetic-nonlexical' if event=='hurt' else 'original-synthetic-Japanese','sourceFile':path.as_posix(),'sha256':row['sha256'],'generationRequest':(batch/(event+'-request.json')).as_posix(),'generationResponse':(batch/(event+'-response.json')).as_posix(),'requestedText':planned['text'],'actualTranscript':None,'nativeReviewed':False,'adopted':False,'humanAuditioned':False})

    assert len(cues)==8 and len(subtitles)==7 and len(source_rows)==7
    folder=OWN/'voice-adoption-fragments1013';folder.mkdir(exist_ok=False)
    (folder/'README.md').write_text('# Shanks voice adoption preparation1013\nSeven unique event clips and eight cue mappings (attack reuses effort). Exact approved select is retained. New five clips remain explicitly pending; generated text is not an audio transcript. This folder never writes central tables or runtime voice media. Existing same cue IDs must be intentionally replaced only after exact native review; generic apply_voices will reject duplicate IDs.\n',encoding='utf-8')
    save(folder/'selection-draft1013.json',{'character':'shanks','readyForApply':False,'eventCount':7,'cueCountWithAttackReuse':8,'cues':cues})
    save(folder/'subtitles-draft1013.json',{'lines':subtitles,'readyForApply':False})
    save(folder/'sources1013.json',{'character':'shanks','createdAtUtc':datetime.now(timezone.utc).isoformat(),'model':'existing Qwen3-TTS-12Hz-1.7B-CustomVoice','speaker':'Uncle Fu','sourceRows':source_rows,'newFilesCopiedToRuntime':0,'formalAdopted':0})
    save(folder/'validation1013.json',{'selectExistingShaVerified':True,'effortExactShaNativeResponseVerified':True,'acceptedEntriesPassedExistingNativeValidator':2,'pendingEntries':5,'reusedAttackCue':True,'allNewOutputShasVerified':True,'runtimeMediaOrSharedCatalogWritten':False,'rootActions':['Review the five new exact native responses; fill only actually heard wording/quality.','For accepted new files, copy unchanged bytes into explicit Shanks runtime paths with copy receipts.','Keep select exactly; replace only Shanks owned cue IDs after snapshot, then use apply_voices with explicit selection/subtitle files.','Record hurt as nonlexical if that is actually heard; never force a language or silently reuse the disputed earlier clips.']})
    print(folder.as_posix())

if __name__=='__main__':main()
