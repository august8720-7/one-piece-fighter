"""Synthetic manifest-gate tests, not actual native listening acceptance."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from apply_voice_manifest import apply_voices, ROSTER_CHARACTERS

class AdoptionGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='opf-roster-voice-gate-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'docs/assets').mkdir(parents=True)
        self.audio = b'fixture-only-not-adopted-real-audio'
        self.sha = hashlib.sha256(self.audio).hexdigest()
        response = self.root / 'docs/assets/response.txt'; response.write_text('实际听到：你好。首尾完整，未见杂音。', encoding='utf-8')
        self.evidence = {'role': 'response', 'path': 'docs/assets/response.txt', 'sha256': hashlib.sha256(response.read_bytes()).hexdigest()}
        self.selection = self.root / 'selection.json'; self.subtitles = self.root / 'subtitles.json'
        self.base = {'voice.luffy.attack': {'files': ['preserved.wav']}, 'hit_light': {'files': ['hit.wav']}}

    def inputs(self, character='aokiji'):
        path = self.root / f'public/assets/audio/voice/{character}/clip.wav'; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(self.audio)
        clip = {'path': path.relative_to(self.root).as_posix(), 'sha256': self.sha, 'transcript': '你好。', 'translation': '你好。'}
        review = {'kind': 'agent_audio_model', 'status': 'accepted', 'inputAudioAttached': True, 'nativeAudioReviewed': True,
            'headTailComplete': True, 'noUnexpectedNoiseOrDistortion': True, 'audioSha256': self.sha, 'transcript': '你好。', 'evidence': [self.evidence]}
        entry = {'character': character, 'event': 'select', 'clips': [clip], 'reviewStatus': 'accepted', 'evidence': 'fixture receipt',
            'contentReview': {'actualContentReview': review}}
        lines = {'lines': [{'file': f'assets/audio/voice/{character}/clip.wav', 'sha256': self.sha, 'original': '你好。', 'translation': '你好。', 'transcriptVerified': True}]}
        self.subtitles.write_text(json.dumps(lines), encoding='utf-8')
        return entry

    def apply(self, entry):
        self.selection.write_text(json.dumps({'cues': [entry]}), encoding='utf-8')
        return apply_voices(self.root, self.base, self.selection, self.subtitles)

    def test_only_complete_native_ticket_can_append_known_roster_voice_without_touching_existing_cues(self):
        for character in ROSTER_CHARACTERS:
            output = self.apply(self.inputs(character))
            self.assertEqual(output['voice.luffy.attack'], self.base['voice.luffy.attack'])
            self.assertIn(f'voice.{character}.select', output)

    def test_asr_decode_or_cannot_listen_is_never_a_listening_approval(self):
        entry = self.inputs(); actual = entry['contentReview']['actualContentReview']
        actual['kind'] = 'local-ASR-waveform'; actual['nativeAudioReviewed'] = False
        with self.assertRaisesRegex(ValueError, 'actual native listening'): self.apply(entry)
        actual['kind'] = 'agent_audio_model'; actual['nativeAudioReviewed'] = True; actual['status'] = 'cannot-listen'
        with self.assertRaisesRegex(ValueError, 'actual native listening'): self.apply(entry)

    def test_changed_evidence_clip_and_subtitle_cannot_be_blessed(self):
        entry = self.inputs(); entry['contentReview']['actualContentReview']['audioSha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'exact adopted audio'): self.apply(entry)
        entry = self.inputs(); (self.root / self.evidence['path']).write_text('changed', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'evidence changed'): self.apply(entry)


    def default_inputs(self):
        entry = self.inputs('aokiji')
        scripts = self.root / 'scripts'; scripts.mkdir()
        path = self.root / 'public/assets/audio/voice/luffy/clip.wav'
        path.parent.mkdir(parents=True); path.write_bytes(self.audio)
        base = {'character': 'luffy', 'event': 'attack', 'clips': [
            {'path': path.relative_to(self.root).as_posix(), 'sha256': self.sha}]}
        (scripts / 'voice_manifest.json').write_text(json.dumps({'cues': [base]}), encoding='utf-8')
        adopted = scripts / 'first_pair_voice_selection1004.json'
        adopted.write_text(json.dumps({'cues': [entry]}), encoding='utf-8')
        (scripts / 'first_pair_voice_selection1013.json').write_text(json.dumps({'cues': []}), encoding='utf-8')
        subtitles = self.root / 'src/audio/voiceLines0922.json'
        subtitles.parent.mkdir(parents=True); subtitles.write_bytes(self.subtitles.read_bytes())
        return entry, adopted

    def test_default_rebuild_preserves_separately_adopted_roster_cues_and_nonvoice_values(self):
        entry, _ = self.default_inputs()
        existing = self.apply(entry)
        existing['voice.luffy.select'] = {'files': ['daily-owned-select.wav'], 'source': 'separate accepted ledger'}
        output = apply_voices(self.root, existing)
        self.assertEqual(output['voice.aokiji.select'], existing['voice.aokiji.select'])
        self.assertEqual(output['hit_light'], existing['hit_light'])
        self.assertEqual(output['voice.luffy.select'], existing['voice.luffy.select'])
        self.assertEqual(output['voice.luffy.attack']['files'], ['assets/audio/voice/luffy/clip.wav'])

    def test_empty_catalog_rebuild_includes_only_the_explicit_reviewed_roster_selection(self):
        self.default_inputs()
        output = apply_voices(self.root, {})
        self.assertEqual(set(output), {'voice.luffy.attack', 'voice.aokiji.select'})
        self.assertNotIn('voice.kizaru.select', output)

    def test_default_rebuild_rejects_changed_roster_audio_and_unaccepted_ticket(self):
        entry, adopted = self.default_inputs()
        (self.root / entry['clips'][0]['path']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'Voice content changed'):
            apply_voices(self.root, {})
        (self.root / entry['clips'][0]['path']).write_bytes(self.audio)
        entry['reviewStatus'] = 'candidate'
        adopted.write_text(json.dumps({'cues': [entry]}), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'explicit content review'):
            apply_voices(self.root, {})

    def test_missing_adopted_ledger_refuses_default_rebuild_even_with_existing_roster_cues(self):
        from unittest.mock import patch
        entry, adopted = self.default_inputs()
        existing = self.apply(entry)
        actual_is_file = Path.is_file
        with patch.object(Path, 'is_file', lambda path: False if path == adopted else actual_is_file(path)):
            for catalog in ({}, existing):
                with self.assertRaisesRegex(FileNotFoundError, 'Missing adopted first-pair'):
                    apply_voices(self.root, catalog)

if __name__ == '__main__': unittest.main()
