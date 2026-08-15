import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'packages', 'cli', 'dist', 'index.js');
const project = path.join(root, 'examples', 'cinematic');

function run(cmd, args, label) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', cwd: root, timeout: 900000 });
  if (res.status !== 0) {
    console.error(`--- ${label} failed ---`);
    console.error(res.stdout);
    console.error(res.stderr);
    process.exit(1);
  }
  return res.stdout;
}

mkdirSync(path.join(project, 'assets', 'footage'), { recursive: true });

console.log('footage (lavfi, deterministic) ...');
run('ffmpeg', [
  '-y', '-v', 'error',
  '-f', 'lavfi', '-i', 'gradients=size=1920x1080:speed=0.025:d=6',
  '-r', '24', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16',
  '-fflags', '+bitexact', '-flags:v', '+bitexact',
  path.join(project, 'assets', 'footage', 'flow.mp4'),
], 'footage');

console.log('gen images ...');
run('node', [cli, 'gen', 'image', '-p', project, '--seed', '21', '--style', 'ridge', '--palette', '#070B14,#F59E4C,#F4F7FB', '--name', 'ridge-21', '--json'], 'gen ridge');
run('node', [cli, 'gen', 'image', '-p', project, '--seed', '42', '--style', 'dune', '--palette', '#070B14,#7FB7D9,#F4F7FB', '--name', 'dune-42', '--json'], 'gen dune');

console.log('snapshot baseline + check ...');
run('node', [cli, 'snapshot', project, '--update'], 'snapshot');
const check = JSON.parse(run('node', [cli, 'check', project, '--json'], 'check'));
if (!check.ok) {
  console.error(JSON.stringify(check, null, 2));
  process.exit(1);
}
console.log(`check ok | gates: ${JSON.stringify(check.gates)}`);

function render(output) {
  return JSON.parse(run('node', [cli, 'render', project, '--json', '-o', output], 'render'));
}

console.log('render A ...');
const a = render(path.join(root, 'out', 'cinematic-a.mp4'));
console.log(`sha256 ${a.sha256} | audio ${JSON.stringify(a.audio)} | ${(a.renderMs / 1000).toFixed(1)}s`);

console.log('render B ...');
const b = render(path.join(root, 'out', 'cinematic-b.mp4'));
console.log(`sha256 ${b.sha256}`);

if (a.sha256 !== b.sha256) {
  console.error('FAIL: audio-inclusive renders diverged');
  process.exit(1);
}
if (!a.audio || a.audio.narration !== 2 || a.audio.music !== true) {
  console.error('FAIL: audio summary unexpected');
  process.exit(1);
}
console.log('PASS: byte-identical renders with narration + music');
