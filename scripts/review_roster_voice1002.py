"""Bounded anonymous review of an explicitly selected public-source audio excerpt.

Uses existing FFmpeg and the official Qwen demo's public Gradio schema. Never
reads browser state, sends expected words, adopts clips, or changes runtime data.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.request
import uuid
import wave
from datetime import datetime, timezone

ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/review-1002')
BASE = 'https://qwen-qwen3-omni-demo.hf.space'
FFMPEG = 'D:/one-piece-fighter-crossover-0922/tools/audio-0925/packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
PROMPT = ('只根据实际附带的音频回答，不要猜文件名、人物或故事。'
          '1. 若有语言，按原语言逐字转写，不清楚写[不清楚]；若只是非语言发声请直接说明。'
          '2. 检查首尾截断、重复、额外尾声、背景音乐、杂音和失真；不能确定就写不能确定。'
          '没有收到或无法读取音频就明确说明。不要补写未听到的字词。')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def save(path, value):
    with path.open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)

def request(path, body=None, content_type='application/json'):
    req = urllib.request.Request(BASE + path, data=body,
                                 headers={'Content-Type': content_type})
    return urllib.request.urlopen(req, timeout=60)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--character', required=True, choices=['aokiji','shanks'])
    parser.add_argument('--clip', required=True, choices=['A','B','C','D','E','F'])
    parser.add_argument('--start', required=True, type=float)
    parser.add_argument('--end', required=True, type=float)
    parser.add_argument('--submit-native-review', action='store_true',
                        help='External upload: requires explicit authorization for third-party source audio')
    args = parser.parse_args()
    catalog = json.loads(Path('scripts/roster_voice_sources0929.json').read_text(encoding='utf-8-sig'))
    original = catalog['characters'][args.character]['original']
    source = Path(original['file'])
    source_hash = digest(source.read_bytes())
    assert source_hash == original['sha256']
    target = ROOT / ('clip-' + args.clip + '.wav')
    if args.submit_native_review:
        allowed = {
            'A': ('aokiji', 26.96, 28.37, 'a83aa58cb810e22f16fad84d5ede25e28739ec981ae1af798be35703af41053b'),
            'C': ('shanks', 35.27, 36.81, '87801104e09e3f598e17df5c8f70e2dd379c7328782f700061cc5f0e217d220c'),
        }
        assert args.clip in allowed, 'Only A and C explicitly authorized'
        char, begin, end, expected = allowed[args.clip]
        assert (args.character, args.start, args.end) == (char, begin, end)
        data = target.read_bytes()
        assert digest(data) == expected
        # Exclusive intent creation prevents repeated upload/inference after unknown outcomes.
        save(ROOT / ('clip-'+args.clip+'-authorized-submit1003.json'), {
            'createdAt': datetime.now(timezone.utc).isoformat(),
            'userAuthorization': '允许这两段短音频外发核验',
            'scope': 'Only prepared A 1.41s and C 1.54s to official Qwen demo, at most one chat_predict each; no full source or B/D upload',
            'sha256': expected, 'url': BASE, 'maxInferenceCallsForThisClip': 1,
        })
        submit_review(args, target, data)
        return
    assert not target.exists(), 'Refuse overwrite'
    raw = subprocess.check_output([FFMPEG,'-nostdin','-v','error','-i',str(source),
                                   '-f','s16le','-acodec','pcm_s16le','-'])
    rate, channels = 44100, 2
    first, last = round(args.start*rate), round(args.end*rate)
    assert 0 <= first < last <= len(raw)//(channels*2)
    selected = raw[first*channels*2:last*channels*2]
    with wave.open(str(target),'wb') as f:
        f.setnchannels(channels); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(selected)
    with wave.open(str(target),'rb') as f:
        assert f.readframes(f.getnframes()) == selected
    data = target.read_bytes()
    record = {'createdAt':datetime.now(timezone.utc).isoformat(), 'character':args.character,
              'source':str(source),'sourceSha256':source_hash,'file':str(target),
              'sha256':digest(data),'sourceStartFrame':first,'sourceEndFrameExclusive':last,
              'sourceStartSeconds':first/rate,'sourceEndSeconds':last/rate,
              'sampleRateHz':rate,'channels':channels,'durationSeconds':(last-first)/rate,
              'pcmSha256':digest(selected),'sourceUnchanged':digest(source.read_bytes())==source_hash,
              'pcmRoundTripVerified':True,'processing':'Native 44100Hz stereo PCM16 decode and exact slice; no gain, filtering, fades, resampling or synthesis',
              'adopted':False,'humanListened':False,'agentListened':False}
    save(ROOT / ('clip-'+args.clip+'-preparation.json'),record)
    print(json.dumps(record,ensure_ascii=False))

def submit_review(args, target, data):
    boundary = '----voiceReview'+uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="files"; filename="{target.name}"\r\nContent-Type: audio/wav\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode())
    try:
        uploaded = json.load(request('/gradio_api/upload',body,'multipart/form-data; boundary='+boundary))
        save(ROOT / ('clip-'+args.clip+'-upload.json'),uploaded)
        audio = {'path':uploaded[0], 'orig_name':target.name,'size':len(data),
                 'mime_type':'audio/wav','meta':{'_type':'gradio.FileData'}}
        system_prompt = ('请检查用户实际提供的音频。必须分三项报告：原语言逐字转写；'
                         '首尾是否完整、是否重复或多余尾声；背景音乐、杂音或失真。'
                         '不能确定的项明确写不能确定，不根据文件名推断。不只输出转写。')
        payload = {'data':[PROMPT,audio,None,None,[],system_prompt,'Cherry / 芊悦',0.1,0.95,20,False,False]}
        save(ROOT / ('clip-'+args.clip+'-request.json'),payload)
        event = json.load(request('/gradio_api/call/chat_predict',json.dumps(payload,ensure_ascii=False).encode()))
        save(ROOT / ('clip-'+args.clip+'-event.json'),event)
        with request('/gradio_api/call/chat_predict/'+event['event_id']) as response:
            with (ROOT / ('clip-'+args.clip+'-response.sse')).open('x',encoding='utf-8') as out:
                for raw_line in response:
                    line=raw_line.decode('utf-8');out.write(line);out.flush()
                    if line.startswith('data:'):print(line.strip(),flush=True)
    except Exception as exc:
        save(ROOT / ('clip-'+args.clip+'-failure.json'),{'type':type(exc).__name__,'error':str(exc),
             'body':exc.read().decode('utf-8','replace') if hasattr(exc,'read') else None})
        raise

if __name__=='__main__':
    main()
