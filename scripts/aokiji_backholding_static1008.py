"""Pair retrieved Aokiji backholding original pixels; no runtime or front writes."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from aokiji_throw_static_pairs1004 import checks, frame as victim_frame, paste as victim_paste, socket_world
from build_anime_atlas import split_foreground


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/generated/source/roster-aokiji-independent-back-holding-1008.png"
SOURCE_SHA = "45b28d32caa687992f9affefa52e0b52e6d2d15e9dfd3a5334242a5fca0e42b3"
OUT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-independent-back-review1008/near-foreground-trial1008")
CROP = [887, 0, 887, 887]
SOURCE_ROOT = [576, 816]
HAND = [735, 702]
NEUTRAL_HEIGHT = 824
WORLD = 100 / NEUTRAL_HEIGHT
ZOOM = 4
HOLD = 30
TARGET_WORLD = [16.0327868852459, -13.180327868852459]
# Manual inspected near blue forearm, near palm, thumb and lower fingers only.
# The other hand and its fingers remain in body behind the actual victim.
NEAR_POLYGON = [
    [541, 545], [556, 547], [581, 572], [608, 604], [634, 639],
    [655, 662], [671, 677], [682, 677], [697, 672], [712, 671],
    [727, 674], [740, 676], [747, 680], [749, 685], [746, 689],
    [739, 690], [732, 687], [724, 690], [719, 695], [716, 702],
    [719, 711], [725, 719], [730, 723], [742, 728], [756, 730],
    [767, 725], [774, 721], [777, 722], [779, 727], [775, 732],
    [767, 737], [756, 741], [741, 744], [727, 741], [714, 737],
    [701, 732], [689, 725], [679, 716], [667, 703], [655, 696],
    [646, 684], [628, 667], [608, 646], [585, 621], [564, 594],
    [548, 567],
]


def sha(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def save_new(path: Path, value: object) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


def paste_caster(canvas: Image.Image, pixels: Image.Image, axis: list[int], facing: int) -> None:
    factor = WORLD * ZOOM
    shown = pixels if facing == 1 else ImageOps.mirror(pixels)
    rx = SOURCE_ROOT[0] * factor if facing == 1 else shown.width - SOURCE_ROOT[0] * factor
    canvas.alpha_composite(shown, (round(axis[0] - rx), round(axis[1] - SOURCE_ROOT[1] * factor)))


def main() -> None:
    OUT.mkdir(exist_ok=False)
    (OUT / "README.md").write_text(
        "# Aokiji independent backholding near-foreground trial1008\n\n"
        "Every character pixel derives from the preserved45b28d original. The source and prepared body+foreground "
        "must reconstitute their original RGBA bytes exactly. Foreground selects the real near forearm/palm only; "
        "far hand, clothing and cape remain body. No source pixels are painted, moved or scaled per pose. "
        "Uniform scale uses the measured standing height824. Shoe support root576,816 is observed independently "
        "of the canonical hand target. Three legacy representative victims are paired in both orientations at roots0/30. "
        "This is static review only, not game grab/release/wall acceptance. All original front/runtime/core files are untouched.\n",
        encoding="utf-8",
    )
    blob = SOURCE.read_bytes()
    assert sha(blob) == SOURCE_SHA
    original = Image.open(SOURCE).convert("RGBA").crop((887, 0, 1774, 887))
    config = {"crop": CROP, "foregroundPolygon": NEAR_POLYGON, "foregroundNote": "Manual original near forearm/palm selection; the far palm/fingers and all cloak/pants remain body. Static trial, not adopted."}
    raw_body, raw_fore, raw_stats = split_foreground(original, config)
    assert Image.alpha_composite(raw_body, raw_fore).tobytes() == original.tobytes()
    raw_body.save(OUT / "original-body-partition1008.png")
    raw_fore.save(OUT / "original-near-forearm-palm1008.png")
    prepared = original.resize((round(original.width * WORLD * ZOOM), round(original.height * WORLD * ZOOM)), Image.Resampling.LANCZOS)
    body, fore, prepared_stats = split_foreground(prepared, config)
    assert Image.alpha_composite(body, fore).tobytes() == prepared.tobytes()
    body.save(OUT / "prepared-body1008.png")
    fore.save(OUT / "prepared-near-forearm-palm1008.png")
    overlay = Image.new("RGBA", original.size, "white")
    overlay.alpha_composite(original)
    tint = Image.new("RGBA", original.size, "#138e47")
    tint.putalpha(raw_fore.getchannel("A").point(lambda a: 128 if a else 0))
    overlay.alpha_composite(tint)
    overlay.convert("RGB").save(OUT / "near-foreground-selection-overlay1008.png")
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 17)
    small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 14)
    hand_world = [(HAND[i] - SOURCE_ROOT[i]) * WORLD for i in (0, 1)]
    target_source = [SOURCE_ROOT[i] + TARGET_WORLD[i] / WORLD for i in (0, 1)]
    rows = []
    panels = []
    for cid, kind in [("labubu", "small legacy"), ("luffy", "ordinary legacy"), ("akainu", "larger available adult legacy")]:
        victim = victim_frame(cid, "held_leg_flip")
        victim_grip = socket_world(victim, "grip")
        for facing in (1, -1):
            axis = [340 if facing == 1 else 660, 520]
            victim_axis = [axis[0] + HOLD * facing * ZOOM, axis[1]]
            canvas = Image.new("RGBA", (1000, 650), "#f5f4ef")
            draw = ImageDraw.Draw(canvas)
            draw.line((30, axis[1], 970, axis[1]), fill="#87949c", width=2)
            draw.text((18, 15), f'Aokiji actual independent BACK / {cid} / facing{facing}', font=font, fill="#243d4b")
            draw.text((18, 43), "Original body < actual victim < original near forearm/palm. STATIC REVIEW ONLY", font=small, fill="#576d7b")
            paste_caster(canvas, body, axis, facing)
            victim_paste(canvas, victim["body"], victim["density"], victim_axis, -facing)
            paste_caster(canvas, fore, axis, facing)
            target = [HOLD * facing - facing * victim_grip[0], victim_grip[1]]
            actual = [facing * hand_world[0], hand_world[1]]
            draw = ImageDraw.Draw(canvas)
            draw.text((18, 561), f"C centre({actual[0]:.4f},{actual[1]:.4f}) / true ankle({target[0]:.4f},{target[1]:.4f})", font=small, fill="#243d4b")
            draw.text((18, 592), "Measured shoes511/641; rear floor816, front floor808; common standing100/824", font=small, fill="#576d7b")
            filename = OUT / f"held_leg_flip-{cid}-face{facing}-foreground1008.png"
            canvas.convert("RGB").save(filename)
            contact_x = round(axis[0] + target[0] * ZOOM)
            contact_y = round(axis[1] + target[1] * ZOOM)
            canvas.crop((contact_x - 65, contact_y - 60, contact_x + 65, contact_y + 60)).resize((520, 480), Image.Resampling.NEAREST).convert("RGB").save(OUT / f"held_leg_flip-{cid}-face{facing}-contact1008.png")
            panels.append(canvas.convert("RGB"))
            delta = [actual[i] - target[i] for i in (0, 1)]
            rows.append({"victim": cid, "representative": kind, "attackerFacing": facing, "victimFacing": -facing, "reaction": "held_leg_flip", "candidateHoldOffset": HOLD, "rootWorld": [0, 0], "victimRootWorld": [30 * facing, 0], "sourceRoot": SOURCE_ROOT, "handWorld": actual, "targetWorld": target, "deltaHandMinusTarget": delta, "distanceWorld": math.hypot(*delta), "victimFrame": victim["name"], "diagnosticFile": filename.as_posix(), "runtimeOrMovesChanged": False})
    montage = Image.new("RGB", (2000, 1950), "white")
    for index, panel in enumerate(panels):
        montage.paste(panel, (index % 2 * 1000, index // 2 * 650))
    montage.save(OUT / "three-representatives-both-facings1008.jpg", quality=94)
    annotated = Image.new("RGBA", original.size, "white")
    annotated.alpha_composite(original)
    draw = ImageDraw.Draw(annotated)
    for point, color in [(HAND, "#c34036"), (target_source, "#138e47")]:
        x, y = point
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), outline=color, width=2)
        draw.line((x - 13, y, x + 13, y), fill=color, width=2)
        draw.line((x, y - 13, x, y + 13), fill=color, width=2)
    draw.line((*HAND, *target_source), fill="#138e47", width=2)
    annotated.convert("RGB").save(OUT / "actual-hand-target-marks1008.png")
    for path, digest in checks.items():
        assert sha(Path(path).read_bytes()) == digest
    assert SOURCE.read_bytes() == blob
    report = {"status": "static-original-pixel-trial-awaiting-visual-decision", "checkedAtUtc": datetime.now(timezone.utc).isoformat(), "source": SOURCE.relative_to(ROOT).as_posix(), "sourceSha256": SOURCE_SHA, "crop": CROP, "root": SOURCE_ROOT, "rootBasis": "Observed actual rear shoe sole centre511 and front641, midpoint576; floor is lower rear shoe alpha64 boundary816. Front shoe floor808 is recorded, not averaged away or relocated. Manual landmarks approx+/-3 source px.", "sockets": {"grip": HAND, "near_palm": HAND, "sole_back": [511, 816], "sole_front": [641, 808]}, "neutralSourceHeight": NEUTRAL_HEIGHT, "unitScale": 407 / NEUTRAL_HEIGHT, "worldPerSourcePixel": WORLD, "foregroundConfig": config, "sourceRoundTrip": raw_stats, "preparedRoundTrip": prepared_stats, "rgbaReconstitutesExactly": True, "targetWorld": TARGET_WORLD, "targetSourcePixel": target_source, "pairs": rows, "legacyInputHashes": checks, "runtimeAuthorOrFrontChanged": False, "assembledOutputBytes": None, "actualReviewFilesBytes": sum(path.stat().st_size for path in OUT.iterdir() if path.is_file())}
    save_new(OUT / "static-review1008.json", report)
    print(json.dumps({"handWorld": hand_world, "targetSource": target_source, "deltaWorld": [hand_world[i] - TARGET_WORLD[i] for i in (0, 1)], "rawAndPreparedExact": True, "pairs": len(rows), "reviewDir": OUT.as_posix()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
