"""Copy the one reviewed Shanks clip into local development assets, never publish."""
import hashlib
import json
from pathlib import Path
import shutil
import wave

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/review-1002')
OUTPUT = EVIDENCE / 'adoption-1003'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_new(path, value):
    with path.open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)

def main():
    candidate = json.loads((ROOT / 'src/audio/rosterVoiceCandidates1003.json').read_text(encoding='utf-8'))
    review = json.loads((EVIDENCE / 'clip-C-native-review1003.json').read_text(encoding='utf-8'))
    source = EVIDENCE / 'clip-C.wav'
    target = ROOT / 'public' / candidate['file']
    assert candidate['cueId'] == 'voice.shanks.select'
    assert candidate['file'] == 'assets/audio/voice/shanks/select-1003.wav'
    assert candidate['sha256'] == sha(source) == review['sha256']
    assert review['actualAudioAttachmentVerified'] and not review['humanListened']
    assert review['transcript'] == candidate['original']
    assert review['response'] == candidate['nativeReview']['response']
    assert sha(Path(review['responseEvidence'])) == candidate['nativeReview']['responseSha256']
    with wave.open(str(source),'rb') as f:
        assert f.getframerate()==44100 and f.getnchannels()==2
        assert f.getnframes()/f.getframerate()==candidate['durationSeconds']
    formal = ['src/audio/sampleManifest.json','src/audio/voiceLines0922.json','scripts/voice_manifest.json']
    baseline = {p:sha(ROOT/p) for p in formal}
    OUTPUT.mkdir(exist_ok=False)
    (OUTPUT/'README.md').write_text('# 香克斯开发候选采用1003\n仅保存已核验clip-C原字节复制前后清单、来源和正式清单不变证明；不发布，既有文件不删除。\n',encoding='utf-8')
    write_new(OUTPUT/'copy-before.json',{'source':str(source),'target':str(target),'sha256':sha(source),'bytes':source.stat().st_size,'formalBefore':baseline})
    assert not target.exists(), 'Do not overwrite an existing asset'
    target.parent.mkdir(exist_ok=True)
    readme=target.parent/'README.md'
    if not readme.exists():
        readme.write_text('# 香克斯开发预览声音\nselect-1003.wav为已核验原声切片原字节副本，仅DEV+rosterPreview=0929且指定香克斯时加载。原件/审核媒体留D盘；没有其他事件覆盖，不公开整个目录。\n',encoding='utf-8')
    shutil.copyfile(source,target)
    assert sha(target)==sha(source)==candidate['sha256']
    assert baseline == {p:sha(ROOT/p) for p in formal}
    report={'copyVerified':True,'sha256':sha(target),'target':str(target),'bytes':target.stat().st_size,'formalUnchanged':baseline,'scope':'local development select only','humanAuditioned':False,'gamePlaybackVerified':False,'sourceUnchanged':sha(source)==candidate['sha256']}
    write_new(OUTPUT/'copy-after.json',report)
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':
    main()
