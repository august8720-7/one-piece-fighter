"""Preserve the old official backholding PNG retrieved on1008; no runtime write."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import shutil

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL = Path("C:/Users/august/AppData/Local/Temp/browser-use/assets/b28a6028-dd97-44bc-aaf0-feb8a9776417/93727ef4a80cb90e")
MANIFEST = ORIGINAL.parent / "manifest.json"
DEST = ROOT / "public/assets/generated/source/roster-aokiji-independent-back-holding-1008.png"
OUT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/aokiji-independent-back-review1008")


def sha(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def save_new(path: Path, value: object) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


def main() -> None:
    OUT.mkdir(exist_ok=False)
    (OUT / "README.md").write_text(
        "# Aokiji independent backholding review1008\n\n"
        "An existing official image, originally requested on1004 and retrieved on1008, is preserved here. "
        "copy-before1008.json precedes copying; copy-after1008.json verifies every byte/hash. "
        "Source, original browser asset and official manifest remain intact. "
        "White/grid images and any body/foreground/paired previews are review data only. "
        "No front throw, runtime, author manifest, move data, old character or core is changed by intake.\n",
        encoding="utf-8",
    )
    blob = ORIGINAL.read_bytes()
    bundle = MANIFEST.read_bytes()
    catalog = json.loads(bundle)
    assert len(blob) == 1039875
    assert blob.startswith(b"\x89PNG\r\n\x1a\n") and blob.endswith(bytes.fromhex("0000000049454e44ae426082"))
    assert len(catalog["assets"]) == 1 and not catalog["failures"]
    assert catalog["assets"][0]["contentType"] == "image/png"
    assert catalog["assets"][0]["url"] == "https://chatgpt.com/api/library/files/libfile_8d1067dee0c4819183288832b87e556c/content"
    with Image.open(io.BytesIO(blob)) as check:
        assert check.format == "PNG"
        check.verify()
    image = Image.open(io.BytesIO(blob)).convert("RGBA")
    image.load()
    assert image.size == (1774, 887)
    assert image.getchannel("A").getextrema() == (0, 255)
    copies = [(ORIGINAL, DEST, blob), (ORIGINAL, OUT / "official-original1008.png", blob), (MANIFEST, OUT / "official-bundle-manifest1008.json", bundle)]
    before = [{"source": source.as_posix(), "destination": target.as_posix(), "bytes": len(value), "sha256": sha(value)} for source, target, value in copies]
    save_new(OUT / "copy-before1008.json", before)
    for source, target, value in copies:
        with target.open("xb") as stream:
            stream.write(value)
        assert sha(target.read_bytes()) == sha(value) and source.read_bytes() == value
    save_new(OUT / "copy-after1008.json", [{**item, "copiedSha256": sha(Path(item["destination"]).read_bytes()), "equal": True, "originalPreserved": True} for item in before])
    white = Image.new("RGBA", image.size, "white")
    white.alpha_composite(image)
    white.convert("RGB").save(OUT / "source-white1008.png")
    grid = white.convert("RGB")
    draw = ImageDraw.Draw(grid)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 12)
    for x in range(900, 1774, 50):
        draw.line((x, 250, x, 850), fill="#8eaac2", width=1)
        draw.text((x + 2, 250), str(x), font=font, fill="#245073")
    for y in range(300, 850, 50):
        draw.line((900, y, 1773, y), fill="#8eaac2", width=1)
        draw.text((900, y + 2), str(y), font=font, fill="#245073")
    grid.save(OUT / "backholding-source-grid1008.png")
    image.crop((887, 0, 1774, 887)).save(OUT / "backholding-original-cell1008.png")
    white.convert("RGB").crop((887, 0, 1774, 887)).save(OUT / "backholding-white-cell1008.png")
    white.convert("RGB").crop((1450, 610, 1740, 780)).resize((870, 510), Image.Resampling.NEAREST).save(OUT / "near-hand-original-zoom1008.png")
    measurements = []
    for name, box in [("standing", (0, 0, 887, 887)), ("backholding", (887, 0, 1774, 887))]:
        cell = image.crop(box)
        alpha = cell.getchannel("A")
        bounds = {str(threshold): alpha.point(lambda a, t=threshold: 255 if a >= t else 0).getbbox() for threshold in (1, 16, 64, 128, 200)}
        measurements.append({"name": name, "crop": [box[0], box[1], box[2] - box[0], box[3] - box[1]], "alphaBounds": bounds, "alpha64Height": bounds["64"][3] - bounds["64"][1]})
    prompt = ROOT / "docs/assets/aokiji-low-hold-backholding-prompt1004.txt"
    result = {
        "status": "existing-official-original-preserved-not-art-adopted",
        "retrievedAtLocal": datetime.fromtimestamp(ORIGINAL.stat().st_mtime).astimezone().isoformat(),
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "source": {"file": DEST.relative_to(ROOT).as_posix(), "sha256": sha(blob), "bytes": len(blob), "format": "PNG", "mode": "RGBA", "size": image.size, "alphaExtrema": image.getchannel("A").getextrema()},
        "browserManifest": {"file": (OUT / "official-bundle-manifest1008.json").as_posix(), "sha256": sha(bundle)},
        "provenance": {"provider": "chatgpt-web", "model": "unverified", "requestDate": "1004", "retrievedDate": "1008", "sessionUrl": "https://chatgpt.com/c/6ac1c91d-9a4c-83ee-90f8-5e05fd1c1774", "spaceUrl": "https://chatgpt.com/space/file/libfile_8d1067dee0c4819183288832b87e556c", "prompt": {"file": prompt.relative_to(ROOT).as_posix(), "sha256": sha(prompt.read_bytes())}, "completionObservationScreenshot": None, "note": "Parent observed completed image5 and exported the original through official file menu/Space/pageAssets. The retrieval time is not server generation time; current intake does not claim a new generation."},
        "cellAlphaMeasurements": measurements,
        "sourceCopyBytes": sum(row["bytes"] for row in before),
        "diskAfterCopy": {drive: shutil.disk_usage(drive)._asdict() for drive in ("C:/", "D:/")},
        "runtimeAuthorMovesOrCoreChanged": False,
    }
    save_new(OUT / "intake1008.json", result)
    print(json.dumps({"sourceSha256": sha(blob), "bytes": len(blob), "size": image.size, "measurements": measurements, "sourceFile": DEST.as_posix(), "reviewDir": OUT.as_posix()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
