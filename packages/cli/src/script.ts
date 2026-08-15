import { lstatSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertPluginInstalled, loadSpec, type NarrationSegment, type Scene } from '@lazy/engine';

function sentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function sceneScript(scene: Scene): string | undefined {
  switch (scene.type) {
    case 'typography':
      return sentence(scene.params.lines.map((line) => line.text.trim().replace(/[,.!?;:]+$/, '')).join(', '));
    case 'stat-hit': {
      const value = `${scene.params.prefix}${scene.params.value.toFixed(scene.params.decimals)}${scene.params.suffix}`;
      return sentence([scene.params.kicker, value, scene.params.label].filter(Boolean).join('. '));
    }
    case 'browser-frame':
      return sentence(`See it in action at ${scene.params.url}`);
    case 'ui-callout':
      return sentence(scene.params.label);
    default:
      return undefined;
  }
}

function fitWords(text: string, availableMs: number, rate: number): string {
  const maxWords = Math.max(1, Math.floor((availableMs / 60000) * rate * 0.85));
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  const candidate = words.slice(0, maxWords);
  for (let i = candidate.length - 1; i >= 1; i--) {
    if (/[.!?;,]$/.test(candidate[i]!)) return `${candidate.slice(0, i + 1).join(' ').replace(/[;,]$/, '')}.`;
  }
  return `${candidate.join(' ').replace(/[,.!?;:]$/, '')}.`;
}

export function runScriptPlanner(opts: {
  project: string;
  provider: string;
  voice: string;
  rate: number;
  offsetMs: number;
  apply: boolean;
  output: string;
  json: boolean;
}): void {
  const project = path.resolve(opts.project);
  const specPath = path.join(project, 'spec.json');
  if (!Number.isInteger(opts.rate) || opts.rate < 80 || opts.rate > 300) throw new Error('--rate must be an integer from 80 to 300');
  if (!Number.isInteger(opts.offsetMs) || opts.offsetMs < 0 || opts.offsetMs > 60000) throw new Error('--offset-ms must be an integer from 0 to 60000');
  if (opts.provider === 'elevenlabs' && opts.voice === 'Samantha') throw new Error('ElevenLabs requires --voice with a voice ID');
  const spec = loadSpec(specPath);
  if (opts.provider !== 'say') assertPluginInstalled(project, opts.provider, 'tts');

  const narration: NarrationSegment[] = [];
  for (const scene of [...spec.scenes].sort((a, b) => a.startMs - b.startMs)) {
    const draft = sceneScript(scene);
    if (!draft) continue;
    const offsetMs = Math.max(opts.offsetMs, scene.transitionIn.ms);
    const availableMs = scene.durationMs - offsetMs - Math.max(400, scene.transitionOut.ms);
    if (availableMs < 500) continue;
    narration.push({
      text: fitWords(draft, availableMs, opts.rate),
      sceneId: scene.id,
      offsetMs,
      provider: opts.provider,
      voice: opts.voice,
      rate: opts.rate,
      model: 'eleven_multilingual_v2',
      voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0, useSpeakerBoost: true },
      gainDb: 0,
    });
  }
  if (narration.length === 0) throw new Error('no narration-ready scene copy found; add typography, stat-hit, browser-frame, or ui-callout scenes');

  const markdown = [
    '# Narration Script',
    '',
    ...narration.flatMap((segment) => [`## ${segment.sceneId}`, '', segment.text, '']),
  ].join('\n');

  if (opts.apply) {
    const outputPath = path.resolve(project, opts.output);
    const relativeOutput = path.relative(project, outputPath);
    if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput)) throw new Error('--output must stay inside the project directory');
    if (outputPath === specPath || outputPath === path.join(project, 'lazy-plugins.json')) throw new Error('--output cannot replace a Lazy Frames project file');
    const projectReal = realpathSync(project);
    const outputParentReal = realpathSync(path.dirname(outputPath));
    const relativeParent = path.relative(projectReal, outputParentReal);
    if (relativeParent.startsWith('..') || path.isAbsolute(relativeParent)) throw new Error('--output cannot traverse a symbolic link outside the project');
    for (const target of [specPath, outputPath]) {
      try {
        if (lstatSync(target).isSymbolicLink()) throw new Error(`refusing to write through symbolic link: ${target}`);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    }
    const raw = JSON.parse(readFileSync(specPath, 'utf8')) as Record<string, unknown>;
    const currentAudio = raw['audio'] && typeof raw['audio'] === 'object' ? raw['audio'] as Record<string, unknown> : {};
    raw['audio'] = { ...currentAudio, narration };
    const specTemp = `${specPath}.${process.pid}.tmp`;
    const outputTemp = path.join(outputParentReal, `.${path.basename(outputPath)}.${process.pid}.tmp`);
    try {
      writeFileSync(specTemp, `${JSON.stringify(raw, null, 2)}\n`, { flag: 'wx' });
      writeFileSync(outputTemp, markdown, { flag: 'wx' });
      renameSync(outputTemp, outputPath);
      renameSync(specTemp, specPath);
    } finally {
      rmSync(specTemp, { force: true });
      rmSync(outputTemp, { force: true });
    }
  }

  const result = { ok: true, applied: opts.apply, script: opts.output, narration };
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else if (opts.apply) console.log(`wrote ${opts.output} and ${narration.length} scene-linked narration beats to spec.json`);
  else console.log(markdown);
}
