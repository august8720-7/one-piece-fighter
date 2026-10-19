"""Original-text-only voice candidates through a known public free TTS demo.

Never uploads audio, clones a voice, calls Omni, loads credentials or adopts a
runtime cue. Exclusive intent files prevent duplicate generation on timeout.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request
import wave

BASE = "https://qwen-qwen3-tts.hf.space"
PROJECT = Path(__file__).resolve().parents[1]
ROOT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003")
SOURCE = PROJECT / "public/assets/audio/sources/roster-1003"
CHARACTERS = {
    "aokiji": {
        "speaker": "Uncle_fu",
        "instruct": "用清楚的普通话说话。成年男性中低音，平稳，稍显慵懒，干声录音，不模仿任何真人或配音演员，不加音乐或音效。每句独立说完，句间稍作停顿。感叹词短促有力。",
        "events": {"select": "那就开始吧。", "attack": "嘿！", "hurt": "呃！", "ko": "到此为止了。", "win": "冷静一点。", "idle": "别太着急。", "move": "走吧。", "effort": "哈！"},
    },
    "shanks": {
        "speaker": "Dylan",
        "instruct": "用清楚的普通话说话。成年男性声线，温和坚定，语句简短，干声录音，不模仿任何真人或配音演员，不加音乐或音效。每句独立说完，句间稍作停顿。感叹词短促有力。",
        "events": {"select": "来，过两招。", "attack": "哈！", "hurt": "呃！", "ko": "这次，是你赢了。", "win": "下一次再见。", "idle": "尽管放马过来。", "move": "走！", "effort": "喝！"},
    },
}


def stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save(path: Path, value) -> None:
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)


def request(url: str, body=None, timeout=45):
    if urllib.parse.urlparse(url).scheme != "https":
        raise ValueError("HTTPS required")
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "OnePieceFighter-OriginalTextCandidate/1003"})
    return urllib.request.urlopen(req, timeout=timeout)


def probe() -> None:
    folder = ROOT / "metadata" / stamp()
    folder.mkdir(parents=True)
    for label, url in [
        ("tts-config", BASE + "/config"),
        ("tts-api-info", BASE + "/gradio_api/info"),
        ("model-license", "https://huggingface.co/api/models/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"),
        ("space-status", "https://huggingface.co/api/spaces/Qwen/Qwen3-TTS"),
    ]:
        with request(url) as response:
            data = response.read()
        (folder / (label + ".json")).write_bytes(data)
    config = json.loads((folder / "tts-config.json").read_bytes())
    endpoint = next(dep for dep in config["dependencies"] if dep["api_name"] == "generate_custom_voice")
    components = {component["id"]: component for component in config["components"]}
    labels = [components[i]["props"].get("label") for i in endpoint["inputs"]]
    assert labels == ["Text to Synthesize", "Language", "Speaker", "Style Instruction (Optional)", "Model Size"], labels
    save(folder / "probe-summary.json", {"atUtc": datetime.now(timezone.utc).isoformat(), "endpoint": "generate_custom_voice", "inputs": labels, "audioUploadSupportedByThisTool": False, "costRoute": "public-free-demo-only; no token, billing endpoint, purchase or account creation", "files": [{"file": file.name, "sha256": sha(file.read_bytes())} for file in folder.glob("*.json")]})
    print(json.dumps({"metadata": str(folder), "inputs": labels}, ensure_ascii=False))


def consume(folder: Path, event_id: str) -> None:
    response_path = folder / ("response-" + stamp() + ".sse")
    last_event = None
    result = None
    with request(BASE + "/gradio_api/call/generate_custom_voice/" + event_id) as response:
        with response_path.open("x", encoding="utf-8") as stream:
            for raw in response:
                line = raw.decode("utf-8")
                stream.write(line)
                stream.flush()
                if line.startswith("event:"):
                    last_event = line[6:].strip()
                elif line.startswith("data:"):
                    payload = json.loads(line[5:])
                    if last_event == "error":
                        save(folder / ("remote-error-" + stamp() + ".json"), {"error": payload})
                        print(json.dumps({"folder": str(folder), "status": "remote-error", "error": payload}, ensure_ascii=False))
                        return
                    if last_event == "complete":
                        result = payload
                        break
    if result is None:
        raise RuntimeError("Event stream ended without completion; do not repeat generation")
    save(folder / ("complete-" + stamp() + ".json"), result)
    intent = json.loads((folder / "intent.json").read_text(encoding="utf-8"))
    if not isinstance(result, list) or not result or not isinstance(result[0], dict):
        raise RuntimeError("No audio returned: " + str(result))
    audio = result[0]
    url = audio.get("url") or BASE + "/gradio_api/file=" + urllib.parse.quote(audio["path"], safe="/")
    if urllib.parse.urlparse(url).netloc != urllib.parse.urlparse(BASE).netloc:
        raise ValueError("Unexpected download host")
    with request(url) as response:
        blob = response.read()
    with wave.open(__import__("io").BytesIO(blob), "rb") as handle:
        facts = {"sampleRateHz": handle.getframerate(), "channels": handle.getnchannels(), "sampleWidthBytes": handle.getsampwidth(), "frames": handle.getnframes(), "durationSeconds": handle.getnframes() / handle.getframerate()}
    name = f"{intent['character']}-{intent['event']}-qwen-original-1003-{intent['jobStamp']}.wav"
    target = SOURCE / name
    before = {"sourceProvider": BASE, "eventId": event_id, "target": str(target), "bytes": len(blob), "sha256": sha(blob), "operation": "Copy original returned bytes; no gain, filtering, resampling, slice or synthesis after provider"}
    save(folder / "copy-before.json", before)
    with target.open("xb") as out:
        out.write(blob)
    assert sha(target.read_bytes()) == before["sha256"]
    record = {**before, **facts, "requestedText": intent["text"], "speaker": intent["speaker"], "instruct": intent["instruct"], "language": "Chinese", "requestedModel": "1.7B", "actualModelEvidence": "Qwen3-TTS public API custom voice endpoint and request; backend weights are provider declared, not locally inspected", "isOriginalSyntheticSpeech": True, "audioReferenceUploaded": False, "humanListened": False, "nativeAudioReviewed": False, "transcriptVerified": False, "gamePlaybackVerified": False, "adopted": False, "status": "downloaded-original-candidate-unreviewed"}
    save(folder / "download-and-check.json", record)
    print(json.dumps(record, ensure_ascii=False), flush=True)


def generate(character: str, event: str) -> None:
    definition = CHARACTERS[character]
    if event == "pack":
        text = "\n\n".join(definition["events"].values())
    else:
        text = definition["events"][event]
    job_stamp = stamp()
    folder = ROOT / "jobs" / f"{character}-{event}-{job_stamp}"
    folder.mkdir(parents=True)
    data = [text, "Chinese", definition["speaker"], definition["instruct"], "1.7B"]
    save(folder / "intent.json", {"character": character, "event": event, "jobStamp": job_stamp, "text": text, "speaker": definition["speaker"], "instruct": definition["instruct"], "route": BASE + "/gradio_api/call/generate_custom_voice", "maxGenerationCalls": 1, "audioUpload": False, "voiceClone": False, "freeDemoOnly": True, "events": definition["events"] if event == "pack" else {event: text}})
    save(folder / "request.json", {"data": data})
    try:
        with request(BASE + "/gradio_api/call/generate_custom_voice", {"data": data}) as response:
            event_data = json.load(response)
        save(folder / "event.json", event_data)
        print(json.dumps({"folder": str(folder), "eventId": event_data["event_id"], "status": "submitted-once"}), flush=True)
        consume(folder, event_data["event_id"])
    except Exception as error:
        save(folder / ("failure-" + stamp() + ".json"), {"kind": type(error).__name__, "message": str(error), "httpBody": error.read().decode("utf-8", "replace") if isinstance(error, urllib.error.HTTPError) else None, "mustResumeExistingEventNotRegenerate": (folder / "event.json").exists()})
        raise


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["probe", "generate", "resume"])
    parser.add_argument("--character", choices=list(CHARACTERS))
    parser.add_argument("--event", choices=["pack", *CHARACTERS["aokiji"]["events"]])
    parser.add_argument("--job", type=Path)
    args = parser.parse_args()
    assert (ROOT / "README.md").is_file() and (SOURCE / "README.md").is_file()
    if args.action == "probe":
        probe()
    elif args.action == "generate":
        assert args.character and args.event
        generate(args.character, args.event)
    else:
        assert args.job and args.job.resolve().is_relative_to((ROOT / "jobs").resolve())
        event_data = json.loads((args.job / "event.json").read_text(encoding="utf-8"))
        consume(args.job, event_data["event_id"])


if __name__ == "__main__":
    main()
