# Scene types reference

8 scene types. Each has a `type` and type-specific `params`. All share the scene envelope (see spec-format.md).

## typography

Text reveals: titles, quotes, section stingers, lockups.

```jsonc
{
  "type": "typography",
  "params": {
    "lines": [
      { "text": "Lazy Frames", "size": 132, "weight": 700, "font": "display", "color": "fg", "tracking": 0, "delayMs": 0 }
    ],
    "align": "center",            // center | left
    "reveal": "letter-stagger",   // fade-up | letter-stagger | mask-wipe | scale-in
    "staggerMs": 120,             // delay between lines
    "revealMs": 600,              // reveal animation duration
    "charStaggerMs": 26,          // (letter-stagger only) delay between chars
    "bg": { "type": "solid", "color": "#0B0F19" }  // optional, transparent if absent
  }
}
```

**Line fields:** `text` (required), `size` (px, 8–800, default 72), `weight` (100–900, default 600), `font` (`"display"` | `"body"`, default display), `color` (`"fg"` | `"accent"`, default fg), `tracking` (px, -10–40, default 0), `delayMs` (override stagger for this line).

**Reveals:**
- `fade-up`: opacity + Y translate, eased
- `letter-stagger`: per-character opacity + Y, staggered
- `mask-wipe`: overflow-hidden mask, inner slides up
- `scale-in`: opacity + scale, eased

**bg:** `{ "type": "solid", "color": "#hex" }` or `{ "type": "gradient", "from": "#hex", "to": "#hex", "angle": 135 }`. If absent, scene is transparent (stage bg shows).

## stat-hit

Count-up numbers, labels, bars — data-driven motion graphics.

```jsonc
{
  "type": "stat-hit",
  "params": {
    "kicker": "DETERMINISTIC",
    "value": 100,
    "decimals": 0,
    "prefix": "",
    "suffix": "%",
    "label": "byte-stable renders",
    "bars": [{ "value": 72 }, { "value": 88 }, { "value": 64 }],
    "valueSize": 200,
    "bg": { ... }  // optional
  }
}
```

All fields optional except `value`. Kicker fades up first, value counts up (1.6s, outQuint) with scale, label fades up delayed, bars grow (outExpo, staggered).

## browser-frame

A screenshot inside a macOS browser chrome mockup with cursor choreography.

```jsonc
{
  "type": "browser-frame",
  "params": {
    "src": "assets/sites/example.com/hero.png",
    "url": "example.com",
    "zoom": "slow-in",    // none | slow-in (subtle zoom on the screenshot)
    "cursor": {
      "moves": [
        { "xPct": 34, "yPct": 40, "atMs": 900 },
        { "xPct": 62, "yPct": 58, "atMs": 2100 }
      ],
      "clickAtMs": 2800   // optional, ripple at cursor's final position
    },
    "bg": { ... }
  }
}
```

`src` is a project-relative path to a PNG. `cursor.moves` = waypoints the cursor travels through (percent of frame). `xPct`/`yPct` are 0–100. `atMs` is scene-local time.

## ui-callout

A screenshot with a dimmed mask, highlighted hotspot, and label.

```jsonc
{
  "type": "ui-callout",
  "params": {
    "src": "assets/sites/example.com/hero.png",
    "hotspot": { "x": 33, "y": 52, "w": 34, "h": 16 },
    "label": "Primary CTA",
    "zoomStrength": 8,    // 0–10, how much the camera dollies toward the hotspot
    "bg": { ... }
  }
}
```

`hotspot` is in percent of the screenshot (0–100). The screenshot dollies toward the hotspot center while a spotlight box scales in (outBack) and a label chip slides in.

## atmosphere

Drifting gradient blobs — ambient backdrops, scene glue, B-roll backgrounds.

```jsonc
{
  "type": "atmosphere",
  "params": {
    "colors": ["#22D3EE", "#F8FAFC"],  // optional, defaults to palette accent + fg
    "blobCount": 3,                     // 1–4
    "drift": "slow",                    // slow | medium
    "seed": 7,                          // deterministic layout
    "bg": { ... }
  }
}
```

Blobs are blurred radial-gradient divs that drift via deterministic seeded motion. Use behind typography or as a transition interstitial.

## parallax

2.5D camera move over a still image. Two modes:

### Flat mode (no depth map)

```jsonc
{
  "type": "parallax",
  "params": {
    "src": "assets/sites/example.com/full.png",
    "move": "dolly-in",    // dolly-in | dolly-out | pan-left | pan-right
    "grade": "none",       // none | warm | cool | noir (per-scene CSS filter)
    "overlay": "vignette", // none | scrim | vignette
    "bg": { ... }
  }
}
```

Ken Burns-style scale + pan with easing. Good for screenshots.

### Depth mode (with depth map)

```jsonc
{
  "type": "parallax",
  "params": {
    "src": "assets/gen/ridge-21.png",
    "depth": "assets/gen/ridge-21.depth.png",
    "depthStrength": 0.45,  // 0–1, parallax intensity
    "move": "dolly-in",
    "grade": "warm",
    "overlay": "vignette",
    "bg": { ... }
  }
}
```

Per-pixel displacement using a depth map — true 2.5D parallax. The still and depth map can be generated together via `lazy gen image` (procedural art with matching depth). Displacement is computed in pure JS (canvas 2D `putImageData`) for cross-session byte-stability.

## video-layer

Raw footage playback with trim, speed, grade.

```jsonc
{
  "type": "video-layer",
  "params": {
    "src": "assets/footage/clip.mp4",
    "trimStartMs": 0,
    "speed": 1,         // 0.5 | 1 | 2
    "grade": "noir",     // none | warm | cool | noir
    "fit": "cover",      // cover | contain
    "bg": { ... }
  }
}
```

The engine owns video seeking — each frame is extracted at the exact timestamp via `<video>.currentTime` (deterministic per machine). Muted (audio is mixed separately via the `audio` spec section).

## three-scene

Deterministic 3D — canvas-2D projected wireframe/solid/particle scenes.

```jsonc
{
  "type": "three-scene",
  "params": {
    "primitive": "cube",       // cube | ico | grid | particles
    "mode": "wireframe",       // wireframe | fill (cube only)
    "orbit": "slow-spin",      // slow-spin | tumble | static-tilt
    "density": 12,             // 1–40 (grid resolution, particle count)
    "color": "accent",         // fg | accent
    "bg": { ... }
  }
}
```

Pure-JS 3D math (rotation matrices, perspective projection) rendered to canvas 2D via `putImageData` for cross-session byte-stability. No WebGL (SwiftShader was nondeterministic across processes). Good for abstract motion, tech intros, data-viz backdrops.