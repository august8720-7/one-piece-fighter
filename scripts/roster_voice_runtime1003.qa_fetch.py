"""Fetch one frozen official Qwen package to D:/; verify hashes and preserve partial files."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import shutil
import time
import urllib.request

ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()

def hash_file(path, mode='sha256'):
    hasher = hashlib.new(mode)
    with path.open('rb') as data:
        for block in iter(lambda: data.read(4 * 1024 * 1024), b''): hasher.update(block)
    return hasher.hexdigest()

def verify(path, row):
    if path.stat().st_size != row['size']: raise ValueError('Model file length mismatch')
    if row.get('lfs'):
        if hash_file(path) != row['lfs']['sha256']: raise ValueError('Official model LFS SHA256 mismatch')
    else:
        git = hashlib.sha1(f'blob {row["size"]}\0'.encode())
        with path.open('rb') as data:
            for block in iter(lambda: data.read(1024 * 1024), b''): git.update(block)
        if git.hexdigest() != row['blobId']: raise ValueError('Official model Git blob identity mismatch')

def download(row, model, revision, folder):
    target = (folder/row['rfilename']).resolve()
    if not target.is_relative_to(folder) or target.parent != folder: raise ValueError('Unexpected model file namespace')
    if target.exists(): verify(target,row); return
    partial = target.with_suffix(target.suffix+'.part')
    url = f'https://huggingface.co/{model}/resolve/{revision}/{row["rfilename"]}'
    for attempt in range(1,4):
        offset = partial.stat().st_size if partial.exists() else 0
        if offset == row['size']: verify(partial,row); partial.rename(target); return
        if offset > row['size']: raise ValueError('Preserve oversize partial; refusing overwrite')
        try:
            headers = {'User-Agent':'one-piece-local-native-qa1003'}
            if offset: headers['Range'] = f'bytes={offset}-'
            with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45) as response:
                if offset and response.status != 206: raise RuntimeError('Server did not honor resume Range; preserving partial')
                if offset and not response.headers.get('Content-Range','').startswith(f'bytes {offset}-'): raise RuntimeError('Unexpected model resume content range')
                received, reported = offset, offset
                with partial.open('ab' if partial.exists() else 'xb') as output:
                    while True:
                        block = response.read(1024*1024)
                        if not block: break
                        if shutil.disk_usage('D:/').free < 15_000_000_000: raise RuntimeError('D:/ game reserve reached; stopped with resumable partial')
                        output.write(block); received += len(block)
                        if received > row['size']: raise ValueError('Model transfer exceeded official expected bytes')
                        if received-reported >= 64*1024*1024:
                            print(json.dumps({'file':row['rfilename'],'received':received,'expected':row['size'],'attempt':attempt}),flush=True)
                            reported=received
            verify(partial,row)
            partial.rename(target)
            return
        except Exception as error:
            # Do not log redirect/signed URLs or retry by disabling TLS checks.
            print(json.dumps({'file':row['rfilename'],'attempt':attempt,'errorKind':type(error).__name__,
                'reason':str(getattr(error,'reason',str(error))).split('https://')[0]}),flush=True)
            if attempt==3: raise
            time.sleep(1)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--probe-only',action='store_true')
    args=parser.parse_args()
    if args.probe_only:
        import torch
        from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniThinkerForConditionalGeneration, Qwen2_5OmniProcessor
        if not torch.cuda.is_available(): raise RuntimeError('CUDA is not available in the isolated environment')
        a=torch.ones((32,32),device='cuda',dtype=torch.bfloat16)
        b=a@a
        q=torch.ones((1,2,32,32),device='cuda',dtype=torch.bfloat16)
        attention=torch.nn.functional.scaled_dot_product_attention(q,q,q)
        torch.cuda.synchronize()
        result={'torch':torch.__version__,'cuda':torch.version.cuda,'capability':torch.cuda.get_device_capability(0),
            'architectures':torch.cuda.get_arch_list(),'gpu':torch.cuda.get_device_name(0),'actualBfloat16Matmul':bool((b==32).all().item()),
            'actualSDPA':bool(torch.isfinite(attention).all().item()),'officialOmniClassesImported':True,'freeGpuBytes':torch.cuda.mem_get_info()[0]}
        record=ROOT/'evidence/platform-probe1003.json'
        if record.exists(): raise FileExistsError('Preserve prior successful platform probe')
        record.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(result),flush=True)
    else:
        if not (ROOT/'evidence/platform-probe1003.json').is_file(): raise RuntimeError('Probe actual Windows/CUDA architecture before downloading model weights')
        metadata=json.loads((ROOT/'evidence/official-model-metadata1003.json').read_bytes())
        budget=json.loads((ROOT/'evidence/budget-before1003.json').read_bytes())
        if metadata['sha'] != budget['revision']: raise ValueError('Frozen model revision changed')
        folder=ROOT/'models/qwen25-omni3b'
        if not folder.exists():
            folder.mkdir()
            (folder/'README-local.txt').write_text('Official frozen Qwen2.5-Omni-3B package for local noncommercial evaluation only. Not game runtime or public material. Preserve all weight and partial files.\n',encoding='utf-8')
        rows=[row for row in metadata['siblings'] if row['rfilename']!='.gitattributes']
        before={'model':metadata['id'],'revision':metadata['sha'],'observedAtUtc':datetime.now(timezone.utc).isoformat(),
            'DfreeBytes':shutil.disk_usage('D:/').free,'expectedRepositoryBytes':sum(row['size'] for row in rows),'files':rows}
        receipt=ROOT/'evidence/model-download-before1003.json'
        if not receipt.exists(): receipt.write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        for row in rows: download(row,metadata['id'],metadata['sha'],folder)
        after={'model':metadata['id'],'revision':metadata['sha'],'DfreeBytes':shutil.disk_usage('D:/').free,
            'files':[{'file':row['rfilename'],'bytes':(folder/row['rfilename']).stat().st_size,'sha256':hash_file(folder/row['rfilename'])} for row in rows],
            'globalChanges':False,'audioUploads':0,'allOfficialIdentitiesVerified':True}
        target=ROOT/'evidence/model-download-after1003.json'
        if target.exists(): raise FileExistsError('Preserve prior complete model receipt')
        target.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'status':'official-package-verified','DfreeBytes':after['DfreeBytes']}),flush=True)
