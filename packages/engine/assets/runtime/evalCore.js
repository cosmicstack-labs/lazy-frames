(function () {
  'use strict';
  var L = window.__LAZY;
  var E = {
    linear: function (u) { return u; },
    outCubic: function (u) { return 1 - Math.pow(1 - u, 3); },
    inOutCubic: function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    outExpo: function (u) { return u === 1 ? 1 : 1 - Math.pow(2, -10 * u); },
    outQuint: function (u) { return 1 - Math.pow(1 - u, 5); },
    inOutSine: function (u) { return -(Math.cos(Math.PI * u) - 1) / 2; },
    outBack: function (u) {
      var c1 = 1.70158;
      var c3 = c1 + 1;
      return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
  };
  window.__lazyEase = function (name, u) { return (E[name] || E.inOutCubic)(u); };
  function evalKeys(keys, t) {
    var n = keys.length;
    if (n === 0) return 0;
    if (t <= keys[0].t) return keys[0].v;
    if (t >= keys[n - 1].t) return keys[n - 1].v;
    for (var i = 0; i < n - 1; i++) {
      var k0 = keys[i];
      var k1 = keys[i + 1];
      if (t >= k0.t && t < k1.t) {
        var span = k1.t - k0.t;
        var u = span <= 0 ? 1 : (t - k0.t) / span;
        var fn = E[k1.e || 'inOutCubic'] || E.inOutCubic;
        return k0.v + (k1.v - k0.v) * fn(u);
      }
    }
    return keys[n - 1].v;
  }
  var st = {};
  function state(id) {
    var s = st[id];
    if (!s) {
      s = st[id] = { x: 0, y: 0, xPct: 0, yPct: 0, scale: 1, rotate: 0, blur: 0, clipTop: 0, clipBottom: 0 };
    }
    return s;
  }
  function apply(id, ch, v) {
    var el = document.getElementById(id);
    if (!el) return;
    var s = state(id);
    switch (ch.p) {
      case 'x': s.x = v; break;
      case 'y': s.y = v; break;
      case 'xPct': s.xPct = v; break;
      case 'yPct': s.yPct = v; break;
      case 'scale': s.scale = v; break;
      case 'rotate': s.rotate = v; break;
      case 'blur': s.blur = v; break;
      case 'clipTop': s.clipTop = v; break;
      case 'clipBottom': s.clipBottom = v; break;
      case 'opacity': el.style.opacity = v; return;
      case 'widthPct': el.style.width = v + '%'; return;
      case 'textCount': {
        var f = ch.f || {};
        var d = f.decimals || 0;
        var txt = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
        el.textContent = (f.prefix || '') + txt + (f.suffix || '');
        return;
      }
    }
    el.style.transform =
      'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(' + Math.round(s.xPct * el.offsetWidth / 100) + 'px,' + Math.round(s.yPct * el.offsetHeight / 100) + 'px) rotate(' + Math.round(s.rotate * 100) / 100 + 'deg) scale(' + (Math.round(s.scale * 1000) / 1000) + ')';
    el.style.filter = s.blur > 0.005 ? 'blur(' + s.blur + 'px)' : 'none';
    var clipped = s.clipTop > 0.005 || s.clipBottom > 0.005;
    el.style.clipPath = clipped ? 'inset(' + s.clipTop + '% 0 ' + s.clipBottom + '% 0)' : 'none';
  }
  var sceneEls = [];
  var programs = (window.__lazyPrograms = {});
  var initPromises = [];
  window.__lazyRegister = function (id, program) {
    programs[id] = program;
    if (program.init) initPromises.push(Promise.resolve(program.init()));
  };
  window.__lazyFinish = function () {
    var parts = initPromises.slice();
    if (document.fonts && document.fonts.ready) parts.push(document.fonts.ready);
    Promise.all(parts).then(
      function () { window.__lazyReady = true; },
      function () { window.__lazyReady = true; }
    );
  };
  function seek(t) {
    for (var i = 0; i < L.scenes.length; i++) {
      var sc = L.scenes[i];
      var el = sceneEls[i] || (sceneEls[i] = document.getElementById(sc.id));
      if (el) el.style.display = t >= sc.s && t < sc.e ? 'block' : 'none';
    }
    var chs = L.channels;
    for (var j = 0; j < chs.length; j++) {
      var c = chs[j];
      apply(c.el, c, evalKeys(c.k, t));
    }
    var waits = [];
    for (var key in programs) {
      var w = programs[key].draw(t);
      if (w) waits.push(w);
    }
    window.__lazyT = t;
    return waits.length > 0 ? Promise.all(waits) : Promise.resolve();
  }
  window.__lazySeek = seek;
  window.addEventListener('message', function (e) {
    if (e.data && typeof e.data.t === 'number') seek(e.data.t);
  });
  seek(0);
})();
