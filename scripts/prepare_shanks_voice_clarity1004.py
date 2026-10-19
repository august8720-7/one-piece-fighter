"""Prepare three explicit new spoken revisions; no quality approval or old-table overwrite."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import wave
import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003')
SOURCE = (PROJECT/'public/assets/audio/sources/roster-1003').resolve()


def sha(data): return hashlib.sha256(data).hexdigest()


def save_new(path, value):
    with path.open('x',encoding='utf-8') as out:
        out.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('job',type=Path)
    args = parser.parse_args()
    job = args.job.resolve()
    assert job.is_relative_to((ROOT/'jobs').resolve()) and (job/'generation-after.json').is_file()
    data = json.loads((job/'generation-after.json').read_text(encoding='utf-8'))
    rows = data['candidates']
    assert len(rows) == 3 and {(row['character'],row['event']) for row in rows} == {
        ('shanks','attack'),('shanks','effort'),('shanks','hurt')}
    folder = ROOT/'candidates'/('shanks-clarity1004-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    folder.mkdir()
    (folder/'README.md').write_text('三条明确香克斯原创短句候选裁切。原片/旧歧义候选保留；只切同一PCM的显式范围，留35ms头和130ms尾，不调音量/音高/语速或重采样。技术检查不是听辨，不自动采用或修改旧16条表；原生审查须绑定本目录exact SHA。\n',encoding='utf-8')
    inventory = []
    for row in rows:
        source = Path(row['file']).resolve()
        assert row['originalSyntheticSpeech'] and row['voicePreset'] == 'zm_yunjian'
        assert source.is_relative_to(SOURCE) and sha(source.read_bytes()) == row['sha256']
        inventory.append({'source':str(source),'sha256':row['sha256'],'event':row['event']})
    save_new(folder/'copy-before.json',inventory)
    result = []
    for index,row in enumerate(sorted(rows,key=lambda item:item['event']),1):
        source = Path(row['file'])
        with wave.open(str(source),'rb') as audio:
            assert (audio.getnchannels(),audio.getsampwidth(),audio.getframerate(),audio.getcomptype()) == (1,2,24000,'NONE')
            frames = audio.getnframes(); pcm = audio.readframes(frames)
        samples = np.frombuffer(pcm,dtype='<i2').astype(float)/32768
        hop = 240
        chunks = np.pad(samples,(0,(-len(samples))%hop)).reshape(-1,hop)
        rms = np.sqrt(np.mean(chunks**2,axis=1))
        threshold = max(.00045,float(np.max(rms))*.012)
        active = np.flatnonzero(rms>threshold)
        assert len(active)
        first = max(0,int(active[0])*hop-840)
        last = min(frames,(int(active[-1])+1)*hop+3120)
        selected = pcm[first*2:last*2]
        candidate = folder/f'candidate-{index:02}.wav'
        with wave.open(str(candidate),'wb') as audio:
            audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(24000);audio.writeframes(selected)
        with wave.open(str(candidate),'rb') as audio:
            assert audio.readframes(audio.getnframes()) == selected
        result.append({**row,'index':index,'sourceFile':str(source),'sourceSha256':row['sha256'],
            'sourceEvidence':str(job/'generation-after.json'),'candidate':str(candidate),
            'candidateSha256':sha(candidate.read_bytes()),'candidateDurationSeconds':(last-first)/24000,
            'sourceFirstFrame':first,'sourceLastFrameExclusive':last,'candidatePcmSha256':sha(selected),
            'trimMethod':{'nativePcmSamplesOnly':True,'headMs':35,'tailMs':130,'rmsThreshold':threshold},
            'nativeAudioReviewed':False,'transcriptVerified':False,'gamePlaybackVerified':False,'adopted':False,
            'proposedCueId':f"voice.shanks.{row['event']}",
            'proposedRuntimeFile':f"assets/audio/voice/shanks/{row['event']}-kokoro-original1004.wav"})
    catalog = {'version':1,'scope':'three explicit new synthetic spoken revisions; no expected text to QA model',
        'files':result,'oldSixteenTableChanged':False,'formalAdopted':0}
    save_new(folder/'candidate-catalog.json',catalog)
    save_new(PROJECT/'scripts/roster_voice_clarity_candidates1004.json',catalog)
    save_new(folder/'copy-after.json',{'allOriginalPcmRangesVerified':True,
        'candidates':[{'file':row['candidate'],'sha256':row['candidateSha256'],'seconds':row['candidateDurationSeconds']} for row in result]})
    print(json.dumps({'catalog':str(PROJECT/'scripts/roster_voice_clarity_candidates1004.json'),
        'candidates':[{key:row[key] for key in ('event','candidate','candidateSha256','candidateDurationSeconds')} for row in result]},ensure_ascii=False))


if __name__ == '__main__': main()
