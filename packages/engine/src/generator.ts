export type GeneratorStyle = 'ridge' | 'dune' | 'nebula';

export interface GeneratorOptions {
  seed: number;
  style: GeneratorStyle;
  width: number;
  height: number;
  palette: string[];
}

const CANVAS_SCRIPT = (o: GeneratorOptions, mode: 'still' | 'depth') => `
(function () {
  var cv = document.getElementById('art');
  var ctx2d = cv.getContext('2d');
  var W = ${o.width}, H = ${o.height};
  var rand = (function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })(${o.seed});
  var mode = ${JSON.stringify(mode)};
  var style = ${JSON.stringify(o.style)};
  var pal = ${JSON.stringify(o.palette.length >= 3 ? o.palette : ['#0B0F19', '#22D3EE', '#F8FAFC'])};
  function hexRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(c1, c2, u) {
    var a = hexRgb(c1), b = hexRgb(c2);
    var r = Math.round(a[0] + (b[0] - a[0]) * u);
    var g = Math.round(a[1] + (b[1] - a[1]) * u);
    var bl = Math.round(a[2] + (b[2] - a[2]) * u);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function gray(v) { var x = Math.round(v * 255); return 'rgb(' + x + ',' + x + ',' + x + ')'; }
  function noise1d(n) {
    var g = [];
    for (var i = 0; i < n; i++) g.push(rand());
    return function (x) {
      var f = x * (n - 1);
      var i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1);
      var u = f - i0;
      var s = u * u * (3 - 2 * u);
      return g[i0] + (g[i1] - g[i0]) * s;
    };
  }
  var bg = pal[0], accent = pal[1], fg = pal[2];
  if (mode === 'depth') { bg = '#000000'; accent = '#808080'; fg = '#ffffff'; }

  var skyGrad = ctx2d.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, mode === 'depth' ? gray(0.02) : mix(bg, fg, 0.12));
  skyGrad.addColorStop(0.62, mode === 'depth' ? gray(0.08) : mix(bg, accent, 0.34));
  skyGrad.addColorStop(1, mode === 'depth' ? gray(0.14) : mix(bg, accent, 0.55));
  ctx2d.fillStyle = skyGrad;
  ctx2d.fillRect(0, 0, W, H);

  var sunX = W * (0.2 + rand() * 0.6);
  var sunY = H * (0.24 + rand() * 0.2);
  var sunR = H * (0.05 + rand() * 0.06);
  if (mode === 'still') {
    for (var ring = 6; ring >= 1; ring--) {
      ctx2d.globalAlpha = 0.05 + 0.04 * ring;
      ctx2d.fillStyle = accent;
      ctx2d.beginPath();
      ctx2d.arc(sunX, sunY, sunR * (1 + ring * 0.8), 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
    ctx2d.fillStyle = mix(accent, fg, 0.7);
    ctx2d.beginPath();
    ctx2d.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx2d.fill();
    var starCount = Math.floor(60 + rand() * 90);
    ctx2d.fillStyle = fg;
    for (var s2 = 0; s2 < starCount; s2++) {
      ctx2d.globalAlpha = 0.15 + rand() * 0.5;
      var sx = rand() * W, sy = rand() * H * 0.5, sr = rand() * 1.8 + 0.4;
      ctx2d.fillRect(sx, sy, sr, sr);
    }
    ctx2d.globalAlpha = 1;
  } else {
    ctx2d.fillStyle = gray(0.06);
    ctx2d.beginPath();
    ctx2d.arc(sunX, sunY, sunR * 1.6, 0, Math.PI * 2);
    ctx2d.fill();
  }

  var layers = style === 'nebula' ? 3 : 4 + Math.floor(rand() * 2);
  var horizon = H * (style === 'dune' ? 0.55 : 0.6);
  for (var li = 0; li < layers; li++) {
    var u = li / Math.max(1, layers - 1);
    var baseY = horizon + (H - horizon) * u * 0.92;
    var amp = (style === 'dune' ? 0.05 : 0.09) * H * (1 - u * 0.5) * (0.6 + rand() * 0.8);
    var fn = noise1d(style === 'nebula' ? 5 : 9 + Math.floor(rand() * 5));
    var top = baseY - amp;
    ctx2d.beginPath();
    ctx2d.moveTo(0, H);
    for (var x = 0; x <= W; x += 8) {
      var nx = x / W;
      var bump = style === 'nebula' ? Math.pow(fn(nx), 2) : fn(nx);
      ctx2d.lineTo(x, top + amp * 2 * bump);
    }
    ctx2d.lineTo(W, H);
    ctx2d.closePath();
    if (mode === 'depth') {
      ctx2d.fillStyle = gray(0.16 + 0.8 * u);
    } else {
      ctx2d.fillStyle = mix(mix(bg, accent, 0.5 - u * 0.3), fg, 0.06 + u * 0.22);
    }
    ctx2d.fill();
    if (mode === 'still' && li < layers - 1) {
      ctx2d.globalAlpha = 0.08 * (1 - u);
      ctx2d.fillStyle = fg;
      ctx2d.fillRect(0, top, W, H - top);
      ctx2d.globalAlpha = 1;
    }
  }
  window.__lazyReady = true;
})();
`;

export function buildGeneratorHtml(o: GeneratorOptions, mode: 'still' | 'depth'): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><style>*{margin:0;padding:0;}html,body{width:${o.width}px;height:${o.height}px;overflow:hidden;background:#000;}</style></head>
<body>
<canvas id="art" width="${o.width}" height="${o.height}"></canvas>
<script>${CANVAS_SCRIPT(o, mode)}</script>
</body>
</html>
`;
}
