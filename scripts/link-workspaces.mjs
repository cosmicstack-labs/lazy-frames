import { symlinkSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nmScoped = path.join(root, 'node_modules', '@lazy');

const links = [
  ['engine', 'packages/engine'],
  ['renderer', 'packages/renderer'],
  ['capture', 'packages/capture'],
  ['cli', 'packages/cli'],
];

try {
  if (!existsSync(nmScoped)) mkdirSync(nmScoped, { recursive: true });
  for (const [name, target] of links) {
    const linkPath = path.join(nmScoped, name);
    const targetPath = path.join(root, target);
    if (existsSync(linkPath)) continue;
    if (existsSync(targetPath)) {
      symlinkSync(targetPath, linkPath, 'dir');
    }
  }
} catch {
  // symlinks may fail on some systems without permissions; npm workspaces handles it in dev
}