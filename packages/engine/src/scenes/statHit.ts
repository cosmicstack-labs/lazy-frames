import type { Channel } from '../channels.js';
import type { StatHitParams } from '../spec.js';
import { accentColor, bgCss, escapeHtml, fgColor, fontFor, hexA, type SceneBuild, type SceneCtx } from './common.js';

export function compileStatHit(p: StatHitParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const channels: Channel[] = [];
  const fg = fgColor(ctx.tokens);
  const accent = accentColor(ctx.tokens);
  const bodyFont = fontFor('body', ctx.tokens);
  const displayFont = fontFor('display', ctx.tokens);
  const vc = `${sid}-vc`;

  const parts: string[] = [`<div class="stat-wrap" id="${sid}-wrap">`];
  if (p.kicker) parts.push(`<div class="kicker" id="${sid}-k">${escapeHtml(p.kicker)}</div>`);
  parts.push(`<div class="stat-value"><span id="${vc}"></span></div>`);
  if (p.label) parts.push(`<div class="stat-label" id="${sid}-l">${escapeHtml(p.label)}</div>`);
  if (p.bars.length > 0) {
    parts.push('<div class="bars">');
    p.bars.forEach((_, i) => parts.push(`<div class="bar"><div class="bar-fill" id="${sid}-b${i}"></div></div>`));
    parts.push('</div>');
  }
  parts.push('</div>');

  if (p.kicker) {
    channels.push(
      { el: `${sid}-k`, p: 'opacity', k: [{ t: 0, v: 0 }, { t: 500, v: 1, e: 'outCubic' }] },
      { el: `${sid}-k`, p: 'y', k: [{ t: 0, v: 24 }, { t: 500, v: 0, e: 'outCubic' }] },
    );
  }
  channels.push(
    {
      el: vc,
      p: 'textCount',
      f: { decimals: p.decimals, prefix: p.prefix, suffix: p.suffix },
      k: [{ t: 200, v: 0 }, { t: 1800, v: p.value, e: 'outQuint' }],
    },
    { el: vc, p: 'scale', k: [{ t: 200, v: 0.96 }, { t: 1800, v: 1, e: 'outQuint' }] },
  );
  if (p.label) {
    channels.push(
      { el: `${sid}-l`, p: 'opacity', k: [{ t: 400, v: 0 }, { t: 900, v: 1, e: 'outCubic' }] },
      { el: `${sid}-l`, p: 'y', k: [{ t: 400, v: 24 }, { t: 900, v: 0, e: 'outCubic' }] },
    );
  }
  p.bars.forEach((b, i) => {
    channels.push({
      el: `${sid}-b${i}`,
      p: 'widthPct',
      k: [{ t: 800 + i * 150, v: 0 }, { t: 1700 + i * 150, v: b.value, e: 'outExpo' }],
    });
  });

  const css = [
    `#${sid}{background:${bgCss(p.bg)};}`,
    `#${sid}-wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:28px;padding:0 10%;text-align:center;}`,
    `#${sid} .kicker{font-family:'${bodyFont}';font-size:26px;font-weight:600;letter-spacing:0.35em;text-transform:uppercase;color:${accent};will-change:transform,opacity;}`,
    `#${sid} .stat-value{font-family:'${displayFont}';font-size:${p.valueSize}px;font-weight:700;color:${fg};line-height:1;}`,
    `#${sid} .stat-value > span{display:inline-block;will-change:transform;}`,
    `#${sid} .stat-label{font-family:'${bodyFont}';font-size:34px;font-weight:400;color:${hexA(fg, 0.75)};will-change:transform,opacity;}`,
    `#${sid} .bars{display:flex;gap:18px;width:60%;margin-top:12px;}`,
    `#${sid} .bar{flex:1;height:14px;background:${hexA(fg, 0.12)};border-radius:7px;overflow:hidden;}`,
    `#${sid} .bar-fill{height:100%;width:0%;background:${accent};border-radius:7px;}`,
  ].join('\n');

  return { html: parts.join(''), css, channels };
}
