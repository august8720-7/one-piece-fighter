"""Merge explicitly selected, hash-checked local voice clips; never infer move names."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import argparse

ROSTER_CHARACTERS = ('aokiji', 'kizaru', 'fujitora', 'ryokugyu', 'garp', 'shanks', 'zoro', 'sanji',
    'whitebeard', 'bigmom', 'kaido', 'sengoku', 'blackbeard', 'roger', 'rocks', 'shiki', 'rayleigh', 'gaban', 'beckman')


def validate_roster_content_review(root: Path, entry: dict) -> None:
    """ASR/decode/peak checks are not a native listening adoption ticket."""
    review = entry.get('contentReview', {}).get('actualContentReview', {})
    if (review.get('kind') not in ('agent_audio_model', 'user_audition_exact_clip') or review.get('status') != 'accepted'
            or review.get('inputAudioAttached') is not True or review.get('nativeAudioReviewed') is not True
            or review.get('headTailComplete') is not True or review.get('noUnexpectedNoiseOrDistortion') is not True):
        raise ValueError('Roster dialogue requires an accepted actual native listening ticket; ASR/waveform/decode is insufficient')
    evidence = review.get('evidence')
    if not isinstance(evidence, list) or not evidence: raise ValueError('Roster listening evidence is missing')
    response = None
    for record in evidence:
        path = (root / record['path']).resolve()
        allowed = ((root / 'docs/assets').resolve(), Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice').resolve(),
                   Path('D:/one-piece-fighter-crossover-0922/roster-0929/acceptance').resolve())
        if not any(path.is_relative_to(folder) for folder in allowed) or not path.is_file(): raise ValueError('Listening evidence escapes the declared evidence roots')
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != record['sha256']: raise ValueError('Roster listening evidence changed')
        if record['role'] == 'response':
            if response is not None: raise ValueError('Ambiguous roster listening response')
            response = data.decode('utf-8-sig')
    for clip in entry['clips']:
        if (review.get('audioSha256') != clip['sha256'] or not clip.get('transcript') or review.get('transcript') != clip['transcript']
                or response is None or clip['transcript'] not in response):
            raise ValueError('Native roster review is not bound to the exact adopted audio and transcript')


def validate_content_review(root: Path, entry: dict, selection: dict) -> None:
    """A user-approved voice identity does not certify newly generated wording."""
    review = entry.get('contentReview', {})
    identity = review.get('identityReference', {})
    accepted_identity = any(
        other['character'] == entry['character'] and other['event'] == 'select'
        and other.get('approval', {}).get('kind') == 'user_audition_exact_clip'
        and any(clip['path'] == identity.get('path') and clip['sha256'] == identity.get('sha256')
                for clip in other['clips']) for other in selection['cues'])
    if review.get('voiceIdentityUserApproved') is not True or not accepted_identity:
        raise ValueError('New dialogue requires its own approved character identity reference')
    actual = review.get('actualContentReview', {})
    if (actual.get('kind') != 'agent_audio_model' or actual.get('userAuditioned') is not False
            or actual.get('status') != 'accepted' or actual.get('inputAudioAttached') is not True):
        raise ValueError('New dialogue requires explicit internal content review, separate from user audition')
    response_text = None
    evidence = actual.get('evidence', [])
    if not evidence:
        raise ValueError('Content review evidence is missing')
    for record in evidence:
        data = (root / record['path']).read_bytes()
        if hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ValueError('Content review evidence changed')
        if record['role'] == 'response':
            if response_text is not None:
                raise ValueError('Ambiguous content review response')
            response_text = data.decode('utf-8-sig')
    for clip in entry['clips']:
        if (actual.get('audioSha256') != clip['sha256'] or not clip.get('transcript')
                or actual.get('transcript') != clip['transcript']
                or response_text is None or clip['transcript'] not in response_text):
            raise ValueError('Content review is not bound to the adopted audio and transcript')


def apply_voices(root: Path, catalog: dict, selection_path: Path | None = None, subtitle_path: Path | None = None) -> dict:
    explicit_selection = selection_path is not None
    selection = json.loads((selection_path or root / 'scripts/voice_manifest.json').read_text(encoding='utf-8-sig'))
    subtitle_path = subtitle_path or root / 'src/audio/voiceLines0922.json'
    subtitles = json.loads(subtitle_path.read_text(encoding='utf-8-sig'))['lines'] if subtitle_path.exists() else []
    # Ownership is by exact cue, not whole character: e.g. the original
    # Luffy/Akainu select aliases belong to apply_voice_lines_0922, not this selection.
    owned_ids = {f"voice.{entry['character']}.{entry['event']}" for entry in selection['cues']}
    result = dict(catalog) if explicit_selection else {key: value for key, value in catalog.items() if key not in owned_ids}
    for entry in selection['cues']:
        character, event = entry['character'], entry['event']
        if character not in ('luffy', 'akainu', 'labubu', 'twinkle', *ROSTER_CHARACTERS) or event not in ('attack', 'hurt', 'ko', 'win', 'effort', 'move', 'idle', 'select'):
            raise ValueError('Only reviewed characters and generic event uses are allowed')
        if character in ('labubu', 'twinkle', *ROSTER_CHARACTERS) or event == 'select':
            if entry.get('reviewStatus') != 'accepted' or not entry.get('evidence'):
                raise ValueError('New voice cues require explicit content review evidence')
        if character in ('labubu', 'twinkle') and event != 'select':
            validate_content_review(root, entry, selection)
        if character in ROSTER_CHARACTERS:
            validate_roster_content_review(root, entry)
        cue_id = f'voice.{character}.{event}'
        if cue_id in result:
            raise ValueError(f'Duplicate voice cue: {cue_id}')
        files = []
        for clip in entry['clips']:
            relative = Path(clip['path'])
            allowed = (root / 'public/assets/audio/voice' / character).resolve()
            path = (root / relative).resolve()
            if not path.is_relative_to(allowed) or path.suffix.lower() not in ('.wav', '.mp3'):
                raise ValueError(f'Invalid voice path: {relative}')
            if hashlib.sha256(path.read_bytes()).hexdigest() != clip['sha256']:
                raise ValueError(f'Voice content changed: {relative}')
            file = path.relative_to((root / 'public').resolve()).as_posix()
            if event == 'select' or 'transcript' in clip:
                matches = [line for line in subtitles if line['file'] == file]
                if (len(matches) != 1 or not clip.get('transcript')
                        or not matches[0].get('transcriptVerified')
                        or matches[0].get('sha256') != clip['sha256']
                        or matches[0].get('original') != clip['transcript']
                        or matches[0].get('translation') != clip.get('translation', clip['transcript'])):
                    raise ValueError(f'Voice subtitle is not bound to the reviewed file: {relative}')
            files.append(file)
        if not files:
            raise ValueError(f'Empty voice cue: {cue_id}')
        result[cue_id] = {
            'files': files, 'group': 'voice', 'characterId': character,
            'gain': 0.85 if event != 'hurt' else 0.65,
            'source': entry.get('evidence', selection.get('evidence')),
            'note': entry.get('note', 'User confirmed character voice in audition; generic game-event placement is an implementation choice. Exact words and named moves are not certified.'),
        }
        if character in ROSTER_CHARACTERS:
            # A defeat must interrupt that fighter's ongoing attack/effort line.
            # Existing accepted four-character playback values remain unchanged.
            result[cue_id].update(priority=100 if event == 'ko' else 70 if event in ('attack', 'win') else 25 if event == 'hurt' else 40,
                                  maxInstances=1)
        if event in ('idle', 'move', 'effort'):
            if event == 'idle' and entry.get('reviewStatus') != 'accepted':
                raise ValueError('Idle lines require explicit semantic listening evidence')
            result[cue_id].update(priority=10 if event == 'idle' else 9 if event == 'move' else 50,
                                  gain=0.7 if event == 'idle' else 0.62,
                                  cooldownMs=0 if event in ('idle', 'move') else 450,
                                  maxInstances=1)
        elif event == 'select':
            result[cue_id].update(priority=60, gain=0.7, cooldownMs=0, maxInstances=1)
        playback = entry.get('playback', {})
        if set(playback) - {'gain', 'cooldownMs'}:
            raise ValueError('Unsupported voice playback setting')
        if 'gain' in playback and (type(playback['gain']) not in (int, float) or not 0 <= playback['gain'] <= 1):
            raise ValueError('Invalid voice gain')
        if 'cooldownMs' in playback:
            cooldown = playback['cooldownMs']
            if type(cooldown) is not int or cooldown < 0:
                raise ValueError('Invalid voice cooldown')
            if event == 'attack' and any(cooldown < 1000 * (clip['source_end_seconds'] - clip['source_start_seconds']) for clip in entry['clips']):
                raise ValueError('Attack voice cooldown must cover the complete adopted clip')
        result[cue_id].update(playback)
    if not explicit_selection:
        # Also rebuild the reviewed first pair when starting from an empty SFX
        # catalog (prepare_audio_assets). This is an explicit adoption ledger,
        # never a scan of candidates. Recheck every clip, subtitle and native
        # evidence through the same strict explicit-selection path.
        # Keep the historical 1004 adoption immutable. The explicitly reviewed
        # 1013 cue overrides run last, so a rebuild cannot restore older speech.
        for name in ('first_pair_voice_selection1004.json', 'first_pair_voice_selection1013.json'):
            adopted_path = root / 'scripts' / name
            if not adopted_path.is_file():
                raise FileNotFoundError(f'Missing adopted first-pair voice selection {name}; refuse incomplete default rebuild')
            adopted = json.loads(adopted_path.read_text(encoding='utf-8-sig'))
            adopted_ids = {f"voice.{entry['character']}.{entry['event']}" for entry in adopted['cues']}
            result = apply_voices(root, {key: value for key, value in result.items() if key not in adopted_ids},
                                  adopted_path, subtitle_path)
    return result


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--selection', type=Path, help='Explicit reviewed roster selection; preserves unrelated existing voices')
    parser.add_argument('--subtitles', type=Path, help='Explicit exact-file subtitle review map')
    parser.add_argument('--input', type=Path, default=root / 'src/audio/sampleManifest.json')
    parser.add_argument('--output', type=Path, help='Use an independent manifest for candidate integration')
    parser.add_argument('--check', action='store_true', help='Validate in memory; write no manifest')
    args = parser.parse_args()
    path = args.input
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    manifest['cues'] = apply_voices(root, manifest['cues'], args.selection, args.subtitles)
    if not args.check:
        (args.output or path).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'voice_cues': sum(key.startswith('voice.') for key in manifest['cues']), 'checkOnly': args.check}))
