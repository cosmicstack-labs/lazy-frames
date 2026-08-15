import type { ThreeSceneParams } from '../spec.js';
import { accentColor, bgCss, fgColor, stageBg, type SceneBuild, type SceneCtx } from './common.js';

const VERTICES: Record<string, number[][]> = {
  cube: [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ],
  ico: [
    [0, 1, 0], [0, -1, 0], [0.851, 0, 0.526], [-0.851, 0, 0.526],
    [0.851, 0, -0.526], [-0.851, 0, -0.526], [0, 0.526, 0.851], [0, 0.526, -0.851],
    [0, -0.526, 0.851], [0, -0.526, -0.851],
  ],
};

const EDGES: Record<string, [number, number][]> = {
  cube: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
  ico: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,6],[2,8],[3,6],[3,8],[4,7],[4,9],[5,7],[5,9],[6,7],[8,9]],
};

export function compileThreeScene(p: ThreeSceneParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const cvId = `${sid}-cv`;
  const color = p.color === 'accent' ? accentColor(ctx.tokens) : fgColor(ctx.tokens);
  const W = ctx.width;
  const H = ctx.height;
  const colorHex = color;

  const program = `(function(){
  var P = ${JSON.stringify({ primitive: p.primitive, mode: p.mode, orbit: p.orbit, density: p.density, dur: ctx.durationMs, W, H })};
  var SID = ${JSON.stringify(sid)};
  var HEX = ${JSON.stringify(colorHex)};
  var CR = parseInt(HEX.slice(1,3),16), CG = parseInt(HEX.slice(3,5),16), CB = parseInt(HEX.slice(5,7),16);
  var VERTS = ${JSON.stringify(VERTICES)};
  var EDG = ${JSON.stringify(EDGES)};
  window.__lazyRegister('prog-' + SID, {
    init: function () {
      var cv = document.getElementById(${JSON.stringify(cvId)});
      var c2d = cv.getContext('2d');
      var img = c2d.createImageData(P.W, P.H);
      window['__lazy3D' + SID] = { c2d: c2d, img: img, buf: new Uint8ClampedArray(img.data.length) };
      return Promise.resolve();
    },
    draw: function (t) {
      var S = window['__lazy3D' + SID];
      if (!S) return;
      var buf = S.buf;
      var W = P.W, H = P.H;
      for (var i = 0; i < buf.length; i++) buf[i] = 0;
      var u = t / P.dur;
      var ax, ay, az;
      if (P.orbit === 'slow-spin') { ax = u * Math.PI * 2; ay = 0.4; az = 0; }
      else if (P.orbit === 'tumble') { ax = u * Math.PI * 2; ay = u * Math.PI * 1.3; az = u * Math.PI * 0.7; }
      else { ax = 0.6; ay = -0.5; az = 0; }
      var cosA = Math.cos(ax), sinA = Math.sin(ax);
      var cosB = Math.cos(ay), sinB = Math.sin(ay);
      var cosC = Math.cos(az), sinC = Math.sin(az);
      function rot(v) {
        var x = v[0], y = v[1], z = v[2];
        var y1 = y * cosA - z * sinA, z1 = y * sinA + z * cosA;
        var x2 = x * cosB + z1 * sinB, z2 = -x * sinB + z1 * cosB;
        var x3 = x2 * cosC - y1 * sinC, y3 = x2 * sinC + y1 * cosC;
        return [x3, y3, z2];
      }
      function project(v) {
        var d = 4;
        var f = d / (d - v[2]);
        return [v[0] * f * H * 0.18 + W / 2, -v[1] * f * H * 0.18 + H / 2, v[2]];
      }
      function setPx(x, y, a) {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        var idx = (y * W + x) * 4;
        buf[idx] = CR;
        buf[idx + 1] = CG;
        buf[idx + 2] = CB;
        buf[idx + 3] = a;
      }
      function line(x0, y0, x1, y1, a) {
        var dx = x1 - x0, dy = y1 - y0;
        var steps = Math.max(Math.abs(Math.round(dx)), Math.abs(Math.round(dy)));
        if (steps === 0) { setPx(x0, y0, a); setPx(x0 + 1, y0, a); setPx(x0, y0 + 1, a); setPx(x0 + 1, y0 + 1, a); return; }
        for (var s = 0; s <= steps; s++) {
          setPx(x0 + dx * s / steps, y0 + dy * s / steps, a);
          setPx(x0 + dx * s / steps + 1, y0 + dy * s / steps, a);
        }
      }
      if (P.primitive === 'particles') {
        var N = P.density * 8;
        for (var i = 0; i < N; i++) {
          var seed = i * 0.6180339887;
          var phi = seed * Math.PI * 2;
          var theta = (seed * 7 + u * 0.3) % 1 * Math.PI - Math.PI / 2;
          var r = 1 + (i % 3) * 0.15;
          var v = rot([r * Math.cos(phi) * Math.cos(theta), r * Math.sin(theta), r * Math.cos(phi) * Math.sin(theta)]);
          var p = project(v);
          var size = Math.max(1, Math.round((2 - v[2]) * 2));
          var a = Math.round((0.5 + (1 - v[2]) * 0.4) * 255);
          for (var py = -size; py <= size; py++) for (var px = -size; px <= size; px++) setPx(p[0] + px, p[1] + py, a);
        }
      } else if (P.primitive === 'grid') {
        var n = P.density;
        var half = (n - 1) / 2;
        for (var gi = 0; gi < n; gi++) {
          for (var gj = 0; gj < n; gj++) {
            var gx = (gi - half) / half;
            var gz = (gj - half) / half;
            var gy = Math.sin(gx * 3 + u * Math.PI * 2) * 0.15 + Math.sin(gz * 2 + u * Math.PI * 1.5) * 0.1;
            var v = rot([gx, gy, gz]);
            var pp = project(v);
            var a = Math.round((0.4 + (1 - v[2]) * 0.5) * 255);
            setPx(pp[0], pp[1], a); setPx(pp[0] + 1, pp[1], a); setPx(pp[0], pp[1] + 1, a); setPx(pp[0] + 1, pp[1] + 1, a);
          }
        }
      } else {
        var verts = VERTS[P.primitive] || VERTS.cube;
        var projected = verts.map(function (v) { return project(rot(v)); });
        var edges = EDG[P.primitive] || EDG.cube;
        if (P.mode === 'fill' && P.primitive === 'cube') {
          var faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];
          var faceData = faces.map(function (f) {
            var avg = projected[f[0]][2] + projected[f[1]][2] + projected[f[2]][2] + projected[f[3]][2];
            return { f: f, z: avg };
          }).sort(function (a, b) { return a.z - b.z; });
          for (var fi = 0; fi < faceData.length; fi++) {
            var fd = faceData[fi].f;
            var a = Math.round((0.1 + (1 - faceData[fi].z) * 0.06) * 255);
            var p0 = projected[fd[0]], p1 = projected[fd[1]], p2 = projected[fd[2]], p3 = projected[fd[3]];
            var minX = Math.round(Math.min(p0[0], p1[0], p2[0], p3[0]));
            var maxX = Math.round(Math.max(p0[0], p1[0], p2[0], p3[0]));
            var minY = Math.round(Math.min(p0[1], p1[1], p2[1], p3[1]));
            var maxY = Math.round(Math.max(p0[1], p1[1], p2[1], p3[1]));
            for (var fy = minY; fy <= maxY; fy++) for (var fx = minX; fx <= maxX; fx++) setPx(fx, fy, a);
          }
        }
        for (var ei = 0; ei < edges.length; ei++) {
          var e = edges[ei];
          var ep0 = projected[e[0]], ep1 = projected[e[1]];
          var a = Math.round((0.6 + (1 - Math.min(ep0[2], ep1[2])) * 0.4) * 255);
          line(ep0[0], ep0[1], ep1[0], ep1[1], a);
        }
      }
      S.img.data.set(buf);
      S.c2d.putImageData(S.img, 0, 0);
      return;
    }
  });
})();`;

  const html = `<div class="three" id="${sid}-wrap"><canvas id="${cvId}" width="${W}" height="${H}"></canvas></div>`;
  const css = [
    `#${sid}{background:${p.bg ? bgCss(p.bg) : stageBg(ctx.tokens)};}`,
    `#${sid}-wrap{position:absolute;inset:0;overflow:hidden;}`,
    `#${cvId}{position:absolute;inset:0;width:100%;height:100%;}`,
  ].join('\n');

  return { html, css, channels: [], program };
}