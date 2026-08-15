#!/usr/bin/env node
import { Command } from 'commander';
import { runCheck } from './check.js';
import { runPreview } from './preview.js';
import { runCapture } from './capture.js';
import { runSnapshotGate } from './gates.js';
import { runDoctor, runGenImage, runGenMusic, runGenTts } from './gen.js';
import { renderProject } from '@lazy/renderer';

const program = new Command();

program
  .name('lazy')
  .description('Lazy Video Skill — deterministic local video rendering from a typed spec')
  .version('0.3.0');

program
  .command('doctor')
  .description('environment + provider capability report')
  .option('--json', 'machine-readable output')
  .action((_opts: Record<string, never>, cmd: Command) => {
    const opts = cmd.opts<{ json?: boolean }>();
    runDoctor(opts.json ?? false);
  });

program
  .command('gen')
  .description('generate media with local providers')
  .argument('<capability>', 'image | music | tts')
  .requiredOption('-p, --project <dir>', 'project directory')
  .option('--seed <n>', 'seed (image, music)', parseInt)
  .option('--style <s>', 'image style: ridge | dune | nebula')
  .option('--width <n>', 'image width', parseInt)
  .option('--height <n>', 'image height', parseInt)
  .option('--palette <hexes>', 'comma-separated palette, e.g. #0B0F19,#22D3EE,#F8FAFC')
  .option('--name <name>', 'output asset name (default: seed-based)')
  .option('--mood <m>', 'music mood: calm | pulse')
  .option('--bpm <n>', 'music bpm', parseInt)
  .option('--bars <n>', 'music bars', parseInt)
  .option('--text <text>', 'tts text')
  .option('--voice <voice>', 'tts voice', 'Samantha')
  .option('--rate <n>', 'tts words per minute', parseInt)
  .option('--json', 'machine-readable output')
  .action(async (capability: string, opts: Record<string, unknown>) => {
    const project = opts['project'] as string;
    const json = (opts['json'] as boolean | undefined) ?? false;
    const name = (opts['name'] as string | undefined) ?? `gen-${Date.now().toString(36)}`;
    try {
      if (capability === 'image') {
        const palette = ((opts['palette'] as string | undefined) ?? '#0B0F19,#22D3EE,#F8FAFC').split(',').map((s) => s.trim());
        await runGenImage({
          project,
          seed: (opts['seed'] as number | undefined) ?? 7,
          style: ((opts['style'] as string | undefined) ?? 'ridge') as 'ridge' | 'dune' | 'nebula',
          width: (opts['width'] as number | undefined) ?? 1920,
          height: (opts['height'] as number | undefined) ?? 1080,
          palette,
          name,
          json,
        });
      } else if (capability === 'music') {
        runGenMusic({
          project,
          mood: ((opts['mood'] as string | undefined) ?? 'calm') as 'calm' | 'pulse',
          bpm: (opts['bpm'] as number | undefined) ?? 90,
          bars: (opts['bars'] as number | undefined) ?? 12,
          seed: (opts['seed'] as number | undefined) ?? 11,
          name,
          json,
        });
      } else if (capability === 'tts') {
        const text = opts['text'] as string | undefined;
        if (!text) throw new Error('tts requires --text');
        runGenTts({
          project,
          text,
          voice: (opts['voice'] as string | undefined) ?? 'Samantha',
          rate: (opts['rate'] as number | undefined) ?? 165,
          name,
          json,
        });
      } else {
        throw new Error(`unknown capability '${capability}'; use image | music | tts`);
      }
    } catch (err) {
      console.error(`gen failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('check')
  .description('validate a project: environment + spec schema + semantic checks + gates')
  .argument('<project>', 'project directory containing spec.json')
  .option('--json', 'machine-readable output')
  .option('--skip-gates', 'skip snapshot + seek-determinism gates (env/schema only)')
  .action(async (project: string, opts: { json?: boolean; skipGates?: boolean }) => {
    process.exitCode = await runCheck(project, opts.json ?? false, { skipGates: opts.skipGates });
  });

program
  .command('capture')
  .description('capture a website: screenshots, palette, logo, copy -> project with starter spec')
  .argument('<url>', 'site URL to capture')
  .argument('[project]', 'project directory (default: projects/<host>)')
  .option('--json', 'machine-readable output')
  .action(async (url: string, project: string | undefined, opts: { json?: boolean }) => {
    try {
      await runCapture(url, project, opts.json ?? false);
    } catch (err) {
      console.error(`capture failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('snapshot')
  .description('create or update the snapshot regression baseline')
  .argument('<project>', 'project directory containing spec.json')
  .option('--update', 'write/refresh the baseline instead of comparing')
  .action(async (project: string, opts: { update?: boolean }) => {
    try {
      const res = await runSnapshotGate(project, opts.update ? 'update' : 'compare');
      if (res.ran && res.ok) console.log('snapshot baseline written');
      else if (res.ran) {
        for (const d of res.diffs) console.error(`drift at t=${d.t}ms: ${d.expected} -> ${d.got}`);
        process.exitCode = 1;
      } else console.log('no baseline found; run with --update to create one');
    } catch (err) {
      console.error(`snapshot failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('render')
  .description('render the project to an MP4')
  .argument('<project>', 'project directory containing spec.json')
  .option('-o, --output <path>', 'output MP4 path (default: spec.outputs[0])')
  .option('--fps <n>', 'override fps (draft iteration)', parseInt)
  .option('--parallel <n>', 'parallel render pages', parseInt)
  .option('--crf <n>', 'x264 crf quality (lower = better)', parseInt)
  .option('--keep-frames', 'keep intermediate PNG frames')
  .option('--fast', 'use more parallel pages for faster rendering')
  .option('--json', 'machine-readable output')
  .action(async (project: string, opts: Record<string, unknown>) => {
    try {
      const summary = await renderProject(project, {
        output: opts['output'] as string | undefined,
        fps: opts['fps'] as number | undefined,
        parallel: opts['parallel'] as number | undefined,
        crf: opts['crf'] as number | undefined,
        keepFrames: (opts['keepFrames'] as boolean | undefined) ?? false,
        fast: (opts['fast'] as boolean | undefined) ?? false,
      });
      if (opts['json']) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        for (const w of summary.warnings) console.warn(`warning: ${w}`);
        console.log(`rendered ${summary.frames} frames -> ${summary.output}`);
        console.log(`duration ${(summary.durationMs / 1000).toFixed(2)}s | fps ${summary.fps} | ${(summary.renderMs / 1000).toFixed(1)}s wall | ${summary.throughput} (${summary.parallel}x parallel)`);
        console.log(`sha256 ${summary.sha256}`);
      }
    } catch (err) {
      console.error(`render failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('preview')
  .description('serve a scrubbable preview of the composition')
  .argument('<project>', 'project directory containing spec.json')
  .option('-p, --port <n>', 'port', parseInt)
  .action(async (project: string, opts: { port?: number }) => {
    try {
      await runPreview(project, opts.port ?? 4173);
    } catch (err) {
      console.error(`preview failed: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parseAsync();
