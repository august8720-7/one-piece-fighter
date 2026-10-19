"""Calibrate new Shanks ordinary boxes to already measured genuine body endpoints."""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
BASE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/baseline')
CHANGES = {
    'st_c': ([9,-68,72,35], [24,-63,52,15]),
    'st_d': ([12,-70,47,46], [30,-72,17,22]),
    'j_a': ([7,-57,32,22], [25,-72,18,24]),
    'j_b': ([8,-34,42,29], [27,-59,25,23]),
    'j_c': ([9,-65,65,46], [27,-57,48,22]),
    'j_d': ([9,-38,56,33], [34,-64,26,25]),
    'cd': ([8,-71,67,55], [43,-70,57,24]),
    'j_cd': ([10,-68,68,54], [14,-67,51,14]),
}


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path, value):
    with path.open('x',encoding='utf-8') as out:
        out.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')


def main():
    file = ROOT/'src/characters/shanks/moves.ts'
    text = file.read_text(encoding='utf-8')
    author = json.loads((ROOT/'scripts/roster_shanks_manifest0929.json').read_text(encoding='utf-8'))['characters']['shanks']
    records = []
    for move_id,(before,after) in CHANGES.items():
        pattern = rf"(normal\(\{{ id: '{move_id}',[^\n]*?hitbox: )\[([^\]]+)\]"
        match = re.search(pattern,text)
        assert match and [int(item.strip()) for item in match[2].split(',')] == before, f'{move_id} changed before calibration'
        frame_name = author['anims'][move_id]['frames'][1]
        frame = author['frames'][frame_name]
        source = author['sources'][frame['source']]
        unit = source['unitScale']*94/380
        points = {key:[(value[i]-frame['root'][i])*unit for i in range(2)] for key,value in frame['sockets'].items()}
        records.append({'move':move_id,'oldBox':before,'newBox':after,'frame':frame_name,
            'source':frame['source'],'sourceSha256':source['sha256'],'crop':frame['crop'],
            'sourceRoot':frame['root'],'sourceSockets':frame['sockets'],'worldUnitsPerSourcePixel':unit,
            'measuredWorldEndpoints':points})
        replacement = match[1]+'['+', '.join(map(str,after))+']'
        text = text[:match.start()]+replacement+text[match.end():]
    output = ROOT/'docs/assets/shanks-ordinary-endpoints1004.json'
    assert not output.exists(), 'Preserve earlier measurements'
    backup = BASE/('shanks-normal-contact1004-'+datetime.now().strftime('%H%M%S'))
    backup.mkdir()
    (backup/'README.md').write_text('首组香克斯普通攻击静态接触校准前源码，先清单/复制/哈希。仅新角色判定，不改core、时序、伤害或输入；静态测量不代表实机通过。\n',encoding='utf-8')
    identity = {'source':str(file),'destination':str(backup/'moves.ts'),'sha256':sha(file)}
    write_new(backup/'copy-before.json',identity)
    shutil.copy2(file,backup/'moves.ts')
    assert sha(backup/'moves.ts') == identity['sha256']
    write_new(backup/'copy-after.json',{**identity,'verified':True})
    file.write_text(text,encoding='utf-8')
    write_new(output,{'character':'shanks','kind':'static-real-endpoint-calibration-before-game',
        'preserved':['damage','startup/active/recovery','input','cancel','knockback','old characters/core'],
        'backup':str(backup),'oldMovesSha256':identity['sha256'],'newMovesSha256':sha(file),'moves':records})
    print(json.dumps({'changed':list(CHANGES),'measurements':str(output),'backup':str(backup)},ensure_ascii=False))


if __name__ == '__main__': main()
