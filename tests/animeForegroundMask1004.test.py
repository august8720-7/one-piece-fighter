"""Optional binary selection-mask checks; synthetic fixtures are not game art."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
BUILDER = Path(__file__).resolve().parents[1] / 'scripts/build_anime_atlas.py'
spec = importlib.util.spec_from_file_location('foreground_mask_builder', BUILDER)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ForegroundMaskChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='opf-mask-synthetic-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.original_folder = self.root / 'public/assets/generated/source'
        self.original_folder.mkdir(parents=True)
        self.image = Image.new('RGBA', (20, 20), (0, 0, 0, 0))
        for y in range(2, 18):
            for x in range(2, 18):
                self.image.putpixel((x, y), (x * 10, y * 10, 73, 91 if x == 2 else 255))
        source = self.original_folder / 'fixture.png'
        self.image.save(source)
        self.source_sha = builder.digest(source.read_bytes())
        self.mask = Image.new('L', (20, 20))
        draw = ImageDraw.Draw(self.mask)
        draw.rectangle((10, 2, 17, 17), fill=255)
        # Deliberately keep an internal hole/far-hand region out of the near hand
        # selection. A coarse solid polygon cannot express this same mask.
        draw.rectangle((12, 8, 14, 10), fill=0)
        self.config = {'source': 'fixture', 'crop': [0, 0, 20, 20], 'root': [10, 24],
                       'sockets': {'palm': [15, 8]}, 'transparency': {'mode': 'source-alpha'},
                       'foregroundNote': 'Synthetic inspected exact near-hand selection; no adopted art'}
        self.write_mask(self.mask)
        self.patch_root = patch.object(builder, 'ROOT', self.root)
        self.patch_root.start()
        self.addCleanup(self.patch_root.stop)

    def write_mask(self, image, name='mask.png'):
        path = self.original_folder / name
        image.save(path)
        self.config['foregroundMask'] = {'file': path.relative_to(self.root).as_posix(),
            'sha256': builder.digest(path.read_bytes()), 'sourceSha256': self.source_sha}
        return path

    def split(self, config=None, scale=1.75):
        config = config or self.config
        full, geometry, _ = builder.prepare_frame(self.image, config, scale)
        body, front, report = builder.split_foreground(full, config, self.source_sha)
        return full, body, front, geometry, report

    def test_exact_mask_resizes_nearest_after_whole_rgba_and_reconstructs_every_byte(self):
        full, body, front, geometry, report = self.split()
        self.assertEqual(full.size, (35, 35))
        self.assertEqual(body.size, full.size)
        self.assertEqual(front.size, full.size)
        self.assertEqual(Image.alpha_composite(body, front).tobytes(), full.tobytes())
        expected_mask = self.mask.resize(full.size, Image.Resampling.NEAREST)
        for y in range(full.height):
            for x in range(full.width):
                original = full.getpixel((x, y))
                chosen, other = (front, body) if expected_mask.getpixel((x, y)) else (body, front)
                self.assertEqual(chosen.getpixel((x, y)), original)
                self.assertEqual(other.getpixel((x, y))[3], 0)
        self.assertEqual(geometry['root'], {'x': 17.5, 'y': 42.0})
        self.assertEqual(report['preparedRgbaSha256'], report['recombinedRgbaSha256'])
        self.assertTrue(report['foregroundMask']['binary'])
        self.assertEqual(report['foregroundMask']['sourceSha256'], self.source_sha)

    def test_polygon_route_pixel_and_report_behavior_remains_the_same_without_source_binding(self):
        config = copy.deepcopy(self.config)
        config.pop('foregroundMask')
        polygon = [[10, 0], [20, 0], [20, 20], [10, 20]]
        config['foregroundPolygon'] = polygon
        full, _, _ = builder.prepare_frame(self.image, config, 1.75)
        body, front, report = builder.split_foreground(full, config)
        self.assertEqual(Image.alpha_composite(body, front).tobytes(), full.tobytes())
        self.assertEqual(report['polygon'], polygon)
        self.assertNotIn('foregroundMask', report)
        self.assertEqual(report['method'], 'whole-frame-resample-then-nearest-source-mask')

    def test_build_character_passes_corresponding_source_sha_and_registers_same_geometry(self):
        configuration = {'scale': 1, 'textureDensity': 2, 'maxTextureSize': 128,
            'sources': {'fixture': {'sha256': self.source_sha}}, 'frames': {'hold': self.config},
            'anims': {'throw_fwd': {'frames': ['hold'], 'loop': False, 'exposures': [{'frame': 0, 'ticks': 12}]}}}
        with patch.object(builder, 'load_sources', return_value={'fixture': self.image}):
            outputs, report = builder.build_character('fixture', configuration, 'fixture-only')
        runtime = json.loads(outputs['runtime.json'])
        key = 'fixture/throw_fwd/0'
        self.assertEqual(runtime['foregroundFrames'][key], key + '/foreground')
        self.assertEqual(runtime['attachments'][key], runtime['attachments'][key + '/foreground'])
        self.assertEqual(report['uniqueCrops'], 1)
        self.assertEqual(report['foregroundCrops'], 1)
        self.assertEqual(report['transparency']['hold']['foreground']['foregroundMask']['sourceSha256'], self.source_sha)
        changed = copy.deepcopy(configuration)
        changed['sources']['fixture']['sha256'] = '0' * 64
        with patch.object(builder, 'load_sources', return_value={'fixture': self.image}):
            with self.assertRaisesRegex(ValueError, 'original source SHA256 mismatch'):
                builder.build_character('fixture', changed, 'fixture-only')

    def test_rejects_wrong_file_or_original_source_hash_and_missing_binding(self):
        full, _, _ = builder.prepare_frame(self.image, self.config, 1)
        wrong = copy.deepcopy(self.config)
        wrong['foregroundMask']['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'SHA256 mismatch'):
            builder.split_foreground(full, wrong, self.source_sha)
        wrong = copy.deepcopy(self.config)
        wrong['foregroundMask']['sourceSha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'original source SHA256 mismatch'):
            builder.split_foreground(full, wrong, self.source_sha)
        with self.assertRaisesRegex(ValueError, 'corresponding original source SHA256'):
            builder.split_foreground(full, self.config)

    def test_rejects_nonbinary_color_wrong_size_and_nonselection_records(self):
        cases = [Image.new('L', (20, 20), 128), Image.new('RGB', (20, 20), (0, 0, 0)), Image.new('L', (19, 20), 0)]
        for index, image in enumerate(cases):
            with self.subTest(index=index):
                self.write_mask(image, f'invalid-{index}.png')
                with self.assertRaises(ValueError): self.split(scale=1)
        self.write_mask(self.mask)
        wrong = copy.deepcopy(self.config)
        wrong['foregroundMask']['model'] = 'not-an-art-source'
        with self.assertRaisesRegex(ValueError, 'exactly file, sha256 and sourceSha256'): self.split(wrong)

    def test_rejects_ambiguous_double_declaration_transform_missing_note_and_empty_partition(self):
        full, _, _ = builder.prepare_frame(self.image, self.config, 1)
        for change, match in [({'foregroundPolygon': [[0, 0], [20, 0], [20, 20]]}, 'mutually exclusive'),
                              ({'transform': {'type': 'rubber-straight'}}, 'geometric'),
                              ({'foregroundNote': ''}, 'foregroundNote')]:
            with self.subTest(match=match):
                with self.assertRaisesRegex(ValueError, match): builder.split_foreground(full, {**self.config, **change}, self.source_sha)
        for value in (0, 255):
            self.write_mask(Image.new('L', (20, 20), value))
            with self.assertRaisesRegex(ValueError, 'retaining a visible body'): builder.split_foreground(full, self.config, self.source_sha)

    def test_rejects_absolute_and_escaped_or_outside_source_paths(self):
        full, _, _ = builder.prepare_frame(self.image, self.config, 1)
        absolute = self.original_folder / 'mask.png'
        outside = self.root / 'outside.png'
        self.mask.save(outside)
        for filename, expected in [(str(absolute), self.config['foregroundMask']['sha256']),
            ('public/assets/generated/source/../../../../outside.png', builder.digest(outside.read_bytes())),
            ('outside.png', builder.digest(outside.read_bytes()))]:
            wrong = copy.deepcopy(self.config)
            wrong['foregroundMask'].update(file=filename, sha256=expected)
            with self.subTest(filename=filename):
                with self.assertRaises(ValueError): builder.split_foreground(full, wrong, self.source_sha)


if __name__ == '__main__': unittest.main()
