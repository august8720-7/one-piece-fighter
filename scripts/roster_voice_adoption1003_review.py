"""Prepare and independently review only new original synthetic voice candidates.

ASR stays entirely local and is never quality acceptance. Optional native
review accepts only this tool's candidate hashes and the NVIDIA official public
demo; original game/actor audio, arbitrary paths, Qwen and cloning are rejected.
"""
from __future__ import annotations

import argparse
from dataclasses import asdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request
import uuid
import wave

ROOT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003")
PROJECT = Path(__file__).resolve().parents[1]
BASE = "https://nvidia-audio-flamingo-next.hf.space"
CATALOG = PROJECT / "scripts/roster_voice_adoption1003.voices.json"
PROMPT = ("Use only the actual attached audio. Do not infer the source or speaker identity. "
          "1. Transcribe any speech verbatim in its original language; write unclear if necessary. "
          "2. Report whether the beginning or end of speech sounds cut off, whether there are repeated words or an extra vocal tail. "
          "3. Report audible background music, noise, clicks, clipping or distortion, and whether the voice is clear. "
          "State uncertain for any item you cannot determine. Do not invent speech.")


def stamp():
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    with Path(path).open("x", encoding="utf-8") as out:
        json.dump(value, out, ensure_ascii=False, indent=2)


def prepare() -> None:
    import numpy as np
    reports = list((ROOT / "jobs").glob("local-kokoro-*/generation-after.json"))
    candidates = []
    for report in reports:
        for item in json.loads(report.read_text(encoding="utf-8"))["candidates"]:
            assert item["originalSyntheticSpeech"] and item["status"] == "generated-original-candidate-unreviewed"
            assert item["voicePreset"] in {"zm_yunxi", "zm_yunjian"}
            source = Path(item["file"]).resolve()
            assert source.is_relative_to((PROJECT / "public/assets/audio/sources/roster-1003").resolve())
            assert digest(source.read_bytes()) == item["sha256"]
            candidates.append((item, str(report)))
    keys = [(item["character"], item["event"]) for item, _ in candidates]
    assert len(keys) == len(set(keys)), "Explicitly select one candidate per event; no automatic newest-wins policy"
    assert len(keys) == 16, keys
    folder = ROOT / "candidates" / stamp()
    folder.mkdir(parents=True)
    save(folder / "copy-before.json", [{"source": item["file"], "sha256": item["sha256"], "purpose": item["event"]} for item, _ in candidates])
    rows = []
    for index, (item, report) in enumerate(sorted(candidates, key=lambda pair: (pair[0]["character"], pair[0]["event"])), 1):
        source = Path(item["file"])
        with wave.open(str(source), "rb") as wav:
            rate, channels, frames = wav.getframerate(), wav.getnchannels(), wav.getnframes()
            pcm = wav.readframes(frames)
        assert channels == 1 and rate == 24000
        samples = np.frombuffer(pcm, dtype="<i2").astype(float) / 32768
        hop = rate // 100
        chunks = np.pad(samples, (0, (-len(samples)) % hop)).reshape(-1, hop)
        rms = np.sqrt(np.mean(chunks ** 2, axis=1))
        threshold = max(0.00045, float(np.max(rms)) * .012)
        active = np.flatnonzero(rms > threshold)
        assert len(active)
        first = max(0, int(active[0]) * hop - round(.035 * rate))
        last = min(frames, (int(active[-1]) + 1) * hop + round(.13 * rate))
        selected = pcm[first * 2:last * 2]
        candidate = folder / f"candidate-{index:02}.wav"
        with wave.open(str(candidate), "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(selected)
        with wave.open(str(candidate), "rb") as wav:
            assert wav.readframes(wav.getnframes()) == selected
        row = {**item, "index": index, "sourceFile": item["file"], "sourceSha256": item["sha256"], "sourceEvidence": report, "candidate": str(candidate), "candidateSha256": digest(candidate.read_bytes()), "candidateBytes": candidate.stat().st_size, "candidateDurationSeconds": (last - first) / rate, "sourceFirstFrame": first, "sourceLastFrameExclusive": last, "candidatePcmSha256": digest(selected), "trimMethod": {"rmsHopSeconds": .01, "activityThreshold": threshold, "retainedHeadSeconds": .035, "retainedTailSeconds": .13, "nativeSamplesOnly": True, "noGainFilteringResampling": True}, "proposedCueId": f"voice.{item['character']}.{item['event']}", "proposedRuntimeFile": f"assets/audio/voice/{item['character']}/{item['event']}-kokoro-original-1003.wav", "humanListened": False, "nativeAudioReviewed": False, "transcriptVerified": False, "gamePlaybackVerified": False, "adopted": False}
        rows.append(row)
    value = {"version": 1, "scope": "original synthetic candidates only; not approved runtime cue manifest", "preparedAtUtc": datetime.now(timezone.utc).isoformat(), "files": rows, "nativeReviewRoute": BASE, "rawGameAudioAllowed": False, "QwenUploadsAllowed": False, "nativeReviewStatus": "not-submitted", "formalAdopted": 0}
    save(folder / "candidate-catalog.json", value)
    save(CATALOG, value)
    print(json.dumps({"catalog": str(CATALOG), "evidence": str(folder), "candidates": len(rows), "durations": [{"index": row["index"], "character": row["character"], "event": row["event"], "seconds": row["candidateDurationSeconds"]} for row in rows]}, ensure_ascii=False))


def asr() -> None:
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
    from faster_whisper import WhisperModel
    model = WhisperModel("D:/one-piece-fighter-crossover-0922/tools/asr-0925/models/faster-whisper-small", device="cpu", compute_type="int8", cpu_threads=2, local_files_only=True)
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    folder = ROOT / "validation" / ("local-asr-" + stamp())
    folder.mkdir(parents=True)
    rows = []
    for item in catalog["files"]:
        path = Path(item["candidate"])
        assert digest(path.read_bytes()) == item["candidateSha256"]
        begun = time.perf_counter()
        segments, _ = model.transcribe(str(path), language="zh", task="transcribe", initial_prompt=None, prefix=None, condition_on_previous_text=False, beam_size=5, temperature=0, vad_filter=False)
        segments = [asdict(segment) for segment in segments]
        result = {"index": item["index"], "candidateSha256": item["candidateSha256"], "text": "".join(segment["text"] for segment in segments), "segments": segments, "elapsedSeconds": time.perf_counter() - begun, "expectedTextProvided": False, "networkInference": False, "listeningAcceptance": False, "qualityAcceptance": False}
        save(folder / (f"candidate-{item['index']:02}.json"), result)
        rows.append(result)
        print(json.dumps({"index": item["index"], "text": result["text"], "elapsedSeconds": result["elapsedSeconds"]}, ensure_ascii=False), flush=True)
    save(folder / "asr-summary.json", {"rows": rows, "engine": "faster-whisper small int8 CPU; no expected words", "scope": "fallible speech content evidence only; cannot prove noise/cutoff/pleasantness"})
    print(json.dumps({"evidence": str(folder), "candidates": len(rows), "qualityAccepted": 0}), flush=True)


def native(index: int, provider: str, show_thinking: bool) -> None:
    base = BASE if provider == "nvidia" else "https://stepfun-ai-step-audio-r1.hf.space"
    endpoint = "infer" if provider == "nvidia" else "chat"
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    item = next(row for row in catalog["files"] if row["index"] == index)
    assert item["originalSyntheticSpeech"] and not item["adopted"]
    path = Path(item["candidate"]).resolve()
    assert path.is_relative_to((ROOT / "candidates").resolve())
    blob = path.read_bytes()
    assert digest(blob) == item["candidateSha256"]
    folder = ROOT / "validation" / (f"native-{provider}-candidate-{index:02}-" + stamp())
    folder.mkdir(parents=True)
    save(folder / "intent.json", {"candidateIndex": index, "sha256": item["candidateSha256"], "sourceKind": "new original synthetic PCM from local licensed preset model", "base": base, "maxInferenceRequests": 1, "purpose": "native content/noise/cutoff review only; no clone; no original game audio", "prompt": PROMPT, "expectedTextProvided": False, "providerDefaultShowThinking": show_thinking})
    boundary = "----OriginalCandidate" + uuid.uuid4().hex
    multipart = (f'--{boundary}\r\nContent-Disposition: form-data; name="files"; filename="candidate.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode() + blob + f"\r\n--{boundary}--\r\n".encode())

    def req(endpoint, body=None, content_type="application/json"):
        request = urllib.request.Request(base + endpoint, data=body, headers={"Content-Type": content_type, "User-Agent": "OriginalSyntheticGameCandidate/1003"})
        return urllib.request.urlopen(request, timeout=45)

    try:
        with req("/gradio_api/upload", multipart, "multipart/form-data; boundary=" + boundary) as response:
            uploaded = json.load(response)
        save(folder / "upload.json", uploaded)
        audio = {"path": uploaded[0], "orig_name": "candidate.wav", "size": len(blob), "mime_type": "audio/wav", "meta": {"_type": "gradio.FileData"}}
        payload = {"data": [audio, "", PROMPT] if provider == "nvidia" else ["Examine the actually attached audio independently. Answer only the user's three requested items; state uncertainty where applicable.", PROMPT, audio, [], None, 16384, 0.7, 0.9, show_thinking]}
        save(folder / "request.json", payload)
        with req("/gradio_api/call/" + endpoint, json.dumps(payload, ensure_ascii=False).encode()) as response:
            event = json.load(response)
        save(folder / "event.json", event)
        print(json.dumps({"folder": str(folder), "index": index, "eventId": event["event_id"]}), flush=True)
        last = None
        with req("/gradio_api/call/" + endpoint + "/" + event["event_id"]) as response:
            with (folder / "response.sse").open("x", encoding="utf-8") as stream:
                for line in response:
                    line = line.decode("utf-8"); stream.write(line); stream.flush()
                    if line.startswith("event:"):
                        last = line[6:].strip()
                    elif line.startswith("data:") and last in {"complete", "error"}:
                        result = json.loads(line[5:])
                        save(folder / "result.json", {"type": last, "result": result, "inputSha256": item["candidateSha256"], "inputAudioAttached": True, "expectedTextProvided": False, "parentMustInterpretBeforeAdoption": True})
                        answer = [row.get("content") for row in result[0] if isinstance(row, dict) and row.get("role") == "assistant"] if provider == "step" and isinstance(result, list) and result and isinstance(result[0], list) else result
                        print(json.dumps({"folder": str(folder), "type": last, "answer": answer}, ensure_ascii=False), flush=True)
                        return
        raise RuntimeError("No final event; do not repeat inference until existing event is resumed")
    except Exception as error:
        save(folder / "failure.json", {"kind": type(error).__name__, "message": str(error), "httpBody": error.read().decode("utf-8", "replace") if isinstance(error, urllib.error.HTTPError) else None, "submitted": (folder / "event.json").exists()})
        raise


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prepare", "asr", "native"])
    parser.add_argument("--index", type=int)
    parser.add_argument("--provider", choices=["nvidia", "step"], default="nvidia")
    parser.add_argument("--show-thinking", action="store_true", help="Use Step demo's public default display mode if hidden mode only returns a placeholder")
    args = parser.parse_args()
    assert (ROOT / "README.md").is_file()
    if args.action == "prepare":
        prepare()
    elif args.action == "asr":
        asr()
    else:
        assert args.index and 1 <= args.index <= 16
        native(args.index, args.provider, args.show_thinking)


if __name__ == "__main__":
    main()
