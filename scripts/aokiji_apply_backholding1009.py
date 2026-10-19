"""Adopt reviewed independent back pixels after exact small rollback and frame checks.

Only Aokiji authoring and anime runtime are written. Root owns move holdOffset,
conditional reaction selection, scene/core, central registries and publishing.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import shutil

from PIL import Image

from build_anime_atlas import build_character, load_sources


ROOT = Path(__file__).resolve().parents[1]
ROSTER = Path("D:/one-piece-fighter-crossover-0922/roster-0929")
MANIFEST = ROOT / "scripts/roster_aokiji_manifest0929.json"
CATALOG = ROOT / "scripts/roster_aokiji_hold_sources1008.json"
CHAR = "aokiji"
OLD_FRAME = "throw_back_hold_1003"
NEW_FRAME = "throw_back_hold_1009"
NEW_SOURCE = "aokiji_low_hold_back_retrieved_1008"
EXPECTED_SOURCE = "45b28d32caa687992f9affefa52e0b52e6d2d15e9dfd3a5334242a5fca0e42b3"
REVIEW = ROSTER / "acceptance/aokiji-independent-back-review1008/near-foreground-trial1008/static-review1008.json"


def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def save_new(path: Path, value: object) -> None:
    with path.open("xb") as stream:
        stream.write(encode(value))


def image_box(image: Image.Image, atlas: dict, key: str) -> Image.Image:
    rect = atlas["frames"][key]["frame"]
    return image.crop((rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"])).convert("RGBA")


def runtime_frames(folder: Path, runtime: dict, outputs: dict[str, bytes] | None = None) -> dict[str, Image.Image]:
    result = {}
    for page in runtime["pages"]:
        data = outputs[page["data"]] if outputs is not None else (folder / page["data"]).read_bytes()
        blob = outputs[page["image"]] if outputs is not None else (folder / page["image"]).read_bytes()
        atlas = json.loads(data)
        with Image.open(io.BytesIO(blob)) as opened:
            sheet = opened.convert("RGBA")
        for key in atlas["frames"]:
            result[key] = image_box(sheet, atlas, key)
    return result


def frame_record(image: Image.Image, attachment: dict) -> dict:
    return {"size": list(image.size), "preparedRuntimeRgbaSha256": digest(image.tobytes()), "root": attachment["root"], "sockets": attachment.get("sockets", {}), "attachment": attachment}


def main() -> None:
    timestamp = datetime.now().strftime("%m%d-%H%M%S-%f")
    baseline = ROSTER / f"baseline/first-pair-backholding-1009-{timestamp}"
    candidate = ROSTER / f"candidate/aokiji-backholding-1009-{timestamp}"
    baseline.mkdir(exist_ok=False)
    candidate.mkdir(exist_ok=False)
    (baseline / "README.md").write_text(
        "# First-pair exact rollback snapshot1009\n\n"
        "copy-before1009.json lists only the two existing anime folders and their two author manifests, "
        "plus the new own-source catalog. It precedes copying. copy-after1009.json verifies every exact byte/hash. "
        "No whole-repository copy, deletion, move, public publish or old-character write occurs. "
        "files/ retains complete prior runtime pages including UI/README and both manifests for rollback.\n",
        encoding="utf-8",
    )
    (candidate / "README.md").write_text(
        "# Aokiji independent backholding candidate1009\n\n"
        "source-registration and six static pairs precede adoption. outputs/ contains exactly the assembled anime output. "
        "The author change replaces only the connected back-hold crop;22/8/15 timing and canonical scale stay unchanged. "
        "unchanged-logical-frames1009.json proves every unaffected prior runtime frame's prepared RGBA, root/socket "
        "and animation mapping unchanged, including all front-body/foreground frames. "
        "PNG pages may be repacked; exact pre-change PNGs remain in the baseline. Root still performs real input/normal-speed "
        "grab/release/wall validation and central/move integration. This directory is not a public or full-character acceptance.\n",
        encoding="utf-8",
    )
    before_bytes = MANIFEST.read_bytes()
    before_author = json.loads(before_bytes)
    author = deepcopy(before_author)
    old_config = before_author["characters"][CHAR]
    config = author["characters"][CHAR]
    old_back = deepcopy(config["anims"]["throw_back"])
    assert old_back["frames"] == [OLD_FRAME, "throw_back_release_1003", "throw_back_recover_1003"]
    assert old_back["throwExposures"] == [{"frame": 0, "ticks": 22}, {"frame": 1, "ticks": 8}, {"frame": 2, "ticks": 15}]
    assert old_back["exposures"] == old_back["throwExposures"]
    review = json.loads(REVIEW.read_text(encoding="utf-8"))
    assert review["rgbaReconstitutesExactly"] and len(review["pairs"]) == 6
    assert review["sourceSha256"] == EXPECTED_SOURCE and review["neutralSourceHeight"] == 824
    new_source = deepcopy(json.loads(CATALOG.read_text(encoding="utf-8"))["sources"][NEW_SOURCE])
    assert new_source["sha256"] == EXPECTED_SOURCE and new_source["unitScale"] == 407 / 824
    load_sources({NEW_SOURCE: new_source})
    assert NEW_SOURCE not in config["sources"] and NEW_FRAME not in config["frames"]
    config["sources"][NEW_SOURCE] = new_source
    old_frame = config["frames"].pop(OLD_FRAME)
    assert OLD_FRAME not in author.get("unusedReviewCrops", {})
    author.setdefault("unusedReviewCrops", {})[OLD_FRAME] = old_frame
    config["frames"][NEW_FRAME] = {
        "source": NEW_SOURCE,
        "crop": review["crop"],
        "root": review["root"],
        "sockets": review["sockets"],
        "transparency": {"mode": "source-alpha"},
        "foregroundPolygon": review["foregroundConfig"]["foregroundPolygon"],
        "foregroundNote": "Reviewed original near forearm/palm only; source body+foreground exact RGBA reconstitution before and after common resampling. Far palm/fingers and cape remain body. No pixel painting, displacement or pose scale.",
        "note": "Independent official backholding requested1004, original retrieved1008 and statically reviewed at measured shoe-axis576/816, neutralH824, roots0/30. All old front mappings and character scale retained. Static review is not game input/grab/release acceptance.",
    }
    config["anims"]["throw_back"]["frames"][0] = NEW_FRAME
    assert config["scale"] == old_config["scale"] and config["textureDensity"] == old_config["textureDensity"]
    assert all(config["sources"][key] == source for key, source in old_config["sources"].items())
    assert all(config["frames"][key] == frame for key, frame in old_config["frames"].items() if key != OLD_FRAME)
    assert author["unusedReviewCrops"][OLD_FRAME] == old_config["frames"][OLD_FRAME]
    assert all(config["anims"][key] == anim for key, anim in old_config["anims"].items() if key != "throw_back")
    after_bytes = encode(author)
    outputs, report = build_character(CHAR, config, digest(after_bytes))
    folder = ROOT / "public/assets/characters/aokiji/anime"
    old_runtime_bytes = (folder / "runtime.json").read_bytes()
    old_runtime = json.loads(old_runtime_bytes)
    new_runtime = json.loads(outputs["runtime.json"])
    before_frames = runtime_frames(folder, old_runtime)
    after_frames = runtime_frames(folder, new_runtime, outputs)
    replaced = "aokiji/throw_back/0"
    equal_rows = []
    changed_rows = []
    for key, before_image in before_frames.items():
        before = frame_record(before_image, old_runtime["attachments"][key])
        assert key in after_frames
        after = frame_record(after_frames[key], new_runtime["attachments"][key])
        if key == replaced:
            changed_rows.append({"frame": key, "before": before, "after": after, "reason": "reviewed independent connected backholding replacement"})
            continue
        assert before == after, f"Unrelated existing frame changed: {key}"
        equal_rows.append({"frame": key, "preparedRgbaEqual": True, "rootSocketsAttachmentEqual": True, **after})
    assert len(changed_rows) == 1
    assert new_runtime["foregroundFrames"][replaced] == replaced + "/foreground"
    assert old_runtime["anims"] == new_runtime["anims"], "Runtime frame counts/timing/phases must remain exactly unchanged"
    assert all(new_runtime["foregroundFrames"][key] == value for key, value in old_runtime["foregroundFrames"].items())
    check = {"sourceCharacter": CHAR, "existingFramesCompared": len(equal_rows), "unchangedFrames": equal_rows, "explicitlyReplaced": changed_rows, "allOldRuntimeAnimationsUnchanged": True, "frontAuthorMappingUnchanged": config["anims"]["throw_fwd"] == old_config["anims"]["throw_fwd"], "sourceCanonicalScaleUnchanged": config["scale"] == old_config["scale"], "oldDisconnectedBackCropPreservedExactlyInUnusedReviewCrops": True, "newForegroundFrame": replaced + "/foreground", "newSourceUnitScale": new_source["unitScale"], "newSourceHash": EXPECTED_SOURCE}
    save_new(candidate / "unchanged-logical-frames1009.json", check)
    save_new(candidate / "author-change1009.json", {"beforeSha256": digest(before_bytes), "afterSha256": digest(after_bytes), "beforeConnectedBackFrame": OLD_FRAME, "afterConnectedBackFrame": NEW_FRAME, "timing": old_back["throwExposures"], "scale": config["scale"], "textureDensity": config["textureDensity"], "newSourceUnitScale": new_source["unitScale"]})
    runtime_inputs = [path for cid in ("aokiji", "shanks") for path in sorted((ROOT / f"public/assets/characters/{cid}/anime").iterdir()) if path.is_file()]
    all_inputs = runtime_inputs + [MANIFEST, ROOT / "scripts/roster_shanks_manifest0929.json", CATALOG]
    inventory = [{"file": path.as_posix(), "relative": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": digest(path.read_bytes())} for path in all_inputs]
    save_new(baseline / "copy-before1009.json", inventory)
    for row in inventory:
        source = Path(row["file"])
        target = baseline / "files" / row["relative"]
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as stream:
            stream.write(source.read_bytes())
        assert target.stat().st_size == row["bytes"] and digest(target.read_bytes()) == row["sha256"]
    save_new(baseline / "copy-after1009.json", [{**row, "copySha256": digest((baseline / "files" / row["relative"]).read_bytes()), "equal": True} for row in inventory])
    output_dir = candidate / "outputs"
    output_dir.mkdir(exist_ok=False)
    for name, blob in outputs.items():
        with (output_dir / name).open("xb") as stream:
            stream.write(blob)
        assert (output_dir / name).read_bytes() == blob
    save_new(candidate / "assembled-output-inventory1009.json", [{"file": name, "bytes": len(blob), "sha256": digest(blob)} for name, blob in outputs.items()])
    for row in inventory:
        assert digest(Path(row["file"]).read_bytes()) == row["sha256"], f"Live input changed during candidate assembly/backup: {row['relative']}"
    assert MANIFEST.read_bytes() == before_bytes and (folder / "runtime.json").read_bytes() == old_runtime_bytes
    MANIFEST.write_bytes(after_bytes)
    for name, blob in outputs.items():
        (folder / name).write_bytes(blob)
        assert (folder / name).read_bytes() == blob
    assert MANIFEST.read_bytes() == after_bytes
    protected_shanks = [row for row in inventory if "/shanks/" in row["file"] or row["relative"] == "scripts/roster_shanks_manifest0929.json"]
    for row in protected_shanks:
        assert digest(Path(row["file"]).read_bytes()) == row["sha256"]
    old_pngs = {row["relative"]: row["sha256"] for row in inventory if "/aokiji/anime/" in row["relative"] and row["relative"].endswith(".png")}
    page_changes = [{"file": name, "oldSha256": old_pngs.get(f"public/assets/characters/aokiji/anime/{name}"), "newSha256": digest(blob), "same": old_pngs.get(f"public/assets/characters/aokiji/anime/{name}") == digest(blob)} for name, blob in outputs.items() if name.endswith(".png")]
    final = {"status": "independent-backholding-runtime-adopted-awaiting-root-real-input-acceptance", "adoptedAtUtc": datetime.now(timezone.utc).isoformat(), "baseline": baseline.as_posix(), "candidate": candidate.as_posix(), "backupFiles": len(inventory), "backupBytes": sum(row["bytes"] for row in inventory), "assembledOutputBytes": sum(len(blob) for blob in outputs.values()), "newAuthorSha256": digest(after_bytes), "newRuntimeSha256": digest(outputs["runtime.json"]), "source": NEW_SOURCE, "sourceHash": EXPECTED_SOURCE, "newFrame": NEW_FRAME, "newForeground": new_runtime["foregroundFrames"][replaced], "timing": new_runtime["anims"]["throw_back"]["throwExposures"], "existingUnchangedLogicalFrames": len(equal_rows), "frontFramesUnchanged": True, "pagePngByteComparisons": page_changes, "oldPngBytesRetainedInVerifiedBaseline": True, "canonicalScaleUnchanged": True, "shanksAnimeAndAuthorUnchanged": True, "coreOldFourMovesAndSelectorsNotWritten": True, "diskAfter": {drive: shutil.disk_usage(drive)._asdict() for drive in ("C:/", "D:/")}, "authoringBuildReport": report}
    save_new(candidate / "adoption1009.json", final)
    print(json.dumps({key: value for key, value in final.items() if key not in ("authoringBuildReport", "diskAfter")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
