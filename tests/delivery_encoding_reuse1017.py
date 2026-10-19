"""Tiny synthetic encoding-receipt checks, not real image/audio/game acceptance."""
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import build_delivery_assets as d
from PIL import Image


class EncodingReceiptChecks(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="opf-reuse-check1017-"))
        (self.root / "README.md").write_text("Synthetic receipt fixtures retained; no real media or adoption.\n")
        self.old_root, self.old_public = d.ROOT, d.PUBLIC
        d.ROOT, d.PUBLIC = self.root, self.root / "public"
        self.image = Image.new("RGBA", (4, 4), (120, 160, 200, 255))
        self.image.putpixel((0, 0), (0, 0, 0, 0))
        png = io.BytesIO(); self.image.save(png, "PNG")
        self.put("assets/generated/source/hero.png", png.getvalue())
        self.base = "assets/characters/hero/anime/"
        self.put(self.base + "atlas.png", png.getvalue())
        self.put(self.base + "atlas.json", b'{"frames":{"idle":{}}}')
        self.put(self.base + "runtime.json", b'{"pages":[{"image":"atlas.png","data":"atlas.json"}],"anims":{"idle":{}}}')
        webp = io.BytesIO(); self.image.save(webp, "WEBP", quality=93, exact=True)
        self.put("assets/delivery/hero-fixture.webp", webp.getvalue())
        self.logical = self.base + "atlas.webp"
        self.records = {self.logical: self.record(self.base + "atlas.png", "assets/delivery/hero-fixture.webp", "image/webp")}
        for name in ["runtime.json", "atlas.json"]:
            self.records[self.base + name] = {"source": self.base + name, "sourceSha256": self.sha(d.PUBLIC / self.base / name)}
        self.put("assets/audio/voice/hero/clip.wav", b"synthetic original clip")
        self.put("assets/delivery/audio-fixture.bin", b"headENCODEDcliptail")
        self.audio = "assets/audio/voice/hero/clip.wav"
        self.records[self.audio] = {**self.record(self.audio, "assets/delivery/audio-fixture.bin", "audio/ogg"), "slice": {"offset": 4, "length": 11}}
        self.owner = {"sha256": "a" * 64, "config": {"sources": {"hero": {"file": "public/assets/generated/source/hero.png", "sha256": self.sha(d.PUBLIC / "assets/generated/source/hero.png")}}}}
        self.report = {"version": "fixture", "parameters": {"authoringManifests": [{"characters": ["hero"], "sha256": "a" * 64}]},
                       "images": [{"logical": self.logical, "source": self.base + "atlas.png", "quality": 93, "lossless": False, "protectedFrames": [], "size": [4, 4], "packedRgbaSha256": hashlib.sha256(self.image.tobytes()).hexdigest()}],
                       "audio": [{"bank": "character-hero", "file": "assets/delivery/audio-fixture.bin", "codec": "opus-96k"}]}
        self.manifest_path, self.report_path = self.root / "manifest.json", self.root / "report.json"
        self.save()

    def tearDown(self):
        d.ROOT, d.PUBLIC = self.old_root, self.old_public

    def sha(self, path): return hashlib.sha256(path.read_bytes()).hexdigest()

    def put(self, relative, raw):
        p = d.PUBLIC / relative; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(raw)

    def record(self, source, file, mime):
        return {"source": source, "sourceSha256": self.sha(d.PUBLIC / source), "file": file,
                "sha256": self.sha(d.PUBLIC / file), "bytes": (d.PUBLIC / file).stat().st_size, "contentType": mime}

    def save(self):
        self.manifest_path.write_text(json.dumps({"version": "fixture", "records": self.records}))
        self.report_path.write_text(json.dumps(self.report))

    def reuse(self): return d.EncodingReuse(self.manifest_path, self.report_path)

    def test_complete_closure_rejects_new_alias_or_author_change_with_unchanged_png(self):
        plan = {"id": "hero", "manifest": self.owner}
        self.assertTrue(self.reuse().character_matches(plan))
        original = (d.PUBLIC / self.base / "runtime.json").read_bytes()
        self.put(self.base + "runtime.json", original.replace(b'"idle":{}', b'"idle":{},"g5_awakening":{}'))
        self.assertFalse(self.reuse().character_matches(plan))
        self.put(self.base + "runtime.json", original)
        self.put(self.base + "atlas.json", b'{"frames":{"idle":{},"g5_awakening":{}}}')
        self.assertFalse(self.reuse().character_matches(plan))
        self.owner["sha256"] = "b" * 64
        self.assertFalse(self.reuse().character_matches(plan))

    def test_image_checks_recipe_layout_full_output_bytes_and_alpha(self):
        reuse = self.reuse()
        args = [self.logical, self.image, self.base + "atlas.png", 93, False, [], False, None, True]
        self.assertIsNotNone(reuse.image(*args))
        args[3] = 95; self.assertIsNone(reuse.image(*args)); args[3] = 93
        moved = self.image.copy(); moved.putpixel((1, 1), (0, 0, 0, 0)); args[1] = moved
        self.assertIsNone(reuse.image(*args)); args[1] = self.image
        self.put("assets/delivery/hero-fixture.webp", b"changed physical bytes")
        with self.assertRaisesRegex(ValueError, "physical output changed"): reuse.verify_snapshot()
        self.assertIsNone(self.reuse().image(*args))

    def test_audio_only_reuses_exact_original_valid_slice_and_matching_codec(self):
        self.assertEqual(self.reuse().audio_clip(self.audio, Path("existing-ffmpeg")), (b"ENCODEDclip", "audio/ogg"))
        self.assertIsNone(self.reuse().audio_clip(self.audio, None))
        self.records[self.audio]["slice"]["length"] = 999; self.save()
        self.assertIsNone(self.reuse().audio_clip(self.audio, Path("existing-ffmpeg")))
        self.put(self.audio, b"new original recording")
        self.assertIsNone(self.reuse().audio_clip(self.audio, Path("existing-ffmpeg")))
        with self.assertRaisesRegex(ValueError, "both"): d.EncodingReuse(self.manifest_path)

    def test_music_also_requires_the_exact_master_processing_recipe(self):
        logical = "assets/audio/music/menu.wav"
        self.put(logical, b"synthetic mastered music")
        self.records[logical] = self.record(logical, "assets/delivery/audio-fixture.bin", "audio/ogg")
        recipe = {"filter": "recorded-master-filter", "sourceSha256": "c" * 64}
        self.report["audio"].append({"music": "menu", "processing": recipe, "codec": "opus-80k"})
        self.save()
        self.assertEqual(self.reuse().music("menu", logical, recipe, "opus-80k"), b"headENCODEDcliptail")
        self.assertIsNone(self.reuse().music("menu", logical, {**recipe, "filter": "changed"}, "opus-80k"))
        self.assertIsNone(self.reuse().music("menu", logical, recipe, "opus-96k"))


if __name__ == "__main__": unittest.main()
