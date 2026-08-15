import type { Channel, ChanKey } from '../channels.js';
import type { BrowserFrameParams } from '../spec.js';
import { bgCss, escapeHtml, fgColor, fontFor, hexA, stageBg, type SceneBuild, type SceneCtx } from './common.js';

const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="34" height="34"><path d="M5 2l14 9-6.2 1.2L9.5 19z" fill="#F8FAFC" stroke="#0B0F19" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

export function compileBrowserFrame(p: BrowserFrameParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const winId = `${sid}-win`;
  const shotId = `${sid}-shot`;
  const curId = `${sid}-cur`;
  const ringId = `${sid}-ring`;
  const dur = ctx.durationMs;
  const src = ctx.asset(p.src);
  const tokens = ctx.tokens;
  const fg = fgColor(tokens);
  const bodyFont = fontFor('body', tokens);

  const channels: Channel[] = [
    { el: winId, p: 'opacity', k: [{ t: 0, v: 0 }, { t: 500, v: 1, e: 'outCubic' }] },
    { el: winId, p: 'y', k: [{ t: 0, v: 42 }, { t: 700, v: 0, e: 'outExpo' }] },
  ];

  if (p.zoom === 'slow-in') {
    channels.push({ el: shotId, p: 'scale', k: [{ t: 0, v: 1 }, { t: dur, v: 1.07, e: 'inOutSine' }] });
  }

  if (p.cursor.moves.length > 0) {
    const sorted = [...p.cursor.moves].sort((a, b) => a.atMs - b.atMs);
    const first = sorted[0]!;
    const xKeys: ChanKey[] = [{ t: 0, v: first.xPct }];
    const yKeys: ChanKey[] = [{ t: 0, v: first.yPct }];
    for (const mv of sorted) {
      xKeys.push({ t: Math.min(mv.atMs, dur), v: mv.xPct, e: 'inOutSine' });
      yKeys.push({ t: Math.min(mv.atMs, dur), v: mv.yPct, e: 'inOutSine' });
    }
    if (xKeys[xKeys.length - 1]!.t < dur) {
      xKeys.push({ t: dur, v: xKeys[xKeys.length - 1]!.v });
      yKeys.push({ t: dur, v: yKeys[yKeys.length - 1]!.v });
    }
    channels.push(
      { el: curId, p: 'xPct', k: xKeys },
      { el: curId, p: 'yPct', k: yKeys },
      { el: curId, p: 'opacity', k: [{ t: 0, v: 0 }, { t: 300, v: 1, e: 'outCubic' }] },
    );
    if (p.cursor.clickAtMs !== undefined && p.cursor.clickAtMs <= dur) {
      const ct = p.cursor.clickAtMs;
      channels.push(
        { el: ringId, p: 'xPct', k: [{ t: 0, v: xKeys[xKeys.length - 1]!.v }, { t: dur, v: xKeys[xKeys.length - 1]!.v }] },
        { el: ringId, p: 'yPct', k: [{ t: 0, v: yKeys[yKeys.length - 1]!.v }, { t: dur, v: yKeys[yKeys.length - 1]!.v }] },
        { el: ringId, p: 'opacity', k: [{ t: ct - 60, v: 0 }, { t: ct, v: 0.9, e: 'outCubic' }, { t: ct + 450, v: 0, e: 'inOutSine' }] },
        { el: ringId, p: 'scale', k: [{ t: ct, v: 0.3 }, { t: ct + 450, v: 1.6, e: 'outCubic' }] },
      );
    }
  }

  const hasCursor = p.cursor.moves.length > 0;
  const html = [
    `<div class="bw" id="${winId}">`,
    `<div class="bw-bar"><span class="bw-dot bw-dot-r"></span><span class="bw-dot bw-dot-y"></span><span class="bw-dot bw-dot-g"></span><span class="bw-url">${escapeHtml(p.url)}</span></div>`,
    `<div class="bw-shot-wrap"><img class="bw-shot" id="${shotId}" src="${src}" alt=""/>`,
    hasCursor ? `<div class="bw-ring" id="${ringId}"></div><div class="bw-cur" id="${curId}">${CURSOR_SVG}</div>` : '',
    `</div>`,
    `</div>`,
  ].join('');

  const css = [
    `#${sid}{background:${p.bg ? bgCss(p.bg) : stageBg(tokens)};}`,
    `#${sid} .bw{position:absolute;left:50%;top:50%;width:78%;aspect-ratio:16/9.4;transform:translate(-50%,-50%);border-radius:14px;overflow:hidden;background:${hexA(fg, 0.03)};box-shadow:0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px ${hexA(fg, 0.08)};will-change:transform,opacity;}`,
    `#${sid} .bw-bar{display:flex;align-items:center;gap:8px;height:44px;padding:0 16px;background:${hexA(fg, 0.06)};}`,
    `#${sid} .bw-dot{width:12px;height:12px;border-radius:50%;flex:none;}`,
    `#${sid} .bw-dot-r{background:#FF5F57;}#${sid} .bw-dot-y{background:#FEBC2E;}#${sid} .bw-dot-g{background:#28C840;}`,
    `#${sid} .bw-url{flex:1;margin:0 12px;height:26px;border-radius:13px;background:${hexA(fg, 0.08)};color:${hexA(fg, 0.6)};font-family:'${bodyFont}';font-size:14px;line-height:26px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:0 12px;}`,
    `#${sid} .bw-shot-wrap{position:relative;width:100%;height:calc(100% - 44px);overflow:hidden;}`,
    `#${sid} .bw-shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:transform;transform-origin:center;}`,
    `#${sid} .bw-cur{position:absolute;left:0;top:0;width:34px;height:34px;will-change:transform,opacity;z-index:3;pointer-events:none;}`,
    `#${sid} .bw-ring{position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:3px solid #F8FAFC;opacity:0;will-change:transform,opacity;z-index:2;pointer-events:none;}`,
  ].join('\n');

  return { html, css, channels };
}
