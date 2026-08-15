# Gates reference

`lazy check` runs two blocking gates that enforce the byte-stability promise. A failing gate names the scene, the timestamp, and the fix.

## snapshot regression

**What it does:** renders keyframes (every scene midpoint + every transition midpoint), hashes their pixels (8×8 grayscale via ffmpeg → sha256), and compares against `snapshots/baseline.json`.

**When it runs:** inside `lazy check` when `snapshots/baseline.json` exists. Also available standalone via `lazy snapshot`.

**Establishing a baseline:**
```bash
lazy snapshot <project> --update
```
This renders all keyframes and writes their hashes as the baseline. Run this once in a new project, and again after any intentional visual change (scene edits, new assets, spec tweaks).

**Comparing:**
```bash
lazy snapshot <project>
# or
lazy check <project>
```
If a keyframe's hash differs from the baseline, you get:
```
error [snapshot_regression]: keyframe t=1400ms (scene 'title') drifted from baseline
  (expected 873f912f..., got 7508fc91...); if intentional run: lazy snapshot <project> --update
```

**When to update vs. fix:**
- Intentional change (you edited the spec, added an asset, changed a color) → `lazy snapshot --update`
- Unintentional drift (you didn't change anything but it failed) → investigate; this may indicate a determinism bug

## seek determinism

**What it does:** renders 5 sampled timestamps (spread across the timeline) twice in the same browser session, hashes each screenshot's pixels, and compares the two passes. Any mismatch means the composition is nondeterministic within a session — a fundamental bug.

**When it runs:** always, inside `lazy check` (unless `--skip-gates`).

**What a failure means:** some element in the composition produces different pixels at the same timestamp across two renders in the same browser. This is rare with the current engine (all transforms are pure functions of `t`), but can happen if:
- A program scene has a race condition (e.g., video not fully loaded on first seek)
- A font fails to load on one pass but not the other (check `document.fonts.ready`)

**Fixing:** the error names the timestamp. Inspect the scene active at that time. Check for async operations that don't resolve before the seek completes.

## Cross-session determinism

The gates verify within-session stability. Cross-session (two separate `lazy render` commands) is enforced by:
1. `--jitless` — V8 interpreter only (no JIT nondeterminism)
2. `--use-angle=swiftshader` — software rendering (no GPU driver variance)
3. Integer-pixel transform rounding — snaps all CSS translates to whole pixels (avoids sub-pixel text rendering nondeterminism)
4. `putImageData` for canvas-based scenes — direct pixel writing (no skia compositing nondeterminism)
5. Bitexact ffmpeg encoding — fixed creation_time, +bitexact flags, fixed thread count

**What breaks cross-session determinism (avoid):**
- CSS `filter: blur()` on elements with text (skia's blur is cross-session nondeterministic)
- CSS `transform: scale()` with non-integer values on text elements (sub-pixel rendering)
- Canvas 2D `fillRect`/`stroke`/`arc` with `globalAlpha` (compositing nondeterminism) — use `putImageData` instead
- CSS `clip-path` with percentage values (sub-pixel clipping nondeterminism)