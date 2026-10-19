"""Offer a local grip-centre refinement only; static contact may already suffice."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/generated/source/roster-aokiji-independent-back-holding-1008.png"
OUT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/reference/aokiji-backholding-optional-refinement1008")
EXPECTED = "45b28d32caa687992f9affefa52e0b52e6d2d15e9dfd3a5334242a5fca0e42b3"


def main() -> None:
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == EXPECTED
    review = json.loads(Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-independent-back-review1008/near-foreground-trial1008/static-review1008.json").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=False)
    (OUT / "README.md").write_text(
        "# Optional Aokiji back grip-centre refinement1008\n\n"
        "This guide exists only if actual contact review requires the local hand refinement. It does not reject "
        "the current source automatically. Three representative bodies in both facings already make visible "
        "palm/ankle contact; the thin Luffy ankle leaves empty space at the right of the current C opening. "
        "Green target derives from actual unchanged roots0/30 and the measured standing824/source shoe axis576,816. "
        "Red/green marks never enter runtime PNG; final drawing must retain the accepted appearance, stance, shoes and neutral scale.\n",
        encoding="utf-8",
    )
    with Image.open(SOURCE) as source:
        raw = source.convert("RGBA")
    image = Image.new("RGBA", raw.size, "#f5f4ef")
    image.alpha_composite(raw)
    draw = ImageDraw.Draw(image)
    target = [887 + review["targetSourcePixel"][0], review["targetSourcePixel"][1]]
    old = [887 + review["sockets"]["grip"][0], review["sockets"]["grip"][1]]
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 17)
    small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 14)
    draw.rounded_rectangle((915, 25, 1719, 136), radius=10, fill="white", outline="#afb9c2", width=2)
    draw.text((933, 42), "OPTIONAL LOCAL WRIST / PALM REFINEMENT; KEEP BODY / SHOES / SCALE", font=font, fill="#243d4b")
    draw.text((933, 73), "Green (1595,707): true ankle. Red (1622,702): current C centre. Move via real joints.", font=small, fill="#138e47")
    draw.text((933, 104), "Both hands support this one point. Final PNG has no labels / marks / extra feet.", font=small, fill="#576d7b")
    for point, color in [(old, "#c34036"), (target, "#138e47")]:
        x, y = point
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), outline=color, width=2)
        draw.line((x - 13, y, x + 13, y), fill=color, width=2)
        draw.line((x, y - 13, x, y + 13), fill=color, width=2)
    draw.line((*old, *target), fill="#138e47", width=2)
    rx, ry = 887 + review["root"][0], review["root"][1]
    draw.line((rx - 10, ry, rx + 10, ry), fill="#2672b1", width=2)
    draw.line((rx, ry - 10, rx, ry + 10), fill="#2672b1", width=2)
    guide = OUT / "aokiji-back-optional-contact-marked1008.png"
    image.convert("RGB").save(guide)
    prompt = ROOT / "docs/assets/aokiji-independent-back-contact-repair-prompt1008.txt"
    with prompt.open("x", encoding="utf-8", newline="\n") as stream:
        stream.write("""只局部细修第一张青雉原PNG右格的握孔，第二张带色点的同画布图仅作定位。左格站姿标尺、右格脸/眼罩/头发/衣服/后转深蹲/披风/双鞋、完整人体尺度和鞋轴原样保留。保留这个独立后握，不换前握，不改变站位或缩放。

绿点原1774×887画布约(1595,707)是真实另一个人的踝中心；现孔中心红点约(1622,702)。用正常收肘和屈腕把两只手支持的同一个真实C孔收向左约27像素、向下约5像素，让近掌拇指和弯指围住绿点，后侧掌托住同一处。不要只把掌盖上绿点而孔仍在右侧；不用平移旧手、拉臂或挪鞋轴。保持两臂关节相连和五指正常，手仍在右前低处、自己的双鞋和小腿外侧，不提前向后释放。

最终只画青雉，不画对手、额外脚或色点/骨架/文字；输出同尺寸双格真透明RGBA PNG，头脚/掌指/披风完整安全边。两手之外只保留原人物像素表现。
""")
    info = {"kind": "optional-local-refinement-guide-not-runtime-or-acceptance", "source": SOURCE.as_posix(), "sourceSha256": EXPECTED, "targetAbsoluteSourcePx": target, "currentOpeningAbsoluteSourcePx": old, "targetMinusCurrentSourcePx": [target[i] - old[i] for i in (0, 1)], "guide": {"file": guide.as_posix(), "sha256": hashlib.sha256(guide.read_bytes()).hexdigest(), "bytes": guide.stat().st_size}, "prompt": {"file": prompt.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(prompt.read_bytes()).hexdigest(), "bytes": prompt.stat().st_size}, "runtimeChanged": False}
    with (OUT / "refinement-input1008.json").open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(info, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
