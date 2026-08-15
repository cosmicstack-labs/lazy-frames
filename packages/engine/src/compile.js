import { FONTS } from './fonts.js';
import { generatePage } from './generate.js';
import { compileStatHit } from './scenes/statHit.js';
import { compileTypography } from './scenes/typography.js';
export class SpecError extends Error {
    errors;
    constructor(errors) {
        super(`spec failed with ${errors.length} error(s): ${errors.map((e) => `[${e.code}] ${e.message}`).join(' | ')}`);
        this.errors = errors;
        this.name = 'SpecError';
    }
}
export function compileSpec(spec) {
    const errors = [];
    const warnings = [];
    if (spec.audio !== undefined) {
        errors.push({ code: 'audio_unsupported', message: 'audio is not supported yet (planned P2); remove the audio section' });
    }
    for (const [field, family] of [
        ['fontDisplay', spec.style.tokens.fontDisplay],
        ['fontBody', spec.style.tokens.fontBody],
    ]) {
        if (!(family in FONTS)) {
            errors.push({
                code: 'unknown_font',
                message: `style.tokens.${field} '${family}' is not bundled; available: ${Object.keys(FONTS).join(', ')}`,
            });
        }
    }
    const ids = new Set();
    for (const sc of spec.scenes) {
        if (ids.has(sc.id)) {
            errors.push({ code: 'duplicate_scene_id', message: `scene id '${sc.id}' is used more than once`, scene: sc.id });
        }
        ids.add(sc.id);
        if (sc.transitionIn.ms + sc.transitionOut.ms >= sc.durationMs) {
            errors.push({
                code: 'transition_exceeds_scene',
                message: `transitions (${sc.transitionIn.ms}+${sc.transitionOut.ms}ms) must be shorter than scene duration (${sc.durationMs}ms)`,
                scene: sc.id,
            });
        }
    }
    let prevEnd = null;
    spec.scenes.forEach((sc, i) => {
        if (prevEnd !== null) {
            if (sc.startMs > prevEnd + 1) {
                warnings.push(`gap of ${sc.startMs - prevEnd}ms before scene '${sc.id}' renders the stage background`);
            }
            else if (sc.startMs < prevEnd - 1) {
                const prev = spec.scenes[i - 1];
                if (prev.transitionOut.type === 'cut' || sc.transitionIn.type === 'cut') {
                    warnings.push(`scene '${sc.id}' overlaps the previous scene with a cut transition; one scene will cover the other`);
                }
            }
        }
        prevEnd = sc.startMs + sc.durationMs;
    });
    if (errors.length > 0)
        throw new SpecError(errors);
    const tokens = spec.style.tokens;
    const ctx = { tokens, index: 0 };
    const channels = [];
    const wireScenes = [];
    const sceneHtml = [];
    const sceneCss = [];
    spec.scenes.forEach((sc, i) => {
        ctx.index = i;
        const sid = `s${i}`;
        const build = sc.type === 'typography' ? compileTypography(sc.params, ctx) : compileStatHit(sc.params, ctx);
        sceneHtml.push(`<div class="scene" id="${sid}" data-scene-id="${sc.id}">${build.html}</div>`);
        sceneCss.push(build.css);
        if (sc.transitionIn.type !== 'cut' && sc.transitionIn.ms > 0) {
            channels.push({ el: sid, p: 'opacity', k: [{ t: 0, v: 0 }, { t: sc.transitionIn.ms, v: 1, e: 'outCubic' }] });
        }
        if (sc.transitionOut.type !== 'cut' && sc.transitionOut.ms > 0) {
            channels.push({
                el: sid,
                p: 'opacity',
                k: [
                    { t: sc.durationMs - sc.transitionOut.ms, v: 1 },
                    { t: sc.durationMs, v: 0, e: 'inOutSine' },
                ],
            });
        }
        for (const ch of build.channels) {
            channels.push({ ...ch, k: ch.k.map((key) => ({ ...key, t: key.t + sc.startMs })) });
        }
        wireScenes.push({ id: sid, s: sc.startMs, e: sc.startMs + sc.durationMs });
    });
    const durationMs = Math.max(...spec.scenes.map((sc) => sc.startMs + sc.durationMs));
    const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * spec.meta.fps - 1e-9));
    if (spec.meta.durationMs !== undefined && Math.abs(spec.meta.durationMs - durationMs) > 150) {
        warnings.push(`meta.durationMs (${spec.meta.durationMs}) disagrees with computed timeline end (${durationMs}ms); the computed value wins`);
    }
    const fonts = [...new Set([tokens.fontDisplay, tokens.fontBody])].filter((f) => f in FONTS);
    const wire = {
        channels,
        scenes: wireScenes,
        width: spec.meta.width,
        height: spec.meta.height,
        fps: spec.meta.fps,
        durationMs,
        frameCount,
    };
    const html = generatePage(spec, { sceneHtml, sceneCss, fonts, wire });
    return { html, wire, warnings, fonts };
}
