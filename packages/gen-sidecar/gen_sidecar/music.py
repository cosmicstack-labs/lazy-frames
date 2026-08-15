import json
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


def _generate_pure(chords, total_samples, rate, beat_samples, mood, rng):
    out = [0.0] * total_samples
    for bar, chord in enumerate(chords):
        start = bar * beat_samples * 4
        end = min(total_samples, start + beat_samples * 4 + int(rate * 0.5))
        length = end - start
        if length <= 0:
            continue
        env = []
        for i in range(length):
            u = i / length
            env.append(min(1.0, u * 8.0, (1.0 - u) * 3.0) * 0.9 + 0.1)
        oscs = []
        for f in chord:
            oscs.append((f * 0.9985, 0.22 / len(chord)))
            oscs.append((f * 1.0015, 0.22 / len(chord)))
        sub = chord[0] / 2.0
        for i in range(length):
            t = i / rate
            v = 0.30 * math.sin(2 * math.pi * sub * t)
            for f, amp in oscs:
                v += amp * math.sin(2 * math.pi * f * t + math.sin(2 * math.pi * 0.15 * t))
            out[start + i] += v * env[i]
    if mood == "pulse":
        noise = rng
        prev = 0.0
        for b in range(total_samples // beat_samples):
            bs = b * beat_samples
            is_beat = b % 2 == 0
            n = int(rate * (0.10 if is_beat else 0.03))
            for i in range(min(n, total_samples - bs)):
                t = i / rate
                if is_beat:
                    s = math.sin(2 * math.pi * 62 * t) * math.exp(-t * 24)
                else:
                    raw = noise.random() * 2 - 1
                    s = (raw - prev * 0.5) * math.exp(-t * 90)
                    prev = raw
                out[bs + i] += 0.5 * s
    for i in range(total_samples):
        out[i] = math.tanh(out[i] * 0.9)
    return out


def _generate_numpy(chords, total_samples, rate, beat_samples, mood, rng):
    import numpy as np

    t = np.arange(total_samples, dtype=np.float64) / rate
    out = np.zeros(total_samples)
    for bar, chord in enumerate(chords):
        start = bar * beat_samples * 4
        end = min(total_samples, start + beat_samples * 4 + int(rate * 0.5))
        if end <= start:
            continue
        length = end - start
        u = np.arange(length) / length
        env = np.minimum(np.minimum(1.0, u * 8.0), (1.0 - u) * 3.0) * 0.9 + 0.1
        seg_t = t[start:end]
        v = 0.30 * np.sin(2 * np.pi * (chord[0] / 2.0) * seg_t)
        for f in chord:
            v += (0.22 / len(chord)) * np.sin(2 * np.pi * f * 0.9985 * seg_t)
            v += (0.22 / len(chord)) * np.sin(2 * math.pi * f * 1.0015 * seg_t + np.sin(2 * math.pi * 0.15 * seg_t))
        out[start:end] += v * env
    if mood == "pulse":
        for b in range(total_samples // beat_samples):
            bs = b * beat_samples
            is_beat = b % 2 == 0
            n = min(int(rate * (0.10 if is_beat else 0.03)), total_samples - bs)
            if n <= 0:
                continue
            lt = np.arange(n) / rate
            if is_beat:
                s = np.sin(2 * np.pi * 62 * lt) * np.exp(-lt * 24)
            else:
                raw = np.array([rng.random() * 2 - 1 for _ in range(n)])
                s = np.diff(raw, prepend=0.0) * np.exp(-lt * 90)
            out[bs : bs + n] += 0.5 * s
    return np.tanh(out * 0.9).tolist()


CHORDS = {
    "Am": [110.0, 130.81, 164.81, 220.0],
    "F": [87.31, 130.81, 174.61, 220.0],
    "C": [130.81, 164.81, 196.0, 261.63],
    "G": [98.0, 146.83, 196.0, 246.94],
}
PROGRESSION = ["Am", "F", "C", "G"]


def generate_music(out_path, mood="calm", bpm=90, bars=12, seed=11, rate=44100):
    rng = random.Random(seed)
    beat_samples = int(rate * 60.0 / bpm)
    total_samples = int(rate * (bars * 4 * 60.0 / bpm))
    chords = [CHORDS[PROGRESSION[i % 4]] for i in range(bars)]
    try:
        import numpy  # noqa: F401

        samples = _generate_numpy(chords, total_samples, rate, beat_samples, mood, rng)
    except ImportError:
        samples = _generate_pure(chords, total_samples, rate, beat_samples, mood, rng)
    _write_wav(out_path, samples, rate)
    return {
        "ok": True,
        "path": out_path,
        "durationSec": round(total_samples / rate, 3),
        "engine": "numpy" if _has_numpy() else "pure",
        "mood": mood,
        "bpm": bpm,
        "bars": bars,
        "seed": seed,
    }


def _has_numpy():
    try:
        import numpy  # noqa: F401

        return True
    except ImportError:
        return False
