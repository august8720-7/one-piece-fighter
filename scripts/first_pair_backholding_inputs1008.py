"""Create contact guides only; never writes character art, author tables or runtime.

The marked Shanks reference retains the existing b07 PNG's canvas coordinates.
Its red/green points are instructions for the official web image editor, not art.
Aokiji's diagram is an abstract pose topology, not a proposed runtime drawing.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/reference/first-pair-backholding-1008")
SOURCE = ROOT / "public/assets/generated/source/roster-shanks-independent-back-holding-1004.png"
SOURCE_SHA = "b07cbc515b926580340f0b7d7fe2bc5cc90084b0a1c2a08ae5e58a670aef3b13"
TARGET_WORLD = (16.0327868852459, -13.180327868852459)
SOURCE_ROOT = (1255, 968)
OLD_HAND = (1470, 850)
WORLD_PER_SOURCE_PIXEL = 94 / 983


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path: Path, text: str) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        stream.write(text)


def main() -> None:
    assert sha(SOURCE) == SOURCE_SHA
    OUT.mkdir(exist_ok=False)
    write_new(
        OUT / "README.md",
        "# First-pair backholding contact inputs 1008\n\n"
        "This folder contains posture/contact guides only. Red/green marks and abstract bones never enter runtime art. "
        "The original PNG remains unchanged in the project source directory. The original standing ruler, shoe axis, "
        "face, clothing, one-arm Shanks identity and source-wide scale must be preserved by the web image editor. "
        "Existing accepted front throws are not candidates for back-throw reuse.\n\n"
        "shanks-back-contact-marked1008.png retains b07's original canvas coordinate system. "
        "aokiji-back-posture-guide1008.png is an abstract pose topology only. "
        "inputs1008.json records real input/output hashes, measured byte counts and the contact calculation; "
        "future new-source output size remains unknown until actually assembled. All old sources and failed trials are preserved.\n",
    )
    target = tuple(SOURCE_ROOT[i] + TARGET_WORLD[i] / WORLD_PER_SOURCE_PIXEL for i in range(2))
    with Image.open(SOURCE) as source:
        original = source.convert("RGBA")
    background = Image.new("RGBA", original.size, "#f5f4ef")
    background.alpha_composite(original)
    reference = background.convert("RGB")
    draw = ImageDraw.Draw(reference)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 18)
    small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 15)
    for point, colour in [(OLD_HAND, "#d82931"), (target, "#138e47")]:
        x, y = point
        draw.ellipse((x - 10, y - 10, x + 10, y + 10), outline=colour, width=3)
        draw.line((x - 14, y, x + 14, y), fill=colour, width=2)
        draw.line((x, y - 14, x, y + 14), fill=colour, width=2)
    draw.line((*OLD_HAND, *target), fill="#138e47", width=3)
    rx, ry = SOURCE_ROOT
    draw.line((rx - 10, ry, rx + 10, ry), fill="#2672b1", width=2)
    draw.line((rx, ry - 10, rx, ry + 10), fill="#2672b1", width=2)
    draw.rounded_rectangle((815, 20, 1509, 169), radius=12, fill="#ffffff", outline="#b0bcc1", width=2)
    draw.text((835, 36), "BACK HOLD: KEEP ORIGINAL FACE / CLOTHES / SHOES / SCALE", font=font, fill="#243d4b")
    draw.text((835, 69), "GREEN (1423,830) = actual other-character ankle centre", font=small, fill="#138e47")
    draw.text((835, 96), "RED (1470,850) = old empty hand hole. Re-draw elbow / wrist / fingers.", font=small, fill="#b62b36")
    draw.text((835, 123), "Blue shoe axis stays fixed. Marks / labels are guide-only; final PNG has none.", font=small, fill="#2672b1")
    marked = OUT / "shanks-back-contact-marked1008.png"
    reference.save(marked)
    # A diagnostic contact zoom, uniformly enlarging the marked reference.
    zoom = reference.crop((1320, 740, 1532, 960)).resize((636, 660), Image.Resampling.NEAREST)
    zoom_path = OUT / "shanks-back-contact-guide-zoom1008.png"
    zoom.save(zoom_path)

    guide = Image.new("RGB", (1040, 750), "#f5f4ef")
    draw = ImageDraw.Draw(guide)
    draw.text((25, 20), "AOKIJI: NEW INDEPENDENT BACK HOLD / ABSTRACT POSTURE GUIDE ONLY", font=font, fill="#243d4b")
    draw.text((25, 54), "Keep real human lengths and the established neutral scale. Draw a new rear-twist stance.", font=small, fill="#576d7b")
    origin = (400, 625)
    factor = 6
    point = lambda xy: (origin[0] + xy[0] * factor, origin[1] + xy[1] * factor)
    hip = (-3, -35)
    shoulder = (3, -57)
    head = (5, -73)
    near_leg = [hip, (9, -26), (7, 0)]
    far_leg = [hip, (-12, -24), (-7, 0)]
    near_arm = [shoulder, (9, -35), (13, -20), TARGET_WORLD]
    far_arm = [(-3, -55), (3, -32), (14, -18), TARGET_WORLD]
    draw.line((60, origin[1], 985, origin[1]), fill="#aab5bd", width=2)
    draw.line([point(hip), point(shoulder)], fill="#526572", width=14)
    hx, hy = point(head)
    draw.ellipse((hx - 35, hy - 42, hx + 35, hy + 42), outline="#526572", width=5)
    draw.line((hx + 28, hy, hx + 72, hy), fill="#526572", width=3)
    draw.polygon([(hx + 72, hy), (hx + 61, hy - 6), (hx + 61, hy + 6)], fill="#526572")
    for joints, colour in [(far_leg, "#cc8c34"), (near_leg, "#287bb1"), (far_arm, "#cc8c34"), (near_arm, "#287bb1")]:
        draw.line([point(j) for j in joints], fill=colour, width=8)
        for j in joints:
            x, y = point(j)
            draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=colour)
    tx, ty = point(TARGET_WORLD)
    draw.ellipse((tx - 17, ty - 20, tx + 17, ty + 20), outline="#138e47", width=3)
    draw.text((tx + 30, ty - 40), "Actual shared ankle space", font=font, fill="#138e47")
    draw.text((tx + 30, ty - 11), "+16.0328, -13.1803 from shoe axis", font=small, fill="#138e47")
    draw.text((620, 250), "Face still looks right; hips / shoulder turn left-back.", font=small, fill="#243d4b")
    draw.text((620, 280), "Both actual shoes remain below body, left of hand space.", font=small, fill="#243d4b")
    draw.text((620, 310), "One near hand wraps; the far hand supports the same ankle.", font=small, fill="#243d4b")
    draw.text((25, 677), "Roots remain0 / 30 before release. No victim / extra foot / guide markings in final character PNG.", font=small, fill="#243d4b")
    draw.text((25, 708), "This skeleton defines topology only. It is not proportion fitting, accepted art or a runtime frame.", font=small, fill="#576d7b")
    aokiji_guide = OUT / "aokiji-back-posture-guide1008.png"
    guide.save(aokiji_guide)

    shanks_prompt = ROOT / "docs/assets/shanks-independent-back-contact-repair-prompt1008.txt"
    write_new(shanks_prompt, """只局部修第一张原PNG右格的“独立后投已经连接、仍在抓住”姿势。第一张是完整b07原画，第二张同画布带红绿标记只作定位指南；最终画里不出现标记、骨架、文字或其他人。

保持左格站立尺原样。右格红发、伤疤、眼睛、脸向右、黑披风、白衬衫、花纹短裤、红腰带、入鞘整刀、缺失左臂、全身比例、头宽、两只完整凉鞋及其原地支撑轴都保持。保留真实后转腰肩和深蹲承重；这是后投连接保持，不要换成前握姿势，也不要提前向左甩出手。

只重新画唯一右臂的自然收肘、屈腕及拇指/弯指包握。绿色十字约在原1536×1024画布(1423,830)，是真实另一个人的足踝中心；现有红色孔中心约(1470,850)握空，须把真正的C形孔中心通过关节屈曲收向左约47像素、向上约20像素。孔必须环绕绿点，指尖从上下两侧包住这一空间，不是仅把手掌盖到绿点而孔仍在右下。保留正常臂长、五指和唯一一条右臂；不平移旧手、不挪整个人、不改鞋轴、不缩放人物。

以原右格鞋轴(1255,968)和左格实际站高983像素计，孔目标为右167.662像素、鞋底上137.831像素；只是这张原画的定位说明，最终不画数字。手孔保持在自己两只鞋、小腿、膝盖前面的外侧，抓住释放前仍在画面右前方。披风原有后身像素自然保留在手后，不把披风画成第三只手、不画额外脚或灰色道具。

输出同一双格横排、原画布尺度、真透明RGBA PNG，完整头脚、全部掌指、披风和刀鞘留足安全边。只改右格关节与孔位，完整独立后姿仍清楚；带标记的参考图不进入最终图。
""")
    aokiji_prompt = ROOT / "docs/assets/aokiji-independent-backholding-prompt1008.txt"
    write_new(aokiji_prompt, """基于本会话已经确定的青雉造型，新增一个真正独立的“后投已经连接、仍抓住”姿势。抽象骨架仅说明朝向、转髋和另一人的踝空间，不是人物比例模板，不进入最终图。输出横向双格真透明RGBA PNG：左格完整自然站姿标尺，右格新后投保持。

脸、卷黑发、青绿额眼罩、蓝衬衫、领带、白马甲裤、黑鞋、金肩章白披风与已定造型一致；双格保持同样头宽和正常人体尺度。不要复制、镜像或平移已有前握图，不把站立尺或骨架画进人物。

右格深蹲，完整双鞋紧收在身下，双膝和髋向左后扭，肩线、后背披风和承重明确为向后投的蓄势；脸仍看右，释放前仍抓右前方。手不能提前移到身后，也不抓自己的裤腿、膝盖或鞋。

以左格完整站高H和右格真实双鞋支撑中心为地轴，实际近掌C孔中心在鞋轴右约0.160328H、鞋底上约0.131803H，双鞋支持中心间距约0.14至0.16H。必须靠正常深屈膝、转髋、屈肘达到，不拉长手臂、不挪人物地轴、不给右格单独缩放。该空间只属于另一人的同一个足踝，右前近掌的拇指和弯指清楚围住它，另一掌在后侧/下侧支持同一位置，不画两个分离握孔；所有自己的鞋和小腿都在这个空间左后方。

两条实际手臂从真实肩/肘/腕连接，五指自然，掌和前臂可清楚辨别；手后的披风自然保留为后层衣物。只画青雉，不画对手、额外脚、灰块、骨架、点线或数字。头、指尖、双鞋、披风完整并留安全边；动作结束才释放，本图必须显示尚在真实握住。
""")

    anime_inventory = {}
    all_backup_files = []
    for cid in ("aokiji", "shanks"):
        folder = ROOT / f"public/assets/characters/{cid}/anime"
        files = [{"file": p.as_posix(), "bytes": p.stat().st_size, "sha256": sha(p)} for p in sorted(folder.iterdir()) if p.is_file()]
        anime_inventory[cid] = {"files": files, "bytes": sum(row["bytes"] for row in files)}
        all_backup_files.extend(files)
    author_inventory = [{"file": str(ROOT / f"scripts/roster_{cid}_manifest0929.json"), "bytes": (ROOT / f"scripts/roster_{cid}_manifest0929.json").stat().st_size, "sha256": sha(ROOT / f"scripts/roster_{cid}_manifest0929.json")} for cid in ("aokiji", "shanks")]
    generated = [marked, zoom_path, aokiji_guide, shanks_prompt, aokiji_prompt, OUT / "README.md"]
    report = {
        "status": "precise-repair-inputs-only-not-new-source-or-art-acceptance",
        "observedAtUtc": datetime.now(timezone.utc).isoformat(),
        "originalSource": {"file": SOURCE.as_posix(), "sha256": SOURCE_SHA, "bytes": SOURCE.stat().st_size},
        "shanks": {"sourceRoot": SOURCE_ROOT, "oldHand": OLD_HAND, "targetWorld": TARGET_WORLD, "sourceWorldPerPixel": WORLD_PER_SOURCE_PIXEL, "targetSourcePixel": target, "targetMinusOldSourcePixel": [target[i] - OLD_HAND[i] for i in range(2)], "existingStaticReport": "docs/assets/shanks-independent-back-foreground-static1004.json", "note": "Hand landmark approximate; canonical target exact from current held-leg contract. New source must be measured afresh, never root-fitted."},
        "aokiji": {"targetWorld": TARGET_WORLD, "neutralWorldHeight": 100, "diagram": "abstract-posture-only", "independentBackSourceAvailable": False},
        "actualInputBackupInventory": {"anime": anime_inventory, "authorManifests": author_inventory, "totalBytes": sum(row["bytes"] for row in all_backup_files + author_inventory), "copyExecuted": False},
        "actualCurrentRuntimeOutputBytes": sum(row["bytes"] for row in all_backup_files),
        "newSourceAssembledOutputBytes": None,
        "newSourceAssembledOutputStatus": "unknown-until-actual-new-source-build",
        "disk": {drive: shutil.disk_usage(drive)._asdict() for drive in ("C:/", "D:/")},
        "generatedFiles": [{"file": path.as_posix(), "bytes": path.stat().st_size, "sha256": sha(path)} for path in generated],
        "generatedTotalBytes": sum(path.stat().st_size for path in generated),
        "authorRuntimeMovesOrCoreChanged": False,
        "originalSourceUnchanged": sha(SOURCE) == SOURCE_SHA,
    }
    write_new(OUT / "inputs1008.json", json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"guideDir": OUT.as_posix(), "targetSourcePixel": target, "inputBackupBytes": report["actualInputBackupInventory"]["totalBytes"], "generatedBytes": report["generatedTotalBytes"], "newRuntimeBytes": None}, ensure_ascii=False))


if __name__ == "__main__":
    main()
