"""Bounded local Kokoro preset TTS: no uploads, paid API or voice cloning.

Reuses the existing CPU ONNX/ASR environment, with Chinese G2P installed only
to a separate --target directory. All exports remain unreviewed originals.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.request
import wave

from roster_voice_adoption1003 import CHARACTERS

PROJECT = Path(__file__).resolve().parents[1]
TOOLS = Path("D:/one-piece-fighter-crossover-0922/tools/roster-voice1003")
ROOT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003")
SOURCE = PROJECT / "public/assets/audio/sources/roster-1003"
REPO = "onnx-community/Kokoro-82M-v1.0-ONNX"
FILES = {
    "onnx/model_quantized.onnx": (92361116, "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478"),
    "voices/zm_yunjian.bin": (522240, "de48a00bdbf3649f07162269a2b6e0513604389bfac8a2e6c75cb34b323ad6fa"),
    "voices/zm_yunxi.bin": (522240, "7243892fb4e560d47014090ddf010f8b8b790f3c6b029ff82b2ac06aa4e27c8b"),
    "tokenizer.json": (None, None),
}
VOICES = {"aokiji": ("zm_yunxi", 0.94), "shanks": ("zm_yunjian", 1.02)}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path: Path, value) -> None:
    with path.open("x", encoding="utf-8") as out:
        json.dump(value, out, ensure_ascii=False, indent=2)


def fetch() -> None:
    folder = TOOLS / "metadata"
    folder.mkdir(exist_ok=True)
    pre = folder / "download-before1003.json"
    if not pre.exists():
        save(pre, {"atUtc": datetime.now(timezone.utc).isoformat(), "repository": REPO, "modelLicense": "Apache-2.0 (HF public card)", "g2p": "misaki 0.9.4 zh extras from PyPI; local target only", "explicitFiles": [{"path": path, "expectedBytes": facts[0], "expectedSha256": facts[1], "url": f"https://huggingface.co/{REPO}/resolve/main/{path}"} for path, facts in FILES.items()]})
    after = []
    for name, (size, expected) in FILES.items():
        target = TOOLS / "models" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            with urllib.request.urlopen(f"https://huggingface.co/{REPO}/resolve/main/{name}", timeout=45) as response:
                with target.open("xb") as out:
                    while block := response.read(1024 * 1024):
                        out.write(block)
        actual = digest(target)
        if size is not None:
            assert target.stat().st_size == size, (target, target.stat().st_size, size)
        if expected is not None:
            assert actual == expected, (target, actual, expected)
        after.append({"path": str(target), "bytes": target.stat().st_size, "sha256": actual, "expectedHashVerified": expected is not None})
        print(json.dumps(after[-1], ensure_ascii=False), flush=True)
    report = folder / ("download-after-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
    save(report, after)


def generate(character: str | None, event: str | None, skipped: list[str], explicit_plan: list[dict] | None = None) -> None:
    sys.path.insert(0, str(TOOLS / "packages"))
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    import numpy as np
    import onnxruntime as ort
    from misaki.zh import ZHG2P

    for name, (size, expected) in FILES.items():
        path = TOOLS / "models" / name
        assert path.is_file(), path
        if expected:
            assert digest(path) == expected, path
    tokenizer = json.loads((TOOLS / "models/tokenizer.json").read_text(encoding="utf-8"))
    vocab = tokenizer["model"]["vocab"]
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(TOOLS / "models/onnx/model_quantized.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
    inputs = [item.name for item in session.get_inputs()]
    assert set(inputs) == {"input_ids", "style", "speed"}, inputs
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    folder = ROOT / "jobs" / ("local-kokoro-" + stamp)
    folder.mkdir(parents=True)
    (folder / 'README.md').write_text('独立本地Kokoro原创候选生成记录。generation-before保存完整输入/实际模型与声线，逐角JSON和generation-after绑定未经剪切的源WAV/PCM哈希。原件不删除、不覆盖，不自动采用；转写和原生音质核验分开，目录不公开。\n', encoding='utf-8')
    g2p = ZHG2P()
    targets = [character] if character else list(VOICES)
    plan = [{"character": char, "event": purpose, "text": text, "voicePreset": VOICES[char][0], "speed": VOICES[char][1]} for char in targets for purpose, text in CHARACTERS[char]["events"].items() if purpose not in skipped and (event is None or event == purpose)]
    if explicit_plan is not None:
        assert explicit_plan and all(isinstance(row, dict) and set(row) == {"character", "event", "text"} for row in explicit_plan)
        keys = [(row["character"], row["event"]) for row in explicit_plan]
        assert len(keys) == len(set(keys)), "One explicitly selected revision per event"
        assert all(row["character"] in VOICES and row["event"] in CHARACTERS[row["character"]]["events"]
                   and isinstance(row["text"], str) and 0 < len(row["text"].strip()) <= 40 for row in explicit_plan)
        assert all(character is None or row["character"] == character for row in explicit_plan)
        assert all(event is None or row["event"] == event for row in explicit_plan)
        assert all(row["event"] not in skipped for row in explicit_plan)
        plan = [{**row, "voicePreset": VOICES[row["character"]][0], "speed": VOICES[row["character"]][1]} for row in explicit_plan]
    source_day = datetime.now(timezone(timedelta(hours=8))).strftime("%m%d")
    save(folder / "generation-before.json", {"atUtc": datetime.now(timezone.utc).isoformat(), "provider": "local CPU", "model": REPO, "modelSha256": FILES["onnx/model_quantized.onnx"][1], "modelVersion": "Kokoro 82M v1.0 quantized", "onnxruntimeVersion": ort.__version__, "g2p": "misaki 0.9.4 ZHG2P legacy compatible with v1.0", "inputShapes": [{"name": item.name, "shape": item.shape, "type": item.type} for item in session.get_inputs()], "originalGameVoice": False, "actorImitation": False, "voiceClone": False, "networkInference": False, "plan": plan})
    rows = []
    for item in plan:
        started = time.perf_counter()
        phonemes, _ = g2p(item["text"])
        unknown = [symbol for symbol in phonemes if symbol not in vocab]
        assert not unknown, (item["text"], phonemes, unknown)
        tokens = [vocab[symbol] for symbol in phonemes]
        assert 0 < len(tokens) < 510
        voice_file = TOOLS / "models/voices" / (item["voicePreset"] + ".bin")
        styles = np.frombuffer(voice_file.read_bytes(), dtype=np.float32).reshape(-1, 256)
        tensor = {"input_ids": np.array([[0, *tokens, 0]], dtype=np.int64), "style": styles[len(tokens):len(tokens) + 1], "speed": np.array([item["speed"]], dtype=np.float32)}
        samples = np.asarray(session.run(None, tensor)[0]).flatten()
        assert np.isfinite(samples).all() and len(samples) > 0
        rate = 24000
        clipped = int(np.sum(np.abs(samples) >= 1))
        pcm = (np.clip(samples, -1, 1) * 32767).round().astype("<i2").tobytes()
        target = SOURCE / f"{item['character']}-{item['event']}-kokoro-original-{source_day}-{stamp}.wav"
        assert not target.exists()
        with wave.open(str(target), "wb") as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(rate)
            out.writeframes(pcm)
        with wave.open(str(target), "rb") as probe:
            assert probe.readframes(probe.getnframes()) == pcm
        row = {**item, "file": str(target), "sha256": digest(target), "bytes": target.stat().st_size, "pcmSha256": hashlib.sha256(pcm).hexdigest(), "phonemes": phonemes, "tokens": tokens, "voicePresetSha256": digest(voice_file), "sampleRateHz": rate, "channels": 1, "sampleWidthBytes": 2, "frames": len(samples), "durationSeconds": len(samples) / rate, "peakAbs": float(np.max(np.abs(samples))), "rms": float(np.sqrt(np.mean(samples ** 2))), "samplesOutsidePcmRange": clipped, "elapsedSeconds": time.perf_counter() - started, "processing": "Native local model output quantized to PCM16; no gain, trimming, filtering, resampling or speech splicing", "status": "generated-original-candidate-unreviewed", "originalSyntheticSpeech": True, "humanListened": False, "nativeAudioReviewed": False, "transcriptVerified": False, "gamePlaybackVerified": False, "adopted": False}
        save(folder / (item["character"] + "-" + item["event"] + ".json"), row)
        rows.append(row)
        print(json.dumps({"character": item["character"], "event": item["event"], "file": str(target), "durationSeconds": row["durationSeconds"], "clipped": clipped, "elapsedSeconds": row["elapsedSeconds"]}, ensure_ascii=False), flush=True)
    save(folder / "generation-after.json", {"provider": "local CPU Kokoro preset", "candidates": rows, "formalAdopted": 0, "qualityReview": "Pending; ASR and PCM metrics are not native audio quality acceptance"})
    print(json.dumps({"evidence": str(folder), "candidates": len(rows), "formalAdopted": 0}), flush=True)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["fetch", "generate"])
    parser.add_argument("--character", choices=list(VOICES))
    parser.add_argument("--event", choices=list(CHARACTERS["aokiji"]["events"]))
    parser.add_argument("--skip-events", nargs="*", default=[], choices=list(CHARACTERS["aokiji"]["events"]))
    parser.add_argument("--plan", type=Path, help="Explicit local character/event/text revisions; does not replace or adopt older candidates")
    args = parser.parse_args()
    assert (TOOLS / "README.md").is_file() and (SOURCE / "README.md").is_file()
    if args.action == "fetch":
        fetch()
    else:
        explicit_plan = None
        if args.plan is not None:
            path = args.plan.resolve()
            assert path.is_file() and path.is_relative_to((PROJECT / 'docs/assets').resolve())
            explicit_plan = json.loads(path.read_text(encoding='utf-8'))['utterances']
        generate(args.character, args.event, args.skip_events, explicit_plan)


if __name__ == "__main__":
    main()
