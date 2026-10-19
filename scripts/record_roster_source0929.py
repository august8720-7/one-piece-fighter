"""Append a real downloaded PNG and caller-observed official-web receipt for the PC roster.

No generation, download, rendering, inferred image-model name, or invented screenshot.
The caller supplies an actual observed completed result timestamp, not server/first
generation time. A completion recheck is valid when described in the UI observation.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from PIL import Image
import build_anime_atlas as builder

ROOT = Path(__file__).resolve().parents[1]


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("key", help="New append-only source key, using lowercase letters/numbers/underscores")
    result.add_argument("source", help="Already downloaded original PNG in public/assets/generated/source")
    result.add_argument("prompt", help="Existing complete UTF-8 prompt in docs/assets")
    result.add_argument("--catalog", default="scripts/roster_sources0929.json")
    result.add_argument("--session", required=True, help="Actual official /c/ conversation URL for this generation")
    result.add_argument("--observed-completed-at", required=True, help="Actual observed completed result, ISO 8601 timestamp with timezone; not server/first generation time")
    result.add_argument("--entry-url", required=True, choices=["https://chatgpt.com/images/"])
    result.add_argument("--entry-title", required=True, choices=["ChatGPT"], help="Actually observed entry title")
    result.add_argument("--text-model-label", required=True, choices=["最新", "GPT-6"])
    result.add_argument("--reasoning-effort", required=True, choices=["极高"])
    result.add_argument("--browser-label", required=True, choices=builder.ROSTER_BROWSER_LABELS)
    result.add_argument("--model-unavailable-statement", required=True, help="Actual observation explaining that the exact image model was not disclosed/verified")
    result.add_argument("--ui-observation", required=True, help="Caller-observed UI evidence from this generation, not an inherited receipt; state when this is a completion recheck")
    result.add_argument("--screenshot", help="Optional existing real PNG/JPEG/WebP screenshot in docs/assets or the roster-0929 release root")
    result.add_argument("--reference", action="append", default=[], help="Existing source key in the same catalog; verifies its real PNG and provenance")
    result.add_argument("--form", choices=["gear5"], help="Record independent form identity only; never grants art acceptance")
    result.add_argument("--reference-file", action="append", default=[], help="KEY=repository-relative-PNG under public/assets/generated/source; explicit inspected attachment, not a new provenance claim")
    result.add_argument("--reference-guide", action="append", default=[], help="KEY=absolute-D-guide-PNG inside the existing roster reference root; never runtime art")
    return result


def local_record(path: Path) -> dict:
    name = path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else path.as_posix()
    return {"file": name, "sha256": builder.digest(path.read_bytes())}


def verify_png(path: Path, label: str) -> list[int]:
    with Image.open(io.BytesIO(path.read_bytes())) as original:
        builder.require(original.format == "PNG", f"{label}: original PNG required")
        size = list(original.size)
        original.verify()
    # verify() checks structure; load() also checks compressed pixel decoding.
    with Image.open(path) as original:
        original.load()
    return size


def reference_argument(value: str) -> tuple[str, str]:
    key, separator, path = value.partition("=")
    builder.require(bool(separator) and bool(builder.NAME.fullmatch(key)) and bool(path.strip()), "Explicit reference must be KEY=path")
    return key, path


def record_source(args: argparse.Namespace) -> dict:
    builder.require(bool(builder.NAME.fullmatch(args.key)), "Invalid source key")
    source, prompt, catalog_path = ((ROOT / value).resolve() for value in (args.source, args.prompt, args.catalog))
    builder.require(source.is_relative_to((ROOT / "public/assets/generated/source").resolve()) and source.is_file(), "Existing original source required in public/assets/generated/source")
    builder.require(prompt.is_relative_to((ROOT / "docs/assets").resolve()) and prompt.is_file(), "Existing complete prompt required in docs/assets")
    builder.require(catalog_path.is_relative_to((ROOT / "scripts").resolve()) and catalog_path.suffix == ".json" and catalog_path.parent.is_dir(), "Catalog must be a JSON file under the existing scripts directory")
    catalog_bytes = catalog_path.read_bytes() if catalog_path.exists() else None
    catalog = json.loads(catalog_bytes.decode("utf-8")) if catalog_bytes is not None else {
        "schemaVersion": 1, "workflowDecision": "pc-roster-0929", "sources": {},
    }
    builder.require(isinstance(catalog, dict) and catalog.get("schemaVersion") == 1 and catalog.get("workflowDecision") == "pc-roster-0929" and isinstance(catalog.get("sources"), dict), "Use the dedicated 0929 catalog; never relabel an older catalog")
    builder.require(args.key not in catalog["sources"], "Do not overwrite source receipts or existing source keys")
    png_bytes, prompt_bytes = source.read_bytes(), prompt.read_bytes()
    size = verify_png(source, "Original downloaded source")
    builder.require(bool(prompt_bytes.decode("utf-8").strip()), "Complete prompt must not be empty")
    entry = {
        "file": source.relative_to(ROOT).as_posix(), "sha256": builder.digest(png_bytes),
        "provider": "chatgpt-web", "model": "unverified", "workflowDecision": "pc-roster-0929",
        "observedImageModel": None, "imageModelDisclosure": "exact-model-unavailable",
        "modelUnavailableStatement": args.model_unavailable_statement,
        "observedTextModelLabel": args.text_model_label, "observedReasoningEffort": args.reasoning_effort,
        "entryUrl": args.entry_url, "entryTitle": args.entry_title, "browserLabel": args.browser_label,
        "sessionUrl": args.session, "observedCompletedAt": args.observed_completed_at,
        "uiObservation": args.ui_observation,
        "prompt": {"file": prompt.relative_to(ROOT).as_posix(), "sha256": builder.digest(prompt_bytes)},
        "referenceSources": {}, "unitScale": 1,
        "recordedAt": datetime.now(timezone.utc).isoformat(),
    }
    if args.form:
        entry["formId"] = args.form
    if args.screenshot:
        screenshot = local_record((ROOT / args.screenshot).resolve())
        builder.verified_roster_screenshot(screenshot, f"{args.key} UI observation")
        entry["screenshot"] = screenshot
    builder.validate_roster_observation(args.key, entry)
    observed = datetime.fromisoformat(args.observed_completed_at.replace("Z", "+00:00"))
    suffix = observed.astimezone(timezone(timedelta(hours=8))).strftime("%m%d")
    proof = ROOT / f"docs/assets/{args.key}来源凭据{suffix}.txt"
    builder.require(not list(proof.parent.glob(f"{args.key}来源凭据*.txt")), "Preserve existing source evidence; use a genuinely new source key")

    builder.require(len(args.reference) == len(set(args.reference)), "Do not duplicate reference keys")
    reference_files = {}
    for key in args.reference:
        builder.require(key in catalog["sources"], f"Unknown reference source {key}")
        reference = catalog["sources"][key]
        # This does not manufacture or copy any pixels; references must already pass their loader.
        builder.load_sources({key: reference})
        path = builder.verified_file(reference, ROOT / "public/assets/generated/source", f"reference {key}")
        reference_files[key] = local_record(path)
        entry["referenceSources"][key] = reference_files[key]["sha256"]

    for key, name in (reference_argument(value) for value in args.reference_file):
        builder.require(key not in reference_files, f"Duplicate reference key {key}")
        relative = Path(name)
        builder.require(not relative.is_absolute(), "--reference-file must use a repository-relative PNG path")
        path = (ROOT / relative).resolve()
        builder.require(path.is_relative_to((ROOT / "public/assets/generated/source").resolve()) and path.is_file(), "Explicit PNG reference must stay under public/assets/generated/source")
        record = local_record(path)
        builder.verified_file(record, ROOT / "public/assets/generated/source", f"reference {key}")
        verify_png(path, f"reference {key}")
        reference_files[key] = record
        entry["referenceSources"][key] = record["sha256"]
    for key, name in (reference_argument(value) for value in args.reference_guide):
        builder.require(key not in reference_files, f"Duplicate reference key {key}")
        path = Path(name)
        builder.require(path.is_absolute(), "--reference-guide must use an absolute D-drive path")
        builder.require(path.resolve().is_relative_to(builder.ROSTER_REFERENCE_GUIDE_ROOT.resolve()) and path.is_file(), "Explicit guide must stay inside the declared D-drive reference directory")
        record = {"file": path.resolve().as_posix(), "sha256": builder.digest(path.read_bytes()), "kind": "reference-guide-not-runtime"}
        path = builder.verified_roster_guide(record, f"reference guide {key}")
        verify_png(path, f"reference guide {key}")
        reference_files[key] = record
        entry["referenceSources"][key] = record["sha256"]

    receipt = {
        "schemaVersion": 1, "sourceKey": args.key, **entry, "referenceFiles": reference_files,
        "originalPngSize": size,
        "timeMeaning": "actual observed completed result; not server/first generation time; a completion recheck is identified in uiObservation",
        "acceptanceMeaning": "source observation receipt only; not image-model identification or visual acceptance",
    }
    proof_bytes = (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    entry["sourceEvidence"] = {"file": proof.relative_to(ROOT).as_posix(), "sha256": builder.digest(proof_bytes)}
    # One source writer owns this catalog. Refuse a changed catalog before appending.
    current_bytes = catalog_path.read_bytes() if catalog_path.exists() else None
    builder.require(current_bytes == catalog_bytes, "Catalog changed during recording; retry without overwriting evidence")
    with proof.open("xb") as output:
        output.write(proof_bytes)
    # The actual persisted receipt and every attachment must pass the production
    # provenance loader before the source can appear in the catalog.
    builder.load_sources({args.key: entry})
    current_bytes = catalog_path.read_bytes() if catalog_path.exists() else None
    builder.require(current_bytes == catalog_bytes, "Catalog changed during validation; preserve evidence and retry with a new source key")
    catalog["sources"][args.key] = entry
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"source": args.key, "sha256": entry["sha256"], "size": size, "catalog": catalog_path.relative_to(ROOT).as_posix(), "evidence": entry["sourceEvidence"], "recorded": True, "observedImageModel": None}


def main() -> None:
    # PowerShell/tool captures read UTF-8; do not emit the Windows locale code page.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    print(json.dumps(record_source(parser().parse_args()), ensure_ascii=False))


if __name__ == "__main__":
    main()
