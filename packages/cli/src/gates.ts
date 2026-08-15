import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { keyframeTimes, loadSpec } from '@lazy/engine';
import { captureKeyframes, prepareComposition, type KeyframeShot } from '@lazy/renderer';

interface Baseline {
  version: 1;
  entries: { t: number; scene?: string; kind?: string; hash: string }[];
}

export interface SnapshotGateResult {
  ran: boolean;
  ok: boolean;
  diffs: { t: number; scene?: string; expected: string; got: string }[];
}

export async function runSnapshotGate(projectDir: string, mode: 'update' | 'compare'): Promise<SnapshotGateResult> {
  const baselinePath = path.join(projectDir, 'snapshots', 'baseline.json');
  const hasBaseline = existsSync(baselinePath);
  if (mode === 'compare' && !hasBaseline) {
    return { ran: false, ok: true, diffs: [] };
  }

  const spec = loadSpec(path.join(projectDir, 'spec.json'));
  const { compositionPath, wire } = prepareComposition(projectDir);
  const times = keyframeTimes(spec);
  const workDir = path.join(projectDir, '.lazy', 'snapshots');
  rmSync(workDir, { recursive: true, force: true });
  const shots: KeyframeShot[] = await captureKeyframes({
    compositionPath,
    width: wire.width,
    height: wire.height,
    times,
    outDir: path.join(projectDir, 'snapshots', 'frames'),
  });

  if (mode === 'update') {
    const baseline: Baseline = {
      version: 1,
      entries: shots.map((s) => ({ t: s.t, scene: s.scene, kind: s.kind, hash: s.hash })),
    };
    writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
    return { ran: true, ok: true, diffs: [] };
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
  const diffs: SnapshotGateResult['diffs'] = [];
  if (baseline.entries.length !== shots.length) {
    diffs.push({ t: -1, expected: `${baseline.entries.length} keyframes`, got: `${shots.length} keyframes` });
  }
  const n = Math.min(baseline.entries.length, shots.length);
  for (let i = 0; i < n; i++) {
    if (baseline.entries[i]!.hash !== shots[i]!.hash) {
      diffs.push({
        t: shots[i]!.t,
        scene: shots[i]!.scene,
        expected: baseline.entries[i]!.hash,
        got: shots[i]!.hash,
      });
    }
  }
  return { ran: true, ok: diffs.length === 0, diffs };
}

export interface SeekGateResult {
  ok: boolean;
  samples: { t: number; a: string; b: string; match: boolean }[];
}

export async function runSeekDeterminismGate(projectDir: string): Promise<SeekGateResult> {
  const { compositionPath, wire } = prepareComposition(projectDir);
  const times = [0.07, 0.23, 0.41, 0.59, 0.83].map((f) => ({
    t: Math.min(wire.durationMs - 10, Math.round(wire.durationMs * f)),
  }));
  const base = path.join(projectDir, '.lazy', 'seek-gate');
  rmSync(base, { recursive: true, force: true });
  const a = await captureKeyframes({ compositionPath, width: wire.width, height: wire.height, times, outDir: path.join(base, 'a') });
  const b = await captureKeyframes({ compositionPath, width: wire.width, height: wire.height, times, outDir: path.join(base, 'b') });
  const samples = a.map((s, i) => ({ t: s.t, a: s.hash, b: b[i]!.hash, match: s.hash === b[i]!.hash }));
  return { ok: samples.every((s) => s.match), samples };
}
