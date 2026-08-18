# SPEC format reference

A composition is a `spec.json` file. The schema is validated by `lazy check` before anything renders.

## Top-level structure

```jsonc
{
  "specVersion": 1,
  "meta": { ... },
  "style": { ... },
  "scenes": [ ... ],
  "audio": { ... },         // optional
  "outputs": [ ... ]
}
```

## meta

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | string (slug) | required | `[a-z0-9-]+`, used in filenames |
| `width` | int | required | even number, 16–7680 |
| `height` | int | required | even number, 16–4320 |
| `fps` | int | required | 1–120 |
| `durationMs` | int | optional | advisory; engine computes true duration from scenes |
| `qualityTier` | `"draft"` \| `"high"` | `"high"` | informational |

## style

```jsonc
"style": {
  "tokens": {
    "palette": ["#0B0F19", "#22D3EE", "#F8FAFC"],  // min 3, max 10
    "fontDisplay": "Space Grotesk",                  // must be bundled
    "fontBody": "Inter",                             // must be bundled
    "stageBg": "#0B0F19"                             // optional, defaults to palette[0]
  },
  "grade": "vivid"   // none | contrast | vivid | muted | monochrome
}
```

**Palette convention:** index 0 = background, 1 = accent, 2 = foreground. Scenes reference colors by role (`"fg"`, `"accent"`), not by hex.

**Grade** applies a CSS filter to the whole composition (subtle, fast). For a real cinematic color grade, use a LUT on the output (see outputs below).

## scenes

An array of scene objects. Each scene has a base envelope plus type-specific `params`.

### Scene envelope (all types)

| Field | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | one of the 8 scene types (see scene-types.md) |
| `id` | string (slug) | required | unique, `[a-z0-9-]+` |
| `startMs` | int | required | absolute start time in ms |
| `durationMs` | int | required | 100–600000 |
| `transitionIn` | object | `{type:"cut",ms:400}` | see transitions below |
| `transitionOut` | object | `{type:"cut",ms:400}` | see transitions below |
| `beat` | object | optional | audio-reactive pulse (see below) |

### Transitions

| Type | Effect |
|---|---|
| `cut` | instant (no animation) |
| `fade` | opacity in/out |
| `dissolve` | alias for fade (crossfade during overlap) |
| `dip-to-black` | alias for fade (to/from dark stage bg) |
| `whip-pan` | horizontal slide with quick ease |
| `light-leak` | hold + fade (flash-like) |
| `luma-wipe` | vertical slide wipe |

All transitions: `{ "type": "...", "ms": N }`. Transition `ms` must be shorter than scene `durationMs`.

### Beat

```jsonc
"beat": { "bpm": 120, "property": "scale", "amount": 0.04, "decayMs": 200 }
```

Generates deterministic pulse channels at bpm-derived intervals. `property` can be `"scale"` (subtle zoom pulse) or `"opacity"` (brightness pulse). **Note:** `scale` on scenes containing text may not be cross-session byte-stable due to Chrome sub-pixel rendering. Use on `three-scene` or `atmosphere` for guaranteed determinism.

## audio

```jsonc
"audio": {
  "narration": [
    { "text": "...", "sceneId": "feature", "offsetMs": 500, "provider": "say", "voice": "Samantha", "rate": 165, "gainDb": 0 },
    { "text": "...", "startMs": 9000, "provider": "elevenlabs", "voice": "VOICE_ID", "model": "eleven_multilingual_v2" }
  ],
  "music": {
    "mood": "calm",    // calm | pulse
    "bpm": 90,
    "bars": 12,
    "seed": 21,
    "gainDb": -14
  },
  "sfx": [
    { "kind": "whoosh", "atMs": 2400, "seed": 1, "gainDb": -6 }
  ]
}
```

Audio is generated at render time and cached by provider, model, voice settings, and content hash.

- **Narration timing:** use absolute `startMs`, or bind a beat to a visual with `sceneId` + `offsetMs`. Scene-linked speech is measured and rejected if it overruns that scene.
- **Local narration:** `provider: "say"`; macOS uses an installed `say` voice (`say -v '?'`), Windows uses SAPI (`Samantha` falls back to the system voice). `rate` = words/min.
- **Plugin narration:** install the provider first. ElevenLabs uses `provider: "elevenlabs"`, a voice ID, optional `model`, and optional `voiceSettings` (`stability`, `similarityBoost`, `style`, `useSpeakerBoost`). Credentials stay in environment variables.
- **Music:** procedural synth. `bars` controls length (each bar = 4 beats). Looped to video duration.
- **SFX:** `kind` = `whoosh` | `hit` | `rise` | `boom`. `seed` for deterministic variation.

## outputs

```jsonc
"outputs": [
  {
    "format": "mp4",
    "path": "out/video.mp4",
    "codec": "h264",
    "lut": "assets/luts/teal-orange.cube"   // optional, project-relative path to .cube file
  }
]
```

The `lut` field applies a 3D LUT during encoding via ffmpeg `lut3d`. Bundled LUTs: `teal-orange.cube`, `noir-film.cube`, `faded-vintage.cube` (copy from `packages/engine/assets/luts/` into your project's `assets/luts/`). Or supply your own .cube file.
