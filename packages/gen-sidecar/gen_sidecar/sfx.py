import math
import random
import struct
import wave


def _write_wav(path, samples, rate=44100):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for s in samples:
            v = int(max(-1.0, min(1.0, s)) * 32767)
            frames += struct.pack("<h", v)
        w.writeframes(bytes(frames))


def _whoosh(seed, rate):
    rng = random.Random(seed)
    dur = 0.45
    n = int(rate * dur)
    out = [0.0] * n
    prev = 0.0
    for i in range(n):
        t = i / n
        raw = rng.random() * 2 - 1
        env = math.sin(math.pi * t) ** 1.5
        bandpass = (raw - prev * 0.92) * (0.3 + 0.7 * t)
        prev = raw
        out[i] = bandpass * env * 0.6
    return out, dur


def _hit(seed, rate):
    rng = random.Random(seed)
    dur = 0.12
    n = int(rate * dur)
    out = [0.0] * n
    freq = 180 + rng.random() * 60
    for i in range(n):
        t = i / rate
        env = math.exp(-t * 30)
        body = math.sin(2 * math.pi * freq * t)
        noise = (rng.random() * 2 - 1) * 0.3
        out[i] = (body * 0.7 + noise) * env * 0.7
    return out, dur


def _rise(seed, rate):
    rng = random.Random(seed)
    dur = 0.7
    n = int(rate * dur)
    out = [0.0] * n
    f0 = 120 + rng.random() * 40
    f1 = 700 + rng.random() * 200
    for i in range(n):
        t = i / n
        u = t * t
        f = f0 + (f1 - f0) * u
        phase = 2 * math.pi * f * (i / rate)
        env = math.sin(math.pi * t) ** 0.5
        out[i] = math.sin(phase) * env * 0.4
    return out, dur


def _boom(seed, rate):
    rng = random.Random(seed)
    dur = 0.5
    n = int(rate * dur)
    out = [0.0] * n
    prev = 0.0
    for i in range(n):
        t = i / rate
        env = math.exp(-t * 8)
        sub = math.sin(2 * math.pi * 55 * t) * 0.6
        raw = rng.random() * 2 - 1
        bp = (raw - prev * 0.95) * 0.3
        prev = raw
        out[i] = (sub + bp) * env * 0.7
    return out, dur


_KINDS = {"whoosh": _whoosh, "hit": _hit, "rise": _rise, "boom": _boom}


def generate_sfx(out_path, kind="whoosh", seed=0, rate=44100):
    fn = _KINDS.get(kind)
    if fn is None:
        return {"ok": False, "error": f"unknown sfx kind '{kind}'; use whoosh|hit|rise|boom"}
    try:
        import numpy as np

        samples, dur = fn(seed, rate)
        arr = np.array(samples, dtype=np.float64)
        arr = np.tanh(arr * 0.9)
        _write_wav(out_path, arr.tolist(), rate)
        engine = "numpy"
    except ImportError:
        samples, dur = fn(seed, rate)
        samples = [math.tanh(s * 0.9) for s in samples]
        _write_wav(out_path, samples, rate)
        engine = "pure"
    return {"ok": True, "path": out_path, "durationSec": round(dur, 3), "kind": kind, "seed": seed, "engine": engine}