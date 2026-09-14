"""Merge explicitly selected, hash-checked local voice clips; never infer move names."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


def apply_voices(root: Path, catalog: dict) -> dict:
    selection = json.loads((root / 'scripts/voice_manifest.json').read_text(encoding='utf-8-sig'))
    result = {key: value for key, value in catalog.items() if not key.startswith('voice.')}
    for entry in selection['cues']:
        character, event = entry['character'], entry['event']
        if character not in ('luffy', 'akainu') or event not in ('attack', 'hurt', 'ko', 'win', 'effort', 'move', 'idle'):
            raise ValueError('Only reviewed characters and generic event uses are allowed')
        cue_id = f'voice.{character}.{event}'
        if cue_id in result:
            raise ValueError(f'Duplicate voice cue: {cue_id}')
        files = []
        for clip in entry['clips']:
            relative = Path(clip['path'])
            allowed = (root / 'public/assets/audio/voice' / character).resolve()
            path = (root / relative).resolve()
            if not path.is_relative_to(allowed) or path.suffix != '.wav':
                raise ValueError(f'Invalid voice path: {relative}')
            if hashlib.sha256(path.read_bytes()).hexdigest() != clip['sha256']:
                raise ValueError(f'Voice content changed: {relative}')
            files.append(path.relative_to((root / 'public').resolve()).as_posix())
        if not files:
            raise ValueError(f'Empty voice cue: {cue_id}')
        result[cue_id] = {
            'files': files, 'group': 'voice', 'characterId': character,
            'gain': 0.85 if event != 'hurt' else 0.65,
            'source': entry.get('evidence', selection['evidence']),
            'note': entry.get('note', 'User confirmed character voice in audition; generic game-event placement is an implementation choice. Exact words and named moves are not certified.'),
        }
        if event in ('idle', 'move', 'effort'):
            if event == 'idle' and entry.get('reviewStatus') != 'accepted':
                raise ValueError('Idle lines require explicit semantic listening evidence')
            result[cue_id].update(priority=10 if event == 'idle' else 9 if event == 'move' else 50,
                                  gain=0.7 if event == 'idle' else 0.62,
                                  cooldownMs=0 if event in ('idle', 'move') else 450,
                                  maxInstances=1)
    return result


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    path = root / 'src/audio/sampleManifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    manifest['cues'] = apply_voices(root, manifest['cues'])
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'voice_cues': sum(key.startswith('voice.') for key in manifest['cues'])}))
