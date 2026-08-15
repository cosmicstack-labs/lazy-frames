# Workflows reference

Three workflows. Each ends with a rendered, verified MP4.

## website-promo

**When:** the user gives a URL and wants a promo/showcase video of the site.

### Steps

1. **Capture the site:**
   ```bash
   node packages/cli/dist/index.js capture https://example.com projects/acme
   ```
   Writes: `assets/sites/<domain>/` (hero.png, full.png, ledger.json), a starter `spec.json`.

2. **Review the starter spec:** read `spec.json` and `ledger.json`. The spec has 5 scenes:
   - typography (site title + description)
   - browser-frame (hero screenshot + cursor)
   - parallax (full-page screenshot, dolly-in)
   - ui-callout (hero screenshot with a hotspot)
   - typography (domain lockup with gradient bg)

3. **Edit if needed:** adjust copy from the ledger's `copy` array, change scene timing, swap transitions, add a LUT, add audio. Common edits:
   - Replace the title text with the site's actual h1 (from `ledger.json` → `copy[0].text`)
   - Add narration: `"audio": { "narration": [{ "text": "...", "startMs": 3600 }] }`
   - Add a LUT: `"outputs": [{ ..., "lut": "assets/luts/teal-orange.cube" }]`

4. **Establish baseline + validate:**
   ```bash
   node packages/cli/dist/index.js snapshot projects/acme --update
   node packages/cli/dist/index.js check projects/acme
   ```

5. **Preview for the user:**
   ```bash
   node packages/cli/dist/index.js preview projects/acme
   ```
   Hand the URL to the user. Wait for approval.

6. **Render after approval:**
   ```bash
   node packages/cli/dist/index.js render projects/acme
   ```

7. **Verify:** confirm the file exists and has the expected duration.
   ```bash
   ffprobe -v error -show_entries format=duration -of csv=p=0 projects/acme/out/site-promo.mp4
   ```

## cinematic

**When:** the user gives a text brief or topic and wants a narrated, cinematic video.

### Steps

1. **Generate stills + depth maps:**
   ```bash
   node packages/cli/dist/index.js gen image -p projects/cine --seed 21 --style ridge --palette "#070B14,#F59E4C,#F4F7FB" --name ridge-01
   node packages/cli/dist/index.js gen image -p projects/cine --seed 42 --style dune --palette "#070B14,#7FB7D9,#F4F7FB" --name dune-01
   ```
   Each generates `<name>.png` + `<name>.depth.png` in `assets/gen/`.

2. **Write `spec.json`:** reference the generated assets in `parallax` scenes with `depth` pointing to the `.depth.png` file. Add `typography` scenes for titles/quotes, `atmosphere` for scene glue, `three-scene` for abstract motion. Add `audio` with narration + music + SFX.

3. **Validate + baseline:**
   ```bash
   node packages/cli/dist/index.js snapshot projects/cine --update
   node packages/cli/dist/index.js check projects/cine
   ```

4. **Preview + render** (same as website-promo steps 5–7).

### Tips

- **Scene pacing:** 3–6 seconds per scene. Overlap by 400–500ms with dissolve/fade for smooth flow.
- **Parallax depth:** `depthStrength` 0.35–0.55 looks good. Higher = more parallax but risk of edge artifacts.
- **Grade:** use `warm` for golden-hour landscapes, `cool` for night/ocean, `noir` for dramatic B&W.
- **LUT:** copy a bundled LUT to `assets/luts/` and reference in `outputs[0].lut` for a cinematic color grade.
- **Music:** `calm` for ambient pads, `pulse` for energetic beats. Match `bpm` to scene pacing (90 = relaxed, 120 = upbeat).
- **SFX timing:** place whooshes at transition points, hits at stat reveals, booms at dramatic moments.

## edit

**When:** the user has existing footage and wants it composited with overlays, grading, transitions.

### Steps

1. **Place the footage** in the project: `projects/edit/assets/footage/clip.mp4`

2. **Write `spec.json`:** use `video-layer` scenes for the footage, interspersed with `typography` (titles), `atmosphere` (bridges), `ui-callout` (annotations over footage screenshots — capture a frame with `ffmpeg -i clip.mp4 -ss 5 -frames:v 1 frame.png`).

3. **Validate + render** (same as above).

### Tips

- **`trimStartMs`** offsets into the footage — use different trims for different scenes to show different parts.
- **`speed: 2`** for time-lapse effect, `speed: 0.5` for slow-mo.
- **`grade: "noir"`** on footage for a dramatic B&W look.
- **`fit: "contain"`** if the footage aspect doesn't match the canvas (letterboxed); `"cover"` fills (cropped).