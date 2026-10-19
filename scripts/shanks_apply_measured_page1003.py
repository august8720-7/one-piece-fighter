"""Append explicitly measured Shanks source crops to the owned authoring manifest.

No image generation, frame synthesis, central registration, moves or publishing.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'scripts/roster_shanks_manifest0929.json'
CATALOG = ROOT / 'scripts/roster_pirate_sources0929.json'
EVIDENCE = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/shanks-completion-1003-1509')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('measurement', type=Path)
    args = parser.parse_args()
    path = (ROOT / args.measurement).resolve()
    assert path.is_relative_to((ROOT / 'docs/assets').resolve()) and path.is_file()
    measurement = json.loads(path.read_text(encoding='utf-8'))
    assert measurement.get('characterId') == 'shanks' and isinstance(measurement.get('frames'), dict)
    before = MANIFEST.read_bytes()
    manifest = json.loads(before)
    character = manifest['characters']['shanks']
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))['sources']
    measured_sources = measurement.get('sources') or {measurement['sourceKey']: measurement}
    for key, values in measured_sources.items():
        assert key.startswith('shanks_') and key in catalog and key not in character['sources']
        assert isinstance(values.get('unitScale'), (float, int)) and values.get('scaleBasis')
        entry = catalog[key].copy()
        entry['unitScale'] = values['unitScale']
        entry['scaleBasis'] = values['scaleBasis']
        character['sources'][key] = entry
    for name, frame in measurement['frames'].items():
        assert re.fullmatch('[a-z][a-z0-9_]*', name) and name not in character['frames']
        assert frame['source'] in measured_sources
        character['frames'][name] = frame
    for name, anim in measurement['anims'].items():
        assert name not in character['anims'], 'Existing animation needs a separately reviewed change'
        assert all(frame in character['frames'] for frame in anim['frames'])
        character['anims'][name] = anim
    stamp = datetime.now(timezone(timedelta(hours=8))).strftime('1003-%H%M%S-%f')
    with (EVIDENCE / ('manifest-before-' + path.stem + '-' + stamp + '.json')).open('xb') as backup:
        backup.write(before)
    assert MANIFEST.read_bytes() == before, 'Another writer changed Shanks manifest'
    manifest['status'] = 'partial-candidate-full-coverage-still-incomplete'
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'character': 'shanks', 'crops': len(character['frames']), 'animations': len(character['anims']), 'applied': path.name}))


if __name__ == '__main__':
    main()
