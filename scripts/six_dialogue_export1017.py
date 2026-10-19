"""Export the actual accepted runtime catalog and whitelist for central delivery.

Merges the immutable base catalog and explicit semantic overlay; unused proof
files/candidates are never included merely because fileChecks retains their SHA.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    assert ROOT == Path('D:/Projects/one-piece-fighter') and sys.dont_write_bytecode
    base_path, overlay_path = ROOT / 'src/audio/sampleManifest.json', ROOT / 'src/audio/semanticDialogue1017.json'
    base, overlay = json.loads(base_path.read_bytes()), json.loads(overlay_path.read_bytes())
    merged = {**base['cues'], **overlay['cues']}
    base_files = {file for cue in base['cues'].values() for file in cue['files']}
    active = sorted({file for cue in merged.values() for file in cue['files']})
    rows = []
    for file in active:
        assert file.startswith('assets/audio/') and '..' not in Path(file).parts
        path = ROOT / 'public' / file
        assert path.is_file()
        expected = overlay['fileChecks'].get(file)
        if expected:
            assert expected['sha256'] == sha(path) and expected['bytes'] == path.stat().st_size
        rows.append({'file': file, 'sha256': sha(path), 'bytes': path.stat().st_size,
                     'cueIds': [key for key, cue in merged.items() if file in cue['files']]})
    out = WORK / 'acceptance/audio1017' / ('runtime-export-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    out.mkdir()
    (out / 'README.md').write_text('# Accepted runtime audio export1017\nBase+semantic explicit cues only. This is input to central encoding/whitelist integration, not proof of public publication or actual playback. Unused proof/candidate files are excluded.\n', encoding='utf-8')
    (out / 'sampleManifest-merged.json').write_text(json.dumps({'version': base['version'], 'cues': merged}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    audit_path = ROOT / 'scripts/six_dialogue_evidence1017.json'
    proof_checks = json.loads(audit_path.read_bytes())['fileChecks'] if audit_path.exists() else overlay['fileChecks']
    report = {'sourceHashes': {'src/audio/sampleManifest.json': sha(base_path), 'src/audio/semanticDialogue1017.json': sha(overlay_path)},
              'files': rows, 'extraLogicalFiles': sorted(set(active) - base_files),
              'unusedProofFilesNotPackaged': sorted(set(proof_checks) - set(active)),
              'meaning': 'Central scripts must merge the same explicit overlay, or accept this merged manifest input; never scan raw sources or candidates.'}
    (out / 'runtime-whitelist.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(out), 'activeFiles': len(active), 'extraLogicalFiles': report['extraLogicalFiles'],
                      'unusedProofFilesNotPackaged': report['unusedProofFilesNotPackaged']}))


if __name__ == '__main__':
    main()
