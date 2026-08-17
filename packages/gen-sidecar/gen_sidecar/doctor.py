import json
import os
import platform
import shutil
import sys


def _total_memory_gb():
    if sys.platform == "win32":
        try:
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
                return round(stat.ullTotalPhys / (1024 ** 3), 1)
        except Exception:
            return None
    try:
        import subprocess

        res = subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            return round(int(res.stdout.strip()) / (1024 ** 3), 1)
    except Exception:
        pass
    try:
        pages = os.sysconf("SC_PHYS_PAGES")
        page = os.sysconf("SC_PAGE_SIZE")
        return round(pages * page / (1024 ** 3), 1)
    except (AttributeError, OSError, ValueError, TypeError):
        return None


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
    total_gb = _total_memory_gb()
    ram = None if total_gb is None else round(total_gb)
    providers = {
        "image.procedural": {"available": True, "engine": "chrome-canvas"},
        "image.mlx-photoreal": {"available": has("mlx.core")},
        "depth.procedural": {"available": True, "engine": "chrome-canvas"},
        "music.procedural": {"available": True, "engine": "numpy" if has("numpy") else "pure"},
        "tts.say": {"available": say_ok, "voices": len(voices)},
        "tts.elevenlabs": {"available": bool(os.environ.get("ELEVENLABS_API_KEY")), "credential": "ELEVENLABS_API_KEY"},
        "tts.mlx": {"available": has("mlx")},
    }
    if ram is not None and ram >= 16 and providers["image.mlx-photoreal"]["available"]:
        tier = "full"
    elif ram is not None and ram >= 8:
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
