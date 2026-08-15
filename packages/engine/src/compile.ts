import type { Channel, WireScene } from './channels.js';
import { FONTS } from './fonts.js';
import { generatePage } from './generate.js';
import type { CheckError, Spec } from './spec.js';
import { compileStatHit } from './scenes/statHit.js';
import { compileTypography } from './scenes/typography.js';
import { compileAtmosphere } from './scenes/atmosphere.js';
import { compileParallax } from './scenes/parallax.js';
import { compileBrowserFrame } from './scenes/browserFrame.js';
import { compileUiCallout } from './scenes/uiCallout.js';
import { compileVideoLayer } from './scenes/videoLayer.js';
import { compileThreeScene } from './scenes/threeScene.js';
import type { SceneBuild, SceneCtx } from './scenes/common.js';

export class SpecError extends Error {
  constructor(public readonly errors: CheckError[]) {
    super(`spec failed with ${errors.length} error(s): ${errors.map((e) => `[${e.code}] ${e.message}`).join(' | ')}`);
    this.name = 'SpecError';
  }
}

export interface Wire {
  channels: Channel[];
  scenes: WireScene[];
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  frameCount: number;
}

export interface CompileResult {
  html: string;
  wire: Wire;
  warnings: string[];
  fonts: string[];
}

export function compileSpec(spec: Spec, opts: { assetMap?: Map<string, string> } = {}): CompileResult {
  const assetMap = opts.assetMap ?? new Map<string, string>();
  const asset = (src: string): string => {
    const dest = assetMap.get(src);
    if (dest === undefined) throw new Error(`internal: asset '${src}' was not collected before compile`);
    return `assets/${dest}`;
  };
  const errors: CheckError[] = [];
  const warnings: string[] = [];
  for (const [field, family] of [
    ['fontDisplay', spec.style.tokens.fontDisplay],
    ['fontBody', spec.style.tokens.fontBody],
  ] as const) {
    if (!(family in FONTS)) {
      errors.push({
        code: 'unknown_font',
        message: `style.tokens.${field} '${family}' is not bundled; available: ${Object.keys(FONTS).join(', ')}`,
      });
    }
  }
  const ids = new Set<string>();
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

  let prevEnd: number | null = null;
  spec.scenes.forEach((sc, i) => {
    if (prevEnd !== null) {
      if (sc.startMs > prevEnd + 1) {
        warnings.push(`gap of ${sc.startMs - prevEnd}ms before scene '${sc.id}' renders the stage background`);
      } else if (sc.startMs < prevEnd - 1) {
        const prev = spec.scenes[i - 1]!;
        if (prev.transitionOut.type === 'cut' || sc.transitionIn.type === 'cut') {
          warnings.push(`scene '${sc.id}' overlaps the previous scene with a cut transition; one scene will cover the other`);
        }
      }
    }
    prevEnd = sc.startMs + sc.durationMs;
  });

  if (errors.length > 0) throw new SpecError(errors);

  const tokens = spec.style.tokens;
  const ctx: SceneCtx = { tokens, index: 0, durationMs: 0, width: spec.meta.width, height: spec.meta.height, asset };
  const channels: Channel[] = [];
  const wireScenes: WireScene[] = [];
  const sceneHtml: string[] = [];
  const sceneCss: string[] = [];
  const programs: string[] = [];

  const totalDurationMs = Math.max(...spec.scenes.map((sc) => sc.startMs + sc.durationMs));
  if (spec.audio) {
    const sortedNarration = [...spec.audio.narration].sort((a, b) => a.startMs - b.startMs);
    for (let i = 0; i < sortedNarration.length; i++) {
      const seg = sortedNarration[i]!;
      if (seg.startMs >= totalDurationMs) {
        errors.push({ code: 'narration_beyond_timeline', message: `narration "${seg.text.slice(0, 30)}…" starts at ${seg.startMs}ms but the timeline is only ${totalDurationMs}ms` });
      }
      if (i > 0) {
        const prev = sortedNarration[i - 1]!;
        const estWords = prev.text.split(/\s+/).length;
        const estMs = Math.round((estWords / prev.rate) * 60000);
        if (prev.startMs + estMs > seg.startMs) {
          warnings.push(`narration "${seg.text.slice(0, 24)}…" may overlap the previous segment (estimated ${estMs}ms)`);
        }
      }
    }
  }
  if (errors.length > 0) throw new SpecError(errors);

  spec.scenes.forEach((sc, i) => {
    ctx.index = i;
    ctx.durationMs = sc.durationMs;
    const sid = `s${i}`;
    let build: SceneBuild;
    switch (sc.type) {
      case 'typography':
        build = compileTypography(sc.params, ctx);
        break;
      case 'stat-hit':
        build = compileStatHit(sc.params, ctx);
        break;
      case 'browser-frame':
        build = compileBrowserFrame(sc.params, ctx);
        break;
      case 'ui-callout':
        build = compileUiCallout(sc.params, ctx);
        break;
      case 'atmosphere':
        build = compileAtmosphere(sc.params, ctx);
        break;
      case 'parallax':
        build = compileParallax(sc.params, ctx);
        break;
      case 'video-layer':
        build = compileVideoLayer(sc.params, ctx);
        break;
      case 'three-scene':
        build = compileThreeScene(sc.params, ctx);
        break;
    }

    sceneHtml.push(`<div class="scene" id="${sid}" data-scene-id="${sc.id}">${build.html}</div>`);
    sceneCss.push(build.css);
    if (build.program) programs.push(build.program);

    const shift = (ch: Channel): Channel => ({ ...ch, k: ch.k.map((key) => ({ ...key, t: key.t + sc.startMs })) });
    const tin = sc.transitionIn;
    const tout = sc.transitionOut;

    if (tin.type !== 'cut' && tin.ms > 0) {
      channels.push(...transitionInChannels(sid, tin.type, tin.ms, sc.durationMs).map(shift));
    }
    if (tout.type !== 'cut' && tout.ms > 0) {
      channels.push(...transitionOutChannels(sid, tout.type, tout.ms, sc.durationMs).map(shift));
    }
    if (sc.beat) {
      const beatMs = 60000 / sc.beat.bpm;
      const amount = sc.beat.amount;
      const decay = sc.beat.decayMs;
      const prop = sc.beat.property;
      const beatKeys: { t: number; v: number; e?: string }[] = [];
      for (let b = 0; b + decay <= sc.durationMs; b += beatMs) {
        beatKeys.push({ t: b, v: prop === 'scale' ? 1 + amount : 1, e: 'outCubic' });
        beatKeys.push({ t: b + decay, v: prop === 'scale' ? 1 : 1 - amount * 2, e: 'linear' });
      }
      if (beatKeys.length > 0) {
        channels.push(shift({ el: sid, p: prop, k: beatKeys }));
      }
    }
    for (const ch of build.channels) {
      channels.push(shift(ch));
    }
    wireScenes.push({ id: sid, s: sc.startMs, e: sc.startMs + sc.durationMs });
  });

  const durationMs = Math.max(...spec.scenes.map((sc) => sc.startMs + sc.durationMs));
  const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * spec.meta.fps - 1e-9));  if (spec.meta.durationMs !== undefined && Math.abs(spec.meta.durationMs - durationMs) > 150) {
    warnings.push(
      `meta.durationMs (${spec.meta.durationMs}) disagrees with computed timeline end (${durationMs}ms); the computed value wins`,
    );
  }

  const fonts = [...new Set([tokens.fontDisplay, tokens.fontBody])].filter((f) => f in FONTS);
  const wire: Wire = {
    channels,
    scenes: wireScenes,
    width: spec.meta.width,
    height: spec.meta.height,
    fps: spec.meta.fps,
    durationMs,
    frameCount,
  };
  const html = generatePage(spec, { sceneHtml, sceneCss, fonts, programs, wire });

  return { html, wire, warnings, fonts };
}

function transitionInChannels(sid: string, type: string, ms: number, _dur: number): Channel[] {
  switch (type) {
    case 'fade':
    case 'dissolve':
    case 'dip-to-black':
      return [{ el: sid, p: 'opacity', k: [{ t: 0, v: 0 }, { t: ms, v: 1, e: 'outCubic' }] }];
    case 'whip-pan':
      return [
        { el: sid, p: 'opacity', k: [{ t: 0, v: 0 }, { t: ms * 0.3, v: 1, e: 'linear' }] },
        { el: sid, p: 'xPct', k: [{ t: 0, v: 18 }, { t: ms, v: 0, e: 'outExpo' }] },
      ];
    case 'light-leak':
      return [{ el: sid, p: 'opacity', k: [{ t: 0, v: 0 }, { t: ms * 0.5, v: 1, e: 'outCubic' }] }];
    case 'luma-wipe':
      return [
        { el: sid, p: 'opacity', k: [{ t: 0, v: 1 }] },
        { el: sid, p: 'yPct', k: [{ t: 0, v: 100 }, { t: ms, v: 0, e: 'outExpo' }] },
      ];
    default:
      return [];
  }
}

function transitionOutChannels(sid: string, type: string, ms: number, dur: number): Channel[] {
  const start = dur - ms;
  switch (type) {
    case 'fade':
    case 'dissolve':
    case 'dip-to-black':
      return [{ el: sid, p: 'opacity', k: [{ t: start, v: 1 }, { t: dur, v: 0, e: 'inOutSine' }] }];
    case 'whip-pan':
      return [
        { el: sid, p: 'xPct', k: [{ t: start, v: 0 }, { t: dur, v: -18, e: 'outExpo' }] },
        { el: sid, p: 'opacity', k: [{ t: dur - ms * 0.3, v: 1 }, { t: dur, v: 0, e: 'linear' }] },
      ];
    case 'light-leak':
      return [{ el: sid, p: 'opacity', k: [{ t: start, v: 1 }, { t: start + ms * 0.5, v: 1 }, { t: dur, v: 0, e: 'inOutSine' }] }];
    case 'luma-wipe':
      return [
        { el: sid, p: 'opacity', k: [{ t: start, v: 1 }] },
        { el: sid, p: 'yPct', k: [{ t: start, v: 0 }, { t: dur, v: -100, e: 'outExpo' }] },
      ];
    default:
      return [];
  }
}
