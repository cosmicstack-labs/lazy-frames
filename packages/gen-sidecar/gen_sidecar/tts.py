import json
import os
import shutil
import subprocess
import tempfile


def generate_tts(out_path, text, voice="Samantha", rate=165):
    if shutil.which("say") is None:
        return {"ok": False, "error": "say not found; macOS TTS unavailable"}
    with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        res = subprocess.run(
            ["say", "-v", voice, "-r", str(rate), "-o", tmp_path, text],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if res.returncode != 0:
            return {"ok": False, "error": f"say failed: {res.stderr.strip()}"}
        conv = subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", tmp_path, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", out_path],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if conv.returncode != 0:
            return {"ok": False, "error": f"ffmpeg convert failed: {conv.stderr.strip()}"}
        size = os.path.getsize(out_path)
        if size < 1000:
            return {"ok": False, "error": "tts output suspiciously small"}
        duration = None
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", out_path],
            capture_output=True,
            text=True,
        )
        if probe.returncode == 0:
            try:
                duration = round(float(json.loads(probe.stdout)["format"]["duration"]), 3)
            except (KeyError, ValueError):
                pass
        return {"ok": True, "path": out_path, "durationSec": duration, "voice": voice, "rate": rate}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def list_voices():
    if shutil.which("say") is None:
        return []
    res = subprocess.run(["say", "-v", "?"], capture_output=True, text=True, timeout=30)
    if res.returncode != 0:
        return []
    names = []
    for line in res.stdout.splitlines():
        parts = line.split()
        if parts:
            names.append(parts[0])
    return names
