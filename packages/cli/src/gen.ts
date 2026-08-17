import { constants as fsConstants, copyFileSync, existsSync, lstatSync, mkdirSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { NarrationSegmentSchema, assertPluginInstalled, buildGeneratorHtml, type GeneratorStyle } from '../../engine/dist/index.js';
import { buildMusic, buildNarration, projectAudioCacheDir, renderStill, sidecarDoctor } from '../../renderer/dist/index.js';

function generatedAssetDir(projectDir: string, name: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(name)) {
    throw new Error('--name must be 1-80 letters, numbers, underscores, or hyphens');
  }
  const project = realpathSync(projectDir);
  const assets = path.join(project, 'assets');
  if (!existsSync(assets)) mkdirSync(assets);
  const assetsReal = realpathSync(assets);
  const assetsRelative = path.relative(project, assetsReal);
  if (assetsRelative.startsWith('..') || path.isAbsolute(assetsRelative)) throw new Error('project assets directory resolves outside the project');
  const dir = path.join(assetsReal, 'gen');
  if (!existsSync(dir)) mkdirSync(dir);
  const dirReal = realpathSync(dir);
  const dirRelative = path.relative(project, dirReal);
  if (dirRelative.startsWith('..') || path.isAbsolute(dirRelative)) throw new Error('generated asset directory resolves outside the project');
  return dirReal;
}

function commitGeneratedFile(temp: string, output: string): void {
  if (!lstatSync(temp).isFile()) throw new Error(`generated output is not a regular file: ${temp}`);
  renameSync(temp, output);
}

export async function runGenImage(opts: {
  project: string;
  seed: number;
  style: GeneratorStyle;
  width: number;
  height: number;
  palette: string[];
  name: string;
  json: boolean;
}): Promise<void> {
  const dir = generatedAssetDir(opts.project, opts.name);
  const genOpts = { seed: opts.seed, style: opts.style, width: opts.width, height: opts.height, palette: opts.palette };
  const stillPath = path.join(dir, `${opts.name}.png`);
  const depthPath = path.join(dir, `${opts.name}.depth.png`);
  const token = randomUUID();
  const stillTemp = path.join(dir, `.${opts.name}.${token}.png`);
  const depthTemp = path.join(dir, `.${opts.name}.${token}.depth.png`);
  try {
    await renderStill({ html: buildGeneratorHtml(genOpts, 'still'), width: opts.width, height: opts.height, outPng: stillTemp });
    await renderStill({ html: buildGeneratorHtml(genOpts, 'depth'), width: opts.width, height: opts.height, outPng: depthTemp });
    commitGeneratedFile(stillTemp, stillPath);
    commitGeneratedFile(depthTemp, depthPath);
  } finally {
    rmSync(stillTemp, { force: true });
    rmSync(depthTemp, { force: true });
  }
  const result = { ok: true, still: path.relative(realpathSync(opts.project), stillPath), depth: path.relative(realpathSync(opts.project), depthPath) };
  console.log(opts.json ? JSON.stringify(result) : `generated ${result.still} + ${result.depth}`);
}

export function runGenMusic(opts: {
  project: string;
  mood: 'calm' | 'pulse';
  bpm: number;
  bars: number;
  seed: number;
  name: string;
  json: boolean;
}): void {
  const cacheDir = projectAudioCacheDir(opts.project);
  const wav = buildMusic(cacheDir, { mood: opts.mood, bpm: opts.bpm, bars: opts.bars, seed: opts.seed, gainDb: 0 });
  const dir = generatedAssetDir(opts.project, opts.name);
  const out = path.join(dir, `${opts.name}.wav`);
  const temp = path.join(dir, `.${opts.name}.${randomUUID()}.wav`);
  try {
    copyFileSync(wav, temp, fsConstants.COPYFILE_EXCL);
    commitGeneratedFile(temp, out);
  } finally {
    rmSync(temp, { force: true });
  }
  const result = { ok: true, file: path.relative(realpathSync(opts.project), out) };
  console.log(opts.json ? JSON.stringify(result) : `generated ${result.file}`);
}

export function runGenTts(opts: {
  project: string;
  text: string;
  provider: string;
  voice: string;
  rate: number;
  model: string;
  stability: number;
  similarityBoost: number;
  voiceStyle: number;
  speakerBoost: boolean;
  name: string;
  json: boolean;
}): void {
  if (opts.provider !== 'say') assertPluginInstalled(opts.project, opts.provider, 'tts');
  const cacheDir = projectAudioCacheDir(opts.project);
  const segment = NarrationSegmentSchema.parse({
    text: opts.text,
    startMs: 0,
    offsetMs: 0,
    provider: opts.provider,
    voice: opts.voice,
    rate: opts.rate,
    model: opts.model,
    voiceSettings: {
      stability: opts.stability,
      similarityBoost: opts.similarityBoost,
      style: opts.voiceStyle,
      useSpeakerBoost: opts.speakerBoost,
    },
    gainDb: 0,
  });
  const segs = buildNarration(cacheDir, {
    narration: [segment],
    sfx: [],
  });
  const dir = generatedAssetDir(opts.project, opts.name);
  const out = path.join(dir, `${opts.name}.wav`);
  const temp = path.join(dir, `.${opts.name}.${randomUUID()}.wav`);
  try {
    copyFileSync(segs[0]!.wavPath, temp, fsConstants.COPYFILE_EXCL);
    commitGeneratedFile(temp, out);
  } finally {
    rmSync(temp, { force: true });
  }
  const result = { ok: true, file: path.relative(realpathSync(opts.project), out), provider: opts.provider, durationSec: segs[0]!.durationSec };
  console.log(opts.json ? JSON.stringify(result) : `generated ${result.file}`);
}

export function runDoctor(json: boolean): void {
  const n = { platform: os.platform(), arch: os.arch(), cpus: os.cpus().length, memoryGb: Math.round(os.totalmem() / 1024 ** 3) };
  const side = sidecarDoctor();
  const providers = (side['providers'] ?? {}) as Record<string, { available?: boolean; engine?: string }>;
  const report = { ok: side.ok, node: n, sidecar: side };
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`node: ${n.platform}/${n.arch} ${n.cpus}cpus ${n.memoryGb}GB`);
    console.log(`sidecar: python ${String(side['python'])} | tier ${String(side['tier'])}`);
    for (const [k, v] of Object.entries(providers)) {
      console.log(`  ${k}: ${v.available ? `available${v.engine ? ` (${v.engine})` : ''}` : 'unavailable'}`);
    }
  }
}
