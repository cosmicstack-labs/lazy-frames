import type { ParallaxParams } from '../spec.js';
import { bgCss, stageBg, type SceneBuild, type SceneCtx } from './common.js';

const GRADES: Record<ParallaxParams['grade'], string> = {
  none: 'none',
  warm: 'saturate(1.08) sepia(0.14) contrast(1.04)',
  cool: 'saturate(1.05) hue-rotate(-8deg) brightness(1.02) contrast(1.05)',
  noir: 'grayscale(1) contrast(1.18) brightness(0.96)',
};

export function compileParallax(p: ParallaxParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const cssBg = `#${sid}{background:${p.bg ? bgCss(p.bg) : stageBg(ctx.tokens)};}`;

  if (!p.depth) {
    return compileFlat(p, ctx, sid, cssBg);
  }

  const cvId = `${sid}-cv`;
  const imgId = `${sid}-src`;
  const depId = `${sid}-dep`;
  const src = ctx.asset(p.src);
  const depthSrc = ctx.asset(p.depth);
  const W = ctx.width;
  const H = ctx.height;

  const program = `(function(){
  var P = ${JSON.stringify({ move: p.move, strength: p.depthStrength, dur: ctx.durationMs, position: p.position })};
  var SID = ${JSON.stringify(sid)};
  var W = ${W}, H = ${H};
  window.__lazyRegister('prog-' + SID, {
    init: function () {
      var imgEl = document.getElementById(${JSON.stringify(imgId)});
      var depEl = document.getElementById(${JSON.stringify(depId)});
      var decodes = [imgEl, depEl].map(function (el) {
        return el.decode ? el.decode().catch(function () {}) : Promise.resolve();
      });
       return Promise.all(decodes).then(function () {
         function drawCover(c, image) {
           var iw = image.naturalWidth, ih = image.naturalHeight;
           var scale = Math.max(W / iw, H / ih);
           var sw = W / scale, sh = H / scale;
           var sx = P.position.x === 'left' ? 0 : P.position.x === 'right' ? iw - sw : (iw - sw) / 2;
           var sy = P.position.y === 'top' ? 0 : P.position.y === 'bottom' ? ih - sh : (ih - sh) / 2;
           c.drawImage(image, sx, sy, sw, sh, 0, 0, W, H);
         }
         var off = document.createElement('canvas');
         off.width = W; off.height = H;
         var octx = off.getContext('2d');
         drawCover(octx, imgEl);
         var img = octx.getImageData(0, 0, W, H);
         octx.clearRect(0, 0, W, H);
         drawCover(octx, depEl);
        var dep = octx.getImageData(0, 0, W, H);
        var cv = document.getElementById(${JSON.stringify(cvId)});
        var dctx = cv.getContext('2d');
        window['__lazyPD' + SID] = {
          dctx: dctx,
          src: new Uint8ClampedArray(img.data),
          depth: new Uint8ClampedArray(dep.data),
          out: dctx.createImageData(W, H)
        };
        return null;
      });
    },
    draw: function (t) {
      var S = window['__lazyPD' + SID];
      if (!S) return;
      var u = Math.min(1, Math.max(0, t / P.dur));
      var e = window.__lazyEase('inOutSine', u) - 0.5;
      var amt = P.strength * 0.5;
      var sx = 0, sy = 0;
      if (P.move === 'dolly-in') { sx = -e * amt; sy = e * amt * 0.4; }
      else if (P.move === 'dolly-out') { sx = e * amt; sy = -e * amt * 0.4; }
      else if (P.move === 'pan-left') { sx = e * amt * 2; }
      else { sx = -e * amt * 2; }
      var over = 1 + P.strength * 0.9;
      var src = S.src, depth = S.depth, out = S.out.data;
      var overW = W * over, overH = H * over;
      var offX = (W - overW) / 2, offY = (H - overH) / 2;
      for (var y = 0; y < H; y++) {
        var v = y / H;
        var rowD = y * W;
        for (var x = 0; x < W; x++) {
          var d = depth[(rowD + x) * 4] / 255;
          var su = (x - offX) / overW + sx * d;
          var sv = (y - offY) / overH + sy * d;
          var fx = su * W - 0.5;
          var fy = sv * H - 0.5;
          var x0 = Math.round(fx), y0 = Math.round(fy);
          var ax = fx - x0, ay = fy - y0;
          var x1 = x0 + 1, y1 = y0 + 1;
          if (x0 < 0) { x0 = 0; x1 = 0; ax = 0; }
          if (x1 > W - 1) { x1 = W - 1; if (x0 > W - 1) { x0 = W - 1; ax = 0; } }
          if (y0 < 0) { y0 = 0; y1 = 0; ay = 0; }
          if (y1 > H - 1) { y1 = H - 1; if (y0 > H - 1) { y0 = H - 1; ay = 0; } }
          var i00 = (y0 * W + x0) * 4, i10 = (y0 * W + x1) * 4;
          var i01 = (y1 * W + x0) * 4, i11 = (y1 * W + x1) * 4;
          var w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
          var di = (rowD + x) * 4;
          out[di] = src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
          out[di + 1] = src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
          out[di + 2] = src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
          out[di + 3] = 255;
        }
      }
      S.dctx.putImageData(S.out, 0, 0);
      return null;
    }
  });
})();`;

  const overlayCss =
    p.overlay === 'none'
      ? ''
      : p.overlay === 'vignette'
        ? `#${sid}-ov{position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%);}`
        : `#${sid}-ov{position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.45));}`;

  const html = `<div class="para" id="${sid}-wrap"><img id="${imgId}" src="${src}" hidden/><img id="${depId}" src="${depthSrc}" hidden/><canvas class="para-cv" id="${cvId}" width="${W}" height="${H}"></canvas><div id="${sid}-ov"></div></div>`;
  const css = [
    cssBg,
    `#${sid}-wrap{position:absolute;inset:0;overflow:hidden;}`,
    `#${cvId}{position:absolute;inset:0;width:100%;height:100%;filter:${GRADES[p.grade]};}`,
    overlayCss,
  ]
    .filter((s) => s.length > 0)
    .join('\n');

  return { html, css, channels: [], program };
}

function compileFlat(p: ParallaxParams, ctx: SceneCtx, sid: string, cssBg: string): SceneBuild {
  const imgId = `${sid}-img`;
  const dur = ctx.durationMs;
  const MOVES: Record<string, { scale: [number, number]; x: [number, number]; y: [number, number] }> = {
    'dolly-in': { scale: [1.08, 1.26], x: [0, 0], y: [0, 0] },
    'dolly-out': { scale: [1.26, 1.08], x: [0, 0], y: [0, 0] },
    'pan-right': { scale: [1.18, 1.18], x: [-4, 4], y: [0, 0] },
    'pan-left': { scale: [1.18, 1.18], x: [4, -4], y: [0, 0] },
  };
  const m = MOVES[p.move]!;
  const src = ctx.asset(p.src);
  const channels = [
    { el: imgId, p: 'scale' as const, k: [{ t: 0, v: m.scale[0] }, { t: dur, v: m.scale[1], e: 'inOutSine' }] },
    { el: imgId, p: 'xPct' as const, k: [{ t: 0, v: m.x[0] }, { t: dur, v: m.x[1], e: 'inOutSine' }] },
    { el: imgId, p: 'yPct' as const, k: [{ t: 0, v: m.y[0] }, { t: dur, v: m.y[1], e: 'inOutSine' }] },
  ];
  const overlayCss =
    p.overlay === 'none'
      ? ''
      : p.overlay === 'vignette'
        ? `#${sid}-ov{position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%);}`
        : `#${sid}-ov{position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.45));}`;
  const html = `<div class="para" id="${sid}-wrap"><img id="${imgId}" src="${src}" alt=""/><div id="${sid}-ov"></div></div>`;
  const css = [
    cssBg,
    `#${sid}-wrap{position:absolute;inset:0;overflow:hidden;}`,
    `#${imgId}{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${p.position.x} ${p.position.y};filter:${GRADES[p.grade]};will-change:transform;transform-origin:center;}`,
    overlayCss,
  ]
    .filter((s) => s.length > 0)
    .join('\n');
  return { html, css, channels };
}
