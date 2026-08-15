export const FONTS: Record<string, string> = {
  Inter: 'Inter.var.ttf',
  'Space Grotesk': 'SpaceGrotesk.var.ttf',
};

export const LUTS: Record<string, string> = {
  'teal-orange': 'teal-orange.cube',
  'noir-film': 'noir-film.cube',
  'faded-vintage': 'faded-vintage.cube',
};

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const distDir = path.dirname(fileURLToPath(import.meta.url));
export const assetsDir = path.resolve(distDir, '..', 'assets');

export function lutAssetPath(file: string): string {
  return path.join(assetsDir, 'luts', file);
}
export function fontAssetPath(file: string): string {
  return path.join(assetsDir, 'fonts', file);
}
export function runtimeAssetPath(): string {
  return path.join(assetsDir, 'runtime', 'evalCore.js');
}
