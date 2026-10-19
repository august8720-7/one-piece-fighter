"""Official HF Hub recovery of the same frozen package, preserving the failed partial."""
from pathlib import Path
import importlib.util
import hashlib
import json
import os
import shutil
from datetime import datetime, timezone

ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()
def digest(path):
    hasher=hashlib.sha256()
    with path.open('rb') as data:
        for block in iter(lambda:data.read(4*1024*1024),b''):hasher.update(block)
    return hasher.hexdigest()

if __name__=='__main__':
    os.environ.update(HF_HOME=str(ROOT/'cache/huggingface'),HF_HUB_DISABLE_XET='1',HF_HUB_DISABLE_IMPLICIT_TOKEN='1',
        HF_HUB_DOWNLOAD_TIMEOUT='90',TEMP=str(ROOT/'cache/tmp'),TMP=str(ROOT/'cache/tmp'))
    from huggingface_hub import hf_hub_download
    from huggingface_hub._local_folder import get_local_download_paths
    metadata=json.loads((ROOT/'evidence/official-model-metadata1003.json').read_bytes())
    folder=ROOT/'models/qwen25-omni3b'
    spec=importlib.util.spec_from_file_location('qa_fetch',Path(__file__).with_name('roster_voice_runtime1003.qa_fetch.py'))
    verifier=importlib.util.module_from_spec(spec);spec.loader.exec_module(verifier)
    partial=folder/'model-00002-of-00003.safetensors.part'
    row=next(item for item in metadata['siblings'] if item['rfilename']=='model-00002-of-00003.safetensors')
    incomplete=get_local_download_paths(folder,row['rfilename']).incomplete_path(row['lfs']['sha256'])
    if not incomplete.resolve().is_relative_to(folder):raise ValueError('Official incomplete path escaped task namespace')
    before={'route':'official huggingface_hub 0.36.2 local_dir resume, same fixed revision', 'observedAtUtc':datetime.now(timezone.utc).isoformat(),
        'preservedPartial':str(partial),'partialBytes':partial.stat().st_size,'partialSha256':digest(partial),
        'officialIncomplete':str(incomplete),'expectedFullBytes':row['size'],'DfreeBytes':shutil.disk_usage('D:/').free,
        'audioUploads':0,'globalChanges':0,'reason':'Custom urllib route exhausted 3 interrupted transfers; do not repeat it'}
    before['officialPartialBytesBefore']=incomplete.stat().st_size if incomplete.exists() else None
    record=ROOT/'evidence'/('hub-resume-before-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.json')
    if record.exists():raise FileExistsError('Preserve prior recovery attempt')
    record.write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if not incomplete.exists():
        if before['DfreeBytes']-before['partialBytes']-4_000_000_000<15_000_000_000:raise RuntimeError('Recovery copy would violate game space reserve')
        shutil.copyfile(partial,incomplete)
        if digest(incomplete)!=before['partialSha256']:raise ValueError('Recovery partial-copy verification failed')
    results=[]
    for item in metadata['siblings']:
        if item['rfilename']=='.gitattributes':continue
        target=folder/item['rfilename']
        if target.exists():verifier.verify(target,item)
        else:
            if shutil.disk_usage('D:/').free<15_000_000_000:raise RuntimeError('Retain mandatory game space')
            print(json.dumps({'officialHubFile':item['rfilename'],'resume':True}),flush=True)
            hf_hub_download(metadata['id'],filename=item['rfilename'],revision=metadata['sha'],local_dir=folder,token=False)
            verifier.verify(target,item)
        results.append({'file':item['rfilename'],'bytes':target.stat().st_size,'sha256':digest(target)})
    after={'model':metadata['id'],'revision':metadata['sha'],'DfreeBytes':shutil.disk_usage('D:/').free,'files':results,
        'preservedOriginalPartial':str(partial),'allOfficialIdentitiesVerified':True,'route':'official-hub-resume','audioUploads':0}
    target=ROOT/'evidence/model-download-after1003.json'
    if target.exists():raise FileExistsError('Preserve original complete package receipt')
    target.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'official-package-verified','DfreeBytes':after['DfreeBytes']}),flush=True)
