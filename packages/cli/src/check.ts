import { assertPluginInstalled, collectAssetRefs, compileSpec, emitProgress, loadSpec, SpecError, type CheckError, type ProgressReporter } from '../../engine/dist/index.js';
import { checkFfmpeg, checkFfprobe, findChrome } from '../../renderer/dist/index.js';
import path from 'node:path';
import { runSeekDeterminismGate, runSnapshotGate } from './gates.js';

export interface CheckOutput {
  ok: boolean;
  errors: CheckError[];
  warnings: string[];
  gates: { snapshots: 'skipped' | 'passed' | 'failed'; seekDeterminism: 'skipped' | 'passed' | 'failed' };
}

export async function runCheck(projectDir: string, json: boolean, opts: { skipGates?: boolean; onProgress?: ProgressReporter } = {}): Promise<number> {
  const errors: CheckError[] = [];
  const warnings: string[] = [];
  const gates: CheckOutput['gates'] = { snapshots: 'skipped', seekDeterminism: 'skipped' };

  emitProgress(opts.onProgress, { command: 'check', phase: 'environment', status: 'start', message: 'Checking Chrome and FFmpeg' });
  try {
    findChrome();
  } catch (err) {
    errors.push({ code: 'chrome_not_found', message: (err as Error).message });
  }
  if (!checkFfmpeg()) errors.push({ code: 'ffmpeg_not_found', message: 'ffmpeg is not on PATH; install it (brew install ffmpeg)' });
  if (!checkFfprobe()) errors.push({ code: 'ffprobe_not_found', message: 'ffprobe is not on PATH; install it (brew install ffmpeg)' });
  emitProgress(opts.onProgress, { command: 'check', phase: 'environment', status: 'complete', message: 'Environment checked' });

  let specOk = false;
  emitProgress(opts.onProgress, { command: 'check', phase: 'spec', status: 'start', message: 'Validating schema, assets, and plugin permissions' });
  try {
    const spec = loadSpec(path.join(projectDir, 'spec.json'));
    specOk = true;
    for (const provider of new Set(spec.audio?.narration.map((segment) => segment.provider).filter((id) => id !== 'say') ?? [])) {
      try {
        const plugin = assertPluginInstalled(projectDir, provider, 'tts');
        for (const variable of plugin.permissions.environment) {
          if (!process.env[variable]) errors.push({ code: 'plugin_credential', message: `plugin '${provider}' requires ${variable} in the environment` });
        }
      } catch (err) {
        errors.push({ code: 'plugin_unavailable', message: (err as Error).message });
      }
    }
    try {
      const assetRefs = collectAssetRefs(spec, projectDir);
      const assetMap = new Map(assetRefs.map((r) => [r.src, r.dest]));
      const compiled = compileSpec(spec, { assetMap });
      warnings.push(...compiled.warnings);
    } catch (err) {
      if (err instanceof SpecError) errors.push(...err.errors);
      else throw err;
    }
  } catch (err) {
    if (err instanceof SpecError) errors.push(...err.errors);
    else errors.push({ code: 'check_failed', message: (err as Error).message });
  }
  emitProgress(opts.onProgress, { command: 'check', phase: 'spec', status: 'complete', message: 'Project spec checked' });

  if (opts.skipGates !== true && specOk && errors.length === 0) {
    emitProgress(opts.onProgress, { command: 'check', phase: 'snapshots', status: 'start', message: 'Comparing visual snapshots' });
    try {
      const snap = await runSnapshotGate(projectDir, 'compare');
      gates.snapshots = snap.ok ? 'passed' : 'failed';
      for (const d of snap.diffs) {
        errors.push({
          code: 'snapshot_regression',
          message: `keyframe t=${d.t}ms${d.scene ? ` (scene '${d.scene}')` : ''} drifted from baseline (expected ${d.expected}, got ${d.got}); if intentional run: lazy snapshot <project> --update`,
        });
      }
    } catch (err) {
      errors.push({ code: 'snapshot_gate_error', message: (err as Error).message });
      gates.snapshots = 'failed';
    }
    emitProgress(opts.onProgress, { command: 'check', phase: 'snapshots', status: 'complete', message: 'Snapshot gate finished' });

    emitProgress(opts.onProgress, { command: 'check', phase: 'seek', status: 'start', message: 'Testing deterministic seeks' });
    try {
      const seek = await runSeekDeterminismGate(projectDir);
      gates.seekDeterminism = seek.ok ? 'passed' : 'failed';
      for (const s of seek.samples) {
        if (!s.match) {
          errors.push({ code: 'seek_nondeterminism', message: `two renders of t=${s.t}ms differ (${s.a} vs ${s.b})` });
        }
      }
    } catch (err) {
      errors.push({ code: 'seek_gate_error', message: (err as Error).message });
      gates.seekDeterminism = 'failed';
    }
    emitProgress(opts.onProgress, { command: 'check', phase: 'seek', status: 'complete', message: 'Seek-determinism gate finished' });
  }

  const ok = errors.length === 0;
  emitProgress(opts.onProgress, { command: 'check', phase: 'complete', status: 'complete', message: ok ? 'All checks passed' : `Checks found ${errors.length} error(s)` });
  const output: CheckOutput = { ok, errors, warnings, gates };
  if (json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const e of errors) console.error(`error [${e.code}]${e.scene ? ` (${e.scene})` : ''}: ${e.message}`);
    for (const w of warnings) console.warn(`warning: ${w}`);
    console.log(`gates: snapshots=${gates.snapshots} seek-determinism=${gates.seekDeterminism}`);
    console.log(ok ? 'check passed' : `check failed with ${errors.length} error(s)`);
  }
  return ok ? 0 : 1;
}
