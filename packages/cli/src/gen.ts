import { copyFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildGeneratorHtml, type GeneratorStyle } from '@lazy/engine';
import { buildMusic, buildNarration, renderStill, sidecarDoctor } from '@lazy/renderer';

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
  const dir = path.join(opts.project, 'assets', 'gen');
  mkdirSync(dir, { recursive: true });
  const genOpts = { seed: opts.seed, style: opts.style, width: opts.width, height: opts.height, palette: opts.palette };
  const stillPath = path.join(dir, `${opts.name}.png`);
  const depthPath = path.join(dir, `${opts.name}.depth.png`);
  await renderStill({ html: buildGeneratorHtml(genOpts, 'still'), width: opts.width, height: opts.height, outPng: stillPath });
  await renderStill({ html: buildGeneratorHtml(genOpts, 'depth'), width: opts.width, height: opts.height, outPng: depthPath });
  const result = { ok: true, still: path.relative(opts.project, stillPath), depth: path.relative(opts.project, depthPath) };
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
  const cacheDir = path.join(opts.project, '.lazy', 'cache', 'audio');
  const wav = buildMusic(cacheDir, { mood: opts.mood, bpm: opts.bpm, bars: opts.bars, seed: opts.seed, gainDb: 0 });
  const dir = path.join(opts.project, 'assets', 'gen');
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${opts.name}.wav`);
  copyFileSync(wav, out);
  const result = { ok: true, file: path.relative(opts.project, out) };
  console.log(opts.json ? JSON.stringify(result) : `generated ${result.file}`);
}

export function runGenTts(opts: { project: string; text: string; voice: string; rate: number; name: string; json: boolean }): void {
  const cacheDir = path.join(opts.project, '.lazy', 'cache', 'audio');
  const segs = buildNarration(cacheDir, {
    narration: [{ text: opts.text, startMs: 0, voice: opts.voice, rate: opts.rate, gainDb: 0 }],
    sfx: [],
  });
  const dir = path.join(opts.project, 'assets', 'gen');
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${opts.name}.wav`);
  copyFileSync(segs[0]!.wavPath, out);
  const result = { ok: true, file: path.relative(opts.project, out) };
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
