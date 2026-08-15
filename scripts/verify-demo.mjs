import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'packages', 'cli', 'dist', 'index.js');
const project = path.join(root, 'examples', 'demo');

function render(output) {
  const res = spawnSync(
    process.execPath,
    [cli, 'render', project, '--json', '-o', output],
    { encoding: 'utf8', cwd: root, timeout: 900000 },
  );
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
    process.exit(1);
  }
  return JSON.parse(res.stdout);
}

console.log('render A ...');
const a = render(path.join(root, 'out', 'demo-a.mp4'));
console.log(`sha256 ${a.sha256} (${(a.renderMs / 1000).toFixed(1)}s, ${a.frames} frames)`);

console.log('render B ...');
const b = render(path.join(root, 'out', 'demo-b.mp4'));
console.log(`sha256 ${b.sha256} (${(b.renderMs / 1000).toFixed(1)}s, ${b.frames} frames)`);

if (a.sha256 === b.sha256) {
  console.log('PASS: byte-identical output across two renders');
} else {
  console.error('FAIL: renders diverged — determinism broken');
  process.exit(1);
}
