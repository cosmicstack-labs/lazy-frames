import { lstatSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  PLUGIN_REGISTRY,
  pluginById,
  pluginApprovalPath,
  pluginFingerprint,
  pluginLockPath,
  pluginProjectIdentity,
  readPluginApprovals,
  readPluginLock,
  type PluginApprovals,
  type PluginLock,
} from '@lazy/engine';

function writeLock(projectDir: string, lock: PluginLock): void {
  const project = path.resolve(projectDir);
  if (!statSync(project).isDirectory()) throw new Error(`project is not a directory: ${project}`);
  const target = pluginLockPath(project);
  try {
    if (lstatSync(target).isSymbolicLink()) throw new Error('refusing to write plugin lock through a symbolic link');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(lock, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  renameSync(temp, target);
}

function writeApprovals(approvals: PluginApprovals): void {
  const target = pluginApprovalPath();
  mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  try {
    if (lstatSync(target).isSymbolicLink()) throw new Error('refusing to write plugin approvals through a symbolic link');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(approvals, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  renameSync(temp, target);
}

export function searchPlugins(query: string, json: boolean): void {
  const needle = query.trim().toLowerCase();
  const matches = PLUGIN_REGISTRY.filter((plugin) =>
    !needle || plugin.id.includes(needle) || plugin.name.toLowerCase().includes(needle) || plugin.capabilities.some((capability) => capability.includes(needle)),
  );
  if (json) console.log(JSON.stringify(matches, null, 2));
  else if (matches.length === 0) console.log(`no reviewed plugins match '${query}'`);
  else for (const plugin of matches) console.log(`${plugin.id}@${plugin.version}  ${plugin.capabilities.join(', ')}  ${plugin.description}`);
}

export function listPlugins(projectDir: string, json: boolean): void {
  const lock = readPluginLock(projectDir);
  const project = pluginProjectIdentity(projectDir);
  const approvals = readPluginApprovals();
  const installed = lock.plugins.map((entry) => {
    const manifest = pluginById(entry.id);
    const integrityValid = manifest !== undefined && entry.version === manifest.version && entry.fingerprint === pluginFingerprint(manifest);
    const approved = approvals.approvals.some((item) => item.project === project && item.id === entry.id && item.version === entry.version && item.fingerprint === entry.fingerprint);
    return { ...entry, valid: integrityValid && approved, integrityValid, approved, manifest };
  });
  if (json) console.log(JSON.stringify(installed, null, 2));
  else if (installed.length === 0) console.log('no plugins installed');
  else for (const plugin of installed) {
    const status = !plugin.integrityValid ? 'INVALID LOCK ENTRY' : !plugin.approved ? 'APPROVAL REQUIRED' : plugin.manifest?.capabilities.join(', ');
    console.log(`${plugin.id}@${plugin.version}  ${status}`);
  }
}

export function installPlugin(projectDir: string, id: string): void {
  const manifest = pluginById(id);
  if (!manifest) throw new Error(`plugin '${id}' is not in the reviewed registry; run lazy plugin search`);
  if (manifest.runtime.type !== 'builtin') throw new Error(`plugin '${id}' uses an unsupported runtime`);
  const lock = readPluginLock(projectDir);
  for (const installed of lock.plugins.filter((entry) => entry.id !== id)) {
    const registered = pluginById(installed.id);
    if (!registered || installed.version !== registered.version || installed.fingerprint !== pluginFingerprint(registered)) {
      throw new Error(`existing lock entry '${installed.id}' is not trusted; remove it before installing another plugin`);
    }
  }
  const entry = { id, version: manifest.version, fingerprint: pluginFingerprint(manifest) };
  const plugins = [...lock.plugins.filter((plugin) => plugin.id !== id), entry].sort((a, b) => a.id.localeCompare(b.id));
  writeLock(projectDir, { lockVersion: 1, plugins });
  const project = pluginProjectIdentity(projectDir);
  const approvals = readPluginApprovals();
  const approval = { project, ...entry };
  writeApprovals({
    approvalVersion: 1,
    approvals: [...approvals.approvals.filter((item) => item.project !== project || item.id !== id), approval]
      .sort((a, b) => `${a.project}:${a.id}`.localeCompare(`${b.project}:${b.id}`)),
  });
  console.log(`installed ${id}@${manifest.version}`);
  console.log(`permissions: network=${manifest.permissions.networkHosts.join(',') || 'none'} env=${manifest.permissions.environment.join(',') || 'none'} filesystem=${manifest.permissions.filesystem.join(',') || 'none'}`);
}

export function removePlugin(projectDir: string, id: string): void {
  const lock = readPluginLock(projectDir);
  const plugins = lock.plugins.filter((plugin) => plugin.id !== id);
  if (plugins.length === lock.plugins.length) throw new Error(`plugin '${id}' is not installed`);
  writeLock(projectDir, { lockVersion: 1, plugins });
  const project = pluginProjectIdentity(projectDir);
  const approvals = readPluginApprovals();
  writeApprovals({ approvalVersion: 1, approvals: approvals.approvals.filter((item) => item.project !== project || item.id !== id) });
  console.log(`removed ${id}`);
}
