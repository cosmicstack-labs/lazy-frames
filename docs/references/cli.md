# CLI reference

Run commands as `node packages/cli/dist/index.js <command>` or symlink the binary.

## Progress output

`capture`, `check`, `gen`, `preview`, and `render` print live phase updates to stderr. Render also reports frame completion in five-percent increments. This remains enabled with `--json`, where stdout is reserved for the final machine-readable result.

## doctor

```bash
lazy doctor [--json]
```

Reports: Node platform/arch/cpus/memory, Python version + hardware tier, provider availability
(procedural imagery, depth, music, TTS, MLX photoreal). Tier: `full` (≥16GB + MLX), `lite` (≥8GB),
`minimal`. Chrome is resolved from `CHROME_PATH`, then macOS `/Applications`, Windows Program Files
(Chrome or Edge), then Linux binaries. The gen sidecar is launched with `python3`, `python`, `py -3`,
or `LAZY_PYTHON`.

## capture

```bash
lazy capture <url> [project] [--json]
```

Captures a website: screenshots @2x DPR (hero + full-page), palette extraction, copy blocks (h1/h2/h3/p/a/button), fonts, logo candidates. Writes assets to `<project>/assets/sites/<domain>/` + a starter `spec.json` whose media crop anchors default to center. If `[project]` is omitted, defaults to `projects/<host>`.

## gen

```bash
lazy gen <capability> -p <project> [options] [--json]
```

### gen image

```bash
lazy gen image -p projects/cine --seed 21 --style ridge --palette "#0B0F19,#22D3EE,#F8FAFC" --name ridge-01
```

Generates a procedural still + matching depth map (PNG) via seeded canvas art. Styles: `ridge` (mountain ridges), `dune` (soft dunes), `nebula` (abstract clouds). Outputs `<name>.png` + `<name>.depth.png` in `assets/gen/`.

### gen music

```bash
lazy gen music -p projects/cine --mood calm --bpm 90 --bars 12 --seed 21 --name bgm
```

Generates a procedural music WAV (chord pads + optional percussion). Outputs `<name>.wav` in `assets/gen/`.

### gen tts

```bash
lazy gen tts -p projects/cine --text "Every frame computed locally." --voice Samantha --rate 165 --name n1
lazy gen tts -p projects/cine --provider elevenlabs --voice VOICE_ID --text "A better story." --name n2
```

Generates a TTS WAV via local macOS `say`, Windows SAPI, or an installed TTS plugin. Outputs `<name>.wav` in `assets/gen/`.

## script

```bash
lazy script <project> [--provider <id>] [--voice <voice>] [--apply] [--json]
```

Drafts one editable narration beat per text-bearing scene. `--apply` writes `narration.md` and replaces `spec.audio.narration` with beats anchored by `sceneId` and `offsetMs`.

## plugin

```bash
lazy plugin search [query]
lazy plugin info <id> [--json]
lazy plugin install <id> [-p <project>]
lazy plugin list [-p <project>]
lazy plugin remove <id> [-p <project>]
```

ElevenLabs is included by default; `install` grants project-scoped approval. Other marketplace manifests are installable, versioned, and fingerprinted. A `scaffold` can be evaluated but cannot execute until its reviewed adapter ships. Plugin installation never runs package lifecycle scripts.

## check

```bash
lazy check <project> [--json] [--skip-gates]
```

Validates: environment (Chrome, ffmpeg, ffprobe), spec schema (zod), semantic checks (font availability, asset existence, transition timing, narration overlap), and two blocking gates:
- **Snapshot regression** (if baseline exists): keyframe pixel-hash comparison
- **Seek determinism**: double-render 5 sampled timestamps

Exit code 0 = pass, 1 = fail. `--skip-gates` runs env/schema only (fast).

## snapshot

```bash
lazy snapshot <project> [--update]
```

Without `--update`: compares current keyframes against `snapshots/baseline.json` (same as the check gate). With `--update`: writes/refreshes the baseline. Run `--update` once in a new project or after intentional spec changes.

## render

```bash
lazy render <project> [-o <path>] [--fps <n>] [--parallel <n>] [--crf <n>] [--fast] [--keep-frames] [--json]
```

Renders the composition to an MP4. Steps: compile spec → write composition HTML → capture frames (headless Chrome) → encode (ffmpeg x264, bitexact) → generate audio (if `audio` in spec) → mux → probe-verify → sha256.

Options:
- `-o`: output path (default: `spec.outputs[0].path`)
- `--fps`: override fps for draft iteration (e.g., `--fps 6` for 3x faster previews)
- `--parallel`: number of Chrome pages (default 2)
- `--crf`: x264 quality (default 16, lower = better)
- `--fast`: use more parallel pages (cpus-1, max 4) + report throughput
- `--keep-frames`: keep intermediate PNGs in `.lazy/frames/`
- `--json`: machine-readable summary (sha256, frame count, duration, throughput, audio info)

## preview

```bash
lazy preview <project> [-p <port>]
```

Serves a scrubbable timeline preview at `http://localhost:<port>` (default 4173). The composition loads in an iframe with a play/pause + scrub bar. Frame-accurate seeking via postMessage.
