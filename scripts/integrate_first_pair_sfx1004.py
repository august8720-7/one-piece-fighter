"""Append reviewed first-pair release cues and their explicit runtime contract."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from adopt_first_pair_sfx1004 import prepare

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / 'src/audio/sampleManifest.json'
CONTRACT = ROOT / 'src/audio/rosterSfx1004.json'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def integration():
    selection, _, _ = prepare()
    central = selection['centralIntegration']
    samples = json.loads(SAMPLES.read_bytes())
    before = dict(samples['cues'])
    for cue_id, cue in central['cues'].items():
        if cue_id in before and before[cue_id] != cue:
            raise ValueError(f'Existing cue differs; preserve and review it first: {cue_id}')
        samples['cues'][cue_id] = cue
    if any(samples['cues'][key] != cue for key, cue in before.items()):
        raise ValueError('An existing audio cue changed')
    moves = {}
    start_releases = {('aokiji', 'sp_ice_body'), ('shanks', 'sp_sidestep')}
    for item in selection['mappings']:
        moves.setdefault(item['character'], {})[item['moveId']] = {
            'cueId': item['cueId'], 'projectile': item['projectileRelease'],
            **({'releaseOnStart': True} if (item['character'], item['moveId']) in start_releases else {}),
        }
    contract = {
        'schemaVersion': 1, 'adoptedStages': ['release'],
        'startEndUseExistingSharedAudio': True, 'moves': moves,
        'fileChecks': {file: {'sha256': check['sha256'], 'bytes': check['bytes']}
                       for file, check in central['fileChecks'].items()},
    }
    if CONTRACT.exists() and json.loads(CONTRACT.read_bytes()) != contract:
        raise FileExistsError('Existing release contract differs; preserve and review it first')
    for file, check in contract['fileChecks'].items():
        actual = (ROOT / 'public' / file).read_bytes()
        if len(actual) != check['bytes'] or hashlib.sha256(actual).hexdigest() != check['sha256']:
            raise ValueError(f'Adopted runtime bytes changed: {file}')
    return samples, contract, len(before)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='Append checked cues; root has already retained a D-drive snapshot')
    args = parser.parse_args()
    samples, contract, previous = integration()
    if args.execute:
        if not CONTRACT.exists():
            with CONTRACT.open('xb') as output:
                output.write(encoded(contract))
        if json.loads(SAMPLES.read_bytes()) != samples:
            SAMPLES.write_bytes(encoded(samples))
    print(json.dumps({'verified': True, 'written': args.execute, 'preservedCues': previous,
                      'releaseMappings': sum(len(moves) for moves in contract['moves'].values()),
                      'uniqueReviewedFiles': len(contract['fileChecks']),
                      'newStages': contract['adoptedStages']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
