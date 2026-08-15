import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, realpathSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { narrationStartMs, type Audio, type NarrationSegment, type Scene, type SfxEntry } from '@lazy/engine';

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
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 24);
}

export function projectAudioCacheDir(projectDir: string): string {
  const project = realpathSync(projectDir);
  let current = project;
  for (const part of ['.lazy', 'cache', 'audio']) {
    current = path.join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    const resolved = realpathSync(current);
    const relative = path.relative(project, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('audio cache resolves outside the project');
    current = resolved;
  }
  return current;
}

function cachedAudioFile(wavPath: string, generate: (tempPath: string) => SidecarResult, label: string): void {
  if (existsSync(wavPath)) {
    if (!lstatSync(wavPath).isFile()) throw new Error(`${label} cache entry is not a regular file`);
    return;
  }
  const temp = path.join(path.dirname(wavPath), `.${path.basename(wavPath, '.wav')}.${randomUUID()}.wav`);
  try {
    const res = generate(temp);
    if (!res.ok || !existsSync(temp) || !lstatSync(temp).isFile()) throw new Error(`${label} generation failed: ${res.error ?? 'no output'}`);
    renameSync(temp, wavPath);
  } finally {
    rmSync(temp, { force: true });
  }
}

export interface PreparedNarration {
  wavPath: string;
  startMs: number;
  gainDb: number;
  durationSec: number;
  provider: NarrationSegment['provider'];
  sceneId?: string;
}

export function buildNarration(cacheDir: string, audio: Audio, scenes: Scene[] = []): PreparedNarration[] {
  mkdirSync(cacheDir, { recursive: true });
  const out: PreparedNarration[] = [];
  for (let i = 0; i < audio.narration.length; i++) {
    const seg: NarrationSegment = audio.narration[i]!;
    const settings = seg.voiceSettings;
    const h = hashOf([
      'tts-v2',
      seg.provider,
      seg.text,
      seg.voice,
      String(seg.rate),
      seg.model,
      String(settings.stability),
      String(settings.similarityBoost),
      String(settings.style),
      String(settings.useSpeakerBoost),
    ]);
    const wavPath = path.join(cacheDir, `${h}.wav`);
    if (!existsSync(wavPath)) {
      const args = [
        'tts', '--out', wavPath, '--text', seg.text, '--provider', seg.provider, '--voice', seg.voice,
        '--rate', String(seg.rate), '--model', seg.model, '--stability', String(settings.stability),
        '--similarity-boost', String(settings.similarityBoost), '--voice-style', String(settings.style),
      ];
      if (!settings.useSpeakerBoost) args.push('--no-speaker-boost');
      cachedAudioFile(wavPath, (temp) => {
        const outIndex = args.indexOf('--out') + 1;
        args[outIndex] = temp;
        return runSidecar(args);
      }, `TTS segment ${i}`);
    } else if (!lstatSync(wavPath).isFile()) {
      throw new Error(`TTS cache entry for segment ${i} is not a regular file`);
    }
    const startMs = narrationStartMs(seg, scenes);
    const durationSec = wavDurationSec(wavPath);
    if (seg.sceneId) {
      const scene = scenes.find((candidate) => candidate.id === seg.sceneId)!;
      const overrunMs = startMs + durationSec * 1000 - (scene.startMs + scene.durationMs);
      if (overrunMs > 1) {
        throw new Error(`narration for scene '${seg.sceneId}' overruns the scene by ${Math.ceil(overrunMs)}ms; shorten the script or extend the scene`);
      }
    }
    out.push({ wavPath, startMs, gainDb: seg.gainDb, durationSec, provider: seg.provider, sceneId: seg.sceneId });
  }
  return out;
}

export function buildMusic(cacheDir: string, music: NonNullable<Audio['music']>): string {
  mkdirSync(cacheDir, { recursive: true });
  const h = hashOf(['music', music.mood, String(music.bpm), String(music.bars), String(music.seed)]);
  const wavPath = path.join(cacheDir, `${h}.wav`);
  if (!existsSync(wavPath)) {
    cachedAudioFile(wavPath, (temp) => runSidecar([
      'music',
      '--out',
      temp,
      '--mood',
      music.mood,
      '--bpm',
      String(music.bpm),
      '--bars',
      String(music.bars),
      '--seed',
      String(music.seed),
    ]), 'music');
  } else if (!lstatSync(wavPath).isFile()) throw new Error('music cache entry is not a regular file');
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
      cachedAudioFile(wavPath, (temp) => runSidecar(['sfx', '--out', temp, '--kind', entry.kind, '--seed', String(entry.seed)]), `SFX entry ${i}`);
    } else if (!lstatSync(wavPath).isFile()) throw new Error(`SFX cache entry for entry ${i} is not a regular file`);
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
