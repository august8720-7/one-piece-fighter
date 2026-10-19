"""Root-authorized narrow Aokiji adoption; shared write ownership must be exclusive."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil

from apply_voice_manifest import apply_voices, validate_roster_content_review

ROOT = Path(__file__).resolve().parents[1]
OWN = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/aokiji')
FRAGMENTS = OWN / 'voice-adoption-fragments1013'
EVENTS = {'select', 'attack', 'effort', 'idle', 'move', 'ko', 'win', 'hurt'}
OWNED = {f'voice.aokiji.{event}' for event in EVENTS}
CHANGED = OWNED - {'voice.aokiji.hurt'}


def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def encode(value): return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
def save_new(path, value):
    with Path(path).open('xb') as handle: handle.write(encode(value))
def ref(path): return {'path':Path(path).as_posix(),'bytes':Path(path).stat().st_size,'sha256':sha(path)}


def main():
    if ROOT != Path('D:/Projects/one-piece-fighter') or Path.cwd().resolve() != ROOT:
        raise RuntimeError('Run only the active D workspace with run-d1013.ps1')
    draft = read(FRAGMENTS/'selection-draft1013.json')
    cues = deepcopy(draft['cues'])
    if (not draft['readyForCompleteApply'] or len(cues)!=8
            or {f"voice.{c['character']}.{c['event']}" for c in cues}!=OWNED
            or any(c['reviewStatus']!='accepted' for c in cues)):
        raise ValueError('All eight Aokiji cue mappings must have exact accepted native evidence')
    for cue in cues: validate_roster_content_review(ROOT,cue)
    paths = {
        'manifest':ROOT/'src/audio/sampleManifest.json',
        'subtitles':ROOT/'src/audio/voiceLines0922.json',
        'ledger':ROOT/'scripts/first_pair_voice_selection1013.json',
        'subtitleLedger':ROOT/'scripts/first_pair_voice_subtitles1013.json',
    }
    before_bytes={key:path.read_bytes() for key,path in paths.items()}
    before={key:json.loads(data) for key,data in before_bytes.items()}
    source_catalog=ROOT/'scripts/aokiji_voice_sources1013.json'
    if source_catalog.exists():raise FileExistsError('Preserve the prior Aokiji adoption; do not replay')
    sources=read(FRAGMENTS/'sources1013.json')['sources']
    if len(sources)!=4 or any(not item['acceptedForStaging'] for item in sources):
        raise ValueError('Exactly four new reviewed original WAVs are required')
    for item in sources:
        if sha(item['source'])!=item['sha256']:raise ValueError('Reviewed original changed')
        target=(ROOT/item['destination']).resolve()
        if not target.is_relative_to((ROOT/'public/assets/audio/voice/aokiji').resolve()):
            raise ValueError('New runtime target escapes Aokiji')
        if target.exists() and sha(target)!=item['sha256']:raise ValueError('Never overwrite differing audio')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    out=OWN/('voice-adoption-'+stamp);out.mkdir()
    (out/'README.md').write_text('# Aokiji exact Japanese adoption1013\nRoot granted exclusive shared-voice write ownership. Eight cue mappings/seven actual value changes, four new exact WAVs, four new subtitle rows; Aokiji old pain cue/media remain byte/value-identical. Old Chinese files,1004 ledgers, Shanks current overrides, old four and every unrelated cue/subtitle remain. Full default rebuild is checked once before final shared runtime manifest/subtitle writes. No model generation/review, no game/browser verification or public release.\n',encoding='utf-8')
    preserve_paths=[ROOT/'scripts/first_pair_voice_selection1004.json',ROOT/'scripts/first_pair_voice_subtitles1004.json',
                    ROOT/'scripts/voice_manifest.json',ROOT/'scripts/shanks_voice_sources1013.json']
    preserved={str(path):sha(path) for path in preserve_paths}
    old_media={}
    for cue in before['manifest']['cues'].values():
        if cue.get('group')!='voice':continue
        for logical in cue.get('files',[]):
            file=(ROOT/'public'/logical).resolve()
            if not file.is_relative_to((ROOT/'public').resolve()):raise ValueError('Old voice path escaped public')
            old_media[str(file)]=sha(file)
    backup_rows=[{'source':str(path),'copy':str(out/(key+'-before.json')),'sha256':hashlib.sha256(before_bytes[key]).hexdigest()}
                 for key,path in paths.items()]
    copies=[{**row,'runtimeTarget':str(ROOT/row['destination']),'destinationExisted':(ROOT/row['destination']).exists()} for row in sources]
    save_new(out/'copy-before1013.json',{'sharedBackups':backup_rows,'runtimeCopies':copies,'protectedFiles':preserved,'oldVoiceMedia':old_media})
    for row in backup_rows:
        shutil.copy2(row['source'],row['copy'])
        if sha(row['copy'])!=row['sha256']:raise ValueError('Incremental backup differs')
    for row in copies:
        target=Path(row['runtimeTarget']);target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists():shutil.copy2(row['source'],target)
        if sha(target)!=row['sha256']:raise ValueError('Exact runtime copy differs')
    save_new(out/'copy-after1013.json',{'sharedBackups':backup_rows,'runtimeCopies':[ref(row['runtimeTarget']) for row in copies],'allExact':True})
    for key,path in paths.items():
        if path.read_bytes()!=before_bytes[key]:raise RuntimeError('Shared file changed during exclusive preparation: '+key)
    for cue in cues:
        if cue['event']!='hurt':
            cue['evidence']='scripts/first_pair_voice_selection1013.json'
        validate_roster_content_review(ROOT,cue)
    ledger=deepcopy(before['ledger'])
    other_ledger=[row for row in ledger['cues'] if row['character']!='aokiji']
    ledger['cues']=other_ledger+cues
    ledger['declaredCueOverrides']=sorted({f"voice.{row['character']}.{row['event']}" for row in ledger['cues']})
    ledger['aokiji1013']={'eightCueProfile':True,'actualChangedCueIds':sorted(CHANGED),'uniqueRuntimeFiles':5,
        'newExactWavs':4,'retainedHurtUnchanged':True,'adoptionEvidence':out.as_posix(),'IABPlaybackVerified':False}
    if len(ledger['declaredCueOverrides'])!=len(ledger['cues']):raise ValueError('Duplicate1013 cue ownership')
    new_lines=[]
    for line in deepcopy(read(FRAGMENTS/'subtitles-draft1013.json')['lines']):
        if line['file'] in {row['destination'].removeprefix('public/') for row in sources}:
            line['evidence']='scripts/first_pair_voice_selection1013.json'
            line['sourceId']='aokiji_qwen_'+next(row['event'] for row in sources if row['destination'].removeprefix('public/')==line['file'])+'_jp1013'
            new_lines.append(line)
    if len(new_lines)!=4:raise ValueError('Require four unique new subtitle rows')
    subtitles=deepcopy(before['subtitles']);subtitle_ledger=deepcopy(before['subtitleLedger'])
    for line in new_lines:
        for table in (subtitles,subtitle_ledger):
            if any(row['file']==line['file'] for row in table['lines']):raise ValueError('Never duplicate a subtitle file')
            table['lines'].append(deepcopy(line))
    save_new(out/'subtitles-candidate1013.json',subtitles)
    save_new(out/'selection-candidate1013.json',{'cues':cues})
    candidate=deepcopy(before['manifest'])
    candidate['cues']=apply_voices(ROOT,{key:value for key,value in before['manifest']['cues'].items() if key not in OWNED},
        out/'selection-candidate1013.json',out/'subtitles-candidate1013.json')
    if set(candidate['cues'])!=set(before['manifest']['cues']):raise RuntimeError('Unexpected cue add/remove')
    actual_changes={key for key,value in before['manifest']['cues'].items() if candidate['cues'][key]!=value}
    if actual_changes!=CHANGED:raise RuntimeError('Changes differ from the seven authorized Aokiji cues')
    if candidate['cues']['voice.aokiji.hurt']!=before['manifest']['cues']['voice.aokiji.hurt']:
        raise RuntimeError('Retained pain cue changed')
    if any(candidate['cues'][key]!=value for key,value in before['manifest']['cues'].items() if not key.startswith('voice.aokiji.')):
        raise RuntimeError('Non-Aokiji cue changed')
    for key in CHANGED:
        for prop in ('gain','priority','maxInstances','group','characterId'):
            if candidate['cues'][key].get(prop)!=before['manifest']['cues'][key].get(prop):
                raise RuntimeError('Original playback property changed: '+key+'/'+prop)
    paths['ledger'].write_bytes(encode(ledger))
    paths['subtitleLedger'].write_bytes(encode(subtitle_ledger))
    rebuilt=apply_voices(ROOT,candidate['cues'],subtitle_path=out/'subtitles-candidate1013.json')
    if rebuilt!=candidate['cues']:raise RuntimeError('Default rebuild restored speech or changed a cue')
    if [row for row in ledger['cues'] if row['character']!='aokiji']!=[row for row in before['ledger']['cues'] if row['character']!='aokiji']:
        raise RuntimeError('Existing Shanks/other overlay entry changed')
    for path,expected in preserved.items():
        if sha(path)!=expected:raise RuntimeError('Protected prior ledger/source changed')
    for path,expected in old_media.items():
        if sha(path)!=expected:raise RuntimeError('Prior voice media changed')
    if subtitles['lines'][:-4]!=before['subtitles']['lines'] or subtitle_ledger['lines'][:-4]!=before['subtitleLedger']['lines']:
        raise RuntimeError('Old subtitle row changed')
    catalog_sources={}
    for row in sources:
        cue=next(c for c in cues if c['event']==row['event'])
        ids=sorted(f"voice.aokiji.{c['event']}" for c in cues if c['clips'][0]['path']==row['destination'])
        catalog_sources['aokiji_qwen_'+row['event']+'_jp1013']={**row,'runtimeFile':row['destination'],
            'runtimeSha256':sha(ROOT/row['destination']),'runtimeCueIds':ids,
            'nativeReview':cue['contentReview']['actualContentReview'],'nativeAudioReviewed':True,
            'humanListened':False,'IABPlaybackVerified':False,'originalActorVoice':False,'paidApiUsed':False}
    catalog_sources['aokiji_existing_hurt1004']={'runtimeFile':next(c for c in cues if c['event']=='hurt')['clips'][0]['path'],
        'sha256':next(c for c in cues if c['event']=='hurt')['clips'][0]['sha256'],
        'status':'retained-existing-reviewed-Aokiji-pain-unchanged','sourceLedger':'scripts/first_pair_voice_selection1004.json',
        'sameRyanPreset':False,'note':'Existing Aokiji short呃, not another character or a new Japanese/English line.'}
    save_new(source_catalog,{'schemaVersion':1,'sources':catalog_sources,'uniqueRuntimeFiles':5,'newExactRuntimeFiles':4,
        'explicitReuse':{'idle':'win','move':'attack','effort':'attack'},'adoptionEvidence':out.as_posix()})
    paths['manifest'].write_bytes(encode(candidate))
    paths['subtitles'].write_bytes(encode(subtitles))
    checks={'status':'adopted-local-runtime-awaiting-root-IAB','adoptionFolder':out.as_posix(),
        'declaredAokijiCueCount':8,'actualChangedCueIds':sorted(actual_changes),'actualChangedCueCount':len(actual_changes),
        'retainedHurtValueUnchanged':True,'allNonAokijiCuesEqual':True,'preservedOtherOverlayEntries':len(other_ledger),
        'oldVoiceMediaVerifiedUnchanged':len(old_media),'allOldSubtitleRowsUnchanged':True,'newSubtitleRows':4,
        'newExactRuntimeFiles':[ref(row['runtimeTarget']) for row in copies], 'defaultRebuildExact':True,
        'modelLoadedOrGenerated':False,'IABPlaybackVerified':False,'publicPublished':False,
        'affectedFiles':[str(path.relative_to(ROOT)) for path in paths.values()]+[str(source_catalog.relative_to(ROOT))]+[row['destination'] for row in sources],
        'afterSharedFiles':{key:ref(path) for key,path in paths.items()}}
    save_new(out/'verification1013.json',checks)
    save_new(OWN/'aokiji-voice-adoption-result1013.json',checks)
    print(json.dumps(checks,ensure_ascii=False))


if __name__=='__main__':main()
