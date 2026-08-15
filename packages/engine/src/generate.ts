import { readFileSync } from 'node:fs';
import type { Channel, WireScene } from './channels.js';
import { runtimeAssetPath } from './fonts.js';
import { stageBg as stageBgColor } from './scenes/common.js';
import type { Spec } from './spec.js';
import { FONTS } from './fonts.js';

export interface PageOptions {
  sceneHtml: string[];
  sceneCss: string[];
  fonts: string[];
  programs: string[];
  wire: {
    channels: Channel[];
    scenes: WireScene[];
    width: number;
    height: number;
    fps: number;
    durationMs: number;
    frameCount: number;
  };
}

const STAGE_GRADES: Record<string, string> = {
  none: 'none',
  contrast: 'contrast(1.12) brightness(1.02)',
  vivid: 'saturate(1.25) contrast(1.06)',
  muted: 'saturate(0.78) brightness(0.98)',
  monochrome: 'grayscale(1) contrast(1.08)',
};

export function generatePage(spec: Spec, opts: PageOptions): string {
  const { width, height } = spec.meta;
  const bg = stageBgColor(spec.style.tokens);
  const bodyFont = spec.style.tokens.fontBody;
  const stageFilter = STAGE_GRADES[spec.style.grade] ?? 'none';

  const fontFaces = opts.fonts
    .map((family) => {
      const file = FONTS[family];
      return `@font-face{font-family:'${family}';src:url('fonts/${file}') format('truetype-variations');font-weight:100 900;font-style:normal;}`;
    })
    .join('\n');

  const wireJson = JSON.stringify(opts.wire);
  const runtime = readFileSync(runtimeAssetPath(), 'utf8');
  const programScripts = opts.programs.map((p) => `<script>${p}</script>`).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${spec.meta.id}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${width}px;height:${height}px;overflow:hidden;background:${bg};}
#stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${bg};font-family:'${bodyFont}',sans-serif;filter:${stageFilter};}
.scene{position:absolute;inset:0;display:none;overflow:hidden;}
${fontFaces}
${opts.sceneCss.join('\n')}
</style>
</head>
<body>
<div id="stage">
${opts.sceneHtml.join('\n')}
</div>
<script>window.__LAZY=${wireJson};</script>
<script>${runtime}</script>
${programScripts}
<script>window.__lazyFinish();</script>
</body>
</html>
`;
}
