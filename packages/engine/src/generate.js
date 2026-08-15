import { readFileSync } from 'node:fs';
import { runtimeAssetPath } from './fonts.js';
import { stageBg as stageBgColor } from './scenes/common.js';
import { FONTS } from './fonts.js';
export function generatePage(spec, opts) {
    const { width, height } = spec.meta;
    const bg = stageBgColor(spec.style.tokens);
    const bodyFont = spec.style.tokens.fontBody;
    const fontFaces = opts.fonts
        .map((family) => {
        const file = FONTS[family];
        return `@font-face{font-family:'${family}';src:url('fonts/${file}') format('truetype-variations');font-weight:100 900;font-style:normal;}`;
    })
        .join('\n');
    const wireJson = JSON.stringify(opts.wire);
    const runtime = readFileSync(runtimeAssetPath(), 'utf8');
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${spec.meta.id}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${width}px;height:${height}px;overflow:hidden;background:${bg};}
#stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${bg};font-family:'${bodyFont}',sans-serif;}
.scene{position:absolute;inset:0;display:none;}
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
</body>
</html>
`;
}
