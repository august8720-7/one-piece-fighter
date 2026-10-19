"""Explicit R/F/G body page intake; combat and central FX stay untouched."""
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
EVIDENCE = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-rfg1003")
KEY = "aokiji_rfg_body_1003"
HASH = "cd3b53d8fcda548ee3799469e46963934c585ab129f9c3583951d3e582c482d2"
POSES = {
    "uplift_start_1003": {"cell": 1, "crop": [0, 0, 412, 455], "root": [226, 447], "sockets": {}},
    "uplift_active_1003": {"cell": 2, "crop": [424, 0, 416, 455], "root": [204, 447], "sockets": {"fist": [349, 43], "ice_tip": [378, 15], "forearm": [328, 82]}},
    "uplift_recover_1003": {"cell": 3, "crop": [849, 30, 402, 425], "root": [217, 417], "sockets": {}},
    "spike_start_1003": {"cell": 4, "crop": [0, 476, 416, 379], "root": [220, 371], "sockets": {}},
    "spike_release_1003": {"cell": 5, "crop": [424, 530, 416, 310], "root": [220, 282], "sockets": {"pressed_palm": [201, 269], "pressed_fingertips": [194, 281], "front_sole": [335, 281]}},
    "spike_recover_1003": {"cell": 6, "crop": [850, 450, 402, 404], "root": [220, 397], "sockets": {}},
    "mirror_start_1003": {"cell": 7, "crop": [0, 857, 418, 397], "root": [224, 386], "sockets": {}},
    "mirror_active_1003": {"cell": 8, "crop": [418, 857, 442, 397], "root": [220, 386], "sockets": {"palm_forward": [400, 82], "fingertips": [404, 55], "front_sole": [360, 381]}},
    "mirror_recover_1003": {"cell": 9, "crop": [864, 860, 390, 394], "root": [222, 383], "sockets": {}},
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    with Path(path).open("x", encoding="utf-8") as out:
        json.dump(value, out, ensure_ascii=False, indent=2)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    before = MANIFEST.read_bytes()
    manifest = json.loads(before)
    character = manifest["characters"]["aokiji"]
    assert not any(name in character["frames"] for name in POSES), "Already registered; preserve existing record"
    source = json.loads(json.dumps(json.loads(CATALOG.read_text(encoding="utf-8"))["sources"][KEY]))
    path = PROJECT / source["file"]
    assert source["sha256"] == HASH == sha(path.read_bytes())
    original = Image.open(path).convert("RGBA"); original.load()
    reference = original.crop((0, 0, 412, 455)).getchannel("A").point(lambda a: 255 if a >= 64 else 0).getbbox()
    height = reference[3] - reference[1]
    assert height == 413
    source["unitScale"] = 407 / height
    source["scaleBasis"] = "One full standing R startup reference cell1, crop[0,0,412,455], alpha>=64 bbox[20,34,385,447], height413px against existing neutral407px. All9RFG poses share407/413, including kneeling and wide stances; no row/per-pose fitting."
    character["sources"][KEY] = source
    (EVIDENCE / "authoring-before.json").write_bytes(before)
    save(EVIDENCE / "manifest-before.json", {"file": str(MANIFEST), "sha256": sha(before), "bytes": len(before)})
    world_scale = character["scale"] * source["unitScale"] / 2
    rows = []
    for name, pose in POSES.items():
        frame = {"source": KEY, "crop": pose["crop"], "root": pose["root"], "sockets": pose["sockets"], "transparency": {"mode": "source-alpha"}, "note": "True independent original RFG body pose; one sheet-wide neutral scale and visible shoe-ground root. Independent FX and actual hit/reflect contact are not accepted by this static registration."}
        x, y, w, h = pose["crop"]
        cut = original.crop((x, y, x + w, y + h))
        box16 = cut.getchannel("A").point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert box16 and all(v > 0 for v in [box16[0], box16[1], w - box16[2], h - box16[3]]), (name, box16)
        character["frames"][name] = frame
        rx, ry = pose["root"]
        white = Image.new("RGBA", cut.size, "white"); white.alpha_composite(cut)
        draw = ImageDraw.Draw(white)
        draw.line((rx - 7, ry, rx + 7, ry), fill="red", width=2); draw.line((rx, ry - 7, rx, ry + 7), fill="red", width=2)
        for point_name, (sx, sy) in pose["sockets"].items():
            draw.ellipse((sx - 3, sy - 3, sx + 3, sy + 3), outline="blue", width=2)
        draw.text((5, 5), name, fill="black")
        white.convert("RGB").save(EVIDENCE / (name + "-root-review1003.png"))
        rows.append({"frame": name, "sourceCell": pose["cell"], "crop": pose["crop"], "root": pose["root"], "alpha16Bbox": box16, "marginAlpha16": [box16[0], box16[1], w - box16[2], h - box16[3]], "socketsSourceLocal": pose["sockets"], "socketsWorldRelativeToRoot": {point_name: [round((p[0] - rx) * world_scale, 4), round((p[1] - ry) * world_scale, 4)] for point_name, p in pose["sockets"].items()}})
    animations = {
        "sp_ice_uplift": (["uplift_start_1003", "uplift_active_1003", "uplift_recover_1003"], [9, 6, 27]),
        "sp_ice_spike": (["spike_start_1003", "spike_release_1003", "spike_recover_1003"], [17, 5, 27]),
        "sp_ice_mirror": (["mirror_start_1003", "mirror_active_1003", "mirror_recover_1003"], [7, 14, 25]),
    }
    for move, (names, ticks) in animations.items():
        character["anims"][move] = {"frames": names, "loop": False, "exposures": [{"frame": i, "ticks": duration} for i, duration in enumerate(ticks)]}
    encoded = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    assert MANIFEST.read_bytes() == before, "Other writer changed manifest"
    MANIFEST.write_bytes(encoded)
    measurements = {"status": "static-body-candidate-not-FX-or-game-contact-acceptance", "sourceKey": KEY, "sourceSha256": HASH, "sourceNeutralAlpha64Height": height, "sourceUnitScale": source["unitScale"], "worldPixelsPerSourcePixel": world_scale, "pointPrecision": "approximately5 original source pixels, manual visual semantic points", "frames": rows, "moveTiming": {move: {"ticks": ticks, "total": sum(ticks)} for move, (_, ticks) in animations.items()}, "releaseFrameF": 17, "rootSourcePixelsUnchanged": True, "perPoseScaleOrRotationUsed": False, "newUniqueCrops": 9, "totalCrops": len(character["frames"]), "totalAnimationItems": len(character["anims"]), "knownDifferences": ["R fist/ice top lies around-98/-105 world, original hitbox extends to-142: root must calibrate visible FX/hitbox; body art alone does not cover it", "F fingertips reach local caster ground; far90world spike is independent FX, not present in body sheet", "G wide stance appears lower than neutral; keep one source-wide scale, do not enlarge row", "Startup/recovery return to guarded stances; real recovery occupation/readability remains gameplay review"], "manifestAfterSha256": sha(encoded), "recordedAtUtc": datetime.now(timezone.utc).isoformat()}
    save(EVIDENCE / "measurements1003.json", measurements)
    save(PROJECT / "docs/assets/aokiji-rfg-measurements1003.json", measurements)
    print(json.dumps({"newCrops": 9, "skillBodyCoverage": "5/9", "totalCrops": len(character["frames"]), "animations": len(character["anims"]), "worldPixelsPerSourcePixel": world_scale, "measurements": "docs/assets/aokiji-rfg-measurements1003.json"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
