"""Preserve a targeted pre-replacement Aokiji contract/source/atlas snapshot."""
from pathlib import Path
from datetime import datetime
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
BASE=Path('D:/one-piece-fighter-crossover-0922/roster-0929/baseline')

def sha(value):return hashlib.sha256(value).hexdigest()
def save(path,value):
    with path.open('x',encoding='utf8') as stream:json.dump(value,stream,ensure_ascii=False,indent=2)

def main():
    now=datetime.now().astimezone()
    folder=BASE/('aokiji-low-hold1004-'+now.strftime('%Y%m%d-%H%M%S-%f'))
    assert not folder.exists()
    folder.mkdir(parents=True)
    (folder/'README.md').write_text('青雉低位保持修复前定向保全。files/按原项目相对路径只存已列明作者合同、源码、运行图集与旧握持源；复制前后清单和SHA同层，不删除、不覆盖原件，不表示新低握原画已通过。根目录与所有子路径仅属于本次快照。\n',encoding='utf8')
    paths=[
        'scripts/roster_aokiji_manifest0929.json','scripts/roster_marine_sources0929.json',
        'src/characters/aokiji/def.ts','src/characters/aokiji/moves.ts',
        'src/characters/aokiji/animations.ts','src/characters/aokiji/ai.ts',
        'src/core/FightSim.ts','src/render/animations.ts','src/render/FighterView.ts',
        'src/render/scenes/FightScene.ts','src/render/screen.ts',
        'public/assets/characters/aokiji/anime/runtime.json',
        'public/assets/generated/source/roster-aokiji-blow-throws-1003.png',
        'docs/assets/aokiji-blowthrows-measurements1003.json',
        'docs/assets/aokiji-throw-static-pairs1004.json',
    ]
    runtime=json.loads((ROOT/paths[11]).read_text(encoding='utf8'))
    for page in runtime['pages']:
        paths.extend('public/assets/characters/aokiji/anime/'+page[key] for key in ['image','data'])
    assert len(paths)==len(set(paths))
    blobs={path:(ROOT/path).read_bytes() for path in paths}
    before=[{'relativePath':path,'source':str(ROOT/path),'destination':str(folder/'files'/path),
             'bytes':len(blob),'sha256':sha(blob)} for path,blob in blobs.items()]
    save(folder/'copy-before1004.json',before)
    after=[]
    for row in before:
        destination=Path(row['destination'])
        assert destination.resolve().is_relative_to(folder.resolve())
        destination.parent.mkdir(parents=True,exist_ok=True)
        with destination.open('xb') as stream:stream.write(blobs[row['relativePath']])
        copied=destination.read_bytes()
        assert len(copied)==row['bytes'] and sha(copied)==row['sha256']
        assert sha((ROOT/row['relativePath']).read_bytes())==row['sha256'],'Source changed during snapshot'
        after.append({**row,'copiedSha256':sha(copied),'equal':True,'originalPreserved':True})
    save(folder/'copy-after1004.json',after)
    save(folder/'snapshot1004.json',{'status':'pre-art-replacement-preserved-not-new-art-acceptance',
                                    'observedAt':now.isoformat(),'files':len(before),
                                    'runtimeSha256':sha(blobs[paths[11]]),
                                    'allCopiesVerified':True,'originalsModifiedOrDeleted':False})
    print(json.dumps({'archive':str(folder),'files':len(before),'allCopiesVerified':True,
                      'runtimeSha256':sha(blobs[paths[11]])},ensure_ascii=False))

if __name__=='__main__':main()
