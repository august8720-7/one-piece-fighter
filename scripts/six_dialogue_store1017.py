"""Keep runtime dialogue minimal; full private/local provenance stays outside imports."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'src/audio/semanticDialogue1017.json'
EVIDENCE = ROOT / 'scripts/six_dialogue_evidence1017.json'
PUBLIC_LINE_FIELDS = ('file', 'label', 'original', 'translation', 'transcriptVerified',
                      'sourceKind', 'nativeAudioReviewed', 'humanListened', 'originalActorClaim',
                      'continuityStatus', 'sha256')


def read_full():
    return json.loads((EVIDENCE if EVIDENCE.exists() else RUNTIME).read_bytes())


def write_full(value):
    EVIDENCE.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    base = json.loads((ROOT / 'src/audio/sampleManifest.json').read_bytes())['cues']
    active = {file for cue in {**base, **value['cues']}.values() for file in cue['files']}
    runtime = {'schemaVersion': 1, 'cues': value['cues'],
               'lines': [{key: line[key] for key in PUBLIC_LINE_FIELDS if key in line}
                         for line in value['lines'] if line['file'] in active],
               'fileChecks': {file: check for file, check in value['fileChecks'].items() if file in active}}
    RUNTIME.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    write_full(read_full())
