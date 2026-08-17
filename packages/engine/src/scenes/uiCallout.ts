import type { Channel } from '../channels.js';
import type { UiCalloutParams } from '../spec.js';
import { accentColor, bgCss, escapeHtml, fgColor, fontFor, hexA, stageBg, type SceneBuild, type SceneCtx } from './common.js';

export function compileUiCallout(p: UiCalloutParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const imgId = `${sid}-img`;
  const holeId = `${sid}-hole`;
  const labelId = `${sid}-label`;
  const dur = ctx.durationMs;
  const src = ctx.asset(p.src);
  const tokens = ctx.tokens;
  const fg = fgColor(tokens);
  const accent = accentColor(tokens);
  const bodyFont = fontFor('body', tokens);

  const cx = p.hotspot.x + p.hotspot.w / 2;
  const cy = p.hotspot.y + p.hotspot.h / 2;
  const s = p.zoomStrength;
  const endX = (50 - cx) * (s / 10) * 2;
  const endY = (50 - cy) * (s / 10) * 2;
  const endScale = 1 + s / 100 * 2.5;

  const labelRight = cx < 50;
  const labelCss =
    labelRight
      ? `left:${Math.min(p.hotspot.x + p.hotspot.w + 2.5, 96)}%;top:${Math.max(cy - 3, 2)}%;transform:translateY(-50%);`
      : `right:${Math.min(100 - p.hotspot.x + 2.5, 96)}%;top:${Math.max(cy - 3, 2)}%;transform:translateY(-50%);`;

  const channels: Channel[] = [
    { el: imgId, p: 'scale', k: [{ t: 0, v: 1 }, { t: dur, v: endScale, e: 'inOutSine' }] },
    { el: imgId, p: 'xPct', k: [{ t: 0, v: 0 }, { t: dur, v: endX, e: 'inOutSine' }] },
    { el: imgId, p: 'yPct', k: [{ t: 0, v: 0 }, { t: dur, v: endY, e: 'inOutSine' }] },
    { el: holeId, p: 'opacity', k: [{ t: 400, v: 0 }, { t: 700, v: 1, e: 'outCubic' }] },
    { el: holeId, p: 'scale', k: [{ t: 400, v: 0.7 }, { t: 1100, v: 1, e: 'outBack' }] },
    { el: labelId, p: 'opacity', k: [{ t: 900, v: 0 }, { t: 1300, v: 1, e: 'outCubic' }] },
    { el: labelId, p: 'x', k: [{ t: 900, v: labelRight ? -26 : 26 }, { t: 1400, v: 0, e: 'outCubic' }] },
  ];

  const html = [
    `<div class="uc" id="${sid}-wrap">`,
    `<img id="${imgId}" src="${src}" alt=""/>`,
    `<div class="uc-hole" id="${holeId}"></div>`,
    `<div class="uc-label" id="${labelId}"><span class="uc-dot"></span>${escapeHtml(p.label)}</div>`,
    `</div>`,
  ].join('');

  const css = [
    `#${sid}{background:${p.bg ? bgCss(p.bg) : stageBg(tokens)};}`,
    `#${sid}-wrap{position:absolute;inset:0;overflow:hidden;}`,
    `#${imgId}{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${p.position.x} ${p.position.y};will-change:transform;transform-origin:center;}`,
    `#${holeId}{position:absolute;left:${p.hotspot.x}%;top:${p.hotspot.y}%;width:${p.hotspot.w}%;height:${p.hotspot.h}%;border-radius:12px;border:2.5px solid ${accent};box-shadow:0 0 0 9999px rgba(5,8,15,0.6);will-change:transform,opacity;z-index:2;}`,
    `#${sid} .uc-label{position:absolute;${labelCss}display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:10px;background:rgba(8,12,20,0.88);border:1px solid ${hexA(accent, 0.35)};color:${fg};font-family:'${bodyFont}';font-size:30px;font-weight:600;white-space:nowrap;will-change:transform,opacity;z-index:3;}`,
    `#${sid} .uc-dot{width:10px;height:10px;border-radius:50%;background:${accent};flex:none;}`,
  ].join('\n');

  return { html, css, channels };
}
