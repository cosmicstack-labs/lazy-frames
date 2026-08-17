import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserFrameParamsSchema, MediaPositionSchema, ParallaxParamsSchema, UiCalloutParamsSchema } from '../packages/engine/dist/index.js';
import { buildStarterSpec } from '../packages/capture/dist/index.js';

const center = { x: 'center', y: 'center' };
assert.deepEqual(MediaPositionSchema.parse(undefined), center);
assert.deepEqual(BrowserFrameParamsSchema.parse({ src: 'hero.png', url: 'example.com' }).position, center);
assert.deepEqual(ParallaxParamsSchema.parse({ src: 'full.png' }).position, center);
assert.deepEqual(UiCalloutParamsSchema.parse({
  src: 'hero.png',
  hotspot: { x: 10, y: 10, w: 20, h: 20 },
  label: 'Example',
}).position, center);

const starter = buildStarterSpec({
  site: 'https://example.com',
  finalUrl: 'https://example.com/',
  capturedAt: '2026-08-17T00:00:00.000Z',
  meta: { title: 'Example', description: 'Centered media' },
  palette: [{ hex: '#0B0F19', count: 10 }, { hex: '#22D3EE', count: 5 }, { hex: '#F8FAFC', count: 4 }],
  fonts: [],
  copy: [],
  assets: [],
}, 'example.com');
for (const scene of starter.scenes.filter((item) => ['browser-frame', 'parallax', 'ui-callout'].includes(item.type))) {
  assert.deepEqual(scene.params.position, center, `${scene.type} starter scene must be centered`);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [
  path.join(root, 'packages/cli/dist/index.js'),
  'check',
  path.join(root, 'examples/demo'),
  '--skip-gates',
  '--json',
], { cwd: root, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
assert.equal(JSON.parse(result.stdout).ok, true);
assert.match(result.stderr, /\[check\] start: Checking Chrome and FFmpeg/);
assert.match(result.stderr, /\[check\] done: All checks passed/);

console.log('alignment and progress regression tests passed');
