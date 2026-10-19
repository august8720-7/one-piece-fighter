"""Encode verified runtime masters for the web without changing animation geometry.

Original PNG/WAV files stay untouched. Only content-addressed delivery files,
their runtime map, and an explicit processing report are written.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import io
import json
import re
import subprocess
import tempfile

from PIL import Image
import numpy as np
from build_anime_atlas import HASH, build_character, load_sources, pack_frames, rectangle
from build_roster_fx1003 import ROSTER_CHARACTERS, load_catalogs, manifest_catalog_names, prepare as prepare_roster_fx

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUTPUT = PUBLIC / "assets/delivery"
DEFAULT_AUTHOR_MANIFEST = ROOT / "scripts/anime_manifest.json"
DEFAULT_REPORT_DIR = ROOT / ".local-releases/加载提速-0915/acceptance"
DEFAULT_MANIFEST_OUTPUT = ROOT / "src/render/deliveryManifest.json"
DEFAULT_CHARACTERS = ("luffy", "akainu")
CHARACTER_FX = {
    "luffy": ("assets/fx/luffy.png", "assets/fx/luffy.json"),
    "akainu": ("assets/fx/akainu.png", "assets/fx/akainu.json"),
    "labubu": ("assets/fx/labubu/atlas.png", "assets/fx/labubu/atlas.json"),
    "twinkle": ("assets/fx/twinkle/atlas.png", "assets/fx/twinkle/atlas.json"),
    # This is an explicit path capability, not a release approval. Every roster
    # selection additionally requires a reviewed FX manifest and verified masters.
    **{character: (f"assets/fx/{character}/atlas.png", f"assets/fx/{character}/atlas.json") for character in ROSTER_CHARACTERS},
}
COMMON_FX = ("assets/fx/common/atlas.png", "assets/fx/common/atlas.json")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode_json(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def immutable_file(label, suffix, data, write=True):
    name = f"{label}-{digest(data)[:20]}.{suffix}"
    path = OUTPUT / name
    if path.exists() and path.read_bytes() != data:
        raise ValueError(f"Content-address collision: {name}")
    if write and not path.exists():
        path.write_bytes(data)
    return f"assets/delivery/{name}"


class EncodingReuse:
    """Explicit adopted receipt reuse; missing evidence recomputes only that output."""
    def __init__(self, manifest=None, report=None):
        if bool(manifest) != bool(report):
            raise ValueError("Reuse requires both --reuse-manifest and --reuse-report")
        self.snapshots = []
        self.records, self.report, self.physical = {}, {}, {}
        self.counts = {"images": 0, "audioClips": 0, "music": 0}
        if manifest:
            for path in (manifest, report):
                path = Path(path).resolve()
                self.snapshots.append((path, path.read_bytes()))
            previous = json.loads(self.snapshots[0][1])
            self.report = json.loads(self.snapshots[1][1])
            if previous.get("version") != self.report.get("version") or not isinstance(previous.get("records"), dict):
                raise ValueError("Reuse manifest/report version mismatch")
            self.records = previous["records"]

    def receipt(self):
        return {"inputs": [{"file": p.as_posix(), "sha256": digest(raw)} for p, raw in self.snapshots],
                "reused": self.counts}

    def verify_snapshot(self):
        if any(path.read_bytes() != raw for path, raw in self.snapshots):
            raise ValueError("Reuse receipt changed during encoding")
        for (file, expected, size), cached in self.physical.items():
            if cached is not None:
                path = PUBLIC / file
                if not path.is_file() or path.stat().st_size != size or digest(path.read_bytes()) != expected:
                    raise ValueError(f"Reused physical output changed during encoding: {file}")

    def physical_bytes(self, record):
        if not isinstance(record, dict) or not re.fullmatch(r"assets/delivery/[a-z0-9-]+\.(webp|avif|json|bin|ogg)", record.get("file", "")):
            return None
        key = (record["file"], record.get("sha256"), record.get("bytes"))
        if key not in self.physical:
            path = PUBLIC / record["file"]
            raw = path.read_bytes() if path.is_file() else None
            self.physical[key] = raw if raw is not None and len(raw) == record.get("bytes") and digest(raw) == record.get("sha256") else None
        return self.physical[key]

    def source_matches(self, logical, record):
        path = PUBLIC / logical
        return (isinstance(record, dict) and record.get("source") == logical and path.is_file()
                and digest(path.read_bytes()) == record.get("sourceSha256"))

    def character_matches(self, plan):
        if plan.get("form"):
            return False  # First independent form has no adopted previous closure.
        owner, character = plan["manifest"], plan["id"]
        previous = next((row for row in self.report.get("parameters", {}).get("authoringManifests", [])
                         if character in row.get("characters", [])), None)
        if not previous or previous.get("sha256") != owner["sha256"]:
            return False
        sources = owner["config"].get("sources", {})
        if not sources:
            return False
        for source in sources.values():
            path = (ROOT / source.get("file", "")).resolve()
            if not path.is_relative_to((PUBLIC / "assets/generated/source").resolve()) or not path.is_file() or digest(path.read_bytes()) != source.get("sha256"):
                return False
        base = f"assets/characters/{character}/anime/"
        path = PUBLIC / base / "runtime.json"
        runtime = read_json(path)
        # The full raw input closure matters: aliases/roots/page metadata may
        # change packing even when original atlas PNG bytes remain identical.
        inputs = [base + "runtime.json", *[base + page[field] for page in runtime["pages"] for field in ("image", "data")]]
        return all(any(self.source_matches(logical, record) for record in self.records.values()) for logical in inputs)

    def image(self, logical, original, source, quality, lossless, protected, avif, avif_quality, closure):
        record = self.records.get(logical)
        row = next((item for item in self.report.get("images", []) if item.get("logical") == logical), None)
        if (not closure or not row or not self.source_matches(source, record)
                or row.get("source") != source or row.get("quality") != (100 if lossless else quality)
                or row.get("lossless") != lossless or row.get("protectedFrames", []) != (protected or [])
                or row.get("size") != list(original.size) or bool(record.get("avif")) != avif):
            return None
        rgba = np.asarray(original)
        raw_hash = digest(original.tobytes())
        previous_raw_hash = row.get("packedRgbaSha256") or row.get("avif", {}).get("packedRgbaSha256")
        direct_source = Image.open(PUBLIC / source).convert("RGBA")
        if previous_raw_hash != raw_hash and not lossless and not (direct_source.size == original.size and np.array_equal(np.asarray(direct_source), rgba)):
            return None
        for selected in ([record, record["avif"]] if avif else [record]):
            raw = self.physical_bytes(selected)
            if raw is None:
                return None
            decoded = Image.open(io.BytesIO(raw)).convert("RGBA")
            if decoded.size != original.size or not np.array_equal(np.asarray(decoded)[:, :, 3], rgba[:, :, 3]):
                return None
            if lossless and not np.array_equal(np.asarray(decoded), rgba):
                return None
        if avif:
            expected_settings = {"quality": avif_quality, "speed": 4, "subsampling": "4:4:4", "max_threads": 2,
                                 "codec": "aom", "advanced": {"alpha:lossless": "1"}}
            if row.get("avif", {}).get("settings") != expected_settings or previous_raw_hash != raw_hash:
                return None
        self.counts["images"] += 1
        return copy.deepcopy(record), {**copy.deepcopy(row), "reusedVerifiedEncoding": True, "packedRgbaSha256": raw_hash}

    def audio_clip(self, source, ffmpeg):
        record = self.records.get(source)
        if not self.source_matches(source, record):
            return None
        row = next((item for item in self.report.get("audio", []) if item.get("bank") and item.get("file") == record.get("file")), None)
        if not row or row.get("codec") != ("opus-96k" if ffmpeg else "original-wav") or record.get("contentType") != ("audio/ogg" if ffmpeg else "audio/wav"):
            return None
        raw, cut = self.physical_bytes(record), record.get("slice", {})
        start, length = cut.get("offset"), cut.get("length")
        if raw is None or not isinstance(start, int) or not isinstance(length, int) or start < 0 or length <= 0 or start + length > len(raw):
            return None
        self.counts["audioClips"] += 1
        return raw[start:start + length], record["contentType"]

    def music(self, name, logical, processing, codec):
        record = self.records.get(logical)
        row = next((item for item in self.report.get("audio", []) if item.get("music") == name), None)
        if not self.source_matches(logical, record) or not row or row.get("processing") != processing or row.get("codec") != codec:
            return None
        raw = self.physical_bytes(record)
        if raw is not None:
            self.counts["music"] += 1
        return raw


def verify_authoring_provenance(manifest, manifest_path, root=ROOT):
    fields = ("sourceManifest", "sourceCatalog", "generator")
    present = [field for field in fields if field in manifest]
    if manifest_path.name.endswith(".resolved.json") or present:
        if set(present) != set(fields):
            raise ValueError(f"Resolved authoring manifest requires sourceManifest/sourceCatalog/generator receipts: {manifest_path}")
    verified = {}
    for field in present:
        record = manifest[field]
        if not isinstance(record, dict) or not isinstance(record.get("file"), str) or not isinstance(record.get("sha256"), str):
            raise ValueError(f"Invalid {field} receipt: {manifest_path}")
        relative = Path(record["file"])
        if relative.is_absolute():
            raise ValueError(f"{field} must be repository-relative: {record['file']}")
        target = (Path(root).resolve() / relative).resolve()
        if not target.is_relative_to(Path(root).resolve()) or not target.is_file() or digest(target.read_bytes()) != record["sha256"].lower():
            raise ValueError(f"{field} receipt mismatch: {record['file']}")
        verified[field] = {"file": relative.as_posix(), "sha256": record["sha256"].lower()}
    return verified


def load_authoring_ownership(manifest_paths, root=ROOT):
    owners, receipts = {}, []
    for manifest_path in manifest_paths:
        path = Path(manifest_path).resolve()
        raw = path.read_bytes()
        manifest = json.loads(raw)
        if manifest.get("schemaVersion") != 1 or not isinstance(manifest.get("characters"), dict):
            raise ValueError(f"Unsupported authoring manifest: {path}")
        provenance = verify_authoring_provenance(manifest, path, root)
        owned = []
        for character, config in manifest["characters"].items():
            if not isinstance(config, dict):
                raise ValueError(f"Invalid character authoring config: {character}")
            if character in owners:
                raise ValueError(f"Character has multiple authoring manifests: {character}")
            owners[character] = {"path": path, "sha256": digest(raw), "config": config, "provenance": provenance}
            owned.append(character)
        try:
            display_path = path.relative_to(ROOT).as_posix()
        except ValueError:
            display_path = path.as_posix()
        receipts.append({"file": display_path, "sha256": digest(raw), "characters": sorted(owned), "provenance": provenance})
    return owners, receipts


def load_reviewed_roster_fx(manifest_paths):
    """Reassemble named reviewed crops in memory and compare every runtime byte."""
    mapped, receipts, catalogs = {}, [], {}
    for manifest_path in manifest_paths:
        path = Path(manifest_path).resolve()
        outputs, report = prepare_roster_fx(path)
        for output, expected in outputs.items():
            if not output.is_file() or digest(output.read_bytes()) != digest(expected):
                raise ValueError(f"FX master differs from its reviewed crop manifest: {output}")
        sources, _ = load_catalogs(manifest_catalog_names(read_json(path)))
        for key, source in sources.items():
            if key in catalogs and catalogs[key] != source:
                raise ValueError(f"Conflicting FX/UI source catalog record: {key}")
            catalogs[key] = source
        for character in report["characters"]:
            character_id = character["character"]
            if character_id in mapped:
                raise ValueError(f"Character has multiple FX manifests: {character_id}")
            base = f"assets/fx/{character_id}/"
            mapped[character_id] = {"pages": [{**page, "image": base + page["image"], "data": base + page["data"]}
                for page in character["pages"]], "runtime": base + "fx-runtime.json" if report["schemaVersion"] == 2 else None}
        receipts.append({"file": path.as_posix(), "sha256": report["manifestSha256"], "catalogs": report["catalogs"],
                         "characters": [row["character"] for row in report["characters"]], "outputs": report["outputs"],
                         "masterBytesVerified": True})
    return mapped, receipts, catalogs


def verify_roster_ui(character, ui, sources):
    """Keep UI source evidence and the declared source-density crop verifiable."""
    identity, processing = ui.get("source"), ui.get("processing")
    if not isinstance(identity, dict) or not isinstance(processing, dict) or processing.get("scale") != 1:
        raise ValueError(f"Roster UI requires a recorded source-density crop: {character}")
    if not isinstance(ui.get("reviewStatus"), str) or not ui["reviewStatus"].strip():
        raise ValueError(f"Roster UI requires an explicit review status: {character}")
    if any(marker in ui["reviewStatus"].lower() for marker in ("blocked", "rejected", "unreviewed", "disabled")):
        raise ValueError(f"Blocked roster UI cannot be encoded: {character} ({ui['reviewStatus']})")
    matched = {key: source for key, source in sources.items() if isinstance(source, dict)
               and source.get("file") == identity.get("file") and source.get("sha256") == identity.get("sha256")}
    if not matched:
        raise ValueError(f"Roster UI source is missing from explicit verified catalogs: {character}")
    declared_key = identity.get("key", identity.get("sourceKey"))
    if declared_key is not None and declared_key not in matched:
        raise ValueError(f"Roster UI source key/content mismatch: {character}")
    key = declared_key or next(iter(matched))
    original = load_sources({key: matched[key]})[key]
    target = (PUBLIC / ui["image"]).resolve()
    if not target.is_relative_to((PUBLIC / f"assets/characters/{character}/anime").resolve()) or not target.is_file():
        raise ValueError(f"Roster UI escapes its character namespace: {character}")
    if not isinstance(ui.get("sha256"), str) or not HASH.fullmatch(ui["sha256"]) or digest(target.read_bytes()) != ui["sha256"].lower():
        raise ValueError(f"UI master content mismatch: {character}")
    x, y, w, h = rectangle(identity.get("crop"), original.width, original.height, f"{character} UI source crop")
    expected = np.asarray(original.crop((x, y, x+w, y+h)))
    actual_image = Image.open(target).convert("RGBA")
    if actual_image.size != (w, h) or (ui.get("width"), ui.get("height")) != (w, h):
        raise ValueError(f"Roster UI source dimensions changed: {character}")
    actual, protected = np.asarray(actual_image), np.ones((h, w), dtype=bool)
    exclusions = processing.get("excludeRects", [])
    if not isinstance(exclusions, list):
        raise ValueError(f"Roster UI exclusions must be explicit rectangles: {character}")
    if exclusions and processing.get("protectedPixelsEqual") is not True:
        raise ValueError(f"Roster UI neighbor exclusions require a protected-pixel receipt: {character}")
    for exclusion in exclusions:
        ex, ey, ew, eh = rectangle(exclusion, w, h, f"{character} UI neighboring-art exclusion")
        protected[ey:ey+eh, ex:ex+ew] = False
    if not np.array_equal(expected[protected], actual[protected]) or (exclusions and np.any(actual[~protected, 3])):
        raise ValueError(f"Roster UI protected RGBA/source crop mismatch: {character}")
    if "protectedRgbaSha256" in processing and digest(actual.tobytes()) != processing["protectedRgbaSha256"]:
        raise ValueError(f"Roster UI processed RGBA receipt mismatch: {character}")
    if actual_image.getchannel("A").getbbox() is None:
        raise ValueError(f"Roster UI contains no artwork: {character}")
    frames = ui.get("frames", {})
    if not isinstance(frames, dict) or not {"body", "portrait"}.issubset(frames):
        raise ValueError(f"Roster UI requires body/portrait frames: {character}")
    for name, frame in frames.items():
        if not isinstance(frame, dict):
            raise ValueError(f"Invalid roster UI frame: {character}/{name}")
        rectangle([frame.get(field) for field in ("x", "y", "w", "h")], w, h, f"{character} UI {name}")


def resolve_build_plan(characters, manifest_paths, ui_manifest_path=None, fx_manifest_paths=()):
    selected = list(dict.fromkeys(characters))
    if not selected or any(character not in CHARACTER_FX for character in selected):
        raise ValueError("Characters must be an explicit non-empty subset of the four release and 19 PC roster ids")
    owners, receipts = load_authoring_ownership(manifest_paths, ROOT)
    reviewed_fx, fx_receipts, catalog_sources = load_reviewed_roster_fx(fx_manifest_paths)
    if set(reviewed_fx) - set(selected):
        raise ValueError("FX manifests must name only selected characters; no unused fighter dependencies")
    ui_path = Path(ui_manifest_path or ROOT / "src/render/anime/uiArtManifest.json")
    ui_characters = read_json(ui_path).get("characters", {})
    plan = []
    for character in selected:
        owner, ui = owners.get(character), ui_characters.get(character)
        if not owner:
            raise ValueError(f"Missing authoring manifest for character: {character}")
        if not isinstance(ui, dict) or not ui.get("image") or not ui.get("sha256"):
            raise ValueError(f"Missing explicit UI identity for character: {character}")
        if ui.get("enabled") is False:
            raise ValueError(f"Disabled character art cannot be encoded: {character} ({ui.get('reviewStatus', 'review blocked')})")
        record = {"id": character, "manifest": owner, "ui": ui, "fx": CHARACTER_FX[character]}
        if character in ROSTER_CHARACTERS:
            if character not in reviewed_fx:
                raise ValueError(f"Roster character requires an explicit reviewed --fx-manifest: {character}")
            author_sources = owner["config"].get("sources")
            load_sources(author_sources)
            all_sources = dict(catalog_sources)
            for key, source in author_sources.items():
                # Author manifests may add a measured unitScale/scaleBasis for
                # bodies; FX keeps original density. Both records are verified
                # independently, and their original/evidence identity must agree.
                if key in all_sources and any(all_sources[key].get(field) != source.get(field)
                    for field in ("file", "sha256", "sourceEvidence", "modelEvidence", "prompt")):
                    raise ValueError(f"Conflicting authoring/UI source record: {key}")
                all_sources[key] = source
            verify_roster_ui(character, ui, all_sources)
            record.update({"fxPages": reviewed_fx[character]["pages"], "fxRuntime": reviewed_fx[character]["runtime"],
                           "fxReceipts": [receipt for receipt in fx_receipts if character in receipt["characters"]]})
        plan.append(record)
    return plan, receipts



def semantic_audio_catalog(samples, overlay, selected_characters, public):
    """Only the explicit accepted semantic table may override runtime cues."""
    if not isinstance(samples, dict) or not isinstance(samples.get("cues"), dict):
        raise ValueError("Invalid base audio cue manifest")
    if not isinstance(overlay, dict) or type(overlay.get("schemaVersion")) is not int or overlay.get("schemaVersion") != 1:
        raise ValueError("Unsupported semantic dialogue schema")
    cues, checks, lines = overlay.get("cues"), overlay.get("fileChecks"), overlay.get("lines")
    if not isinstance(cues, dict) or not isinstance(checks, dict) or not isinstance(lines, list):
        raise ValueError("Invalid semantic dialogue cues/fileChecks/lines")
    selected = set(selected_characters)
    selected_checks = {}
    for cue_id, cue in cues.items():
        parts = cue_id.split(".")
        if not re.fullmatch(r"voice\.[a-z0-9_]+\.[a-z0-9_]+", cue_id):
            raise ValueError(f"Invalid semantic dialogue cue id: {cue_id}")
        if not isinstance(cue, dict) or cue.get("group") != "voice" or cue.get("characterId") != parts[1]:
            raise ValueError(f"Invalid semantic dialogue owner/group: {cue_id}")
        files = cue.get("files")
        if not isinstance(files, list) or not files:
            raise ValueError(f"Invalid semantic dialogue files: {cue_id}")
        for source in files:
            relative = Path(source) if isinstance(source, str) else Path()
            if (not isinstance(source, str) or "\\" in source or relative.is_absolute()
                    or ".." in relative.parts or not source.startswith(f"assets/audio/voice/{parts[1]}/")
                    or not re.fullmatch(rf"assets/audio/voice/{parts[1]}/[a-zA-Z0-9_.-]+\.(wav|mp3|ogg)", source)):
                raise ValueError(f"Unsafe semantic dialogue file: {source}")
            check = checks.get(source)
            if (not isinstance(check, dict) or not isinstance(check.get("sha256"), str)
                    or len(check["sha256"]) != 64 or any(c not in "0123456789abcdef" for c in check["sha256"].lower())
                    or not isinstance(check.get("bytes"), int) or isinstance(check["bytes"], bool) or check["bytes"] <= 0):
                raise ValueError(f"Missing semantic dialogue integrity: {source}")
            if not any(isinstance(line, dict) and line.get("file") == source
                       and line.get("transcriptVerified") is True and isinstance(line.get("translation"), str)
                       and line["translation"].strip() for line in lines):
                raise ValueError(f"Unverified semantic dialogue line: {source}")
            if parts[1] not in selected:
                continue
            raw = (Path(public) / relative).read_bytes()
            if len(raw) != check["bytes"] or digest(raw) != check["sha256"].lower():
                raise ValueError(f"Semantic dialogue exact audio mismatch: {source}")
            selected_checks[source] = {"sha256": check["sha256"].lower(), "bytes": check["bytes"]}
    merged = {**samples["cues"], **cues}
    filtered = {cue_id: cue for cue_id, cue in merged.items()
                if (cue.get("characterId") or (cue_id.split(".")[1] if cue_id.startswith("voice.") else None)) in selected
                or not (cue.get("characterId") or (cue_id.split(".")[1] if cue_id.startswith("voice.") else None))}
    return filtered, selected_checks


def load_semantic_audio_catalog(selected_characters, root=ROOT, public=PUBLIC):
    base_path = Path(root) / "src/audio/sampleManifest.json"
    semantic_path = Path(root) / "src/audio/semanticDialogue1017.json"
    base_raw, semantic_raw = base_path.read_bytes(), semantic_path.read_bytes()
    cues, checks = semantic_audio_catalog(json.loads(base_raw), json.loads(semantic_raw), selected_characters, public)
    receipt = {"file": semantic_path.as_posix(), "sha256": digest(semantic_raw),
               "baseFile": base_path.as_posix(), "baseSha256": digest(base_raw),
               "selectedFiles": checks}
    return cues, receipt


def verify_audio_manifest_snapshot(receipt):
    if digest(Path(receipt["file"]).read_bytes()) != receipt["sha256"]:
        raise ValueError("Semantic dialogue manifest changed during encoding; retry from a stable snapshot")
    if digest(Path(receipt["baseFile"]).read_bytes()) != receipt["baseSha256"]:
        raise ValueError("Base audio manifest changed during encoding; retry from a stable snapshot")


def audio_banks(cues, selected_characters):
    selected = set(selected_characters)
    menu_ids = {"menu_move", "menu_confirm"}
    owners, menu_files, included = {}, set(), set()
    for cue_id, cue in cues.items():
        owner = cue.get("characterId") or (cue_id.split(".")[1] if cue_id.startswith("voice.") else None)
        if owner and owner not in selected:
            continue
        for source in cue.get("files", []):
            included.add(source)
            # AudioEngine.preloadMenu also needs the tiny selection responses.
            # A shared attack/select clip belongs here once, not in a whole fighter bank.
            if cue_id in menu_ids or (cue_id.startswith("voice.") and cue_id.endswith(".select")):
                menu_files.add(source)
            if owner:
                previous = owners.setdefault(source, owner)
                if previous != owner:
                    raise ValueError(f"Audio file assigned to multiple characters: {source}")
    banks = {}
    for source in sorted(included):
        group = "menu" if source in menu_files else f"character-{owners[source]}" if source in owners else "effects"
        banks.setdefault(group, []).append(source)
    return banks


def encode_avif_image(original, quality=70):
    """Ordinary atlas alternative only; alpha must remain sample-exact."""
    if not isinstance(quality, int) or not 65 <= quality <= 100:
        raise ValueError("Reviewed AVIF candidate quality must be between 65 and 100")
    target = io.BytesIO()
    settings = {"quality": quality, "speed": 4, "subsampling": "4:4:4", "max_threads": 2,
                "codec": "aom", "advanced": {"alpha:lossless": "1"}}
    original.save(target, "AVIF", **settings)
    data = target.getvalue()
    decoded = Image.open(io.BytesIO(data)).convert("RGBA")
    if decoded.size != original.size or not np.array_equal(np.asarray(original)[:, :, 3], np.asarray(decoded)[:, :, 3]):
        raise ValueError("AVIF atlas dimensions or alpha changed")
    return data, {"settings": settings, "exactAlpha": True, "size": list(decoded.size)}


def resolve_gear5_delivery(manifest_path, selected):
    if manifest_path is None:
        return []
    if "luffy" not in selected:
        raise ValueError("Gear5 delivery requires selected base Luffy")
    path = Path(manifest_path).resolve()
    raw = path.read_bytes()
    manifest = json.loads(raw)
    config = manifest.get("characters", {}).get("luffy")
    if manifest.get("schemaVersion") != 1 or not isinstance(config, dict) or config.get("formReview") != "full-coverage-accepted":
        raise ValueError("Gear5 delivery requires an explicit fully reviewed form manifest")
    if config.get("pendingContact"):
        raise ValueError("Gear5 delivery refuses unresolved pending contact reviews")
    outputs, report = build_character("luffy", config, digest(raw), "gear5")
    base = "assets/characters/luffy/forms/gear5/"
    runtime = json.loads(outputs["runtime.json"])
    required = {"idle", "walk_fwd", "walk_back", "crouch", "prejump", "jump_neutral", "jump_fwd", "jump_back", "landing", "dash", "backdash", "roll_fwd", "roll_back", "block_stand", "block_crouch", "hit_stand", "hit_crouch", "hit_air", "knockdown", "getup", "throw", "thrown", "throw_tech", "ko", "win", "held_leg_flip", "held_labubu_throw", "held_twinkle_throw", "g5_elastic_rush", "g5_bounce_slam", "g5_rising_whip", "g5_awakening"}
    required.update({"ult_red_hawk", "sp_storm", "sp_gigant_pistol", "sp_rocket", "sp_balloon", "cd", "j_cd", "throw_fwd", "throw_back", "f_c", "j_2d", "st_a", "st_b", "st_c", "st_d", "cr_a", "cr_b", "cr_c", "cr_d", "j_a", "j_b", "j_c", "j_d"})
    if required - runtime["anims"].keys():
        raise ValueError("Gear5 delivery missing reachable states/moves")
    base_runtime = read_json(PUBLIC / "assets/characters/luffy/anime/runtime.json")
    for label, candidate in [("base", base_runtime), ("gear5", runtime)]:
        awakening = candidate.get("anims", {}).get("g5_awakening", {})
        if awakening.get("loop") is not False or sum(exposure.get("ticks", 0) for exposure in awakening.get("exposures", [])) != 36:
            raise ValueError(f"{label}: Gear5 awakening must retain the 36-tick action clock")
    for name, expected in outputs.items():
        if name == "build-report.json":
            continue
        target = PUBLIC / base / name
        if not target.is_file() or digest(target.read_bytes()) != digest(expected):
            raise ValueError(f"Gear5 runtime differs from verified original source assembly: {name}")
    return [{"id": "luffy", "form": "gear5", "base": base,
             "manifest": {"sha256": digest(raw)}, "sourceReport": report}]


def build(ffmpeg=None, quality=95, characters=DEFAULT_CHARACTERS, author_manifests=(DEFAULT_AUTHOR_MANIFEST,),
          report_dir=DEFAULT_REPORT_DIR, manifest_output=DEFAULT_MANIFEST_OUTPUT, check=False,
          avif_quality=None, avif_characters=(), ui_manifest=None, fx_manifests=(), gear5_manifest=None,
          reuse_manifest=None, reuse_report=None):
    plan, author_receipts = resolve_build_plan(characters, author_manifests, ui_manifest, fx_manifests)
    form_plan = resolve_gear5_delivery(gear5_manifest, characters)
    cues, dialogue_receipt = load_semantic_audio_catalog(characters)
    reuse = EncodingReuse(reuse_manifest, reuse_report)
    avif_ids = set(avif_characters)
    if avif_ids - {item["id"] for item in plan} or bool(avif_ids) != (avif_quality is not None):
        raise ValueError("AVIF requires an explicit quality and non-empty subset of the selected characters")
    if avif_quality is not None and (not isinstance(avif_quality, int) or not 65 <= avif_quality <= 100):
        raise ValueError("AVIF candidate quality must be between 65 and 100")
    report_dir, manifest_output = Path(report_dir).resolve(), Path(manifest_output).resolve()
    if (form_plan or len(plan) > 2 or len(author_receipts) > 1 or any(item["id"] in ROSTER_CHARACTERS for item in plan)) and report_dir == DEFAULT_REPORT_DIR.resolve():
        raise ValueError("Expanded delivery builds require an independent --report-dir; refusing to overwrite the 0915 report area")
    if not check:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    records, images_report, audio_report = {}, [], []

    def add(logical, label, suffix, data, mime, source, **extra):
        records[logical] = {
            "file": immutable_file(label, suffix, data, not check), "sha256": digest(data),
            "bytes": len(data), "contentType": mime,
            "source": source, "sourceSha256": digest((PUBLIC / source).read_bytes()), **extra,
        }

    def image(logical, label, original, source, lossless=False, protected_names=None, avif=False, reuse_closure=False):
        if avif and (lossless or protected_names):
            raise ValueError("Protected foreground/body pages must keep their exact lossless WebP")
        cached = reuse.image(logical, original, source, quality, lossless, protected_names, avif, avif_quality, reuse_closure)
        if cached:
            records[logical], image_receipt = cached
            images_report.append(image_receipt)
            return
        target = io.BytesIO()
        original.save(target, "WEBP", lossless=lossless, quality=100 if lossless else quality, method=6, exact=True)
        data = target.getvalue()
        decoded = Image.open(io.BytesIO(data)).convert("RGBA")
        before, after = np.asarray(original), np.asarray(decoded)
        alpha_equal = bool(np.array_equal(before[:, :, 3], after[:, :, 3]))
        rgba_equal = bool(np.array_equal(before, after))
        if not alpha_equal or (lossless and not rgba_equal):
            raise ValueError(f"Pixel protection failed: {logical}")
        add(logical, label, "webp", data, "image/webp", source)
        if protected_names:
            records[logical]["preserveRgba"] = True
        images_report.append({"logical": logical, "source": source, "size": list(original.size),
                              "bytes": len(data), "quality": 100 if lossless else quality, "lossless": lossless, "exactAlpha": alpha_equal,
                              "exactRgba": rgba_equal, "protectedFrames": protected_names or [],
                              "packedRgbaSha256": digest(original.tobytes())})
        if avif:
            alternative, checks = encode_avif_image(original, avif_quality)
            records[logical]["avif"] = {
                "file": immutable_file(label + "-avif", "avif", alternative, not check),
                "sha256": digest(alternative), "bytes": len(alternative), "contentType": "image/avif",
                "source": source, "sourceSha256": records[logical]["sourceSha256"],
            }
            images_report[-1]["avif"] = {**checks, "bytes": len(alternative), "sha256": digest(alternative),
                                         "packedRgbaSha256": digest(original.tobytes()), "visualAcceptance": "pending"}

    for character_plan in [*plan, *form_plan]:
        character = character_plan["id"]
        label_prefix = character + ("-gear5" if character_plan.get("form") else "")
        manifest_hash = character_plan["manifest"]["sha256"]
        base = character_plan.get("base", f"assets/characters/{character}/anime/")
        reuse_closure = reuse.character_matches(character_plan)
        source_runtime = base + "runtime.json"
        runtime = read_json(PUBLIC / source_runtime)
        source_report = character_plan.get("sourceReport") or read_json(PUBLIC / base / "build-report.json")
        for name in ["runtime.json", *[p[field] for p in runtime["pages"] for field in ("image", "data")]]:
            actual = digest((PUBLIC / base / name).read_bytes())
            if source_report["outputHashes"].get(name) != actual:
                raise ValueError(f"Runtime master differs from its build record: {base}{name}")
        original_runtime = copy.deepcopy(runtime)
        crop_images, entries, aliases, origins = {}, {}, {}, {}
        original_rgba_bytes = 0
        for page in runtime["pages"]:
            source = base + page["image"]
            sheet = Image.open(PUBLIC / source).convert("RGBA")
            original_rgba_bytes += sheet.width * sheet.height * 4
            atlas = read_json(PUBLIC / base / page["data"])
            if atlas.get("meta", {}).get("manifestSha256") != manifest_hash:
                raise ValueError(f"Runtime atlas belongs to a different authoring manifest: {base}{page['data']}")
            for name, entry in atlas["frames"].items():
                f = entry["frame"]
                x, y, w, h = (f[key] for key in ("x", "y", "w", "h"))
                key = f'{page["id"]}:{x}:{y}:{w}:{h}'
                if key not in crop_images:
                    crop_images[key] = sheet.crop((x, y, x + w, y + h))
                    origins[key] = source
                entries[name], aliases[name] = copy.deepcopy(entry), key
        protected = {aliases[name] for pair in runtime.get("foregroundFrames", {}).items() for name in pair}
        groups = []
        for page in runtime["pages"]:
            keys = [key for key in crop_images if key.startswith(page["id"] + ":") and key not in protected]
            if keys:
                groups.append((keys, False))
        if protected:
            groups.append((sorted(protected), True))
        runtime["pages"], runtime["framePages"] = [], {}
        delivery_rgba_bytes = 0
        for index, (keys, lossless) in enumerate(groups):
            selected = {key: crop_images[key] for key in keys}
            packed, positions = pack_frames(selected, 4096)
            # Paste RGBA directly: alpha-compositing can discard transparent RGB.
            packed = Image.new("RGBA", packed.size)
            for key, position in positions.items():
                packed.paste(selected[key], position)
            page_id = f"p{index}"
            stem = "atlas" if index == 0 else f"atlas-{page_id}"
            page = {"id": page_id, "image": stem + ".webp", "data": stem + ".json",
                    "width": packed.width, "height": packed.height}
            frames = {}
            for name, key in aliases.items():
                if key not in positions:
                    continue
                entry = copy.deepcopy(entries[name])
                entry["frame"]["x"], entry["frame"]["y"] = positions[key]
                frames[name] = entry
                runtime["framePages"][name] = page_id
            sources = {origins[key] for key in keys}
            if len(sources) != 1:
                raise ValueError("Delivery groups must retain one explicit original page")
            source = sources.pop()
            image(base + page["image"], label_prefix + "-" + stem, packed, source, lossless,
                  list(frames) if lossless else [], avif=not character_plan.get("form") and character in avif_ids and not lossless,
                  reuse_closure=reuse_closure)
            metadata = {"frames": frames, "meta": {"image": page["image"],
                        "size": {"w": packed.width, "h": packed.height}, "scale": "1",
                        "textureDensity": runtime["textureDensity"], "page": page_id}}
            add(base + page["data"], label_prefix + "-" + stem, "json", encode_json(metadata), "application/json",
                base + original_runtime["pages"][int(keys[0].split(":")[0][1:])]["data"])
            runtime["pages"].append(page)
            delivery_rgba_bytes += packed.width * packed.height * 4
        runtime["atlas"] = {"image": "atlas.webp", "data": "atlas.json"}
        if character_plan.get("form"):
            runtime["formEvidence"]["atlasHashes"] = {page[field]: records[base + page[field]]["sha256"]
                                                       for page in runtime["pages"] for field in ("image", "data")}
        if runtime["anims"] != original_runtime["anims"] or runtime["attachments"] != original_runtime["attachments"]:
            raise ValueError("Delivery packaging changed animation or attachment geometry")
        if set(runtime["framePages"]) != set(original_runtime["framePages"]):
            raise ValueError("Delivery packaging changed frame coverage")
        if delivery_rgba_bytes > original_rgba_bytes * 1.2:
            raise ValueError(f"Delivery texture memory grew beyond 20%: {character}")
        add(source_runtime, label_prefix + "-runtime", "json", encode_json(runtime), "application/json", source_runtime)
        if character_plan.get("form"):
            continue
        ui = character_plan["ui"]
        if digest((PUBLIC / ui["image"]).read_bytes()) != ui["sha256"].lower():
            raise ValueError(f"UI master content mismatch: {character}")
        roster = character in ROSTER_CHARACTERS
        image(ui["image"], character + "-ui", Image.open(PUBLIC / ui["image"]).convert("RGBA"), ui["image"], lossless=roster, reuse_closure=reuse_closure)
        fx_pages = character_plan.get("fxPages", [{"id": "p0", "image": character_plan["fx"][0], "data": character_plan["fx"][1]}])
        for page in fx_pages:
            fx, fx_meta = page["image"], page["data"]
            label = character + "-fx" + ("-" + page["id"] if page["id"] != "p0" else "")
            image(fx, label, Image.open(PUBLIC / fx).convert("RGBA"), fx, lossless=roster, reuse_closure=reuse_closure)
            add(fx_meta, label, "json", (PUBLIC / fx_meta).read_bytes(), "application/json", fx_meta)
        if character_plan.get("fxRuntime"):
            source = character_plan["fxRuntime"]
            add(source, character + "-fx-runtime", "json", (PUBLIC / source).read_bytes(), "application/json", source)

    if any(item["id"] in ("labubu", "twinkle") for item in plan):
        fx, fx_meta = COMMON_FX
        image(fx, "common-fx", Image.open(PUBLIC / fx).convert("RGBA"), fx, lossless=True, reuse_closure=True)
        add(fx_meta, "common-fx", "json", (PUBLIC / fx_meta).read_bytes(), "application/json", fx_meta)

    for name in ("backdrop", "floor"):
        source = f"assets/stages/marineford/{name}.webp"
        add(source, name, "webp", (PUBLIC / source).read_bytes(), "image/webp", source)

    # Pack independently decodable clips together. Offsets cut original encoded
    # files, not a continuous audio stream, so no cue timing or encoder delay leaks.
    banks = audio_banks(cues, [item["id"] for item in plan])
    # Keep these task-owned intermediates for audio comparison; no cleanup or
    # permission-changing retry touches previous runs' temporary files.
    with tempfile.TemporaryDirectory(prefix="opf-audio-delivery-", delete=False) as temporary:
        for group, sources in banks.items():
            payload, slices = bytearray(), []
            for index, source in enumerate(sources):
                original = (PUBLIC / source).read_bytes()
                expected = dialogue_receipt["selectedFiles"].get(source)
                if expected and (len(original) != expected["bytes"] or digest(original) != expected["sha256"]):
                    raise ValueError(f"Semantic dialogue changed before encoding: {source}")
                data, mime = original, "audio/wav"
                cached = reuse.audio_clip(source, ffmpeg)
                if cached:
                    data, mime = cached
                elif ffmpeg:
                    target = Path(temporary) / f"{group}-{index}.ogg"
                    subprocess.run([str(ffmpeg), "-nostdin", "-v", "error", "-i", str(PUBLIC / source),
                                    "-c:a", "libopus", "-b:a", "96k", "-vbr", "on", "-application", "audio",
                                    "-frame_duration", "10", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                                    "-map_metadata", "-1", str(target)], check=True)
                    data, mime = target.read_bytes(), "audio/ogg"
                slices.append((source, len(payload), len(data), mime))
                payload.extend(data)
            data = bytes(payload)
            file = immutable_file("audio-" + group, "bin", data, not check)
            for source, offset, length, mime in slices:
                records[source] = {"file": file, "sha256": digest(data), "bytes": len(data), "contentType": mime,
                                   "source": source, "sourceSha256": digest((PUBLIC / source).read_bytes()),
                                   "slice": {"offset": offset, "length": length}}
            audio_report.append({"bank": group, "file": file, "clips": len(sources), "bytes": len(data),
                                 "codec": "opus-96k" if ffmpeg else "original-wav"})
        # Recreate the same mastered music from its verified original recording,
        # not from a second lossy encode of the previous delivery OGG.
        processing = read_json(ROOT / "scripts/daily_audio_manifest.json")["assets"]
        music = read_json(ROOT / "src/audio/musicManifest.json")["tracks"]
        for name, track in music.items():
            logical = track["file"]
            item = next(entry for entry in processing if entry["output"] == "public/" + logical)
            source = ROOT / item["source"]
            if digest(source.read_bytes()) != item["sourceSha256"]:
                raise ValueError(f"Music source changed: {source}")
            if not ffmpeg:
                raise ValueError("Music delivery requires the existing ffmpeg executable")
            target = Path(temporary) / f"music-{name}.ogg"
            bitrate = 80 if name == "menu" else 96
            cached = reuse.music(name, logical, item, f"opus-{bitrate}k")
            if cached is not None:
                add(logical, "music-" + name, "ogg", cached, "audio/ogg", logical)
                audio_report.append({"music": name, "file": records[logical]["file"], "bytes": len(cached),
                                     "codec": f"opus-{bitrate}k", "processing": item, "streaming": True,
                                     "reusedVerifiedEncoding": True})
                continue
            command = [str(ffmpeg), "-nostdin", "-v", "error"]
            if "start" in item:
                command += ["-ss", str(item["start"]), "-t", str(item["duration"])]
            command += ["-i", str(source), "-af", item["filter"], "-ac", "2", "-c:a", "libopus",
                        "-b:a", f"{bitrate}k", "-vbr", "on", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                        "-map_metadata", "-1", str(target)]
            subprocess.run(command, check=True)
            data = target.read_bytes()
            add(logical, "music-" + name, "ogg", data, "audio/ogg", logical)
            audio_report.append({"music": name, "file": records[logical]["file"], "bytes": len(data),
                                 "codec": f"opus-{bitrate}k", "processing": item, "streaming": True})
    verify_audio_manifest_snapshot(dialogue_receipt)
    reuse.verify_snapshot()
    manifest = {"schemaVersion": 1, "version": digest(encode_json(records)), "records": records}
    physical_records = [physical for record in records.values() for physical in ([record, record["avif"]] if "avif" in record else [record])]
    report = {"version": manifest["version"], "images": images_report, "audio": audio_report,
              "uniqueFiles": len({r["file"] for r in physical_records}),
              "bytes": sum({r["file"]: r["bytes"] for r in physical_records}.values()),
              "visualAcceptance": "pending", "audioAcceptance": "pending",
              "encodingReuse": reuse.receipt(),
              "parameters": {"characters": [item["id"] for item in plan], "quality": quality,
                             "ffmpeg": str(ffmpeg) if ffmpeg else None, "output": OUTPUT.as_posix(),
                             "manifestOutput": manifest_output.as_posix(), "reportDir": report_dir.as_posix(),
                             "authoringManifests": author_receipts, "semanticDialogue": dialogue_receipt, "checkOnly": check,
                             "avifQuality": avif_quality, "avifCharacters": sorted(avif_ids)}}
    if ui_manifest is not None:
        report["parameters"]["uiManifest"] = {"file": str(Path(ui_manifest).resolve()), "sha256": digest(Path(ui_manifest).read_bytes())}
    if gear5_manifest is not None:
        report["parameters"]["gear5Manifest"] = {"file": str(Path(gear5_manifest).resolve()), "sha256": digest(Path(gear5_manifest).read_bytes())}
    if fx_manifests:
        report["parameters"]["rosterFxManifests"] = list({receipt["file"]: receipt
            for item in plan for receipt in item.get("fxReceipts", [])}.values())
    report_file = report_dir / f"encoding-{manifest['version'][:20]}.json"
    if not check:
        manifest_output.parent.mkdir(parents=True, exist_ok=True)
        manifest_output.write_bytes(encode_json(manifest))
        report_dir.mkdir(parents=True, exist_ok=True)
        if report_file.exists() and report_file.read_bytes() != encode_json(report):
            raise ValueError(f"Encoding report collision: {report_file}")
        report_file.write_bytes(encode_json(report))
    print(json.dumps({**{key: value for key, value in report.items() if key not in ("images",)},
                      "report": report_file.as_posix()}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", type=Path, help="Existing ffmpeg binary; no dependency is installed")
    parser.add_argument("--quality", type=int, default=95, choices=range(90, 101), help="Candidate WebP quality; lossless foreground pages stay unchanged")
    parser.add_argument("--character", action="append", dest="characters", help="Explicit character id; repeat for each delivery character")
    parser.add_argument("--author-manifest", action="append", type=Path, dest="author_manifests", help="Explicit authoring manifest; repeat for each source manifest")
    parser.add_argument("--gear5-manifest", type=Path, help="Explicit reviewed independent Luffy Gear5 authoring manifest; base/UI/FX remain unchanged")
    parser.add_argument("--reuse-manifest", type=Path, help="Explicit previous adopted delivery manifest, paired with --reuse-report; no candidate discovery")
    parser.add_argument("--reuse-report", type=Path, help="Matching previous encoding report; incomplete closure/evidence recomputes affected outputs")
    parser.add_argument("--ui-manifest", type=Path, help="Explicit reviewed UI identity map; default is the release uiArtManifest.json")
    parser.add_argument("--fx-manifest", action="append", type=Path, dest="fx_manifests", help="Explicit reviewed roster FX crop manifest; repeat per selected new fighter; every output is reverified")
    parser.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR, help="Independent acceptance report directory")
    parser.add_argument("--manifest-output", type=Path, default=DEFAULT_MANIFEST_OUTPUT, help="Delivery manifest output path")
    parser.add_argument("--check", action="store_true", help="Run all encoding and validation in memory without writing delivery files, manifest or report")
    parser.add_argument("--avif-quality", type=int, choices=range(65, 101), help="Optional ordinary atlas AVIF alternative; keeps the original WebP; numerical quality alone is not visual acceptance")
    parser.add_argument("--avif-character", action="append", default=[], help="Explicit reviewed character eligible for AVIF; repeat as needed")
    args = parser.parse_args()
    try:
        build(args.ffmpeg, args.quality, args.characters or DEFAULT_CHARACTERS,
              args.author_manifests or (DEFAULT_AUTHOR_MANIFEST,), args.report_dir, args.manifest_output, args.check,
              args.avif_quality, args.avif_character, args.ui_manifest, args.fx_manifests or (), args.gear5_manifest,
              args.reuse_manifest, args.reuse_report)
    except (ValueError, OSError, TypeError, KeyError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
