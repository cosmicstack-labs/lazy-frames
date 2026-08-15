import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function checkFfmpeg(): boolean {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}
export function checkFfprobe(): boolean {
  return spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
}

export function encodeFrames(opts: {
  framesDir: string;
  fps: number;
  output: string;
  crf?: number;
  threads?: number;
  lutPath?: string;
}): void {
  const vf = opts.lutPath ? `lut3d=${opts.lutPath}` : undefined;
  const args = [
    '-y',
    '-framerate',
    String(opts.fps),
    '-i',
    `${opts.framesDir}/f%06d.png`,
  ];
  if (vf) args.push('-vf', vf);
  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(opts.crf ?? 16),
    '-pix_fmt',
    'yuv420p',
    '-threads',
    String(opts.threads ?? 4),
    '-fflags',
    '+bitexact',
    '-flags:v',
    '+bitexact',
    '-metadata',
    'creation_time=1970-01-01T00:00:00.000000Z',
    '-movflags',
    '+faststart',
    opts.output,
  );
  const res = spawnSync('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (res.status !== 0) {
    throw new Error(`ffmpeg encode failed:\n${res.stderr?.toString() ?? 'unknown error'}`);
  }
}

export interface ProbeResult {
  durationSec: number;
  codec: string;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  audioCodec?: string;
}

export function probeVideo(path: string): ProbeResult {
  const res = spawnSync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) throw new Error(`ffprobe failed: ${res.stderr ?? 'unknown error'}`);
  const data = JSON.parse(res.stdout!) as {
    format?: { duration?: string };
    streams?: { codec_type: string; codec_name: string; width: number; height: number; r_frame_rate?: string }[];
  };
  const v = data.streams?.find((s) => s.codec_type === 'video');
  const a = data.streams?.find((s) => s.codec_type === 'audio');
  if (!v || !data.format?.duration) throw new Error('no video stream in output');
  const fr = (v.r_frame_rate ?? '0/1').split('/');
  const num = Number(fr[0] ?? 0);
  const den = Number(fr[1] ?? 1) || 1;
  return {
    durationSec: parseFloat(data.format.duration),
    codec: v.codec_name,
    width: v.width,
    height: v.height,
    fps: num / den,
    hasAudio: a !== undefined,
    audioCodec: a?.codec_name,
  };
}

export function assertProbe(
  probe: ProbeResult,
  expect: { durationSec: number; fps: number; width: number; height: number; hasAudio?: boolean },
): void {
  const tolerance = 2 / expect.fps + 0.05;
  if (probe.codec !== 'h264') throw new Error(`probe: expected h264, got ${probe.codec}`);
  if (Math.abs(probe.durationSec - expect.durationSec) > tolerance) {
    throw new Error(`probe: duration ${probe.durationSec.toFixed(3)}s deviates from expected ${expect.durationSec.toFixed(3)}s`);
  }
  if (probe.width !== expect.width || probe.height !== expect.height) {
    throw new Error(`probe: resolution ${probe.width}x${probe.height} != expected ${expect.width}x${expect.height}`);
  }
  if (Math.abs(probe.fps - expect.fps) > 0.01) {
    throw new Error(`probe: fps ${probe.fps} != expected ${expect.fps}`);
  }
  if (expect.hasAudio === true && !probe.hasAudio) throw new Error('probe: expected an audio stream, found none');
  if (expect.hasAudio === false && probe.hasAudio) throw new Error('probe: unexpected audio stream');
}

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function hashImagePixels(pngPath: string): string {
  const res = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', pngPath, '-vf', 'scale=8:8', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
    { maxBuffer: 1 << 20 },
  );
  if (res.status !== 0 || !res.stdout || res.stdout.length < 64) {
    throw new Error(`ffmpeg pixel-hash failed for ${pngPath}`);
  }
  return createHash('sha256').update(res.stdout.subarray(0, 64)).digest('hex');
}
