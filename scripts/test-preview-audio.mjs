import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareComposition, preparePreviewAudio } from '../packages/renderer/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'examples/showreel');
const { wire } = prepareComposition(project);
const mix = preparePreviewAudio(project, wire.frameCount / wire.fps);
assert.ok(mix, 'showreel preview should produce a mix');
assert.ok(existsSync(mix), mix);
assert.ok(statSync(mix).size > 4000, 'preview mix is too small');

const probe = spawnSync(
  'ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mix],
  { encoding: 'utf8' },
);
assert.equal(probe.status, 0, probe.stderr);
const duration = parseFloat(probe.stdout.trim());
const expected = wire.frameCount / wire.fps;
assert.ok(Math.abs(duration - expected) < 0.15, `mix duration ${duration} vs ${expected}`);

console.log(`preview audio ok ${path.relative(root, mix)} ${duration.toFixed(2)}s`);
