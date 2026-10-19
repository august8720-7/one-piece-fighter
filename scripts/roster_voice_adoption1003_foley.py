"""Explicit CC0 audio derivatives for two complete nine-skill sound maps.

All signal layers are read from verified published assets. This does not
generate character speech or establish a listening review.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import urllib.request
import wave

import numpy as np

PROJECT = Path(__file__).resolve().parents[1]
ROOT = Path("D:/one-piece-fighter-crossover-0922/roster-0929/acceptance/voice/continuation-1003")
SOURCE = PROJECT / "public/assets/audio/sources"
NEW = SOURCE / "roster-1003/foley"
FFMPEG = Path("D:/one-piece-fighter-crossover-0922/tools/audio-0925/packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe")
RATE = 44100


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path: Path, data) -> None:
    with path.open("x", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    out = ROOT / "foley" / stamp
    out.mkdir(parents=True)
    assert (NEW / "README.md").is_file()
    source_urls = [("glass-break-source1003.html", "https://opengameart.org/content/glass-break"), ("glass-break-till-behrend-1003.wav", "https://opengameart.org/sites/default/files/glass_breaking.wav")]
    save(out / "copy-before.json", {"explicitNewSources": [{"file": str(NEW / name), "url": url} for name, url in source_urls], "license": "CC0; author Till Behrend, submitted by TinyWorlds, as actually displayed on original page", "recordingOrigin": "Provider says created for Duckstruction; underlying recording/synthesis method unknown; never called original One Piece SFX"})
    for name, url in source_urls:
        target = NEW / name
        if not target.exists():
            with urllib.request.urlopen(url, timeout=30) as response:
                blob = response.read()
            with target.open("xb") as dest:
                dest.write(blob)
    page = (NEW / source_urls[0][0]).read_text(encoding="utf-8", errors="replace")
    assert "CC0" in page and "Till Behrend" in page
    ledger = json.loads((SOURCE / "audio-preparation-ledger-0912.json").read_text(encoding="utf-8-sig"))
    seen = {}
    cache = {}
    glass = NEW / source_urls[1][0]

    def load(name: str):
        if name in cache:
            return cache[name]
        if name == "glass":
            path = glass
            origin = {"url": source_urls[1][1], "page": source_urls[0][1], "author": "Till Behrend / TinyWorlds", "license": "CC0", "sourcePageSha256": sha(NEW / source_urls[0][0])}
        else:
            path = SOURCE / name
            origin = ledger["sources"][name]
            assert origin["license"] == "CC0", origin
            assert sha(path) == origin["sha256"], path
        raw = subprocess.check_output([str(FFMPEG), "-nostdin", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"])
        signal = np.frombuffer(raw, dtype="<f4").astype(np.float64)
        assert np.isfinite(signal).all() and len(signal) > 0
        cache[name] = signal
        seen[name] = {"file": str(path), "sha256": sha(path), "decodedSeconds": len(signal) / RATE, **origin}
        return signal

    def piece(name, begin=0, seconds=.35, speed=1, gain=1, hp=None, lp=None, reverse=False, offset=0):
        signal = load(name)
        assert 0 <= begin < len(signal) / RATE
        last = min(len(signal), round((begin + seconds) * RATE))
        signal = signal[round(begin * RATE):last].copy()
        if reverse:
            signal = signal[::-1]
        if speed != 1:
            signal = np.interp(np.arange(max(1, round(len(signal) / speed))) * speed, np.arange(len(signal)), signal)
        if hp or lp:
            frequencies = np.fft.rfftfreq(len(signal), 1 / RATE)
            spectrum = np.fft.rfft(signal)
            if hp:
                spectrum *= 1 / np.sqrt(1 + (hp / np.maximum(1, frequencies)) ** 8)
            if lp:
                spectrum *= 1 / np.sqrt(1 + (frequencies / lp) ** 8)
            signal = np.fft.irfft(spectrum, n=len(signal))
        signal -= np.mean(signal)
        signal *= gain / max(float(np.max(np.abs(signal))), 1e-6)
        return signal, {"source": name, "sourceSha256": seen[name]["sha256"], "beginSeconds": begin, "endSeconds": last / RATE, "speed": speed, "gain": gain, "highpassHz": hp, "lowpassHz": lp, "reverse": reverse, "offsetSeconds": offset}

    def swish(n, **options):
        return piece(f"swish/swosh-{n:02}.flac", **options)

    def hit(n, **options):
        return piece(f"hits/hit{n:02}.mp3.flac", **options)

    def ice(**options):
        return piece("glass", **options)

    def wind(**options):
        return piece("wind_background_noise_2.wav", begin=4, **options)

    profiles = {
        "aokiji": {
            "sp_ice_lance": ("ice_lance", [ice(begin=.10, seconds=.22, reverse=True, gain=.55), wind(seconds=.24, hp=1900, gain=.15)], [swish(2, speed=1.3, gain=.75), ice(begin=.05, seconds=.33, hp=900, gain=.6)], [ice(begin=.65, seconds=.20, hp=1200, gain=.3)]),
            "sp_ice_blade": ("ice_blade", [ice(begin=.04, seconds=.20, reverse=True, gain=.45)], [swish(4, speed=1.1, gain=.8), ice(begin=.12, seconds=.30, hp=650, gain=.4)], [swish(4, begin=.10, seconds=.18, speed=1.4, gain=.3)]),
            "sp_ice_uplift": ("ice_uplift", [ice(begin=.20, seconds=.22, reverse=True, gain=.5)], [swish(7, speed=1.25, gain=.7), ice(begin=.02, seconds=.36, speed=1.2, gain=.65)], [ice(begin=.80, seconds=.23, gain=.25)]),
            "sp_ice_spike": ("ice_spike", [wind(seconds=.33, lp=1500, gain=.3), ice(begin=.4, seconds=.28, reverse=True, gain=.55)], [hit(19, seconds=.34, lp=2000, gain=.55), ice(seconds=.48, speed=.8, gain=.8)], [ice(begin=.72, seconds=.30, gain=.35)]),
            "sp_ice_mirror": ("ice_mirror", [ice(begin=.18, seconds=.16, speed=1.8, hp=1400, gain=.7)], [hit(3, seconds=.16, speed=1.6, hp=1400, gain=.45), ice(begin=.08, seconds=.27, speed=1.5, gain=.75)], [ice(begin=.62, seconds=.22, speed=1.1, hp=1800, gain=.25)]),
            "sp_ice_body": ("ice_body", [ice(begin=.18, seconds=.18, reverse=True, gain=.5)], [swish(3, seconds=.30, speed=1.4, gain=.6), ice(begin=.13, seconds=.22, hp=1800, gain=.45)], [wind(seconds=.22, hp=2100, gain=.25)]),
            "sp_ice_pheasant": ("ice_pheasant", [ice(begin=.20, seconds=.30, reverse=True, gain=.65), wind(seconds=.35, hp=850, gain=.25)], [wind(seconds=.50, hp=700, gain=.4), swish(5, seconds=.40, speed=.8, gain=.7), ice(seconds=.52, gain=.65)], [ice(begin=.64, seconds=.33, hp=700, gain=.35)]),
            "sp_glacier_line": ("glacier_line", [wind(seconds=.4, lp=1300, gain=.3), ice(begin=.42, seconds=.27, reverse=True, gain=.5)], [ice(seconds=.38, gain=.75), ice(begin=.08, seconds=.33, speed=.9, gain=.65, offset=.08), ice(begin=.15, seconds=.35, speed=1.1, gain=.65, offset=.16), hit(19, seconds=.38, lp=1700, gain=.35)], [ice(begin=.80, seconds=.35, speed=.85, gain=.35)]),
            "ult_ice_age": ("ice_age", [wind(seconds=.60, lp=1100, gain=.35), ice(begin=.08, seconds=.40, reverse=True, speed=.8, gain=.65)], [ice(seconds=.65, speed=.72, gain=.8), ice(begin=.06, seconds=.45, speed=1.1, gain=.45, offset=.12), hit(19, seconds=.4, speed=.75, lp=1500, gain=.5)], [ice(begin=.72, seconds=.50, speed=.8, gain=.35), wind(seconds=.45, lp=1200, gain=.18)]),
        },
        "shanks": {
            "sp_haki_slash": ("haki_slash", [swish(3, speed=.95, reverse=True, gain=.65)], [swish(5, speed=.85, gain=.9), wind(seconds=.4, hp=350, gain=.2)], [swish(5, begin=.10, seconds=.24, speed=1.2, gain=.25)]),
            "sp_single_arm_cut": ("single_arm_cut", [swish(2, seconds=.2, speed=1.2, gain=.6)], [swish(4, speed=1.25, gain=.8), swish(7, speed=1.2, gain=.75, offset=.09)], [swish(3, seconds=.2, speed=1.3, gain=.25)]),
            "sp_rising_guard": ("rising_guard", [swish(7, speed=.9, reverse=True, gain=.55)], [swish(7, speed=1.15, gain=.8), hit(3, seconds=.20, speed=1.6, hp=1000, gain=.3)], [swish(4, begin=.1, seconds=.2, speed=1.2, gain=.25)]),
            "sp_step_thrust": ("step_thrust", [hit(4, begin=.15, seconds=.16, lp=600, gain=.4), swish(2, seconds=.23, reverse=True, gain=.45)], [swish(2, speed=1.45, gain=.9), hit(1, seconds=.15, speed=1.5, hp=500, gain=.2)], [swish(2, begin=.12, seconds=.15, gain=.25)]),
            "sp_low_cut": ("low_cut", [swish(3, seconds=.24, reverse=True, gain=.5)], [swish(3, seconds=.35, speed=1.15, gain=.9)], [swish(4, begin=.10, seconds=.18, gain=.25)]),
            "sp_sidestep": ("sidestep", [hit(4, begin=.15, seconds=.15, lp=650, gain=.3)], [swish(2, seconds=.22, speed=1.65, gain=.7)], [hit(4, begin=.15, seconds=.15, speed=1.1, lp=600, gain=.25)]),
            "sp_divine_departure": ("divine_departure", [swish(5, seconds=.4, speed=.8, reverse=True, gain=.6), wind(seconds=.33, lp=850, gain=.25)], [swish(5, speed=.75, gain=.85), hit(9, seconds=.30, speed=.9, gain=.6), wind(seconds=.45, hp=750, gain=.25)], [swish(3, seconds=.28, speed=.85, gain=.3)]),
            "sp_emperor_cuts": ("emperor_cuts", [swish(4, seconds=.28, reverse=True, gain=.55)], [swish(2, speed=1.25, gain=.75), swish(4, speed=1.35, gain=.8, offset=.08), swish(7, speed=1.2, gain=.8, offset=.17)], [swish(5, begin=.12, seconds=.23, gain=.25)]),
            "ult_red_hair_finale": ("red_hair_finale", [wind(seconds=.60, lp=900, gain=.4), swish(5, seconds=.45, speed=.75, reverse=True, gain=.65)], [swish(5, speed=.7, gain=.85), hit(19, seconds=.42, speed=.8, lp=2300, gain=.55), swish(7, seconds=.4, speed=.8, gain=.45, offset=.12)], [wind(seconds=.42, hp=850, gain=.25), swish(4, begin=.12, seconds=.25, gain=.25)]),
        },
    }
    files, cues, moves = [], {}, {}
    for char, definitions in profiles.items():
        moves[char] = {}
        for move, (family, *stages) in definitions.items():
            moves[char][move] = {"family": family, "genericEffortCue": f"voice.{char}.effort", "dedicatedMoveVoice": False, "stages": {}}
            for stage, layers in zip(["start", "release", "end"], stages):
                n = min(round((.75 if stage == "release" else .6) * RATE), max(round(spec["offsetSeconds"] * RATE) + len(samples) for samples, spec in layers))
                mixed = np.zeros(n)
                for samples, spec in layers:
                    first = round(spec["offsetSeconds"] * RATE)
                    count = min(len(samples), n - first)
                    if count > 0:
                        mixed[first:first + count] += samples[:count]
                mixed -= np.mean(mixed)
                mixed *= (.78 if stage == "release" else .65 if stage == "start" else .45) / max(float(np.max(np.abs(mixed))), 1e-6)
                fade_in, fade_out = min(round(.004 * RATE), n // 2), min(round(.065 * RATE), n // 2)
                mixed[:fade_in] *= np.linspace(0, 1, fade_in)
                mixed[-fade_out:] *= np.linspace(1, 0, fade_out)
                path = out / f"{char}-{family}-{stage}-cc0-1003.wav"
                pcm = (np.clip(mixed, -.9999, .9999) * 32767).round().astype("<i2").tobytes()
                with wave.open(str(path), "wb") as wav:
                    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(RATE); wav.writeframes(pcm)
                with wave.open(str(path), "rb") as wav:
                    assert wav.readframes(wav.getnframes()) == pcm
                cue = f"sfx.{char}.{family}.{stage}"
                runtime = f"assets/audio/sfx/{path.name}"
                cues[cue] = {"files": [runtime], "group": "sfx", "characterId": char, "gain": .45 if stage == "start" else .7 if stage == "release" else .3, "priority": 30 if stage == "start" else 45 if stage == "release" else 20, "cooldownMs": 80 if stage == "start" else 35, "maxInstances": 3 if stage == "release" else 2, "source": "docs/assets/声音接续1003.md", "note": "Original game audio design from explicit CC0 audio sources; not official One Piece audio. Candidate awaiting native listening/game mix review."}
                row = {"character": char, "moveId": move, "family": family, "stage": stage, "cueId": cue, "candidate": str(path), "proposedRuntimeFile": runtime, "bytes": path.stat().st_size, "sha256": sha(path), "sampleRateHz": RATE, "channels": 1, "durationSeconds": n / RATE, "peakAbs": float(np.max(np.abs(mixed))), "pcmFullScaleSamples": int(np.sum(np.abs(np.frombuffer(pcm, dtype="<i2")) >= 32767)), "headAndTailSampleZero": pcm[:2] == b"\x00\x00" and pcm[-2:] == b"\x00\x00", "recipes": [spec for _, spec in layers], "humanListened": False, "nativeAudioReviewed": False, "gamePlaybackVerified": False, "adopted": False}
                files.append(row)
                moves[char][move]["stages"][stage] = cue
    candidate_manifest = {"version": 1, "scope": "candidate for parent integration; not a formal sample manifest", "createdAtUtc": datetime.now(timezone.utc).isoformat(), "sources": seen, "sourceChecks": {"filesUnchanged": all(sha(Path(row["file"])) == row["sha256"] for row in seen.values()), "newRawGlassBytes": glass.stat().st_size, "newRawGlassSha256": sha(glass)}, "files": files, "cues": cues, "moves": moves, "candidateSkillCount": 18, "candidateCueCount": len(cues), "adoptedCueCount": 0, "remainingReview": "Native listening plus actual game release/hit/end/mix; technical signal metrics are not sound acceptance"}
    save(out / "foley-candidates1003.json", candidate_manifest)
    manifest = PROJECT / "scripts/roster_voice_adoption1003.foley.json"
    assert not manifest.exists(), "Do not overwrite earlier manifest; use separate run suffix"
    save(manifest, candidate_manifest)
    print(json.dumps({"evidence": str(out), "manifest": str(manifest), "skillMaps": 18, "candidateCues": len(cues), "candidateFiles": len(files), "formalAdopted": 0, "glassSha256": sha(glass)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
