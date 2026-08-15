---
name: lazy-frames
description: >
  Turn any input (a website URL, a text brief, existing footage, a music track) into a finished,
  pixel-perfect MP4 — fully local, byte-stable across renders. The agent researches the input and
  dumps a typed SPEC; the Lazy Frames CLI turns that spec into video. Use for website promos,
  cinematic clips, motion graphics, explainer videos, social ads, and any programmatic video
  generation that must be deterministic and work offline.
  Install: npm install lazy-frames | Raw skill URL: https://lazy-frames.cosmicstack.ai/skill.md
---

# Lazy Frames

Lazy Frames renders video from a **typed JSON spec** — a composition is a `spec.json` file whose
scenes declare timing, content, and style; the CLI turns it into a deterministic, pixel-perfect MP4.
No cloud, no keys, no nondeterminism. Same spec + same machine = byte-identical output, every time.

## 1. Start from project state

| State | Action |
|---|---|
| Existing project with `spec.json` | Read the spec, make the edit or run the requested operation. Skip routing. |
| Fresh request with a website URL | Route to **website-promo** workflow (§ 3). |
| Fresh request with a text brief | Route to **cinematic** workflow (§ 3). |
| Fresh request with existing footage | Route to **edit** workflow (§ 3). |
| Unclear | Ask one question: "Is this about a specific website, a topic/brief, or existing video footage?" |

## 2. Prerequisites

```bash
node --version   # >= 20
ffmpeg -version  # required
python3 --version  # required for audio (music, TTS, SFX)
ls "/Applications/Google Chrome.app"  # required (headless renderer)
```

Build the CLI from the repo root:

```bash
npm install && npm run build
```

Verify the environment:

```bash
node packages/cli/dist/index.js doctor
```

Doctor reports: Node platform/memory, Python version + tier, and provider availability
(procedural imagery, depth, music, TTS). If `tts.say` is unavailable, narration won't work
(macOS only). If `image.mlx-photoreal` is unavailable (expected on <16 GB machines), the
procedural image generator is used instead — still produces cinematic stills, just not photoreal.

## 3. Workflows

### website-promo

**Input:** a URL.
**Output:** a promo/showcase MP4 built from the site's own captured visuals.

```bash
# 1. Capture the site (screenshots @2x, palette, copy, fonts, logo)
node packages/cli/dist/index.js capture https://example.com projects/acme

# 2. Review the generated starter spec + captured assets
cat projects/acme/spec.json
ls projects/acme/assets/sites/example.com/

# 3. Edit the spec if needed (adjust scenes, copy, timing, transitions)

# 4. Validate + run gates
node packages/cli/dist/index.js snapshot projects/acme --update
node packages/cli/dist/index.js check projects/acme

# 5. Render
node packages/cli/dist/index.js render projects/acme
```

The capture command writes:
- `assets/sites/<domain>/hero.png` + `full.png` (screenshots at 2x DPR)
- `assets/sites/<domain>/ledger.json` (palette, fonts, copy blocks, metadata)
- A starter `spec.json` with 5 scenes built from the captured content

### cinematic

**Input:** a text brief or topic.
**Output:** a 30–60 s cinematic clip with generated stills, depth-parallax, narration, music, SFX.

```bash
# 1. Generate procedural stills + matching depth maps
node packages/cli/dist/index.js gen image -p projects/cine --seed 21 --style ridge --palette "#070B14,#F59E4C,#F4F7FB" --name ridge-01
node packages/cli/dist/index.js gen image -p projects/cine --seed 42 --style dune --palette "#070B14,#7FB7D9,#F4F7FB" --name dune-01

# 2. Write spec.json referencing the generated assets (see references/spec-format.md)

# 3. (Optional) Generate audio assets to preview
node packages/cli/dist/index.js gen music -p projects/cine --mood calm --bpm 90 --bars 12 --seed 21
node packages/cli/dist/index.js gen tts -p projects/cine --text "Every frame computed locally." --name n1

# 4. Validate + render
node packages/cli/dist/index.js snapshot projects/cine --update
node packages/cli/dist/index.js check projects/cine
node packages/cli/dist/index.js render projects/cine
```

### edit

**Input:** existing footage (MP4) + a brief.
**Output:** the footage composited into a video with overlays, grading, transitions.

Write a spec with `video-layer` scenes referencing the footage file, plus typography/atmosphere
scenes for titles and transitions. The engine owns video seeking (deterministic per-machine frame
extraction). See `references/scene-types.md` for `video-layer` params.

## 4. Agent contract

The agent's job across all workflows:

1. **Research** the input (read the site, understand the brief, inspect the footage).
2. **Produce or refine** `spec.json` — a valid typed spec (see `references/spec-format.md`).
3. **Generate assets** if needed (`lazy gen image`, `lazy gen music`, `lazy gen tts`).
4. **Run `lazy check`** and fix every error. Warnings are advisory.
5. **Run `lazy snapshot --update`** to establish the regression baseline.
6. **Run `lazy check`** again — snapshot + seek-determinism gates must pass.
7. **Run `lazy preview`** and hand the URL to the user. Ask whether to revise or render.
8. **Render only after approval.** `lazy render` — never before the user says go.
9. **Verify the output:** confirm the file exists, is non-empty, has the expected duration.
10. Report the output path + sha256.

### Non-negotiable rules

- **Never render before the user approves.** Always pause at preview.
- **Never skip `lazy check`.** It catches schema errors, missing assets, and nondeterminism.
- **Always run `lazy snapshot --update` before the first `lazy check`** in a new project.
- **Never edit `.lazy/`** — it's generated. Edit `spec.json` and re-render.
- **Reference assets by project-relative paths** in spec (e.g., `assets/gen/ridge-01.png`).
- **Scenes are sequential with optional overlap.** Overlap + fade/dissolve = crossfade.
- **All timing is in milliseconds.** Start times are absolute from the composition start.
- **Palette convention:** `palette[0]` = bg, `palette[1]` = accent, `palette[2]` = fg.
- **Width/height must be even** (h264 yuv420p requirement).
- **Fonts are bundled:** `Inter` (body) and `Space Grotesk` (display). No external fonts.

## 5. Key concepts

### Determinism

Same spec + same machine = byte-identical MP4 (verified by sha256). Three Chrome flags enforce this:
`--jitless` (V8 interpreter only), `--use-angle=swiftshader` (software rendering), and
integer-pixel transform rounding in the runtime. CSS sub-pixel text rendering is
cross-session nondeterministic — the runtime snaps all transforms to integer pixels.

### Gates

`lazy check` runs two blocking gates:
- **Snapshot regression:** renders keyframes (scene midpoints + transition midpoints), hashes their
  pixels, and compares against `snapshots/baseline.json`. Drift = error with scene + timestamp.
- **Seek determinism:** renders 5 sampled timestamps twice in one browser session, compares hashes.

### Audio

Audio is declarative in the spec (`narration`, `music`, `sfx`) — no audio files needed in the spec.
The renderer generates audio at render time (cached by content hash) and mixes via ffmpeg:
- **Narration:** macOS `say` TTS → WAV, placed at `startMs` with gain
- **Music:** procedural synth (chord pads + percussion) seeded by `seed`, looped to video duration
- **SFX:** synthesized whoosh/hit/rise/boom, placed at `atMs` with gain

### LUT / grade

Two layers:
- **Stage grade** (`style.grade`): CSS filter preset on the composition root (fast, subtle)
- **Output LUT** (`outputs[0].lut`): 3D LUT .cube file applied via ffmpeg `lut3d` during encode
  (cinematic color grade). Bundled LUTs: `teal-orange`, `noir-film`, `faded-vintage`.

## 6. References

| File | Read it to… |
|---|---|
| `references/spec-format.md` | author a valid `spec.json` — full schema, all fields, defaults |
| `references/scene-types.md` | pick a scene type and configure its params |
| `references/workflows.md` | step-by-step for website-promo, cinematic, and edit workflows |
| `references/cli.md` | every CLI command with flags and examples |
| `references/gates.md` | snapshot regression + seek determinism gate usage |
