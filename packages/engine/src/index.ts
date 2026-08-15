import { readFileSync } from 'node:fs';
import { compileSpec, SpecError, type CompileResult, type Wire } from './compile.js';
import { SpecSchema, type CheckError, type Spec } from './spec.js';

export * from './constants.js';
export * from './channels.js';
export * from './spec.js';
export * from './fonts.js';
export { compileSpec, SpecError };
export type { CompileResult, Wire };
export { collectAssetRefs } from './assets.js';
export type { AssetRef } from './assets.js';
export { keyframeTimes } from './keyframes.js';
export { compileTypography } from './scenes/typography.js';
export { compileStatHit } from './scenes/statHit.js';
export { compileAtmosphere } from './scenes/atmosphere.js';
export { compileParallax } from './scenes/parallax.js';
export { compileBrowserFrame } from './scenes/browserFrame.js';
export { compileUiCallout } from './scenes/uiCallout.js';
export { compileVideoLayer } from './scenes/videoLayer.js';
export { compileThreeScene } from './scenes/threeScene.js';
export { buildGeneratorHtml } from './generator.js';
export type { GeneratorStyle, GeneratorOptions } from './generator.js';

export function loadSpec(path: string): Spec {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new SpecError([{ code: 'spec_unreadable', message: `cannot read spec file: ${path}` }]);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new SpecError([{ code: 'spec_invalid_json', message: `spec is not valid JSON: ${(err as Error).message}` }]);
  }
  const parsed = SpecSchema.safeParse(json);
  if (!parsed.success) {
    const errors: CheckError[] = parsed.error.issues.map((issue) => ({
      code: 'schema',
      message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    }));
    throw new SpecError(errors);
  }
  return parsed.data;
}
