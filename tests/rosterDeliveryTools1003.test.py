"""Synthetic tool-boundary checks only; temporary pixels never become adopted art."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import build_anime_atlas as anime
import build_delivery_assets as delivery
import build_roster_fx1003 as fx


class BackupChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='opf-anime-backup-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.destination = self.root / 'public/assets/characters/aokiji/anime'
        self.destination.mkdir(parents=True)
        self.old = {'atlas.png': b'original-png-fixture', 'runtime.json': b'original-runtime', 'ui.png': b'ui-fixture'}
        for name, data in self.old.items():
            (self.destination / name).write_bytes(data)
        self.addCleanup(patch.stopall)
        patch.object(anime, 'ROOT', self.root).start()

    def test_explicit_backup_saves_inventory_before_copy_and_verifies_all_originals(self):
        backup_root = self.root / 'external-baseline'
        copy = anime.shutil.copy2

        def checked_copy(source, target):
            inventory = json.loads((Path(target).parent / 'backup-inventory.json').read_bytes())
            self.assertEqual({row['file'] for row in inventory}, set(self.old))
            self.assertTrue((Path(target).parent / 'README.md').is_file())
            return copy(source, target)

        with patch.object(anime.shutil, 'copy2', side_effect=checked_copy):
            backup = anime.backup_candidate(self.destination, 'aokiji', backup_root)
        self.assertEqual(backup.parent, backup_root)
        for name, data in self.old.items():
            self.assertEqual((backup / name).read_bytes(), data)
            self.assertEqual((self.destination / name).read_bytes(), data)
        after = json.loads((backup / 'backup-copy-after.json').read_bytes())
        self.assertTrue(all(row['verified'] for row in after))
        second = anime.backup_candidate(self.destination, 'aokiji', backup_root)
        self.assertNotEqual(backup, second)
        self.assertTrue((backup / 'backup-inventory.json').is_file())

    def test_default_location_stays_compatible_and_runtime_backup_location_is_rejected(self):
        backup = anime.backup_candidate(self.destination, 'aokiji')
        self.assertEqual(backup.parent, self.root / '.local-releases')
        with self.assertRaisesRegex(ValueError, 'outside runtime assets'):
            anime.backup_candidate(self.destination, 'aokiji', self.destination / 'backup')
        self.assertFalse((self.destination / 'backup').exists())

    def test_failed_copy_blocks_replacement_and_keeps_originals(self):
        def wrong_copy(source, target):
            Path(target).write_bytes(b'damaged-copy')
        with patch.object(anime.shutil, 'copy2', side_effect=wrong_copy):
            with self.assertRaisesRegex(ValueError, 'backup verification failed'):
                anime.backup_candidate(self.destination, 'aokiji', self.root / 'baseline')
        for name, data in self.old.items():
            self.assertEqual((self.destination / name).read_bytes(), data)


class DeliveryRosterChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='opf-roster-delivery-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.public = self.root / 'public'
        self.source = {'file': 'public/assets/generated/source/fixture.png', 'sha256': '0' * 64,
                       'adoptionStatus': 'shape_reviewed_candidate'}
        self.sheet = Image.new('RGBA', (6, 3), (37, 59, 83, 1))
        self.sheet.putpixel((1, 1), (91, 111, 151, 200))
        self.sheet.putpixel((4, 1), (181, 71, 41, 255))
        (self.root / 'catalog.json').write_text(json.dumps({'sources': {'fixture': self.source}}), encoding='utf-8')
        self.fx_manifest = self.root / 'fx.json'
        self.fx_manifest.write_text(json.dumps({'schemaVersion': 2, 'catalog': 'catalog.json',
            'characters': {'kizaru': {'frames': {
                'beam': {'source': 'fixture', 'crop': [0, 0, 3, 3]},
                'impact': {'source': 'fixture', 'crop': [3, 0, 3, 3]}}}}}), encoding='utf-8')
        self.author = self.root / 'author.json'
        self.author.write_text(json.dumps({'schemaVersion': 1, 'characters': {
            'kizaru': {'sources': {'fixture': self.source}}}}), encoding='utf-8')
        folder = self.public / 'assets/characters/kizaru/anime'
        folder.mkdir(parents=True)
        self.ui_file = folder / 'ui.png'
        self.sheet.save(self.ui_file)
        self.ui_manifest = self.root / 'ui.json'
        self.ui_entry = {'image': 'assets/characters/kizaru/anime/ui.png', 'sha256': delivery.digest(self.ui_file.read_bytes()),
            'width': 6, 'height': 3, 'reviewStatus': 'static-reviewed-fixture',
            'source': {**self.source, 'crop': [0, 0, 6, 3]}, 'processing': {'scale': 1, 'pixelsEqual': True},
            'frames': {'body': {'x': 0, 'y': 0, 'w': 6, 'h': 3}, 'portrait': {'x': 0, 'y': 0, 'w': 3, 'h': 3}}}
        self.write_ui()
        self.addCleanup(patch.stopall)
        patch.object(delivery, 'ROOT', self.root).start()
        patch.object(delivery, 'PUBLIC', self.public).start()
        patch.object(fx, 'ROOT', self.root).start()
        # Source/evidence parsing is separately exercised by real provenance tests.
        # These isolated fixtures test crop-byte and delivery gating mechanics.
        patch.object(fx, 'load_sources', side_effect=lambda sources: {key: self.sheet for key in sources}).start()
        patch.object(delivery, 'load_sources', side_effect=lambda sources: {key: self.sheet for key in sources}).start()
        outputs, report = fx.prepare(self.fx_manifest)
        fx.commit(outputs, report, self.root / 'fx-report.json')

    def write_ui(self):
        self.ui_manifest.write_text(json.dumps({'characters': {'kizaru': self.ui_entry}}), encoding='utf-8')

    def resolve(self, fx_paths=None):
        return delivery.resolve_build_plan(['kizaru'], [self.author], self.ui_manifest,
            [self.fx_manifest] if fx_paths is None else fx_paths)

    def test_roster_plan_verifies_named_author_ui_and_all_fx_pages(self):
        plan, authors = self.resolve()
        self.assertEqual(plan[0]['id'], 'kizaru')
        self.assertEqual(plan[0]['fx'], ('assets/fx/kizaru/atlas.png', 'assets/fx/kizaru/atlas.json'))
        self.assertEqual(plan[0]['fxRuntime'], 'assets/fx/kizaru/fx-runtime.json')
        self.assertTrue(plan[0]['fxReceipts'][0]['masterBytesVerified'])
        self.assertEqual(authors[0]['characters'], ['kizaru'])
        self.assertEqual(len(set(fx.ROSTER_CHARACTERS)), 19)

    def test_no_roster_fx_manifest_is_not_an_implicit_release_approval(self):
        with self.assertRaisesRegex(ValueError, 'explicit reviewed --fx-manifest'):
            self.resolve([])
        with self.assertRaisesRegex(ValueError, 'explicit non-empty subset'):
            delivery.resolve_build_plan(['unknown'], [self.author], self.ui_manifest)

    def test_changed_fx_and_ui_source_pixels_cannot_be_reencoded(self):
        atlas = self.public / 'assets/fx/kizaru/atlas.png'
        atlas.write_bytes(atlas.read_bytes() + b'tampered')
        with self.assertRaisesRegex(ValueError, 'FX master differs'):
            self.resolve()
        outputs, _ = fx.prepare(self.fx_manifest)
        atlas.write_bytes(outputs[atlas])
        changed = self.sheet.copy()
        changed.putpixel((1, 1), (255, 11, 12, 200))
        changed.save(self.ui_file)
        # A changed output hash alone must not bless repainted source pixels.
        self.ui_entry['sha256'] = delivery.digest(self.ui_file.read_bytes())
        self.write_ui()
        with self.assertRaisesRegex(ValueError, 'protected RGBA/source crop mismatch'):
            self.resolve()

    def test_unmatched_ui_source_and_duplicate_fx_owners_are_rejected(self):
        original_review = self.ui_entry['reviewStatus']
        self.ui_entry['reviewStatus'] = 'blocked-review'
        self.write_ui()
        with self.assertRaisesRegex(ValueError, 'Blocked roster UI cannot be encoded'):
            self.resolve()
        self.ui_entry['reviewStatus'] = original_review
        self.ui_entry['source']['sha256'] = '1' * 64
        self.write_ui()
        with self.assertRaisesRegex(ValueError, 'missing from explicit verified catalogs'):
            self.resolve()
        with self.assertRaisesRegex(ValueError, 'multiple FX manifests'):
            self.resolve([self.fx_manifest, self.fx_manifest])


if __name__ == '__main__':
    unittest.main()
