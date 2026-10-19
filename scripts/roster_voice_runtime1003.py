"""Prepare explicit, hash-checked DEV audio copies; never approve unheard candidates."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import shutil
import wave

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
RECORD_ROOT = Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice')
VOICE = ROOT / 'scripts/roster_voice_adoption1003.voices.json'
FOLEY = ROOT / 'scripts/roster_voice_adoption1003.foley.json'
INTEGRATION = ROOT / 'scripts/roster_voice_adoption1003.integration.json'
OUTPUT = ROOT / 'src/audio/rosterVoiceCandidates1003.json'
EVENTS = ('attack', 'effort', 'hurt', 'idle', 'ko', 'move', 'select', 'win')
LABELS = {'aokiji': '青雉', 'shanks': '香克斯'}

def digest(data): return hashlib.sha256(data).hexdigest()
def encoded(data): return (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def verified(path, expected):
    path = Path(path).resolve()
    data = path.read_bytes()
    if digest(data) != expected: raise ValueError(f'Audio SHA256 mismatch: {path}')
    return path, data

def pcm(data):
    with wave.open(io.BytesIO(data)) as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getcomptype() != 'NONE' or wav.getnframes() <= 0:
            raise ValueError('Candidate must be complete nonempty PCM16 mono WAV')
        return wav.getframerate(), wav.getnframes(), wav.readframes(wav.getnframes())

def prepare():
    voice, foley, integration, approved = read(VOICE), read(FOLEY), read(INTEGRATION), read(OUTPUT)
    if len(voice['files']) != 16 or len(foley['files']) != 54: raise ValueError('Explicit first-pair preparation set changed; recheck the source plan')
    inputs, copies, cues, lines, checks = {}, {}, {}, [], {}
    def copy(source, expected, logical):
        source, data = verified(source, expected)
        pcm(data)
        target = (PUBLIC / logical).resolve()
        if not target.is_relative_to((PUBLIC / 'assets/audio').resolve()): raise ValueError('Unsafe candidate audio destination')
        if target in copies and copies[target]['sha256'] != expected: raise ValueError('Conflicting candidate copies')
        if target.exists() and target.read_bytes() != data: raise FileExistsError(f'Preserve differing runtime audio: {target}')
        copies[target] = {'source': str(source), 'destination': str(target), 'sha256': expected, 'bytes': len(data), 'data': data}
        checks[logical] = {'sha256': expected, 'bytes': len(data)}
        return pcm(data)[1] / pcm(data)[0]

    for source in foley['sources'].values():
        if source.get('license') != 'CC0': raise ValueError('Only the recorded CC0 foley source plan is permitted')
        verified(source['file'], source['sha256'])
    seen = set()
    for entry in voice['files']:
        character, event = entry['character'], entry['event']
        if character not in LABELS or event not in EVENTS or (character, event) in seen: raise ValueError('Unknown or duplicate first-pair voice event')
        seen.add((character, event))
        _, original = verified(entry['sourceFile'], entry['sourceSha256'])
        _, candidate = verified(entry['candidate'], entry['candidateSha256'])
        rate, _, source_pcm = pcm(original)
        candidate_rate, _, candidate_pcm = pcm(candidate)
        lo, hi = entry['sourceFirstFrame'], entry['sourceLastFrameExclusive']
        if rate != candidate_rate or source_pcm[lo * 2:hi * 2] != candidate_pcm:
            raise ValueError('Prepared voice trim no longer matches the actual original PCM sample range')
        logical = f'assets/audio/voice/{character}/preview-{event}-kokoro-original1003.wav'
        duration = copy(entry['candidate'], entry['candidateSha256'], logical)
        cue_id = f'voice.{character}.{event}'
        if character == 'shanks' and event == 'select': cue_id += '.synthetic_candidate'
        cues[cue_id] = {'files': [logical], 'group': 'voice', 'characterId': character,
            'gain': 0.7 if event == 'select' else 0.65 if event == 'hurt' else 0.62 if event in ('idle', 'move', 'effort') else 0.85,
            'priority': 10 if event == 'idle' else 9 if event == 'move' else 25 if event == 'hurt' else 100 if event == 'ko' else 60 if event == 'select' else 70,
            'cooldownMs': 0 if event in ('select', 'idle', 'move', 'win', 'ko') else int(duration * 1000 + 1), 'maxInstances': 1,
            'source': 'scripts/roster_voice_adoption1003.voices.json',
            'note': 'Original local Kokoro synthetic candidate, never the original actor. Exact prepared PCM trim/hash checked; native hearing and game mix pending; no dedicated move call claim.'}
        lines.append({'file': logical, 'sha256': entry['candidateSha256'], 'label': f'{LABELS[character]} · 原创语音候选（待听觉核验）',
            'original': entry['text'], 'translation': entry['text'], 'transcriptVerified': False,
            'textSource': 'generation-input-not-certified-audio-transcript', 'nativeAudioReviewed': False, 'humanListened': False})
        inputs[logical] = {'sourceSha256': entry['sourceSha256'], 'candidateSha256': entry['candidateSha256'],
            'sourceFirstFrame': lo, 'sourceLastFrameExclusive': hi, 'sourceRateHz': rate, 'voicePreset': entry['voicePreset']}
    if seen != {(character, event) for character in LABELS for event in EVENTS}: raise ValueError('Incomplete generic voice event set')
    source_files = {entry['cueId']: entry for entry in foley['files']}
    for cue_id, cue in foley['cues'].items():
        entry = source_files[cue_id]
        for recipe in entry['recipes']:
            if foley['sources'][recipe['source']]['sha256'] != recipe['sourceSha256']: raise ValueError('Foley recipe source binding mismatch')
        reused = integration.get('stageReuse', {}).get(cue_id)
        original_logical = reused['runtimeFile'] if reused else cue['files'][0]
        original_entry = next(row for row in foley['files'] if row['proposedRuntimeFile'] == original_logical)
        character = entry['character']
        logical = f'assets/audio/sfx/roster-preview1003/{character}/{original_entry["family"]}-{original_entry["stage"]}.wav'
        copy(original_entry['candidate'], original_entry['sha256'], logical)
        cues[cue_id] = {**cue, 'files': [logical], 'note': cue['note'] + (' Explicit glacier release reuses one ice-spike release per actual spawn.' if reused else '')}
    for cue_id, cue in integration['commonCues'].items(): cues[cue_id] = cue
    for row in integration['reusedFileChecks']:
        verified(PUBLIC / row['file'], row['sha256']); checks[row['file']] = {'sha256': row['sha256'], 'bytes': row['bytes']}
    verified(PUBLIC / approved['file'], approved['sha256'])
    checks[approved['file']] = {'sha256': approved['sha256'], 'bytes': (PUBLIC / approved['file']).stat().st_size}
    moves = {character: {move: {**profile, 'projectile': move in integration['projectileMoveIds'][character]}
        for move, profile in rows.items()} for character, rows in foley['moves'].items()}
    runtime = {'schemaVersion': 1, 'scope': 'DEV rosterPreview=0929 only; explicitly selected characters; no release adoption',
        'voiceQualityStatus': 'native-hearing-not-completed', 'sfxQualityStatus': 'native-hearing-and-game-mix-pending',
        'formalAdoptedVoices': 0, 'formalAdoptedSfx': 0, 'cues': cues, 'lines': lines, 'fileChecks': checks, 'moves': moves,
        'sourceManifests': [{'file': path.relative_to(ROOT).as_posix(), 'sha256': digest(path.read_bytes())} for path in (VOICE, FOLEY, INTEGRATION)],
        'voiceCopyProvenance': inputs, 'stageReuse': integration.get('stageReuse', {}),
        'sharedOrdinarySounds': integration['commonCues'],
        'rules': {'start': 'real move-instance start', 'release': 'real active segment / utility start; detached projectile only its actual spawn',
            'end': 'melee real recovery; projectile ground/timeout/out_of_bounds, never administrative cleanup or duplicate hit sound',
            'voice': 'ordinary effort and generic special attack; no named original-actor call claim',
            'select': 'Shanks keeps the earlier reviewed original clip; synthetic select is a manual preview alternative'}}
    return {**approved, 'scope': 'DEV rosterPreview=0929 only; first-pair candidates plus the earlier reviewed Shanks select', 'runtime': runtime}, copies

def commit(document, copies, record_dir):
    record_dir = Path(record_dir).resolve()
    if not record_dir.is_relative_to(RECORD_ROOT.resolve()) or record_dir == RECORD_ROOT.resolve() or record_dir.exists():
        raise ValueError('Use a new independent child of the declared D:/ voice acceptance root')
    record_dir.mkdir()
    (record_dir / 'README.md').write_text('# Roster DEV audio runtime copies1003\nCopy-before inventory and original-byte SHA256 checks. No native-quality approval or formal adoption. Retain all evidence and backups.\n', encoding='utf-8')
    inventory = [{key: value for key, value in row.items() if key != 'data'} for row in copies.values()]
    (record_dir / 'copy-before.json').write_bytes(encoded(inventory))
    original_manifest = OUTPUT.read_bytes()
    (record_dir / 'previous-rosterVoiceCandidates1003.json').write_bytes(original_manifest)
    for target, row in copies.items():
        current = target.parent
        missing = []
        while not current.exists(): missing.append(current); current = current.parent
        for folder in reversed(missing):
            folder.mkdir()
            (folder / 'README.md').write_text('# Local audio preview candidates1003\nOnly explicitly copied candidate WAVs. Unheard/original synthetic and CC0 derived sounds remain DEV-only, never release acceptance. Originals and review evidence stay separate. Preserve all files.\n', encoding='utf-8')
        if not target.exists(): shutil.copyfile(row['source'], target)
        if digest(target.read_bytes()) != row['sha256'] or digest(Path(row['source']).read_bytes()) != row['sha256']:
            raise ValueError('Audio copy changed; refusing runtime manifest update')
    (record_dir / 'copy-after.json').write_bytes(encoded(inventory))
    OUTPUT.write_bytes(encoded(document))
    (record_dir / 'runtime-manifest-receipt.json').write_bytes(encoded({'file': OUTPUT.relative_to(ROOT).as_posix(),
        'sha256': digest(OUTPUT.read_bytes()), 'previousSha256': digest(original_manifest), 'scope': 'DEV candidate only'}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record-dir', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    document, copies = prepare()
    if not args.check:
        if args.record_dir is None: raise SystemExit('Explicit --record-dir required for copies')
        commit(document, copies, args.record_dir)
    print(json.dumps({'checkOnly': args.check, 'copyFiles': len(copies), 'candidateCues': len(document['runtime']['cues']),
        'genericVoiceCandidates': len(document['runtime']['lines']), 'skillStageCues': sum(key.startswith('sfx.') and key.endswith(('.start', '.release', '.end')) for key in document['runtime']['cues']),
        'nativeAudioReviewed': False, 'formalAdopted': 0}))
