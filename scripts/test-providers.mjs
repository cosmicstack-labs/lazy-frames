import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, findPython, sidecarDoctor } from '../packages/renderer/dist/index.js';

const chrome = findChrome();
assert.ok(existsSync(chrome), `Chrome path missing: ${chrome}`);

const python = findPython();
assert.equal(typeof python.bin, 'string');
assert.ok(python.bin.length > 0);

const side = sidecarDoctor();
assert.equal(side.ok, true, side.error ?? 'sidecar doctor failed');
assert.equal(typeof side.python, 'string');
assert.match(String(side.python), /^\d+\.\d+/);
assert.ok(['full', 'lite', 'minimal'].includes(String(side.tier)));
if (process.platform === 'win32') {
  assert.notEqual(side.memoryGb, null, 'Windows sidecar should report physical memory');
  assert.ok(Number(side.memoryGb) >= os.totalmem() / (1024 ** 3) - 2);
}

console.log(`providers ok chrome=${path.basename(chrome)} python=${python.bin} ${side.python} ${side.tier}`);
