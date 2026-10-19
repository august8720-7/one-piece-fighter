"""Keep the previous short win; the 2.40s reviewed Japanese line is idle-only."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
from apply_voice_manifest import apply_voices, validate_roster_content_review

ROOT=Path(__file__).resolve().parents[1]
OWN=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/aokiji')
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def enc(v):return (json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def new(p,v):
    with Path(p).open('xb')as f:f.write(enc(v))

def main():
    assert ROOT==Path('D:/Projects/one-piece-fighter') and Path.cwd().resolve()==ROOT
    adoption=read(OWN/'aokiji-voice-adoption-result1013.json')
    baseline=read(Path(adoption['adoptionFolder'])/'manifest-before.json')
    old_ledger=read(ROOT/'scripts/first_pair_voice_selection1004.json')
    old_win=deepcopy(next(c for c in old_ledger['cues']if c['character']=='aokiji'and c['event']=='win'))
    validate_roster_content_review(ROOT,old_win)
    paths=[ROOT/'src/audio/sampleManifest.json',ROOT/'scripts/first_pair_voice_selection1013.json',ROOT/'scripts/aokiji_voice_sources1013.json']
    before=[read(p)for p in paths]; before_bytes=[p.read_bytes()for p in paths]
    out=OWN/('win-window-adjustment-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'));out.mkdir()
    (out/'README.md').write_text('# Aokiji win playback-window correction1013\nThe new2.40s Japanese line is retained unchanged for idle only. Restore the exact prior reviewed short win cue and its1004 native entry. No core timing, other cue, media, subtitle or Shanks value changes. This is temporary pending one new short win and its exact native/game checks.\n',encoding='utf-8')
    copies=[{'source':str(p),'target':str(out/f'before-{i}.json'),'sha256':sha(p)}for i,p in enumerate(paths)]
    new(out/'copy-before1013.json',copies)
    for row in copies:shutil.copy2(row['source'],row['target']);assert sha(row['target'])==row['sha256']
    manifest,ledger,sources=deepcopy(before)
    manifest['cues']['voice.aokiji.win']=deepcopy(baseline['cues']['voice.aokiji.win'])
    ledger['cues']=[old_win if c['character']=='aokiji'and c['event']=='win' else c for c in ledger['cues']]
    ledger['aokiji1013']['actualChangedCueIds']=[key for key in ledger['aokiji1013']['actualChangedCueIds']if key!='voice.aokiji.win']
    ledger['aokiji1013'].update(uniqueRuntimeFiles=6,temporaryWinPreserved1004=True,
        winPolicy='The2.40s Japanese file is idle-only. Keep the original short win until a new <=1.8s line is native-reviewed and plays fully in the existing round window.')
    sources['sources']['aokiji_qwen_win_jp1013']['runtimeCueIds']=['voice.aokiji.idle']
    sources['sources']['aokiji_qwen_win_jp1013']['currentRuntimeUse']='idle only; generated as win but2.40s exceeds the existing victory playback window'
    sources['sources']['aokiji_retained_win1004']={'runtimeFile':old_win['clips'][0]['path'],'sha256':old_win['clips'][0]['sha256'],
        'status':'temporary exact prior reviewed short win','sourceLedger':'scripts/first_pair_voice_selection1004.json','sameRyanPreset':False}
    sources.update(uniqueRuntimeFiles=6,explicitReuse={'idle':'reviewed long Japanese calm line','move':'attack','effort':'attack'},temporaryWinPreserved1004=True)
    assert all(manifest['cues'][key]==value for key,value in before[0]['cues'].items()if key!='voice.aokiji.win')
    for p,data in zip(paths,before_bytes):assert p.read_bytes()==data
    paths[1].write_bytes(enc(ledger));paths[2].write_bytes(enc(sources))
    rebuilt=apply_voices(ROOT,manifest['cues'])
    assert rebuilt==manifest['cues']
    paths[0].write_bytes(enc(manifest))
    changes=[key for key,value in baseline['cues'].items()if manifest['cues'][key]!=value]
    assert len(changes)==6 and all(key.startswith('voice.aokiji.')for key in changes)
    result={'status':'temporary-short-win-restored-new-long-line-idle-only','folder':str(out),'changedNow':['voice.aokiji.win'],
        'actualAokijiChangesFromBeforeAdoption':changes,'actualChangedCueCount':6,'defaultRebuildExact':True,
        'temporaryWinFile':old_win['clips'][0]['path'],'oldWinDurationSeconds':old_win['clips'][0]['source_end_seconds']-old_win['clips'][0]['source_start_seconds'],
        'mediaOrSubtitlesChanged':False,'otherCuesUnchanged':True,'sharedFiles':[str(p.relative_to(ROOT))for p in paths]}
    new(out/'result1013.json',result);new(OWN/'aokiji-win-window-adjustment1013.json',result);print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
