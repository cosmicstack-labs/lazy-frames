import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

export const PluginCapabilitySchema = z.enum(['tts', 'script', 'storytelling', 'image', 'music', 'sfx']);

export const PluginManifestSchema = z
  .object({
    apiVersion: z.literal('lazy-frames.cosmicstack.ai/plugin/v1'),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1).max(80),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().min(1).max(300),
    publisher: z.object({ name: z.string().min(1), url: z.string().url(), verified: z.boolean() }).strict(),
    capabilities: z.array(PluginCapabilitySchema).min(1),
    runtime: z.object({ type: z.literal('builtin'), adapter: z.string().regex(/^[a-z0-9-]+$/) }).strict(),
    permissions: z
      .object({
        networkHosts: z.array(z.string().regex(/^[a-z0-9.-]+$/)).max(10).default([]),
        environment: z.array(z.string().regex(/^[A-Z][A-Z0-9_]+$/)).max(10).default([]),
        filesystem: z.array(z.enum(['project-read', 'project-cache-write', 'project-assets-write'])).max(6).default([]),
      })
      .strict(),
    homepage: z.string().url(),
    featured: z.boolean().default(false),
  })
  .strict();

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

export const PLUGIN_REGISTRY: readonly PluginManifest[] = [
  PluginManifestSchema.parse({
    apiVersion: 'lazy-frames.cosmicstack.ai/plugin/v1',
    id: 'elevenlabs',
    name: 'ElevenLabs TTS',
    version: '1.0.0',
    description: 'Generate scene-linked narration with ElevenLabs voices and normalize it for deterministic Lazy Frames renders.',
    publisher: { name: 'Cosmic Stack', url: 'https://cosmicstack.ai', verified: true },
    capabilities: ['tts'],
    runtime: { type: 'builtin', adapter: 'elevenlabs' },
    permissions: {
      networkHosts: ['api.elevenlabs.io'],
      environment: ['ELEVENLABS_API_KEY'],
      filesystem: ['project-cache-write', 'project-assets-write'],
    },
    homepage: 'https://lazy-frames.cosmicstack.ai/plugins#elevenlabs',
    featured: true,
  }),
];

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
  if (!existsSync(lockPath)) return { lockVersion: 1, plugins: [] };
  return PluginLockSchema.parse(JSON.parse(readFileSync(lockPath, 'utf8')));
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
