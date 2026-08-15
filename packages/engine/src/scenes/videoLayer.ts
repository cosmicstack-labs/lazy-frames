import type { VideoLayerParams } from '../spec.js';
import { bgCss, stageBg, type SceneBuild, type SceneCtx } from './common.js';

const GRADES: Record<VideoLayerParams['grade'], string> = {
  none: 'none',
  warm: 'saturate(1.08) sepia(0.12) contrast(1.04)',
  cool: 'saturate(1.05) hue-rotate(-8deg) brightness(1.02) contrast(1.05)',
  noir: 'grayscale(1) contrast(1.18) brightness(0.96)',
};

export function compileVideoLayer(p: VideoLayerParams, ctx: SceneCtx): SceneBuild {
  const sid = `s${ctx.index}`;
  const vidId = `${sid}-vid`;
  const src = ctx.asset(p.src);

  const program = `(function(){
  var P = ${JSON.stringify({ start: 0, dur: ctx.durationMs, trim: p.trimStartMs, speed: p.speed })};
  var VID = ${JSON.stringify(vidId)};
  window.__lazyRegister('prog-' + ${JSON.stringify(sid)}, {
    init: function () {
      var v = document.getElementById(VID);
      if (v.readyState >= 1) return Promise.resolve();
      return new Promise(function (res) {
        v.addEventListener('loadeddata', function () { res(); }, { once: true });
        v.addEventListener('error', function () { res(); }, { once: true });
        setTimeout(res, 8000);
      });
    },
    draw: function (t) {
      var v = document.getElementById(VID);
      if (v.readyState < 1) return null;
      var local = Math.max(0, Math.min(P.dur, t)) * P.speed + P.trim;
      var target = local / 1000;
      if (Math.abs(v.currentTime - target) < 0.0005) return null;
      return new Promise(function (res) {
        var done = false;
        function fin() { if (!done) { done = true; res(); } }
        v.addEventListener('seeked', fin, { once: true });
        setTimeout(fin, 500);
        v.currentTime = target;
      });
    }
  });
})();`;

  const html = `<div class="vl" id="${sid}-wrap"><video id="${vidId}" src="${src}" muted preload="auto" playsinline></video></div>`;
  const css = [
    `#${sid}{background:${p.bg ? bgCss(p.bg) : stageBg(ctx.tokens)};}`,
    `#${sid}-wrap{position:absolute;inset:0;overflow:hidden;}`,
    `#${vidId}{position:absolute;inset:0;width:100%;height:100%;object-fit:${p.fit};filter:${GRADES[p.grade]};}`,
  ].join('\n');

  return { html, css, channels: [], program };
}
