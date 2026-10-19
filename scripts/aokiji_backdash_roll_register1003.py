"""Explicit static ingestion of the observed aokiji backdash/roll original.

No generation, rotation, mirroring, per-pose scale or combat edits. The neutral
reference stays unused; the two rolls explicitly share the real compressed pose.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

from PIL import Image, ImageDraw

PROJECT = Path(__file__).resolve().parents[1]
MANIFEST = PROJECT / "scripts/roster_aokiji_manifest0929.json"
CATALOG = PROJECT / "scripts/roster_marine_sources0929.json"
EVIDENCE = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-backdash-roll1003")
KEY = "aokiji_backdash_roll_1003"
HASH = "4f202b46f5c7358898fd089469ba43fc2defedb2f08f0e9491c2a6dad2642fcb"

# Rectangles preserve real source art, independently of the inaccurate 418px grid.
# Grounded roots are defined from visible soles; coiled roots use the lowest
# shoulder/back-cloth contact plane. Socket labels do not claim attack contact.
POSES = {
    "backdash_start_1003": {"cell": 2, "crop": [450, 20, 416, 429], "root": [256, 407], "sockets": {"near_sole": [153, 406], "far_sole": [359, 405]}, "note": "Independent backward-lean preparation. Root is centered between the visible shoes, on the sole ground line."},
    "backdash_hop_1003": {"cell": 3, "crop": [870, 0, 374, 455], "root": [216, 447], "sockets": {"planted_sole": [216, 445], "raised_shoe": [218, 338]}, "note": "Independent knee-withdrawal pose, face stays right. One shoe planted; cape extends left as authored. Real lateral retreat and normal-speed continuity remain to be checked."},
    "backdash_settle_1003": {"cell": 4, "crop": [0, 444, 413, 400], "root": [230, 391], "sockets": {"near_sole": [116, 389], "far_sole": [343, 382]}, "note": "Independent two-shoe settlement, ground defined by visible lower sole rather than resizing to a neutral height."},
    "roll_compress_1003": {"cell": 5, "crop": [452, 528, 407, 317], "root": [246, 310], "sockets": {"near_sole": [134, 309], "far_sole": [359, 303]}, "note": "True newly drawn low compressed preparation, shared explicitly by forward and backward rolls. Not a duplicated independent backward pose."},
    "roll_fwd_coil_1003": {"cell": 6, "crop": [895, 515, 352, 330], "root": [214, 319], "sockets": {"lower_shoulder": [224, 310], "visible_shoe": [59, 101]}, "note": "True rightward coiled body from original. Root at the low shoulder/back-cloth contact plane; overlapping shoe contours are not given invented separate coordinates. No rotation or mirror applied."},
    "roll_fwd_rise_1003": {"cell": 7, "crop": [0, 900, 416, 342], "root": [227, 321], "sockets": {"planted_sole": [227, 320], "lower_fingertips": [377, 303]}, "note": "Independent front-roll rising pose. Visible lower fingertips are above the shoe plane; root stays at the planted shoe and is not pulled to force a palm-ground contact."},
    "roll_back_coil_1003": {"cell": 8, "crop": [431, 897, 408, 333], "root": [204, 301], "sockets": {"lower_back": [204, 299], "near_shoe": [326, 54], "far_shoe": [343, 109]}, "note": "True separately drawn back-roll coiled body, face looking right/up. Ground plane comes from low back-cloth contact. Not a mirror of forward roll."},
    "roll_back_rise_1003": {"cell": 9, "crop": [841, 900, 413, 345], "root": [173, 330], "sockets": {"planted_sole": [173, 329], "folded_shoe": [140, 270], "lower_fingertips": [391, 297]}, "note": "Independent back-roll rising pose. Shoe defines ground; lower fingers remain above that plane. Forward torso/head offset must be checked in the real game; no root fitting to hurtboxes."},
}


def sha(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def save(path: Path, data) -> None:
    with path.open("x", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    manifest_bytes = MANIFEST.read_bytes()
    manifest = json.loads(manifest_bytes)
    character = manifest["characters"]["aokiji"]
    assert not any(name in character["frames"] for name in POSES), "Already registered; do not repeat"
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    source = json.loads(json.dumps(catalog["sources"][KEY]))
    image_path = PROJECT / source["file"]
    assert sha(image_path.read_bytes()) == HASH == source["sha256"]
    source_image = Image.open(image_path).convert("RGBA")
    source_image.load()
    assert source_image.size == (1254, 1254)
    neutral = source_image.crop((0, 0, 418, 447))
    neutral64 = neutral.getchannel("A").point(lambda a: 255 if a >= 64 else 0).getbbox()
    neutral_height = neutral64[3] - neutral64[1]
    assert neutral_height == 429
    baseline_height = 407
    source["unitScale"] = baseline_height / neutral_height
    source["scaleBasis"] = "One neutral reference at source cell1, crop[0,0,418,447], alpha>=64 bbox[25,11,379,440], height429px against established basic neutral407px. Every backdash/roll pose shares407/429; no per-pose rescale or hurtbox fitting."
    character["sources"][KEY] = source
    save(EVIDENCE / "manifest-before.json", {"file": str(MANIFEST), "sha256": sha(manifest_bytes), "bytes": len(manifest_bytes)})
    (EVIDENCE / "authoring-before.json").write_bytes(manifest_bytes)
    world_scale = character["scale"] * source["unitScale"] / 2
    rows = []
    for name, pose in POSES.items():
        frame = {"source": KEY, "crop": pose["crop"], "root": pose["root"], "sockets": pose["sockets"], "transparency": {"mode": "source-alpha"}, "note": pose["note"]}
        x, y, w, h = frame["crop"]
        cut = source_image.crop((x, y, x + w, y + h))
        alpha = cut.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
        assert bbox and all(value > 0 for value in [bbox[0], bbox[1], w - bbox[2], h - bbox[3]]), (name, bbox)
        character["frames"][name] = frame
        white = Image.new("RGBA", cut.size, "white"); white.alpha_composite(cut)
        draw = ImageDraw.Draw(white)
        rx, ry = frame["root"]
        draw.line((rx - 7, ry, rx + 7, ry), fill="red", width=2)
        draw.line((rx, ry - 7, rx, ry + 7), fill="red", width=2)
        draw.text((5, 5), name, fill="black")
        for socket, (sx, sy) in frame["sockets"].items():
            draw.ellipse((sx - 3, sy - 3, sx + 3, sy + 3), outline="blue", width=2)
        white.convert("RGB").save(EVIDENCE / (name + "-root-review1003.png"))
        rows.append({"frame": name, "sourceCell": pose["cell"], "crop": frame["crop"], "root": frame["root"], "alpha16Bbox": bbox, "sourceMarginsAlpha16": [bbox[0], bbox[1], w - bbox[2], h - bbox[3]], "socketsSourceLocal": frame["sockets"], "socketsWorldRelativeToRoot": {socket: [round((p[0] - rx) * world_scale, 4), round((p[1] - ry) * world_scale, 4)] for socket, p in frame["sockets"].items()}, "note": pose["note"]})
    def anim(frames, ticks):
        return {"frames": frames, "loop": False, "exposures": [{"frame": index, "ticks": duration} for index, duration in enumerate(ticks)]}
    character["anims"]["backdash"] = anim(["backdash_start_1003", "backdash_hop_1003", "backdash_settle_1003"], [4, 8, 8])
    character["anims"]["roll_fwd"] = anim(["roll_compress_1003", "roll_fwd_coil_1003", "roll_fwd_rise_1003"], [6, 13, 10])
    character["anims"]["roll_back"] = anim(["roll_compress_1003", "roll_back_coil_1003", "roll_back_rise_1003"], [6, 13, 10])
    manifest.setdefault("unusedReviewCrops", {})["aokiji_backdash_roll_neutral_reference_1003"] = {"source": KEY, "reason": "Cell1 only sets sheet-wide neutral scale; existing idle is kept. Does not count as new runtime pose.", "regions": [[0, 0, 418, 447]], "alpha64Box": list(neutral64), "sourceHash": HASH}
    assert MANIFEST.read_bytes() == manifest_bytes, "Manifest changed during static registration"
    encoded = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    MANIFEST.write_bytes(encoded)
    measurement = {"status": "static-candidate-not-normal-speed-or-gameplay-acceptance", "sourceKey": KEY, "sourceSha256": HASH, "sourceNeutralAlpha64Height": neutral_height, "baselineHeight": baseline_height, "sourceUnitScale": source["unitScale"], "worldPixelsPerSourcePixel": world_scale, "worldScaleMeaning": "character.scale * sourceUnitScale * UI_SCALE/RENDER_SCALE; UI_SCALE/RENDER_SCALE = 1/2, textureDensity cancels", "pointPrecision": "Manually inspected semantic shoe/contact points, approximately5 source pixels; not automatic contact detection", "newUniqueRuntimeCrops": 8, "newStates": {"backdash": {"ticks": [4, 8, 8], "total": 20}, "roll_fwd": {"ticks": [6, 13, 10], "total": 29}, "roll_back": {"ticks": [6, 13, 10], "total": 29}}, "sharedRealPose": {"frame": "roll_compress_1003", "sourceCell": 5, "animations": ["roll_fwd", "roll_back"], "countsAsIndependentExtraPose": False}, "frames": rows, "remaining": ["normal-speed lateral retreat/roll continuity", "both facing directions", "post-invulnerability torso/hand height and hurtbox contact", "actual inputs and state capability gating"], "sourcePixelsAlteredBeforeAtlasResample": False, "poseRotationOrMirrorUsed": False, "perPoseScaleUsed": False, "manifestAfterSha256": sha(encoded), "recordedAtUtc": datetime.now(timezone.utc).isoformat()}
    save(EVIDENCE / "static-measurements1003.json", measurement)
    save(PROJECT / "docs/assets/aokiji-backdash-roll-measurements1003.json", measurement)
    print(json.dumps({"newCrops": 8, "newStates": list(measurement["newStates"]), "totalCrops": len(character["frames"]), "totalStates": len(character["anims"]), "unitScale": source["unitScale"], "worldPixelsPerSourcePixel": world_scale, "measurements": "docs/assets/aokiji-backdash-roll-measurements1003.json"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
