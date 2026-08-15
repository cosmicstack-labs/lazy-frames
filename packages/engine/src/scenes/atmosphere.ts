import type { Channel } from '../channels.js';
import type { AtmosphereParams } from '../spec.js';
import { bgCss, hexA, stageBg, type SceneBuild, type SceneCtx } from './common.js';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function compileAtmosphere(p: AtmosphereParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const rand = mulberry32(p.seed);
  const dur = ctx.durationMs;
  const base = stageBg(ctx.tokens);
  const tokens = ctx.tokens;
  const autoColors = [tokens.palette[1] ?? '#22D3EE', tokens.palette[2] ?? '#F8FAFC', tokens.palette[1] ?? '#22D3EE'];
  const colors = p.colors.length > 0 ? p.colors : autoColors;
  const driftSpan = p.drift === 'slow' ? 9 : 16;
  const cycle = p.drift === 'slow' ? dur : Math.max(1, dur / 2);

  const channels: Channel[] = [];
  const blobsHtml: string[] = [];
  const blobCss: string[] = [];

  const count = Math.min(p.blobCount, colors.length > 0 ? Math.max(p.blobCount, 1) : 3);
  for (let i = 0; i < count; i++) {
    const id = `${sid}-b${i}`;
    const color = colors[i % colors.length]!;
    const size = 42 + rand() * 30;
    const x0 = 12 + rand() * 76;
    const y0 = 14 + rand() * 62;
    const dx = driftSpan * (0.4 + rand() * 0.6);
    const dy = driftSpan * (0.3 + rand() * 0.5);
    const swapX = rand() > 0.5 ? -1 : 1;
    const swapY = rand() > 0.5 ? -1 : 1;
    const mid = Math.round(cycle / 2);
    const s0 = 0.85 + rand() * 0.25;

    blobsHtml.push(`<div class="blob" id="${id}"></div>`);
    blobCss.push(
      `#${id}{position:absolute;left:${x0.toFixed(1)}%;top:${y0.toFixed(1)}%;width:${size.toFixed(0)}vmin;height:${size.toFixed(0)}vmin;border-radius:50%;background:radial-gradient(circle at 35% 35%, ${hexA(color, 0.5)}, ${hexA(color, 0.05)} 70%);filter:blur(60px);will-change:transform;}`,
    );
    channels.push(
      {
        el: id,
        p: 'xPct',
        k: [
          { t: 0, v: 0 },
          { t: mid, v: dx * swapX, e: 'inOutSine' },
          { t: cycle, v: 0, e: 'inOutSine' },
          ...(cycle < dur ? [{ t: dur, v: dx * swapX, e: 'inOutSine' }] : []),
        ],
      },
      {
        el: id,
        p: 'yPct',
        k: [
          { t: 0, v: 0 },
          { t: mid, v: dy * swapY, e: 'inOutSine' },
          { t: cycle, v: 0, e: 'inOutSine' },
          ...(cycle < dur ? [{ t: dur, v: dy * swapY, e: 'inOutSine' }] : []),
        ],
      },
      {
        el: id,
        p: 'scale',
        k: [
          { t: 0, v: s0 },
          { t: dur, v: s0 * 1.18, e: 'inOutSine' },
        ],
      },
    );
  }

  const html = `<div class="atmo" id="${sid}-wrap">${blobsHtml.join('')}</div>`;
  const css = [
    `#${sid}{background:${p.bg ? bgCss(p.bg) : base};}`,
    `#${sid}-wrap{position:absolute;inset:0;overflow:hidden;}`,
    ...blobCss,
  ].join('\n');

  return { html, css, channels };
}
