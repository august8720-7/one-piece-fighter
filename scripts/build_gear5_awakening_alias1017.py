"""Reproduce approved Gear5 startup metadata aliases without altering base art.

Run after any base anime atlas rebuild and before delivery encoding. The old
GearSecond action and all image bytes remain unchanged; only runtime/atlas JSON
and its build receipt gain explicit aliases for already accepted source frames.
"""
from __future__ import annotations

import argparse
import copy
from datetime import datetime
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/assets/characters/luffy/anime"


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def prepare(base):
    base = Path(base).resolve()
    require(base.drive.lower() == "d:" and base.is_dir(), "Use an existing D-drive base runtime directory")
    runtime = json.loads((base / "runtime.json").read_text(encoding="utf-8"))
    report = json.loads((base / "build-report.json").read_text(encoding="utf-8"))
    require(runtime.get("characterId") == "luffy" and runtime.get("schemaVersion") == 2 and not runtime.get("formId"), "Only ordinary Luffy schema2 runtime is supported")
    original_action = copy.deepcopy(runtime["anims"]["sp_gear2"])
    require(original_action.get("frames") == 4 and original_action.get("exposures") == [{"frame": 0, "ticks": 6}, {"frame": 1, "ticks": 12}, {"frame": 2, "ticks": 4}, {"frame": 3, "ticks": 2}], "GearSecond baseline changed; inspect the real preparation again")
    files = {"runtime.json", "build-report.json", *[p[field] for p in runtime["pages"] for field in ("image", "data")]}
    require(all(Path(name).name == name for name in files), "Base pages must use local filenames")
    before = {name: (base / name).read_bytes() for name in files}
    for name in files - {"build-report.json"}:
        require(report.get("outputHashes", {}).get(name) == sha(before[name]), f"Base differs from its build receipt: {name}")
    pages = {page["id"]: page for page in runtime["pages"]}
    atlases = {page["data"]: json.loads(before[page["data"]]) for page in runtime["pages"]}
    alias_action = {**copy.deepcopy(original_action), "exposures": [{"frame": 0, "ticks": 6}, {"frame": 1, "ticks": 12}, {"frame": 2, "ticks": 4}, {"frame": 3, "ticks": 14}]}
    if "g5_awakening" in runtime["anims"]:
        require(runtime["anims"]["g5_awakening"] == alias_action, "Existing awakening differs; do not overwrite a different action")
    mapping, touched = [], set()
    for index in range(4):
        source, target = f"luffy/sp_gear2/{index}", f"luffy/g5_awakening/{index}"
        page = pages[runtime["framePages"][source]]
        atlas = atlases[page["data"]]
        require(not any(target in other["frames"] for file, other in atlases.items() if file != page["data"]), "Awakening alias already exists on a different page")
        require(source in atlas["frames"] and source in runtime["attachments"], "Accepted preparation frame is missing")
        if target in atlas["frames"]:
            require(atlas["frames"][target] == atlas["frames"][source] and runtime["attachments"].get(target) == runtime["attachments"][source], "Existing awakening alias geometry differs")
        atlas["frames"][target] = copy.deepcopy(atlas["frames"][source])
        runtime["attachments"][target] = copy.deepcopy(runtime["attachments"][source])
        runtime["framePages"][target] = page["id"]
        touched.add(page["data"])
        require(source not in runtime.get("foregroundFrames", {}), "Inspect newly layered GearSecond frames before adding awakening aliases")
        mapping.append({"source": source, "target": target, "page": page["id"], "rect": atlas["frames"][source]["frame"]})
    runtime["anims"]["g5_awakening"] = alias_action
    require(runtime["anims"]["sp_gear2"] == original_action, "Original GearSecond action changed")
    outputs = {"runtime.json": encode(runtime), **{name: encode(atlases[name]) for name in sorted(touched)}}
    images = {page["image"]: sha(before[page["image"]]) for page in runtime["pages"]}
    report["awakeningMetadataAlias1017"] = {
        "script": {"file": "scripts/build_gear5_awakening_alias1017.py", "sha256": sha(Path(__file__).read_bytes())},
        "meaning": "accepted original preparation reused, not newly generated awakening artwork",
        "sourceAction": "sp_gear2", "sourceActionSha256": sha(encode(original_action)),
        "sourceActionTicks": 24, "visibleBaseTicks": "0..23", "whiteFormTicks": "24..35",
        "mapping": mapping, "preservedImageSha256": images,
    }
    report["outputHashes"].update({name: sha(data) for name, data in outputs.items()})
    outputs["build-report.json"] = encode(report)
    return base, before, outputs, images


def apply(base, backup_root=None, check=False):
    base, before, outputs, images = prepare(base)
    changed = {name: data for name, data in outputs.items() if before[name] != data}
    summary = {"base": str(base), "checkOnly": check, "changedMetadata": list(changed), "preservedImageSha256": images,
               "sourceActionPreserved": True, "newOriginalArt": False, "formAccepted": False}
    if check or not changed:
        return summary
    require(backup_root is not None, "--apply requires an explicit --backup-dir")
    root = Path(backup_root).resolve()
    require(root.drive.lower() == "d:" and not root.is_relative_to((ROOT / "public/assets").resolve()), "Backup must remain on D outside runtime assets")
    root.mkdir(parents=True, exist_ok=True)
    if not (root / "README.md").exists():
        (root / "README.md").write_text("# Awakening alias baselines\nUnique children preserve metadata and all original image hashes/copies before alias insertion.\n", encoding="utf-8")
    backup = root / (datetime.now().strftime("%Y%m%d-%H%M%S-%f") + "-awakening-alias")
    backup.mkdir()
    (backup / "README.md").write_text("# Base awakening metadata baseline\nExplicit inventory before verified copies; PNGs and old GearSecond data are protected.\n", encoding="utf-8")
    inventory = [{"file": name, "bytes": len(data), "sha256": sha(data)} for name, data in sorted(before.items())]
    (backup / "copy-before.json").write_bytes(encode(inventory))
    for name, data in before.items():
        require((base / name).read_bytes() == data, f"Base changed concurrently: {name}")
        shutil.copyfile(base / name, backup / name)
        require((backup / name).read_bytes() == data, f"Backup mismatch: {name}")
    (backup / "copy-after.json").write_bytes(encode(inventory))
    for name, data in before.items():
        require((base / name).read_bytes() == data, f"Base changed after backup: {name}")
    for name, data in changed.items():
        (base / name).write_bytes(data)
        require((base / name).read_bytes() == data, f"Written alias metadata mismatch: {name}")
    require(all(sha((base / name).read_bytes()) == digest for name, digest in images.items()), "Base image changed unexpectedly")
    again = prepare(base)[2]
    require(all((base / name).read_bytes() == data for name, data in again.items()), "Alias generation is not idempotent")
    return {**summary, "backup": str(backup), "backupVerified": True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, default=BASE)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    args = parser.parse_args()
    print(json.dumps(apply(args.base, args.backup_dir, not args.apply), ensure_ascii=False))


if __name__ == "__main__":
    main()
