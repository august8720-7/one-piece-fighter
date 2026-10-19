import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const run = (body: string) => JSON.parse(execFileSync('python', ['-c', `
import importlib.util,json,sys
from pathlib import Path
from tempfile import TemporaryDirectory
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('alias',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture(base):
    action={'frames':4,'fps':60,'loop':False,'pixelArt':False,'exposures':[{'frame':0,'ticks':6},{'frame':1,'ticks':12},{'frame':2,'ticks':4},{'frame':3,'ticks':2}]}
    frames={f'luffy/sp_gear2/{i}':{'frame':{'x':i*4,'y':0,'w':4,'h':8}} for i in range(4)}
    geometry={name:{'size':{'width':4,'height':8},'root':{'x':2,'y':8},'sockets':{}} for name in frames}
    runtime={'characterId':'luffy','schemaVersion':2,'anims':{'sp_gear2':action},'attachments':geometry,'framePages':{name:'p0' for name in frames},'pages':[{'id':'p0','image':'atlas.png','data':'atlas.json'}]}
    # Explicitly synthetic bytes: the test checks immutable byte preservation,
    # not real artwork or production source acceptance.
    values={'atlas.png':b'SYNTHETIC-TEST-ONLY-not-game-art','atlas.json':m.encode({'frames':frames}),'runtime.json':m.encode(runtime)}
    for name,data in values.items():(base/name).write_bytes(data)
    (base/'build-report.json').write_bytes(m.encode({'outputHashes':{name:m.sha(data) for name,data in values.items()}}))
    return action,values
${body}
`, resolve('scripts/build_gear5_awakening_alias1017.py')], { encoding: 'utf8' }));

describe('reproducible base awakening metadata aliases', () => {
  it('preserves all original pixels and GearSecond action, binds aliases to the exact rectangles, and is idempotent', () => {
    const result = run(`
with TemporaryDirectory(prefix='opf-awakening-alias-test-') as directory:
    base=Path(directory)/'base';base.mkdir();action,original=fixture(base)
    check=m.apply(base,check=True);assert all((base/name).read_bytes()==data for name,data in original.items())
    applied=m.apply(base,Path(directory)/'backup',False);again=m.apply(base,Path(directory)/'backup',False)
    runtime=json.loads((base/'runtime.json').read_text(encoding='utf-8'));atlas=json.loads((base/'atlas.json').read_text(encoding='utf-8'))
    print(json.dumps({'check':check,'applied':applied,'again':again,'imageSame':(base/'atlas.png').read_bytes()==original['atlas.png'],'actionSame':runtime['anims']['sp_gear2']==action,'ticks':runtime['anims']['g5_awakening']['exposures'],'aliasesSame':all(atlas['frames'][f'luffy/g5_awakening/{i}']==atlas['frames'][f'luffy/sp_gear2/{i}'] for i in range(4))}))
`);
    expect(result.imageSame).toBe(true); expect(result.actionSame).toBe(true); expect(result.aliasesSame).toBe(true);
    expect(result.ticks.map((part: { ticks: number }) => part.ticks)).toEqual([6, 12, 4, 14]);
    expect(result.applied.backupVerified).toBe(true); expect(result.again.changedMetadata).toEqual([]);
  });

  it('rejects changed baseline/tampered bytes and refuses apply without a backup before any metadata write', () => {
    const result = run(`
with TemporaryDirectory(prefix='opf-awakening-alias-reject-') as directory:
    base=Path(directory)/'base';base.mkdir();action,original=fixture(base);before={p.name:p.read_bytes() for p in base.iterdir()};errors=[]
    try:m.apply(base,None,False)
    except ValueError as error:errors.append(str(error))
    same=all((base/name).read_bytes()==data for name,data in before.items())
    (base/'atlas.png').write_bytes(b'changed')
    try:m.prepare(base)
    except ValueError as error:errors.append(str(error))
    (base/'atlas.png').write_bytes(original['atlas.png']);runtime=json.loads(original['runtime.json']);runtime['anims']['sp_gear2']['exposures'][0]['ticks']=7;(base/'runtime.json').write_bytes(m.encode(runtime))
    try:m.prepare(base)
    except ValueError as error:errors.append(str(error))
    print(json.dumps({'errors':errors,'unchangedWithoutBackup':same}))
`);
    expect(result.unchangedWithoutBackup).toBe(true); expect(result.errors).toHaveLength(3);
  });
});
