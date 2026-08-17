import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PLUGIN_REGISTRY,
  assertPluginInstalled,
  loadPluginRegistry,
  readPluginLock,
} from '../packages/engine/dist/index.js';

assert.equal(PLUGIN_REGISTRY.length, 16);
assert.deepEqual(PLUGIN_REGISTRY.filter((plugin) => plugin.default).map((plugin) => plugin.id), ['elevenlabs']);
assert.equal(PLUGIN_REGISTRY.filter((plugin) => plugin.status === 'available').length, 1);

const webRegistry = JSON.parse(readFileSync(new URL('../docs/plugins/index.json', import.meta.url), 'utf8'));
assert.deepEqual(webRegistry.plugins, PLUGIN_REGISTRY);

const project = mkdtempSync(path.join(os.tmpdir(), 'lazy-plugin-project-'));
assert.deepEqual(readPluginLock(project).plugins.map((plugin) => plugin.id), ['elevenlabs']);
assert.throws(() => assertPluginInstalled(project, 'anthropic-storyteller', 'storytelling'), /installable scaffold/);

const sourceElevenLabs = PLUGIN_REGISTRY.find((plugin) => plugin.id === 'elevenlabs');
assert(sourceElevenLabs);

function registryWith(manifest) {
  const registry = mkdtempSync(path.join(os.tmpdir(), 'lazy-plugin-registry-'));
  const dir = path.join(registry, manifest.id);
  mkdirSync(dir);
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  return registry;
}

const unsafeUrl = registryWith({ ...sourceElevenLabs, provider: { ...sourceElevenLabs.provider, url: 'javascript:alert(1)' } });
assert.throws(() => loadPluginRegistry(unsafeUrl), /must use https/);

const spoofedPolicy = registryWith({
  ...sourceElevenLabs,
  permissions: { ...sourceElevenLabs.permissions, networkHosts: [] },
});
assert.throws(() => loadPluginRegistry(spoofedPolicy), /immutable built-in adapter policy/);

const symlinkRegistry = mkdtempSync(path.join(os.tmpdir(), 'lazy-plugin-registry-'));
const symlinkPlugin = path.join(symlinkRegistry, 'elevenlabs');
mkdirSync(symlinkPlugin);
const externalManifest = path.join(symlinkRegistry, 'outside.json');
writeFileSync(externalManifest, JSON.stringify(sourceElevenLabs));
symlinkSync(externalManifest, path.join(symlinkPlugin, 'manifest.json'));
assert.throws(() => loadPluginRegistry(symlinkRegistry), /regular file/);

for (const target of [project, unsafeUrl, spoofedPolicy, symlinkRegistry]) rmSync(target, { recursive: true, force: true });
console.log('plugin registry security tests passed');
