"""Apply the reviewed true front holding only, preserving prior author/runtime.

Does not modify moves, holding distance, reaction selector or other characters.
"""
from pathlib import Path
import hashlib
import json
import sys
import copy
import shutil

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_anime_atlas import build_character, backup_candidate
OUT=Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-green-foreground-static1004')
BACKUP_ROOT=Path('D:/one-piece-fighter-crossover-0922/roster-0929/baseline/anime-backups-1003')
assert (OUT/'README.md').is_file() and (BACKUP_ROOT/'README.md').is_file()
assert not (OUT/'front-holding-intake1004.json').exists()
manifest_path=ROOT/'scripts/roster_shanks_manifest0929.json'
catalog_path=ROOT/'scripts/roster_pirate_sources0929.json'
sha=lambda b:hashlib.sha256(b).hexdigest()
old_bytes=manifest_path.read_bytes();manifest=json.loads(old_bytes)
old_runtime=ROOT/'public/assets/characters/shanks/anime/runtime.json'
assert sha(old_runtime.read_bytes())=='199dd4ca89cdf6c60850387bf6d5cdb2deba7755163a55a7f094fce16e07d728'
old=copy.deepcopy(manifest)
cfg=manifest['characters']['shanks']
proof=json.loads((ROOT/'docs/assets/shanks-green-foreground-static1004.json').read_text(encoding='utf-8'))
assert proof['allRgbaBytesUnchangedAfterPartitionRecombine']
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))['sources']
source_key='shanks_fresh_front_green_repair_1004'
source=copy.deepcopy(catalog[source_key])
assert source['sha256']=='5736bf68bc96ed65519e3f871d143e82982b4ae551a2b34c77eed10fb8df3272'
source['unitScale']=380/979
source['scaleBasis']='One actual neutral alpha>=8 height979px; uniform380/979 for the page. No pose-specific fitting.'
cfg['sources'][source_key]=source
new_name='throw_fwd_hold_green_1004'
assert new_name not in cfg['frames']
fg=proof['foregroundConfig']
cfg['frames'][new_name]={'source':source_key,'crop':fg['crop'],'root':proof['sourceRootLocal'],
                       'sockets':{'grip':[1380-fg['crop'][0],845-fg['crop'][1]]},
                       'transparency':{'mode':'source-alpha'},
                       'foregroundPolygon':fg['foregroundPolygon'],'foregroundNote':fg['foregroundNote']}
retired={}
for name in ['throw_fwd_connect_1003','throw_fwd_load_1003']:
    retired[name]=copy.deepcopy(cfg['frames'].pop(name))
    assert name not in manifest['unusedReviewCrops']
    manifest['unusedReviewCrops'][name]={**retired[name],'reviewStatus':'preserved-old-front-connected-hand-not-used1004',
                                     'note':'Original source and registration retained in backup; true connected holding now uses the reviewed new drawing.'}
frames=['throw_fwd_start_1003',new_name,'throw_fwd_release_1003','throw_fwd_recover_1003']
for anim in ['throw_fwd','throw']:
    cfg['anims'][anim]={'frames':frames,'loop':False,
        'exposures':[{'frame':0,'ticks':4},{'frame':1,'ticks':17},{'frame':2,'ticks':7},{'frame':3,'ticks':14}],
        'throwExposures':[{'frame':1,'ticks':21},{'frame':2,'ticks':7},{'frame':3,'ticks':14}]}
    assert sum(t['ticks'] for t in cfg['anims'][anim]['exposures'])==42
    assert sum(t['ticks'] for t in cfg['anims'][anim]['throwExposures'])==42
assert cfg['anims']['throw_back']==old['characters']['shanks']['anims']['throw_back']
note='1004 source5736 front true holding/near-arm foreground static3representatives2facings reviewed by root; connected21/release7/recover14 preserve42. Runtime art intake only; holding distance/reaction selector unchanged until both front/back and gameplay review.'
if isinstance(manifest['notes'],list):manifest['notes'].append(note)
else:manifest['notes']=str(manifest['notes'])+'\n'+note
new_bytes=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
# Assembly validates all sources, crops, exact foreground reconstruction and
# timeline totals in memory, before any existing author/runtime output changes.
outputs,report=build_character('shanks',cfg,sha(new_bytes))
backup=backup_candidate(old_runtime.parent,'shanks',BACKUP_ROOT)
assert backup is not None
author_inventory=[]
for src,name in [(manifest_path,'author-manifest-before1004.json'),(catalog_path,'source-catalog-before1004.json')]:
    author_inventory.append({'source':str(src),'backup':str(backup/name),'bytes':src.stat().st_size,'sha256Before':sha(src.read_bytes())})
(backup/'author-copy-before1004.json').write_text(json.dumps(author_inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for row in author_inventory:
    shutil.copyfile(row['source'],row['backup']);row['sha256After']=sha(Path(row['backup']).read_bytes());assert row['sha256After']==row['sha256Before']
(backup/'author-copy-after1004.json').write_text(json.dumps(author_inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert manifest_path.read_bytes()==old_bytes
manifest_path.write_bytes(new_bytes)
report['backup']=str(backup);report['backupVerified']=True
outputs['build-report.json']=(json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
for name,content in outputs.items():
    target=old_runtime.parent/name;target.write_bytes(content);assert sha(target.read_bytes())==sha(content)
result={'status':'reviewed-front-art-intake-not-complete-character','backup':str(backup),
        'manifestSha256':sha(new_bytes),'runtimeSha256':sha(old_runtime.read_bytes()),
        'frames':len(cfg['frames']),'animations':len(cfg['anims']),'retiredActivityFrames':retired,
        'foregroundMappedFrames':report['mappedForegroundFrames'],'pages':report['pages'],
        'connectedReleaseRecoveryTicks':[21,7,14],'movesOrHoldOffsetOrSelectorChanged':False,
        'backHoldingChanged':False,'sourceRgbaUnmodified':True}
with (OUT/'front-holding-intake1004.json').open('x',encoding='utf-8') as stream:json.dump(result,stream,ensure_ascii=False,indent=2)
print(json.dumps(result,ensure_ascii=False))
