import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FONTS, assertPluginInstalled, collectAssetRefs, compileSpec, fontAssetPath, loadSpec, type Wire } from '../../engine/dist/index.js';
import { renderFrames } from './driver.js';
import { assembleAudio, buildMusic, buildNarration, buildSfx, projectAudioCacheDir } from './audio.js';
import { assertProbe, encodeFrames, probeVideo, sha256File } from './ffmpeg.js';

export interface PreparedComposition {
  compositionPath: string;
  wire: Wire;
  warnings: string[];
  lutPath?: string;
}

export function prepareComposition(projectDir: string): PreparedComposition {
  const spec = loadSpec(path.join(projectDir, 'spec.json'));
  const assetRefs = collectAssetRefs(spec, projectDir);
  const assetMap = new Map(assetRefs.map((r) => [r.src, r.dest]));
  const compiled = compileSpec(spec, { assetMap });
  const lazyDir = path.join(projectDir, '.lazy');
  mkdirSync(path.join(lazyDir, 'fonts'), { recursive: true });
  mkdirSync(path.join(lazyDir, 'assets'), { recursive: true });
  const compositionPath = path.join(lazyDir, 'composition.html');
  writeFileSync(compositionPath, compiled.html);
  for (const family of compiled.fonts) {
    copyFileSync(fontAssetPath(FONTS[family]!), path.join(lazyDir, 'fonts', FONTS[family]!));
  }
  for (const ref of assetRefs) {
    if (ref.kind === 'media') {
      copyFileSync(path.resolve(projectDir, ref.src), path.join(lazyDir, 'assets', ref.dest));
    } else {
      copyFileSync(path.resolve(projectDir, ref.src), path.join(lazyDir, ref.dest));
    }
  }
  const lutRef = assetRefs.find((r) => r.kind === 'lut');
  return { compositionPath, wire: compiled.wire, warnings: compiled.warnings, lutPath: lutRef ? path.join(lazyDir, lutRef.dest) : undefined };
}

export interface RenderOptions {
  output?: string;
  parallel?: number;
  crf?: number;
  fps?: number;
  keepFrames?: boolean;
  fast?: boolean;
}

export interface RenderSummary {
  output: string;
  sha256: string;
  frames: number;
  durationMs: number;
  fps: number;
  renderMs: number;
  warnings: string[];
  audio: { narration: number; music: boolean; sfx: number } | null;
  throughput: string;
  parallel: number;
}

export async function renderProject(projectDir: string, opts: RenderOptions = {}): Promise<RenderSummary> {
  const started = Date.now();
  const spec = loadSpec(path.join(projectDir, 'spec.json'));
  for (const provider of new Set(spec.audio?.narration.map((segment) => segment.provider).filter((id) => id !== 'say') ?? [])) {
    const plugin = assertPluginInstalled(projectDir, provider, 'tts');
    for (const variable of plugin.permissions.environment) {
      if (!process.env[variable]) throw new Error(`plugin '${provider}' requires ${variable} in the environment`);
    }
  }
  const fps = opts.fps ?? spec.meta.fps;
  const { compositionPath, wire, warnings, lutPath } = prepareComposition(projectDir);

  const framesDir = path.join(projectDir, '.lazy', 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const frameDur = 1000 / fps;
  const frameCount = Math.max(1, Math.ceil(wire.durationMs / frameDur - 1e-9));
  const frames = Array.from({ length: frameCount }, (_, i) => ({ index: i, tMs: i * frameDur }));

  const parallel = opts.fast ? Math.max(2, Math.min((os.cpus().length ?? 4) - 1, 4)) : (opts.parallel ?? 2);
  const frameStart = Date.now();
  await renderFrames({
    compositionPath,
    width: spec.meta.width,
    height: spec.meta.height,
    frames,
    framesDir,
    parallel,
  });
  const frameMs = Date.now() - frameStart;
  const throughput = (frameCount / (frameMs / 1000)).toFixed(1);

  const output = opts.output ?? path.resolve(projectDir, spec.outputs[0]!.path);
  mkdirSync(path.dirname(output), { recursive: true });
  const durationSec = frameCount / fps;
  const wantAudio =
    spec.audio !== undefined && (spec.audio.narration.length > 0 || spec.audio.music !== undefined || spec.audio.sfx.length > 0);
  let audioInfo: RenderSummary['audio'] = null;

  if (wantAudio && spec.audio) {
    const silentVideo = path.join(projectDir, '.lazy', 'video-silent.mp4');
    encodeFrames({ framesDir, fps, output: silentVideo, crf: opts.crf, lutPath });
    const cacheDir = projectAudioCacheDir(projectDir);
    const narration = buildNarration(cacheDir, spec.audio, spec.scenes);
    const clipped = narration.find((segment) => segment.startMs + segment.durationSec * 1000 > durationSec * 1000 + 1);
    if (clipped) {
      warnings.push(`legacy narration at ${clipped.startMs}ms extends beyond the video and will be clipped; use sceneId timing to enforce a complete spoken beat`);
    }
    const sfx = buildSfx(cacheDir, spec.audio);
    const musicWav = spec.audio.music ? buildMusic(cacheDir, spec.audio.music) : undefined;
    assembleAudio({
      videoPath: silentVideo,
      outputPath: output,
      durationSec,
      narration,
      sfx,
      musicWav,
      musicGainDb: spec.audio.music?.gainDb,
    });
    audioInfo = { narration: narration.length, music: musicWav !== undefined, sfx: sfx.length };
  } else {
    encodeFrames({ framesDir, fps, output, crf: opts.crf, lutPath });
  }

  const probe = probeVideo(output);
  assertProbe(probe, {
    durationSec,
    fps,
    width: spec.meta.width,
    height: spec.meta.height,
    hasAudio: wantAudio || undefined,
  });
  if (!opts.keepFrames) rmSync(framesDir, { recursive: true, force: true });

  return {
    output,
    sha256: sha256File(output),
    frames: frameCount,
    durationMs: wire.durationMs,
    fps,
    renderMs: Date.now() - started,
    warnings,
    audio: audioInfo,
    throughput: `${throughput} fps`,
    parallel,
  };
}
