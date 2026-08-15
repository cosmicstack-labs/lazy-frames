import json
import math
import os
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _convert_to_wav(source_path, out_path):
    conv = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", source_path, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", out_path],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if conv.returncode != 0:
        return f"ffmpeg convert failed: {conv.stderr.strip()}"
    if os.path.getsize(out_path) < 1000:
        return "tts output suspiciously small"
    return None


def _duration(out_path):
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", out_path],
        capture_output=True,
        text=True,
    )
    if probe.returncode == 0:
        try:
            return round(float(json.loads(probe.stdout)["format"]["duration"]), 3)
        except (KeyError, ValueError):
            pass
    return None


def _generate_say(out_path, text, voice, rate):
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
        error = _convert_to_wav(tmp_path, out_path)
        if error:
            return {"ok": False, "error": error}
        return {"ok": True, "path": out_path, "durationSec": _duration(out_path), "provider": "say", "voice": voice, "rate": rate}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _generate_elevenlabs(out_path, text, voice, model, voice_settings):
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        return {"ok": False, "error": "ELEVENLABS_API_KEY is not set"}
    if not voice or voice == "Samantha":
        return {"ok": False, "error": "ElevenLabs requires a voice ID via --voice"}

    url = "https://api.elevenlabs.io/v1/text-to-speech/{}?output_format=mp3_44100_128".format(
        urllib.parse.quote(voice, safe="")
    )
    body = json.dumps({"text": text, "model_id": model, "voice_settings": voice_settings}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        try:
            opener = urllib.request.build_opener(_NoRedirect)
            with opener.open(request, timeout=120) as response:
                audio = response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read(500).decode("utf-8", errors="replace")
            return {"ok": False, "error": f"ElevenLabs returned HTTP {exc.code}: {detail}"}
        except urllib.error.URLError as exc:
            return {"ok": False, "error": f"ElevenLabs request failed: {exc.reason}"}
        with open(tmp_path, "wb") as stream:
            stream.write(audio)
        error = _convert_to_wav(tmp_path, out_path)
        if error:
            return {"ok": False, "error": error}
        return {
            "ok": True,
            "path": out_path,
            "durationSec": _duration(out_path),
            "provider": "elevenlabs",
            "voice": voice,
            "model": model,
        }
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def generate_tts(out_path, text, voice="Samantha", rate=165, provider="say", model="eleven_multilingual_v2", voice_settings=None):
    settings = voice_settings or {
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0,
        "use_speaker_boost": True,
    }
    if not isinstance(text, str) or not 1 <= len(text) <= 2000:
        return {"ok": False, "error": "text must contain 1 to 2000 characters"}
    if not isinstance(voice, str) or not 1 <= len(voice) <= 200:
        return {"ok": False, "error": "voice must contain 1 to 200 characters"}
    if not isinstance(model, str) or not 1 <= len(model) <= 120:
        return {"ok": False, "error": "model must contain 1 to 120 characters"}
    if not isinstance(rate, int) or not 80 <= rate <= 300:
        return {"ok": False, "error": "rate must be an integer from 80 to 300"}
    for key in ("stability", "similarity_boost", "style"):
        value = settings.get(key)
        if not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
            return {"ok": False, "error": f"{key} must be a finite number from 0 to 1"}
    if not isinstance(settings.get("use_speaker_boost"), bool):
        return {"ok": False, "error": "use_speaker_boost must be a boolean"}
    if provider == "say":
        return _generate_say(out_path, text, voice, rate)
    if provider == "elevenlabs":
        return _generate_elevenlabs(out_path, text, voice, model, settings)
    return {"ok": False, "error": f"unsupported TTS provider: {provider}"}


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
