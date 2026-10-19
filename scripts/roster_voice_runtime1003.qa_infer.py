"""One local original-WAV native multimodal QA trial; no ASR surrogate or audio upload."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import shutil
import sys
import time

ROOT = Path('D:/one-piece-fighter-crossover-0922/tools/native-audio-qa1003').resolve()
PROJECT = Path(__file__).resolve().parents[1]
AUDIO = PROJECT/'public/assets/audio/sources/roster-1003/aokiji-select-kokoro-original-1003-20261003T072741899342Z.wav'
EXPECTED = '4d67897c9ec0c773a510bbec5258e53a3242acf9a47fa51b5184b519f8f30f77'
PROMPT = '请仅根据提供的音频直接聆听并回答：一、如果有人声，实际语言和逐字内容是什么？二、首尾有没有截断、重复或多余尾声？三、有没有背景音乐、杂音、明显失真或发音异常？不能确定的部分明确写不确定，不根据文件名猜测，不用ASR或波形统计替代听觉判断。'
ACTIVE_FOLDER = None

def setup_paths():
    os.environ.update(HF_HOME=str(ROOT/'cache/huggingface'), TORCH_HOME=str(ROOT/'cache/torch'),
        HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_IMPLICIT_TOKEN='1',
        TEMP=str(ROOT/'cache/tmp'), TMP=str(ROOT/'cache/tmp'), PYTHONPYCACHEPREFIX=str(ROOT/'cache/pyc'),
        CUDA_CACHE_PATH=str(ROOT/'cache/cuda'), TRITON_CACHE_DIR=str(ROOT/'cache/triton'))

def main():
    global ACTIVE_FOLDER
    setup_paths()
    if sys.prefix == sys.base_prefix or not Path(sys.prefix).resolve().is_relative_to(ROOT): raise RuntimeError('Run only the isolated D:/ QA Python')
    if hashlib.sha256(AUDIO.read_bytes()).hexdigest()!=EXPECTED: raise ValueError('Original audio identity changed')
    if not (ROOT/'evidence/model-download-after1003.json').is_file(): raise RuntimeError('Verify the complete official model package first')
    if shutil.disk_usage('D:/').free<15_000_000_000: raise RuntimeError('Retain at least 15 GB game space')
    folder=ROOT/'evidence'/('one-original-trial-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    folder.mkdir()
    ACTIVE_FOLDER = folder
    (folder/'README.md').write_text('# One original native audio QA trial\nModel response is not human audition. Exact raw original WAV only; no original actor clip, external upload or batch. Actual native audio features, model revision and runtime evidence remain explicit.\n',encoding='utf-8')
    request={'audio':str(AUDIO),'audioSha256':EXPECTED,'prompt':PROMPT,'expectedTranscriptProvided':False,'audioUploads':0,
        'officialModel':'Qwen/Qwen2.5-Omni-3B','mode':'native audio encoder plus multimodal language generation; no standalone ASR/waveform judgement'}
    (folder/'request.json').write_text(json.dumps(request,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'one-original-local-trial-start','recordDir':str(folder)}),flush=True)
    import torch
    import transformers
    from transformers import Qwen2_5OmniForConditionalGeneration,Qwen2_5OmniProcessor
    from qwen_omni_utils import process_mm_info
    if not torch.cuda.is_available(): raise RuntimeError('Actual CUDA unavailable')
    torch.cuda.reset_peak_memory_stats()
    start=time.monotonic()
    model=Qwen2_5OmniForConditionalGeneration.from_pretrained(str(ROOT/'models/qwen25-omni3b'),
        torch_dtype=torch.bfloat16,device_map='auto',max_memory={0:'8GiB','cpu':'12GiB'},
        enable_audio_output=False,attn_implementation='sdpa',low_cpu_mem_usage=True,local_files_only=True,
        offload_folder=str(ROOT/'cache/offload'))
    if model.has_talker: raise RuntimeError('Unused audio generation components were not disabled')
    model.eval()
    processor=Qwen2_5OmniProcessor.from_pretrained(str(ROOT/'models/qwen25-omni3b'),local_files_only=True)
    conversation=[{'role':'system','content':[{'type':'text','text':'You are a careful audio understanding assistant. Report only what the audio supports.'}]},
        {'role':'user','content':[{'type':'audio','audio':str(AUDIO)},{'type':'text','text':PROMPT}]}]
    text=processor.apply_chat_template(conversation,add_generation_prompt=True,tokenize=False)
    audios,images,videos=process_mm_info(conversation,use_audio_in_video=False)
    inputs=processor(text=text,audio=audios,images=images,videos=videos,return_tensors='pt',padding=True,use_audio_in_video=False)
    if 'input_features' not in inputs or inputs['input_features'].numel()==0: raise RuntimeError('No actual native audio features attached')
    shapes={name:list(value.shape) for name,value in inputs.items() if hasattr(value,'shape')}
    inputs=inputs.to(model.device).to(model.dtype)
    with torch.inference_mode():
        output=model.generate(**inputs,return_audio=False,max_new_tokens=384,do_sample=False)
    output=output[:,inputs.input_ids.shape[1]:]
    response=processor.batch_decode(output,skip_special_tokens=True,clean_up_tokenization_spaces=False)[0]
    if not response.strip(): raise RuntimeError('Native model returned no audio QA response')
    (folder/'response.txt').write_text(response,encoding='utf-8')
    result={'status':'native-model-response-requires-review','request':request,'inputAudioAttached':True,'nativeAudioFeatureShapes':shapes,
        'modelRevision':json.loads((ROOT/'evidence/budget-before1003.json').read_bytes())['revision'],
        'responseSha256':hashlib.sha256(response.encode()).hexdigest(),'response':response,'humanListened':False,
        'torch':torch.__version__,'transformers':transformers.__version__,'GPU':torch.cuda.get_device_name(0),
        'elapsedSeconds':time.monotonic()-start,'peakAllocatedGpuBytes':torch.cuda.max_memory_allocated(),
        'deviceMap':model.hf_device_map,'DfreeBytes':shutil.disk_usage('D:/').free,'audioUploads':0,'batchRun':False}
    (folder/'native-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False),flush=True)

if __name__=='__main__':
    try: main()
    except Exception as error:
        failure={'status':'native-inference-failed-not-an-audio-review','errorKind':type(error).__name__,'error':str(error),
            'audioUploads':0,'formalAdopted':0}
        if ACTIVE_FOLDER is not None:
            (ACTIVE_FOLDER/'native-failure.json').write_text(json.dumps(failure,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(failure,ensure_ascii=False),flush=True)
        raise
