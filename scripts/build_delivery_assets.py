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
import subprocess
import tempfile

from PIL import Image
import numpy as np
from build_anime_atlas import pack_frames

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUTPUT = PUBLIC / "assets/delivery"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode_json(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def immutable_file(label, suffix, data):
    name = f"{label}-{digest(data)[:20]}.{suffix}"
    path = OUTPUT / name
    if path.exists() and path.read_bytes() != data:
        raise ValueError(f"Content-address collision: {name}")
    if not path.exists():
        path.write_bytes(data)
    return f"assets/delivery/{name}"


def build(ffmpeg=None, quality=95):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records, images_report, audio_report = {}, [], []

    def add(logical, label, suffix, data, mime, source, **extra):
        records[logical] = {
            "file": immutable_file(label, suffix, data), "sha256": digest(data),
            "bytes": len(data), "contentType": mime,
            "source": source, "sourceSha256": digest((PUBLIC / source).read_bytes()), **extra,
        }

    def image(logical, label, original, source, lossless=False, protected_names=None):
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
        images_report.append({"logical": logical, "source": source, "size": list(original.size),
                              "bytes": len(data), "quality": 100 if lossless else quality, "lossless": lossless, "exactAlpha": alpha_equal,
                              "exactRgba": rgba_equal, "protectedFrames": protected_names or []})

    for character in ("luffy", "akainu"):
        base = f"assets/characters/{character}/anime/"
        source_runtime = base + "runtime.json"
        runtime = read_json(PUBLIC / source_runtime)
        source_report = read_json(PUBLIC / base / "build-report.json")
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
            image(base + page["image"], character + "-" + stem, packed, source, lossless,
                  list(frames) if lossless else [])
            metadata = {"frames": frames, "meta": {"image": page["image"],
                        "size": {"w": packed.width, "h": packed.height}, "scale": "1",
                        "textureDensity": runtime["textureDensity"], "page": page_id}}
            add(base + page["data"], character + "-" + stem, "json", encode_json(metadata), "application/json",
                base + original_runtime["pages"][int(keys[0].split(":")[0][1:])]["data"])
            runtime["pages"].append(page)
            delivery_rgba_bytes += packed.width * packed.height * 4
        runtime["atlas"] = {"image": "atlas.webp", "data": "atlas.json"}
        if runtime["anims"] != original_runtime["anims"] or runtime["attachments"] != original_runtime["attachments"]:
            raise ValueError("Delivery packaging changed animation or attachment geometry")
        if set(runtime["framePages"]) != set(original_runtime["framePages"]):
            raise ValueError("Delivery packaging changed frame coverage")
        if delivery_rgba_bytes > original_rgba_bytes * 1.2:
            raise ValueError(f"Delivery texture memory grew beyond 20%: {character}")
        add(source_runtime, character + "-runtime", "json", encode_json(runtime), "application/json", source_runtime)
        ui = read_json(ROOT / "src/render/anime/uiArtManifest.json")["characters"][character]
        if digest((PUBLIC / ui["image"]).read_bytes()) != ui["sha256"]:
            raise ValueError(f"UI master content mismatch: {character}")
        image(ui["image"], character + "-ui", Image.open(PUBLIC / ui["image"]).convert("RGBA"), ui["image"])
        fx = f"assets/fx/{character}.png"
        image(fx, character + "-fx", Image.open(PUBLIC / fx).convert("RGBA"), fx)
        fx_meta = f"assets/fx/{character}.json"
        add(fx_meta, character + "-fx", "json", (PUBLIC / fx_meta).read_bytes(), "application/json", fx_meta)

    for name in ("backdrop", "floor"):
        source = f"assets/stages/marineford/{name}.webp"
        add(source, name, "webp", (PUBLIC / source).read_bytes(), "image/webp", source)

    # Pack independently decodable clips together. Offsets cut original encoded
    # files, not a continuous audio stream, so no cue timing or encoder delay leaks.
    cues = read_json(ROOT / "src/audio/sampleManifest.json")["cues"]
    banks = {}
    menu_files = {file for name, cue in cues.items() if name in ("menu_move", "menu_confirm") for file in cue["files"]}
    for source in sorted({file for cue in cues.values() for file in cue["files"]}):
        group = "menu" if source in menu_files else "voice-luffy" if "/voice/luffy/" in source else "voice-akainu" if "/voice/akainu/" in source else "effects"
        banks.setdefault(group, []).append(source)
    # Keep these task-owned intermediates for audio comparison; no cleanup or
    # permission-changing retry touches previous runs' temporary files.
    with tempfile.TemporaryDirectory(prefix="opf-audio-delivery-", delete=False) as temporary:
        for group, sources in banks.items():
            payload, slices = bytearray(), []
            for index, source in enumerate(sources):
                original = (PUBLIC / source).read_bytes()
                data, mime = original, "audio/wav"
                if ffmpeg:
                    target = Path(temporary) / f"{group}-{index}.ogg"
                    subprocess.run([str(ffmpeg), "-nostdin", "-v", "error", "-i", str(PUBLIC / source),
                                    "-c:a", "libopus", "-b:a", "96k", "-vbr", "on", "-application", "audio",
                                    "-frame_duration", "10", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                                    "-map_metadata", "-1", str(target)], check=True)
                    data, mime = target.read_bytes(), "audio/ogg"
                slices.append((source, len(payload), len(data), mime))
                payload.extend(data)
            data = bytes(payload)
            file = immutable_file("audio-" + group, "bin", data)
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
    manifest = {"schemaVersion": 1, "version": digest(encode_json(records)), "records": records}
    (ROOT / "src/render/deliveryManifest.json").write_bytes(encode_json(manifest))
    report = {"version": manifest["version"], "images": images_report, "audio": audio_report,
              "uniqueFiles": len({r["file"] for r in records.values()}),
              "bytes": sum({r["file"]: r["bytes"] for r in records.values()}.values()),
              "visualAcceptance": "pending", "audioAcceptance": "pending"}
    report_path = ROOT / ".local-releases/加载提速-0915/acceptance"
    report_path.mkdir(parents=True, exist_ok=True)
    (report_path / f"encoding-{manifest['version'][:20]}.json").write_bytes(encode_json(report))
    print(json.dumps({key: value for key, value in report.items() if key not in ("images",)}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", type=Path, help="Existing ffmpeg binary; no dependency is installed")
    parser.add_argument("--quality", type=int, default=95, choices=range(90, 101), help="Candidate WebP quality; lossless foreground pages stay unchanged")
    args = parser.parse_args()
    build(args.ffmpeg, args.quality)
