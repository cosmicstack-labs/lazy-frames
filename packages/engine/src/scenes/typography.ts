import type { Channel } from '../channels.js';
import type { TypographyParams } from '../spec.js';
import { accentColor, bgCss, escapeHtml, fgColor, fontFor, type SceneBuild, type SceneCtx } from './common.js';
export function compileTypography(p: TypographyParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const channels: Channel[] = [];
  const linesHtml: string[] = [];
  const lineCss: string[] = [];
  const fg = fgColor(ctx.tokens);
  const accent = accentColor(ctx.tokens);

  p.lines.forEach((line, j) => {
    const id = `${sid}-l${j}`;
    const color = line.color === 'accent' ? accent : fg;
    const font = fontFor(line.font, ctx.tokens);
    const delay = line.delayMs ?? j * p.staggerMs;

    lineCss.push(
      `#${id}{font-family:'${font}';font-size:${line.size}px;font-weight:${line.weight};color:${color};letter-spacing:${line.tracking}px;line-height:1.15;}`,
    );

    if (p.reveal === 'letter-stagger') {
      const chars = [...line.text];
      const spans = chars
        .map((ch, k) => `<span class="ch" id="${id}-c${k}">${escapeHtml(ch)}</span>`)
        .join('');
      linesHtml.push(`<div class="line" id="${id}">${spans}</div>`);
      chars.forEach((_, k) => {
        const d = delay + k * p.charStaggerMs;
        channels.push(
          { el: `${id}-c${k}`, p: 'opacity', k: [{ t: d, v: 0 }, { t: d + 320, v: 1, e: 'outCubic' }] },
          { el: `${id}-c${k}`, p: 'y', k: [{ t: d, v: 26 }, { t: d + 420, v: 0, e: 'outCubic' }] },
        );
      });
    } else if (p.reveal === 'mask-wipe') {
      const inId = `${id}-in`;
      linesHtml.push(
        `<div class="mask" id="${id}"><span class="mask-in" id="${inId}">${escapeHtml(line.text)}</span></div>`,
      );
      lineCss.push(`#${id}{display:inline-block;overflow:hidden;padding-bottom:0.08em;}#${inId}{display:inline-block;}`);
      channels.push(
        { el: inId, p: 'yPct', k: [{ t: delay, v: 110 }, { t: delay + p.revealMs, v: 0, e: 'outExpo' }] },
        { el: id, p: 'opacity', k: [{ t: delay, v: 0 }, { t: delay + 80, v: 1, e: 'linear' }] },
      );
    } else if (p.reveal === 'scale-in') {
      linesHtml.push(`<div class="line" id="${id}">${escapeHtml(line.text)}</div>`);
      channels.push(
        { el: id, p: 'opacity', k: [{ t: delay, v: 0 }, { t: delay + p.revealMs * 0.5, v: 1, e: 'outCubic' }] },
        { el: id, p: 'scale', k: [{ t: delay, v: 0.92 }, { t: delay + p.revealMs, v: 1, e: 'outQuint' }] },
      );
    } else {
      linesHtml.push(`<div class="line" id="${id}">${escapeHtml(line.text)}</div>`);
      channels.push(
        { el: id, p: 'opacity', k: [{ t: delay, v: 0 }, { t: delay + p.revealMs, v: 1, e: 'outCubic' }] },
        { el: id, p: 'y', k: [{ t: delay, v: 48 }, { t: delay + p.revealMs, v: 0, e: 'outCubic' }] },
      );
    }
  });

  const alignItems = p.align === 'left' ? 'flex-start' : 'center';
  const textAlign = p.align === 'left' ? 'left' : 'center';
  const html = `<div class="typo-wrap" id="${sid}-wrap">${linesHtml.join('')}</div>`;
  const css = [
    `#${sid}{background:${bgCss(p.bg)};}`,
    `#${sid}-wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:${alignItems};gap:24px;padding:0 8%;text-align:${textAlign};}`,
    ...lineCss,
    `#${sid} .line{will-change:transform,opacity;}`,
    `#${sid} .mask{overflow:hidden;display:inline-block;}`,
    `#${sid} .mask-in{will-change:transform;}`,
    `#${sid} .ch{display:inline-block;white-space:pre;will-change:transform,opacity;}`,
  ].join('\n');

  return { html, css, channels };
}
