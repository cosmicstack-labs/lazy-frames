export const FONTS = {
    Inter: 'Inter.var.ttf',
    'Space Grotesk': 'SpaceGrotesk.var.ttf',
};
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const distDir = path.dirname(fileURLToPath(import.meta.url));
export const assetsDir = path.resolve(distDir, '..', 'assets');
export function fontAssetPath(file) {
    return path.join(assetsDir, 'fonts', file);
}
export function runtimeAssetPath() {
    return path.join(assetsDir, 'runtime', 'evalCore.js');
}
