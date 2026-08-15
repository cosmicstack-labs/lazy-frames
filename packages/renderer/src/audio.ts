import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Audio, NarrationSegment, SfxEntry } from '@lazy/engine';

function sidecarDir(): string {
  if (process.env['LAZY_SIDECAR_DIR']) return process.env['LAZY_SIDECAR_DIR']!;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', 'gen-sidecar');
}

export interface SidecarResult {
  ok: boolean;
  path?: string;
  durationSec?: number;
  error?: string;
}

function runSidecar(args: string[]): SidecarResult {
  const res = spawnSync('python3', ['-m', 'gen_sidecar', ...args], {
    cwd: sidecarDir(),
    encoding: 'utf8',
    timeout: 300000,
  });
  if (res.status !== 0) {
    return { ok: false, error: res.stderr?.trim() || `sidecar exited ${res.status}` };
  }
  try {
    const lines = (res.stdout ?? '').trim().split('\n');
    return JSON.parse(lines[lines.length - 1]!) as SidecarResult;
  } catch {
    return { ok: false, error: `sidecar returned unparseable output: ${res.stdout?.slice(0, 200)}` };
  }
}

function hashOf(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

export interface PreparedNarration {
  wavPath: string;
  startMs: number;
  gainDb: number;
}

export function buildNarration(cacheDir: string, audio: Audio): PreparedNarration[] {
  mkdirSync(cacheDir, { recursive: true });
  const out: PreparedNarration[] = [];
  for (let i = 0; i < audio.narration.length; i++) {
    const seg: NarrationSegment = audio.narration[i]!;
    const h = hashOf(['tts', seg.text, seg.voice, String(seg.rate)]);
    const wavPath = path.join(cacheDir, `${h}.wav`);
    if (!existsSync(wavPath)) {
      const res = runSidecar(['tts', '--out', wavPath, '--text', seg.text, '--voice', seg.voice, '--rate', String(seg.rate)]);
      if (!res.ok || !existsSync(wavPath)) {
        throw new Error(`TTS generation failed for segment ${i}: ${res.error ?? 'no output'}`);
      }
    }
    out.push({ wavPath, startMs: seg.startMs, gainDb: seg.gainDb });
  }
  return out;
}

export function buildMusic(cacheDir: string, music: NonNullable<Audio['music']>): string {
  mkdirSync(cacheDir, { recursive: true });
  const h = hashOf(['music', music.mood, String(music.bpm), String(music.bars), String(music.seed)]);
  const wavPath = path.join(cacheDir, `${h}.wav`);
  if (!existsSync(wavPath)) {
    const res = runSidecar([
      'music',
      '--out',
      wavPath,
      '--mood',
      music.mood,
      '--bpm',
      String(music.bpm),
      '--bars',
      String(music.bars),
      '--seed',
      String(music.seed),
    ]);
    if (!res.ok || !existsSync(wavPath)) {
      throw new Error(`music generation failed: ${res.error ?? 'no output'}`);
    }
  }
  return wavPath;
}

export interface PreparedSfx {
  wavPath: string;
  startMs: number;
  gainDb: number;
}

export function buildSfx(cacheDir: string, audio: Audio): PreparedSfx[] {
  mkdirSync(cacheDir, { recursive: true });
  const out: PreparedSfx[] = [];
  for (let i = 0; i < audio.sfx.length; i++) {
    const entry: SfxEntry = audio.sfx[i]!;
    const h = hashOf(['sfx', entry.kind, String(entry.seed)]);
    const wavPath = path.join(cacheDir, `${h}.wav`);
    if (!existsSync(wavPath)) {
      const res = runSidecar(['sfx', '--out', wavPath, '--kind', entry.kind, '--seed', String(entry.seed)]);
      if (!res.ok || !existsSync(wavPath)) {
        throw new Error(`SFX generation failed for entry ${i}: ${res.error ?? 'no output'}`);
      }
    }
    out.push({ wavPath, startMs: entry.atMs, gainDb: entry.gainDb });
  }
  return out;
}

function wavDurationSec(wavPath: string): number {
  const res = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', wavPath], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`ffprobe failed for ${wavPath}`);
  const data = JSON.parse(res.stdout!) as { format?: { duration?: string } };
  return parseFloat(data.format?.duration ?? '0');
}

export function assembleAudio(opts: {
  videoPath: string;
  outputPath: string;
  durationSec: number;
  narration: PreparedNarration[];
  sfx: PreparedSfx[];
  musicWav?: string;
  musicGainDb?: number;
}): void {
  const { durationSec: DUR } = opts;
  const args = ['-y', '-v', 'error', '-i', opts.videoPath];
  const filters: string[] = [];
  const labels: string[] = [];

  if (opts.musicWav) {
    const musicDur = wavDurationSec(opts.musicWav);
    const cycle = Math.max(1, Math.round(musicDur * 44100));
    args.push('-i', opts.musicWav);
    filters.push(
      `[1:a]aloop=loop=-1:size=${cycle},atrim=0:${DUR.toFixed(3)},asetpts=N/SR/TB,volume=${(opts.musicGainDb ?? -14)}dB,afade=t=out:st=${(DUR - 0.8).toFixed(3)}:d=0.8[bed]`,
    );
    labels.push('[bed]');
  } else {
    args.push('-f', 'lavfi', '-t', DUR.toFixed(3), '-i', 'anullsrc=r=44100:cl=mono');
    filters.push('[1:a]anull[bed]');
    labels.push('[bed]');
  }

  opts.narration.forEach((n, i) => {
    const inIdx = i + 2;
    args.push('-i', n.wavPath);
    filters.push(`[${inIdx}:a]adelay=${n.startMs}:all=1,volume=${n.gainDb}dB[n${i}]`);
    labels.push(`[n${i}]`);
  });

  const sfxBase = 2 + opts.narration.length;
  opts.sfx.forEach((s, i) => {
    const inIdx = sfxBase + i;
    args.push('-i', s.wavPath);
    filters.push(`[${inIdx}:a]adelay=${s.startMs}:all=1,volume=${s.gainDb}dB[s${i}]`);
    labels.push(`[s${i}]`);
  });

  filters.push(
    `${labels.join('')}amix=inputs=${labels.length}:duration=first:normalize=0,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[aout]`,
  );
  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '0:v',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-fflags',
    '+bitexact',
    '-flags:a',
    '+bitexact',
    '-movflags',
    '+faststart',
    '-t',
    DUR.toFixed(3),
    opts.outputPath,
  );
  const res = spawnSync('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    throw new Error(`audio assembly failed:\n${res.stderr?.toString() ?? 'unknown error'}`);
  }
}

export function sidecarDoctor(): SidecarResult & Record<string, unknown> {
  return runSidecar(['doctor']) as SidecarResult & Record<string, unknown>;
}
