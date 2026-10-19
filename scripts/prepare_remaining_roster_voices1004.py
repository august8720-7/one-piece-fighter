"""Generate/prepare bounded remaining-roster original Chinese voice batches.

Reuse the working existing CPU ONNX + local misaki path. No reinstall, paid
API, actor imitation/cloning, upload, shared src table or automatic adoption.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import wave

PROJECT = Path(__file__).resolve().parents[1]
CATALOG = PROJECT / 'scripts/remaining_roster_voice_sources1004.json'
TOOLS = Path('D:/one-piece-fighter-crossover-0922/tools/roster-voice1003')
ASR_ENV = Path('D:/one-piece-fighter-crossover-0922/tools/asr-0925/.venv').resolve()
MODEL_SHA = 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478'
PRESET_SHA = {'zm_yunxi': '7243892fb4e560d47014090ddf010f8b8b790f3c6b029ff82b2ac06aa4e27c8b',
              'zm_yunjian': 'de48a00bdbf3649f07162269a2b6e0513604389bfac8a2e6c75cb34b323ad6fa',
              'zf_xiaoxiao': '03adb5d5e3ddd88b047954e974e651cb0a4b524c985057e5d872e962c7be1169'}


def digest(data): return hashlib.sha256(data).hexdigest()
def stamp(): return datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
def save_new(path, value):
    data = value if isinstance(value, bytes) else (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
    with path.open('xb') as file: file.write(data)


def generate(characters, events):
    if Path(sys.prefix).resolve() != ASR_ENV:
        raise RuntimeError('Use the existing D:/ asr-0925 CPU ONNX environment; no installation is performed')
    raw = CATALOG.read_bytes(); catalog = json.loads(raw)
    production = Path(catalog['productionRoot']).resolve()
    if not (production/'README.md').is_file(): raise RuntimeError('Read the existing remaining voice structure rule first')
    selected = [row for row in catalog['utterancePlan'] if row['character'] in characters and row['event'] in events]
    if not selected or len(selected)>14: raise ValueError('Use explicit small batches of at most two full characters')
    existing = {row['id'] for row in catalog['files']}
    if any(row['id'] in existing for row in selected): raise ValueError('Preserve prior originals/candidates; revisions require a separate explicit selection')
    if len({row['index'] for row in selected})!=len(selected): raise ValueError('Plan indices must be unique')
    sys.path.insert(0,str(TOOLS/'packages'))
    os.environ.update(HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',HF_HUB_DISABLE_IMPLICIT_TOKEN='1',
        TEMP=str(production/'jobs'),TMP=str(production/'jobs'),PYTHONPYCACHEPREFIX=str(production/'metadata/pyc'))
    import numpy as np
    import onnxruntime as ort
    from misaki.zh import ZHG2P
    model_path=TOOLS/'models/onnx/model_quantized.onnx'
    if digest(model_path.read_bytes())!=MODEL_SHA: raise ValueError('Previously verified unchanged TTS model required')
    presets={}
    for row in selected:
        name=row['voicePreset']
        path=TOOLS/'models/voices'/(name+'.bin')
        if name=='zf_xiaoxiao': path=production/'metadata/presets'/ (name+'.bin')
        if not path.is_file() or path.stat().st_size!=522240 or digest(path.read_bytes())!=PRESET_SHA[name]:
            raise ValueError('The exact licensed fixed preset is unavailable; no silent replacement')
        presets[name]=path
    options=ort.SessionOptions(); options.intra_op_num_threads=2; options.inter_op_num_threads=1
    session=ort.InferenceSession(str(model_path),sess_options=options,providers=['CPUExecutionProvider'])
    if {item.name for item in session.get_inputs()}!={'input_ids','style','speed'}: raise ValueError('Unexpected existing ONNX model interface')
    vocab=json.loads((TOOLS/'models/tokenizer.json').read_bytes())['model']['vocab'];g2p=ZHG2P()
    tag=stamp();job=production/'jobs'/('local-kokoro-'+tag);job.mkdir()
    (job/'README.md').write_text('# Small original Chinese voice batch1004\nBefore/after input and output receipts. Fixed public presets, CPU only, no uploads/cloning. Original WAVs remain uncut; prepared candidates preserve exact original PCM range. Never auto-adopt or overwrite prior files.\n',encoding='utf-8')
    save_new(job/'generation-before.json',{'atUtc':datetime.now(timezone.utc).isoformat(),'model':'onnx-community/Kokoro-82M-v1.0-ONNX',
       'modelSha256':MODEL_SHA,'license':'Apache-2.0 public model card; fixed preset, not actor imitation',
       'onnxruntime':ort.__version__,'providers':session.get_providers(),'generationModelQuantized':True,
       'note':'Existing quantized TTS exporter reused; the separate native hearing model stays original BF16.',
       'plan':selected,'networkInference':False,'cloning':False,'sharedTablesModified':False})
    originals=[]
    for row in selected:
        start=time.monotonic();phonemes,_=g2p(row['text'])
        if any(symbol not in vocab for symbol in phonemes): raise ValueError('Unknown Chinese phoneme; do not bypass')
        tokens=[vocab[symbol] for symbol in phonemes]
        if not 0<len(tokens)<510: raise ValueError('Unsupported short utterance token count')
        styles=np.frombuffer(presets[row['voicePreset']].read_bytes(),dtype=np.float32).reshape(-1,256)
        samples=np.asarray(session.run(None,{'input_ids':np.array([[0,*tokens,0]],dtype=np.int64),
            'style':styles[len(tokens):len(tokens)+1],'speed':np.array([row['speed']],dtype=np.float32)})[0]).flatten()
        if not len(samples) or not np.isfinite(samples).all() or np.any(np.abs(samples)>=1): raise ValueError('Empty/nonfinite/clipped output cannot be prepared')
        raw_pcm=(samples*32767).round().astype('<i2').tobytes()
        source=production/'originals'/f"{row['character']}-{row['event']}-kokoro-original1004-{tag}.wav"
        if source.exists(): raise FileExistsError('Preserve existing original')
        with wave.open(str(source),'wb') as file:file.setnchannels(1);file.setsampwidth(2);file.setframerate(24000);file.writeframes(raw_pcm)
        with wave.open(str(source),'rb') as file:
            if file.readframes(file.getnframes())!=raw_pcm: raise ValueError('Independent original export altered PCM')
        item={**row,'sourceFile':str(source),'sourceSha256':digest(source.read_bytes()),'sourcePcmSha256':digest(raw_pcm),
            'sourceBytes':source.stat().st_size,'sourceFrames':len(samples),'sourceDurationSeconds':len(samples)/24000,
            'voicePresetFile':str(presets[row['voicePreset']]),'voicePresetSha256':PRESET_SHA[row['voicePreset']],
            'phonemes':phonemes,'tokens':tokens,'originalSyntheticSpeech':True,'sampleRateHz':24000,'channels':1,'sampleWidthBytes':2,
            'elapsedSeconds':time.monotonic()-start,'peakAbs':float(np.max(np.abs(samples))),
            'nativeAudioReviewed':False,'transcriptVerified':False,'humanListened':False,'adopted':False}
        save_new(job/(row['character']+'-'+row['event']+'.json'),item);originals.append(item)
        print(json.dumps({'generatedOriginal':item['id'],'seconds':item['sourceDurationSeconds'],'sha256':item['sourceSha256']},ensure_ascii=False),flush=True)
    save_new(job/'generation-after.json',{'files':originals,'independentExportPcmVerified':True,'formalAdopted':0})
    prepared=production/'candidates'/('batch-'+tag);prepared.mkdir()
    (prepared/'README.md').write_text('# Exact prepared voice PCM1004\nOnly explicit original frame ranges, with head35ms/tail130ms. No gain/pitch/filter/resampling/splicing. Candidate SHA is the native QA identity, not the source original SHA. Raw originals and old candidates stay unchanged; no adoption.\n',encoding='utf-8')
    save_new(prepared/'copy-before.json',[{'id':row['id'],'sourceFile':row['sourceFile'],'sourceSha256':row['sourceSha256']} for row in originals])
    result=[]
    for row in originals:
        with wave.open(row['sourceFile'],'rb') as file: raw_pcm=file.readframes(file.getnframes())
        samples=np.frombuffer(raw_pcm,dtype='<i2').astype(float)/32768
        chunks=np.pad(samples,(0,(-len(samples))%240)).reshape(-1,240)
        rms=np.sqrt(np.mean(chunks**2,axis=1)); threshold=max(.00045,float(np.max(rms))*.012)
        active=np.flatnonzero(rms>threshold)
        if not len(active): raise ValueError('No voiced samples in generated original')
        first=max(0,int(active[0])*240-840);last=min(len(samples),(int(active[-1])+1)*240+3120)
        chosen=raw_pcm[first*2:last*2];candidate=prepared/f"candidate-{row['index']:03}.wav"
        with wave.open(str(candidate),'wb') as file:file.setnchannels(1);file.setsampwidth(2);file.setframerate(24000);file.writeframes(chosen)
        with wave.open(str(candidate),'rb') as file:
            if file.readframes(file.getnframes())!=chosen: raise ValueError('Prepared candidate no longer matches original PCM')
        result.append({**row,'candidate':str(candidate),'candidateSha256':digest(candidate.read_bytes()),'candidatePcmSha256':digest(chosen),
            'candidateDurationSeconds':(last-first)/24000,'sourceFirstFrame':first,'sourceLastFrameExclusive':last,
            'sourceEvidence':str(job/'generation-after.json'),'batchId':tag,
            'trimMethod':{'originalSamplesOnly':True,'headMs':35,'tailMs':130,'activityThreshold':threshold},
            'runtimeCopied':False,'nativeReviewStatus':'pending-exact-candidate-native-review'})
    save_new(prepared/'prepared-after.json',{'files':result,'allPcmRangesVerified':True,'formalAdopted':0})
    snapshot=production/'catalog-history'/('before-'+tag+'.json');save_new(snapshot,raw)
    catalog['files'].extend(result);catalog['batches'].append({'id':tag,'characters':characters,'events':events,
        'job':str(job),'prepared':str(prepared),'indices':[row['index'] for row in result],'status':'prepared-not-native-reviewed'})
    save_new(prepared/'catalog-after-snapshot.json',catalog)
    CATALOG.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'batchId':tag,'files':len(result),'catalog':str(CATALOG),'job':str(job),'prepared':str(prepared),'formalAdopted':0},ensure_ascii=False),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--characters',nargs='+',required=True)
    parser.add_argument('--events',nargs='+',required=True,choices=['select','effort','hurt','ko','win','idle','move'])
    args=parser.parse_args()
    if len(args.characters)!=len(set(args.characters)) or len(args.events)!=len(set(args.events)):parser.error('No duplicate character/event selection')
    generate(args.characters,args.events)
