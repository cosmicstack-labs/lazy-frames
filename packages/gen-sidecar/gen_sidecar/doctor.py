import json
import platform
import shutil
import sys


def probe():
    def has(mod):
        try:
            __import__(mod)
            return True
        except ImportError:
            return False

    say_ok = shutil.which("say") is not None
    voices = []
    if say_ok:
        from . import tts

        voices = tts.list_voices()
    total_gb = None
    try:
        import subprocess

        res = subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            total_gb = round(int(res.stdout.strip()) / (1024 ** 3), 1)
    except Exception:
        pass
    providers = {
        "image.procedural": {"available": True, "engine": "chrome-canvas"},
        "image.mlx-photoreal": {"available": has("mlx.core")},
        "depth.procedural": {"available": True, "engine": "chrome-canvas"},
        "music.procedural": {"available": True, "engine": "numpy" if has("numpy") else "pure"},
        "tts.say": {"available": say_ok, "voices": len(voices)},
        "tts.mlx": {"available": has("mlx")},
    }
    if total_gb is not None and total_gb >= 16 and providers["image.mlx-photoreal"]["available"]:
        tier = "full"
    elif total_gb is not None and total_gb >= 8:
        tier = "lite"
    else:
        tier = "minimal"
    return {
        "ok": True,
        "python": platform.python_version(),
        "memoryGb": total_gb,
        "tier": tier,
        "providers": providers,
    }


if __name__ == "__main__":
    print(json.dumps(probe(), indent=2))
    sys.exit(0)
