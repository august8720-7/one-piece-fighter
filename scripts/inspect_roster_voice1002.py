"""Read-only acoustic boundary report; never a substitute for audio review."""
import json
import subprocess
from pathlib import Path
import numpy as np

data = json.loads(Path('scripts/roster_voice_sources0929.json').read_text(encoding='utf-8-sig'))
print('catalog_keys', list(data))
for char in ['aokiji', 'shanks']:
    source = data['characters'][char]['original']['file']
    raw = subprocess.check_output([data['tools']['ffmpeg']['file'], '-v', 'error', '-i', source,
                                   '-t', '61', '-f', 's16le', '-acodec', 'pcm_s16le', '-'])
    audio = np.frombuffer(raw, dtype=np.int16).reshape(-1,2)/32768
    rms = np.sqrt(np.mean(audio[:len(audio)//441*441].reshape(-1,441,2)**2, axis=(1,2)))
    edges = np.diff(np.r_[False, rms < 0.003, False].astype(int))
    intervals = [(round(float(s)*.01,2), round(float(e)*.01,2))
                 for s,e in zip(np.where(edges==1)[0],np.where(edges==-1)[0])
                 if e-s >= 12 and (s < 600 or (char == 'shanks' and s > 2900))]
    print(char, json.dumps(intervals))
