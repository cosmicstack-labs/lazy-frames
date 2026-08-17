import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const PluginCapabilitySchema = z.enum([
  'tts', 'script', 'storytelling', 'image', 'music', 'sfx', 'stock-media', 'transcription', 'captions', 'export',
]);

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === 'https:', 'must use https');
const unique = <T>(items: T[]): boolean => new Set(items).size === items.length;

export const PluginManifestSchema = z
  .object({
    apiVersion: z.literal('lazy-frames.cosmicstack.ai/plugin/v1'),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1).max(80),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(1).max(300),
    publisher: z.object({ name: z.string().min(1), url: httpsUrl, verified: z.boolean() }).strict(),
    provider: z.object({ name: z.string().min(1).max(80), url: httpsUrl }).strict(),
    category: z.enum(['voice', 'storytelling', 'visuals', 'audio', 'workflow']),
    tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(12).refine(unique, 'tags must be unique'),
    capabilities: z.array(PluginCapabilitySchema).min(1).refine(unique, 'capabilities must be unique'),
    runtime: z.object({ type: z.enum(['builtin', 'scaffold']), adapter: z.string().regex(/^[a-z0-9-]+$/) }).strict(),
    permissions: z
      .object({
        networkHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).max(10),
        environment: z.array(z.string().regex(/^[A-Z][A-Z0-9_]+$/)).max(10),
        filesystem: z.array(z.enum(['project-read', 'project-cache-write', 'project-assets-write'])).max(6),
      })
      .strict(),
    homepage: httpsUrl,
    featured: z.boolean(),
    default: z.boolean(),
    installable: z.boolean(),
    status: z.enum(['available', 'scaffold']),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    if ((manifest.status === 'available') !== (manifest.runtime.type === 'builtin')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['runtime', 'type'], message: 'available plugins must be builtin; scaffold plugins must use the scaffold runtime' });
    }
    if (manifest.default && (!manifest.installable || manifest.status !== 'available' || manifest.runtime.type !== 'builtin')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['default'], message: 'default plugins must be installable, available, and builtin' });
    }
  });

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

const BUILTIN_ADAPTER_POLICY = Object.freeze({
  elevenlabs: {
    adapter: 'elevenlabs',
    capabilities: ['tts'],
    permissions: {
      networkHosts: ['api.elevenlabs.io'],
      environment: ['ELEVENLABS_API_KEY'],
      filesystem: ['project-cache-write', 'project-assets-write'],
    },
  },
} as const);

export function pluginRegistryDir(): string {
  if (process.env['LAZY_ALLOW_UNSAFE_PLUGIN_REGISTRY'] === '1' && process.env['LAZY_PLUGIN_REGISTRY_DIR']) {
    return path.resolve(process.env['LAZY_PLUGIN_REGISTRY_DIR']);
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'plugins');
}

export function loadPluginRegistry(registryDir = pluginRegistryDir()): PluginManifest[] {
  const root = realpathSync(registryDir);
  const manifests = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => {
      const manifestPath = path.join(root, entry.name, 'manifest.json');
      if (!existsSync(manifestPath)) throw new Error(`plugin folder '${entry.name}' is missing manifest.json`);
      const stat = lstatSync(manifestPath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`plugin '${entry.name}' manifest must be a regular file`);
      const manifestReal = realpathSync(manifestPath);
      const relative = path.relative(root, manifestReal);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`plugin '${entry.name}' manifest escapes the registry`);
      const manifest = PluginManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
      if (manifest.id !== entry.name) throw new Error(`plugin folder '${entry.name}' must match manifest id '${manifest.id}'`);
      return manifest;
    })
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ids = new Set<string>();
  for (const manifest of manifests) {
    if (ids.has(manifest.id)) throw new Error(`duplicate plugin id '${manifest.id}'`);
    ids.add(manifest.id);
    if (manifest.status === 'available') {
      const policy = BUILTIN_ADAPTER_POLICY[manifest.id as keyof typeof BUILTIN_ADAPTER_POLICY];
      if (!policy) throw new Error(`available plugin '${manifest.id}' has no immutable built-in adapter policy`);
      if (manifest.runtime.adapter !== policy.adapter || JSON.stringify(manifest.capabilities) !== JSON.stringify(policy.capabilities) ||
        JSON.stringify(manifest.permissions) !== JSON.stringify(policy.permissions)) {
        throw new Error(`available plugin '${manifest.id}' does not match its immutable built-in adapter policy`);
      }
    }
  }
  return manifests;
}

export const PLUGIN_REGISTRY: readonly PluginManifest[] = Object.freeze(loadPluginRegistry());

const PluginLockSchema = z
  .object({
    lockVersion: z.literal(1),
    plugins: z.array(
      z
        .object({
          id: z.string(),
          version: z.string(),
          fingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();

export type PluginLock = z.infer<typeof PluginLockSchema>;

const PluginApprovalSchema = z
  .object({
    approvalVersion: z.literal(1),
    approvals: z.array(
      z
        .object({
          project: z.string().min(1),
          id: z.string(),
          version: z.string(),
          fingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();

export type PluginApprovals = z.infer<typeof PluginApprovalSchema>;

export function pluginFingerprint(manifest: PluginManifest): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(manifest)).digest('hex')}`;
}

export function pluginById(id: string): PluginManifest | undefined {
  return PLUGIN_REGISTRY.find((plugin) => plugin.id === id);
}

export function pluginLockPath(projectDir: string): string {
  return path.resolve(projectDir, 'lazy-plugins.json');
}

export function pluginApprovalPath(): string {
  const configDir = process.env['LAZY_CONFIG_DIR'] ? path.resolve(process.env['LAZY_CONFIG_DIR']) : path.join(os.homedir(), '.config', 'lazy-frames');
  return path.join(configDir, 'plugin-approvals.json');
}

export function pluginProjectIdentity(projectDir: string): string {
  return realpathSync(projectDir);
}

export function readPluginLock(projectDir: string): PluginLock {
  const lockPath = pluginLockPath(projectDir);
  const lock = existsSync(lockPath)
    ? PluginLockSchema.parse(JSON.parse(readFileSync(lockPath, 'utf8')))
    : { lockVersion: 1 as const, plugins: [] };
  const defaults = PLUGIN_REGISTRY.filter((plugin) => plugin.default).map((plugin) => ({
    id: plugin.id,
    version: plugin.version,
    fingerprint: pluginFingerprint(plugin),
  }));
  return {
    lockVersion: 1,
    plugins: [...lock.plugins, ...defaults.filter((item) => !lock.plugins.some((entry) => entry.id === item.id))]
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function readPluginApprovals(): PluginApprovals {
  const approvalPath = pluginApprovalPath();
  if (!existsSync(approvalPath)) return { approvalVersion: 1, approvals: [] };
  return PluginApprovalSchema.parse(JSON.parse(readFileSync(approvalPath, 'utf8')));
}

export function assertPluginInstalled(projectDir: string, id: string, capability: PluginCapability): PluginManifest {
  const manifest = pluginById(id);
  if (!manifest || !manifest.capabilities.includes(capability)) {
    throw new Error(`unknown ${capability} plugin '${id}'; run lazy plugin search ${capability}`);
  }
  if (manifest.status !== 'available' || manifest.runtime.type !== 'builtin') {
    throw new Error(`plugin '${id}' is an installable scaffold; its ${capability} adapter is not available yet`);
  }
  const installed = readPluginLock(projectDir).plugins.find((entry) => entry.id === id);
  if (!installed) throw new Error(`plugin '${id}' is not installed; run npx lazy plugin install ${id} -p ${projectDir}`);
  if (installed.version !== manifest.version || installed.fingerprint !== pluginFingerprint(manifest)) {
    throw new Error(`plugin '${id}' lock does not match the reviewed registry manifest; reinstall it before use`);
  }
  const project = pluginProjectIdentity(projectDir);
  const approved = readPluginApprovals().approvals.find((entry) =>
    entry.project === project && entry.id === id && entry.version === manifest.version && entry.fingerprint === installed.fingerprint,
  );
  if (!approved) throw new Error(`plugin '${id}' is locked but not approved for this project; run npx lazy plugin install ${id} -p ${projectDir}`);
  return manifest;
}
