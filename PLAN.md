# Lazy Frames — Plan

Agentic video generation skill: an agent researches any input (a website URL, a text brief, footage) and dumps a typed spec; Lazy Frames turns that spec into a finished, pixel-perfect MP4 — fully local.

Release versions remain on the `0.6.x` line until a deliberate minor release is approved. Routine releases increment only the patch component (for example, `0.6.2` to `0.6.3`).

## 1. Positioning

| | HyperFrames | Lazy Frames |
|---|---|---|
| Media generation | None (TTS/music/matting only) | Local gen sidecar: photoreal stills, depth maps, TTS, music |
| Determinism | Author-enforced rules (docs warn of "guaranteed first build failure") | Engine-owned clocks/media — author *cannot* create nondeterminism |
| Process ceremony | Intent interview → BRIEF.md → 10+ routing skills | Agent dumps one typed SPEC; validation before authoring |
| QA | Advisory checks | Blocking gates incl. snapshot regression |
| Renderer | Headless Chrome screenshot loop → FFmpeg | Headless Chrome + WebCodecs fast-path encode → FFmpeg mux (frame-loop fallback) |
| Photoreal content | Out of scope | Generated stills + depth-parallax camera moves + grading |

**Target machine (tier-1 reference):** MacBook Pro M2, 8 GB unified memory, ffmpeg + Node 20 present. All capability decisions below are sized to this box.

### Hardware capability matrix

| Capability | 8 GB M2 verdict |
|---|---|
| Photoreal stills (SDXL / Flux-schnell 8-bit via MLX) | ✅ ~60–120 s/image |
| Depth-based 2.5D camera motion over stills | ✅ free (deterministic WebGL) |
| Cinematic grading, sound design, typography | ✅ free |
| Local video-gen (Wan/LTX) | ❌ memory swaps, impractical |
| Photoreal humans in full motion | ❌ stills + parallax only |

**"Photoreal cinematic" locally = generated stills + depth-parallax + grading + sound.** This is a real cinematic style and the thing HyperFrames cannot do at all.

### Non-goals (for now)

- Cloud gen-video APIs (Veo/Kling/Runway). The gen layer is behind a provider interface so they can slot in later without rearchitecting.
- Local text-to-video models on tier-1 hardware.
- Interactive decks/slideshows.

## 2. Architecture

```
SPEC (typed JSON — agent dumps; same format for every workflow)
  │
  ├─ lazy doctor     hardware tiering: probe chip/RAM/GPU → pick models, resolution
  │                 caps, parallelism; emit capability report JSON
  ├─ lazy capture    headless Chrome site capture: full-page + viewport + scroll
  │                 screenshots @2x DPR, asset extraction (logo, palette, fonts,
  │                 copy blocks), frozen locally → feeds SPEC scenes + style tokens
  ├─ lazy gen        local MLX gen sidecar (Python): photoreal stills, depth maps,
  │                 TTS, music → every asset frozen on disk + ledger record
  ├─ Composition     HTML+WebGL, ONE seekable timeline. Scene types (§4) incl.
  │                 2.5D-parallax shared by gen stills AND screenshots
  ├─ lazy check      blocking gates: schema → layout/overflow → contrast →
  │                 snapshot regression vs baseline
  ├─ lazy preview    local timeline scrubber UI
  └─ lazy render     headless Chrome deterministic seek + WebCodecs fast-path
                    encode → FFmpeg mux; fallback: parallelized frame loop
```

### Project layout

```
lazy-frames/
├── PLAN.md
├── packages/
│   ├── cli/            # `lazy` CLI (Node 20+): doctor, capture, gen, check, preview, render
│   ├── engine/         # composition runtime: timeline, clocks, media ownership, scene types
│   ├── renderer/       # headless Chrome driver, WebCodecs encoder, FFmpeg muxer
│   ├── capture/        # site capture + asset/brand extraction
│   └── gen-sidecar/    # Python/MLX: image gen, depth, TTS, music; provider interface
└── skill/              # agent-facing SKILL.md + workflow references (P4)
```

## 3. SPEC format

One typed JSON, validated by `lazy check --schema-only` **before** any authoring starts. Invalid spec = immediate, named errors — never a half-built composition.

```jsonc
{
  "specVersion": 1,
  "meta": {
    "id": "acme-promo",
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "durationMs": 42000,           // advisory; engine computes true duration from scenes
    "qualityTier": "high"          // doctor may downgrade per hardware tier
  },
  "style": {
    "tokens": {                    // free-form; scenes consume via CSS vars
      "palette": ["#0B0F19", "#22D3EE", "#F8FAFC"],
      "fontDisplay": "Space Grotesk",
      "fontBody": "Inter",
      "grain": 0.06,
      "grade": "teal-orange-cine"
    },
    "source": "captured:acme.com"  // or "spec:manual" — provenance for style tokens
  },
  "scenes": [ /* scene objects, §4 */ ],
  "audio": {
    "narration": { "provider": "local-tts", "voice": "nova", "segments": "script.md" },
    "music": { "provider": "local-gen", "mood": "cinematic-tension", "bpm": 90 }
  },
  "outputs": [
    { "format": "mp4", "path": "out/acme-promo.mp4", "codec": "h264" }
  ]
}
```

Scene envelope (all scene types share it):

```jsonc
{
  "type": "parallax",              // §4 registry
  "id": "hero-dolly",
  "startMs": 0,
  "durationMs": 4000,
  "transitionIn": { "type": "film-dissolve", "ms": 500 },
  "transitionOut": { "type": "cut" },
  "params": { /* type-specific */ },
  "assets": [                      // every asset must exist in the ledger at check time
    { "role": "image", "ref": "ledger:acme-hero.png" },
    { "role": "depth", "ref": "ledger:acme-hero.depth.png" }
  ]
}
```

**Ledger** (`assets/ledger.json`): every media file gets one record — source (generated / captured / user-supplied), provider, prompt or URL provenance, hash, dimensions, generation params. Compositions reference assets only via `ledger:` IDs. No network at render time, ever.

## 4. Scene types

Scene types are engine-provided components. Authors (agents) configure them via `params`; the engine owns their clocks, visibility, and media — nondeterminism is impossible by construction.

| Type | Purpose | Key params | Ships in |
|---|---|---|---|
| `parallax` | 2.5D camera move over a still (gen still OR screenshot — same shader) | image, depth map, cameraPath (dolly/pan/orbit/zoom), dof, parallaxStrength | P1 (screenshot mode), P2 (gen mode) |
| `motion-graphics` | Kinetic typography, stat hits, chart builds | elements[], timeline beats, easing profiles | P1 |
| `typography` | Title cards, quotes, section stingers | text, layout, reveal style | P1 |
| `browser-frame` | Screenshot inside a macUI browser chrome with cursor choreography | screenshot, url, scrollCue, cursorPath | P1 |
| `ui-callout` | Feature callout over a screenshot: magnifier, arrow, dim-mask | screenshot, hotspot(x,y,w,h), calloutStyle | P1 |
| `video-layer` | Raw footage playback with trims/speed/grade | ledger video ref, trim, speed, lut | P2 |
| `three-scene` | First-class Three.js/WebGPU scene (not a bolt-on adapter) | module ref (bundled, deterministic seed) | P3 |
| `gradient-atmosphere` | Generated ambient backdrops (mesh gradients, nebula) for scene glue | palette, motion | P1 |

Shared transitions: `cut`, `film-dissolve`, `whip-pan`, `light-leak`, `dip-to-black`, `luma-wipe`.

## 5. Determinism model (engine-owned)

The failure mode we're eliminating: HyperFrames makes the *author* responsible for seek-safety (bans on render-time clocks, unseeded random, `repeat: -1`, CSS/GSAP transform conflicts…). Lazy Frames inverts ownership:

1. **One clock.** Scenes receive `t` (ms) from the engine's seek loop. No `requestAnimationFrame`, no `Date.now`, no `setInterval` inside scenes — the engine runtime doesn't expose them.
2. **Declarative params → engine-interpolated motion.** Camera paths, element beats, and transitions are data; the engine evaluates them as pure functions of `t`.
3. **Media is engine-owned.** Videos decode via seek-driven frame extraction; audio positions derive from `t`. Authors declare, engine plays.
4. **Seeded randomness only.** Grain, particles, atmospheres take a seed from the spec hash. Same spec + assets → byte-identical frames.
5. **Bundled modules for `three-scene`.** External scene code runs in a sandboxed, deterministic context (no network, no wall clock, seeded PRNG injected).

## 6. QA gates (`lazy check`)

Blocking. A failing gate names the scene, the frame, and the fix.

1. **Schema** — spec validates; all `ledger:` refs resolve; fonts exist.
2. **Static layout** — author-time DOM audit: overflow, unsized roots, contrast (WCAG AA on text scenes).
3. **Snapshot regression** — render keyframes (scene midpoints + transition midpoints) at 2x and diff against `snapshots/` baselines; perceptual hash with threshold. First run establishes baseline; `--update-baselines` is explicit and reviewed.
4. **Seek determinism** — sample N random timestamps, render each twice, assert identical hashes.
5. **Dry render** — full timeline walk at low fps; catches runtime errors, failed decodes, blank frames (frame-luminance check).

## 7. Renderer

- **Driver:** headless Chrome (system Chrome via CDP). Page load → engine builds timeline → driver seeks to `t = n/fps`.
- **Fast path:** in-page `VideoEncoder` (WebCodecs) with hardware acceleration — encode frames as they're rendered, pipe encoded chunks to disk, FFmpeg muxes + audio. Target: ≥10× the screenshot-loop throughput.
- **Fallback:** parallel frame extraction (multiple Chrome targets rendering interleaved frame ranges) → FFmpeg assemble. Used when WebCodecs is unavailable or codec support is missing.
- **Audio:** engine renders the audio timeline (narration + music + SFX with trims/gains) offline via FFmpeg filters; muxed at the end. No in-page audio decode.
- **Verification:** every render ends with `ffprobe` assertions — exists, non-empty, duration ≈ spec, streams present.

## 8. Gen sidecar (`packages/gen-sidecar`)

Python + MLX, driven by the CLI over a small JSON-RPC/stdio protocol; fully optional — engine and website workflow work with zero ML installed.

| Capability | Tier-1 implementation | Notes |
|---|---|---|
| Image gen | Flux-schnell or SDXL, 8-bit/4-bit MLX quant | 1024px cap on 8 GB; batch of 1 |
| Depth estimation | Depth-Anything-2 small (MLX) | → parallax depth maps |
| TTS | Kokoro (MLX, CPU-friendly) | voice registry in spec |
| Music | Procedural/algorithmic bed generator (chord loops + drum synthesis, no model) | deterministic, seeded by mood+bpm; upgradeable later |
| Matting | Background removal (small portrait model) | P3 |

**Provider interface:** every capability is `generate(request) -> ledger ref` behind a Python protocol. Local providers are the default registry; a future cloud provider implements the same protocol with API-backed generation. Spec's `provider` field selects; `doctor` reports availability and never silently falls back — a missing provider for a requested capability is a hard check error.

## 9. Capture (`packages/capture`)

- Headless Chrome, DPR 2. Full-page screenshot + viewport-height scroll segments (for parallax and scroll-cue scenes).
- Asset extraction: favicon/apple-touch icon → logo candidates; computed styles → palette (dominant colors); font families in use; hero copy blocks (h1/h2, CTA text) with bounding boxes → feeds SPEC copy.
- Everything frozen under `assets/sites/<domain>/` + ledger records. Site render is snapshot once; no live embed at composition time.

## 10. Phases

### P0 — Engine proof ✅ (done)
Delivered: engine (spec schema, typography/stat-hit compilers, transitions, seek runtime), renderer (Chrome driver, bitexact x264, ffprobe gate), CLI (check/render/preview), `examples/demo` + `npm run verify:demo` byte-stability gate.
- `packages/engine`: timeline model, spec schema + validator, scene-type registry, declarative interpolation core (§5).
- `packages/renderer`: CDP driver, deterministic seek loop, frame-loop fallback, FFmpeg assembly, ffprobe verification.
- `packages/cli`: `lazy check` (schema + static layout), `lazy render`, `lazy preview` (basic scrubber).
- **Done when:** a hand-written SPEC (typography + motion-graphics scenes) renders to an exact, reproducible MP4 — byte-stable across two runs.

### P1 — Website-to-video track ✅ (done)
Delivered: `@lazy/capture` (screenshots @2x, palette/copy/fonts/logo extraction, ledger, starter-spec generator), scene types `parallax`/`browser-frame`/`ui-callout`/`atmosphere` (plus `gradient` via bg tokens), `lazy capture` + `lazy snapshot` commands, `lazy check` gates: snapshot regression (keyframe pixel-hash vs baseline, proven to catch a one-line spec change) + seek determinism (double-render hash compare). E2E: `capture https://example.com` → starter spec → gates → 14s promo MP4.
- `packages/capture` complete (§9).
- Scene types: `parallax` (screenshot mode), `browser-frame`, `ui-callout`, `gradient-atmosphere`.
- Snapshot regression + seek-determinism gates live.
- **Done when:** `lazy capture https://example.com` → agent-authored SPEC → check passes → promo MP4 with at least one parallax-over-screenshot hero scene. Zero ML dependencies.

### P2 — Gen sidecar + cinematic track ✅ (done)
Delivered: `@lazy/gen-sidecar` (Python, stdlib + numpy) — procedural music synth (Am-F-C-G pads + pulse percussion), macOS `say` TTS, doctor probing with hardware tiering; provider interface so MLX photoreal slots in later (deferred — 8GB M2 / no MLX wheels on Python 3.14). `@lazy/engine` procedural image generator (seeded canvas art: ridge/dune/nebula landscapes + matching depth maps). `parallax` depth mode rewritten in **pure-JS canvas 2D displacement** (SwiftShader WebGL proved nondeterministic across processes ~25% flake; JS float math is always byte-identical). `video-layer` scene via engine-owned `<video>` seeking (async program draw returns readiness promise). Full audio pipeline: narration + music → ffmpeg `amix`/`aloop`/`adelay` → AAC mux, bitexact. `lazy gen` (image/music/tts) + `lazy doctor` commands. E2E `examples/cinematic`: 25.9s clip, 6 scenes (depth-parallax ×2, video-layer, typography ×3), narration + music — byte-identical across renders *including* audio.
- `packages/gen-sidecar`: image gen, depth estimation, TTS, procedural music; provider interface; `lazy doctor` hardware tiering.
- Scene types: `parallax` (gen mode with depth), `video-layer`.
- **Done when:** text brief → SPEC with gen stills → 30–60 s cinematic clip with narration + music, fully local.

### P3 — Full quality both tracks ✅ (done)
Delivered: stage-level CSS grade presets + output-level 3D LUT pipeline (bundled teal-orange/noir-film/faded-vintage .cube LUTs via ffmpeg `lut3d`). Transition library expanded: whip-pan, light-leak, dip-to-black, luma-wipe (slide). SFX synthesis (whoosh/hit/rise/boom) in the Python sidecar + `spec.audio.sfx` + mix. Audio-reactive beat mapping (`scene.beat` param → deterministic bpm-derived pulse channels). `three-scene` — deterministic canvas-2D 3D projector (cube/ico/grid/particles, orbit camera) using `putImageData` for cross-session byte-stability. `--fast` render flag (increased parallelism + throughput report). **Critical determinism fix:** evalCore now rounds all CSS transforms to integer pixels — Chrome's sub-pixel text rendering is cross-session nondeterministic; integer-pixel translates + `--jitless` + `--use-angle=swiftshader` achieves full byte-stability across separate browser launches. `examples/showreel` exercises all P3 features — byte-identical across renders.
- `three-scene` (bundled deterministic Three.js), matting, LUT/grade pipeline, transition library polish, SFX.
- Audio-reactive beat mapping for music.
- **Done when:** both workflows produce deliverable-grade output; render fast-path (WebCodecs) is default with measured throughput report.

### P4 — Skill layer ✅ (done)
Delivered: `skill/SKILL.md` (entry point + 3-workflow routing + agent contract + non-negotiable rules), `skill/references/` — spec-format.md (full schema), scene-types.md (all 8 types), workflows.md (website-promo/cinematic/edit step-by-step), cli.md (every command), gates.md (snapshot + seek-determinism + cross-session determinism guide). `README.md` with quick start + architecture overview. A fresh agent can go from "here's my site" to approved MP4 reading only the skill.
- `skill/SKILL.md`: entry point, routing (URL → website-promo; brief → cinematic; footage → edit), agent contract (research → SPEC → iterate on check errors → render after human approval).
- Workflow references, example projects, feedback loop docs.
- **Done when:** a fresh agent + user can go from "here's my site" to approved MP4 reading only the skill.

## 11. Open questions (to resolve during P0/P1)

1. **Composition authoring surface:** spec-only (JSON in, video out) vs. spec + optional HTML escape hatch for custom scenes. Start spec-only; the escape hatch informs the `three-scene` module design.
2. **WebCodecs encoder settings:** target codec/hw-encode availability on M2 Chrome — verify in P0 spike, decide fast-path default.
3. **Font handling:** bundled open-source font pack vs. capture-time font fetching (licensing constraints). Leaning bundled pack + system fallbacks.
4. **Music ceiling:** how far procedural music can go before it needs a local model or the provider interface earns a cloud slot earlier than planned.
5. **Snapshot baselines in agent loops:** how agents update baselines without rubber-stamping regressions (require human-visible diff summary?).
