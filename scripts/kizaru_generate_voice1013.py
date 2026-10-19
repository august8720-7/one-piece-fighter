"""Generate three review-only Japanese samples using the existing local queue.

No model loading, dependency installation, upload, edit, trimming or adoption.
Uses gradio_client's documented Client.predict API and preserves exact originals.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import sys
import wave
from array import array
from datetime import datetime, timezone, timedelta
from pathlib import Path

os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
from gradio_client import Client

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/character-closure1013/kizaru")
SERVER_CACHE = Path("D:/one-piece-fighter-crossover-0922/tools/game-voice1013/cache").resolve()


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_json(path: Path, value: object) -> None:
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--plan", type=Path, default=ROOT / "scripts/kizaru_voice_lines1013.json")
    args = parser.parse_args()
    output = args.output.resolve()
    if output != DEFAULT_OUTPUT.resolve() or not (output / "README.md").is_file():
        raise ValueError("Use the predefined character directory after its README exists.")
    plan_file = args.plan.resolve()
    if plan_file.parent != (ROOT / "scripts").resolve() or not plan_file.name.startswith("kizaru_voice_") or plan_file.suffix != ".json":
        raise ValueError("Use an explicit kizaru_voice_ JSON plan in this repository's scripts directory.")
    plan = json.loads(plan_file.read_text(encoding="utf-8"))
    client = Client("http://127.0.0.1:7863", download_files=False)
    run = datetime.now(timezone(timedelta(hours=8))).strftime("%Y%m%dT%H%M%S")
    save_json(output / f"kizaru-voice-plan1013-{run}.json", plan)
    for line in plan["lines"]:
        if not line["sample"]:
            continue
        print(f"submitting {line['event']}", flush=True)
        started = datetime.now(timezone(timedelta(hours=8)))
        result = client.predict(
            text=line["text"], lang_disp=plan["language"], spk_disp=plan["speaker"],
            instruct=line["instruction"], api_name="/run_instruct",
        )
        data, status = result
        source = Path(data["path"] if isinstance(data, dict) else data).resolve()
        if not source.is_relative_to(SERVER_CACHE) or not source.is_file():
            raise ValueError(f"Unexpected local response file: {source}")
        if "Finished" not in status:
            raise RuntimeError(status)
        target = output / f"kizaru-voice-{line['event']}-qwen1013-{run}.wav"
        if target.exists():
            raise FileExistsError(target)
        receipt = {
            "id": f"kizaru.{line['event']}", "startedAt": started.isoformat(),
            "completedAt": datetime.now(timezone(timedelta(hours=8))).isoformat(),
            "source": str(source), "target": str(target), "bytes": source.stat().st_size,
            "sourceSha256": sha(source), "input": line,
            "planSha256": sha(plan_file), "speaker": plan["speaker"],
            "language": plan["language"], "model": plan["model"],
            "endpoint": "http://127.0.0.1:7863/run_instruct", "status": status,
            "newModelLoads": 0, "installsOrDownloads": 0,
            "auditoryReview": "not-performed", "gameAdopted": False,
        }
        save_json(target.with_suffix(".before-copy.json"), receipt)
        shutil.copyfile(source, target)
        receipt["targetSha256"] = sha(target)
        if receipt["sourceSha256"] != receipt["targetSha256"]:
            raise ValueError("Copied candidate differs from server original.")
        with wave.open(str(target), "rb") as wav:
            receipt["pcm"] = {
                "channels": wav.getnchannels(), "sampleRate": wav.getframerate(),
                "sampleWidth": wav.getsampwidth(), "frames": wav.getnframes(),
                "durationSeconds": wav.getnframes() / wav.getframerate(),
            }
            if wav.getsampwidth() != 2:
                raise ValueError("Expected PCM16 WAV.")
            samples = array("h", wav.readframes(wav.getnframes()))
            if sys.byteorder != "little":
                samples.byteswap()
            receipt["signalOnly"] = {
                "peak": max(abs(x) for x in samples) / 32768,
                "rms": math.sqrt(sum(x * x for x in samples) / len(samples)) / 32768,
                "clippedSampleCount": sum(abs(x) >= 32767 for x in samples),
                "doesNotCertify": "Pronunciation, voice identity, shouts, artifacts or hearing quality.",
            }
        save_json(target.with_suffix(".json"), receipt)
        print(json.dumps({"event": line["event"], "file": str(target), "pcm": receipt["pcm"], "sha256": receipt["targetSha256"]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
