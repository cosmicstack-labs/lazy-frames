import { accessSync, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { SpecError } from './compile.js';
import type { CheckError, Spec } from './spec.js';

export interface AssetRef {
  src: string;
  dest: string;
  kind: 'media' | 'lut';
}

function sanitizeBasename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 0 ? base.slice(0, 120) : 'asset';
}

function srcsOfScene(scene: Spec['scenes'][number]): string[] {
  if (scene.type === 'browser-frame' || scene.type === 'ui-callout' || scene.type === 'parallax') {
    const srcs = [scene.params.src];
    if (scene.type === 'parallax' && scene.params.depth) srcs.push(scene.params.depth);
    return srcs;
  }
  if (scene.type === 'video-layer') {
    return [scene.params.src];
  }
  return [];
}

export function collectAssetRefs(spec: Spec, projectDir: string): AssetRef[] {
  const errors: CheckError[] = [];
  const refs: AssetRef[] = [];
  const seen = new Map<string, string>();

  for (const sc of spec.scenes) {
    for (const src of srcsOfScene(sc)) {
      if (seen.has(src)) continue;
      if (src.includes('..')) {
        errors.push({ code: 'asset_path_escape', message: `asset path '${src}' must not traverse outside the project`, scene: sc.id });
        continue;
      }
      try {
        accessSync(path.resolve(projectDir, src), fsConstants.R_OK);
      } catch {
        errors.push({ code: 'asset_missing', message: `asset '${src}' does not exist in project`, scene: sc.id });
        continue;
      }
      let dest = sanitizeBasename(src);
      for (const taken of seen.values()) {
        if (taken === dest) {
          dest = `${refs.length}-${dest}`;
          break;
        }
      }
      seen.set(src, dest);
      refs.push({ src, dest, kind: 'media' });
    }
  }

  for (const out of spec.outputs) {
    if (out.lut) {
      if (out.lut.includes('..')) {
        errors.push({ code: 'asset_path_escape', message: `lut path '${out.lut}' must not traverse outside the project` });
        continue;
      }
      try {
        accessSync(path.resolve(projectDir, out.lut), fsConstants.R_OK);
      } catch {
        errors.push({ code: 'asset_missing', message: `lut '${out.lut}' does not exist in project` });
        continue;
      }
      let dest = sanitizeBasename(out.lut);
      for (const taken of seen.values()) {
        if (taken === dest) {
          dest = `${refs.length}-${dest}`;
          break;
        }
      }
      seen.set(out.lut, dest);
      refs.push({ src: out.lut, dest, kind: 'lut' });
    }
  }

  if (errors.length > 0) throw new SpecError(errors);
  return refs;
}
