// Film strip: generate animated frames
(function () {
  var strip = document.querySelector('.filmstrip-inner');
  if (!strip) return;
  var types = [
    { label: 'typography', shape: 'text' },
    { label: 'parallax', shape: 'ridge' },
    { label: 'browser-frame', shape: 'browser' },
    { label: 'stat-hit', shape: 'stat' },
    { label: 'atmosphere', shape: 'blobs' },
    { label: 'ui-callout', shape: 'callout' },
    { label: 'three-scene', shape: 'cube' },
    { label: 'video-layer', shape: 'video' },
  ];
  var palette = ['#1A1B22', '#C49A5C', '#E2E0DC'];
  function makeFrame(t, i) {
    var f = document.createElement('div');
    f.className = 'filmstrip-frame';
    var label = document.createElement('span');
    label.className = 'frame-label';
    label.textContent = t.label;
    f.appendChild(label);
    var shape = document.createElement('div');
    shape.className = 'frame-shape';
    shape.style.cssText = 'position:absolute;inset:0;';
    if (t.shape === 'text') {
      shape.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:700;color:' + palette[2] + ';letter-spacing:-0.02em;">Aa</div>';
    } else if (t.shape === 'ridge') {
      shape.innerHTML = '<div style="position:absolute;bottom:0;left:0;right:0;height:50%;background:linear-gradient(180deg,transparent,' + palette[1] + '40);clip-path:polygon(0 100%,20% 60%,40% 80%,60% 40%,80% 70%,100% 50%,100% 100%);"></div>';
    } else if (t.shape === 'browser') {
      shape.innerHTML = '<div style="position:absolute;top:8px;left:8px;right:8px;height:6px;background:' + palette[0] + ';border-radius:2px;"><div style="width:4px;height:4px;border-radius:50%;background:#FF5F57;display:inline-block;margin:1px 2px;"></div><div style="width:4px;height:4px;border-radius:50%;background:#FEBC2E;display:inline-block;margin:1px 2px;"></div><div style="width:4px;height:4px;border-radius:50%;background:#28C840;display:inline-block;margin:1px 2px;"></div></div><div style="position:absolute;top:18px;left:8px;right:8px;bottom:8px;background:' + palette[0] + ';border-radius:2px;"></div>';
    } else if (t.shape === 'stat') {
      shape.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;font-weight:700;color:' + palette[1] + ';font-family:monospace;">87</div>';
    } else if (t.shape === 'blobs') {
      shape.innerHTML = '<div style="position:absolute;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle,' + palette[1] + '30,transparent 70%);top:20%;left:30%;filter:blur(8px);"></div><div style="position:absolute;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,' + palette[2] + '20,transparent 70%);top:50%;left:60%;filter:blur(6px);"></div>';
    } else if (t.shape === 'callout') {
      shape.innerHTML = '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);"></div><div style="position:absolute;top:40%;left:30%;width:40%;height:25%;border:1.5px solid ' + palette[1] + ';border-radius:3px;box-shadow:0 0 0 100px rgba(0,0,0,0.3);"></div>';
    } else if (t.shape === 'cube') {
      shape.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="' + palette[1] + '" stroke-width="1.5"><path d="M10 14 L20 10 L30 14 L20 18 Z"/><path d="M10 14 L10 26 L20 30 L20 18"/><path d="M30 14 L30 26 L20 30"/></svg></div>';
    } else if (t.shape === 'video') {
      shape.innerHTML = '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + palette[0] + ',' + palette[1] + '20);"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;border-left:8px solid ' + palette[2] + ';border-top:5px solid transparent;border-bottom:5px solid transparent;"></div>';
    }
    f.appendChild(shape);
    return f;
  }
  for (var dup = 0; dup < 2; dup++) {
    types.forEach(function (t, i) { strip.appendChild(makeFrame(t, i)); });
  }
})();

// Scene showcase tiles
(function () {
  var grid = document.querySelector('.showcase');
  if (!grid) return;
  var scenes = [
    { name: 'typography', meta: '4 reveals', bg: 'linear-gradient(135deg,#1A1B22,#26272F)', icon: 'Aa' },
    { name: 'stat-hit', meta: 'count-up', bg: 'linear-gradient(135deg,#1A1B22,#2A2418)', icon: '87' },
    { name: 'browser-frame', meta: 'cursor', bg: 'linear-gradient(135deg,#1A1B22,#1E2028)', icon: '▤' },
    { name: 'ui-callout', meta: 'spotlight', bg: 'linear-gradient(135deg,#1A1B22,#1E2028)', icon: '◐' },
    { name: 'parallax', meta: '2.5D depth', bg: 'linear-gradient(135deg,#1A1B22,#2A2418)', icon: '⛰' },
    { name: 'atmosphere', meta: 'blobs', bg: 'linear-gradient(135deg,#1A1B22,#1E2028)', icon: '◉' },
    { name: 'video-layer', meta: 'footage', bg: 'linear-gradient(135deg,#1A1B22,#1E2028)', icon: '▶' },
    { name: 'three-scene', meta: '3D wire', bg: 'linear-gradient(135deg,#1A1B22,#1E2028)', icon: '◇' },
  ];
  scenes.forEach(function (s) {
    var tile = document.createElement('div');
    tile.className = 'showcase-tile';
    tile.innerHTML =
      '<div class="st-bg" style="background:' + s.bg + ';"></div>' +
      '<div class="st-meta">' + s.meta + '</div>' +
      '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;color:rgba(196,154,92,0.4);">' + s.icon + '</div>' +
      '<div class="st-label">' + s.name + '</div>';
    grid.appendChild(tile);
  });
})();

// Typing animation for the code block
(function () {
  var block = document.querySelector('.code-typing');
  if (!block) return;
  var lines = [
    { html: '<span class="c-com">// lazy-frames — spec in, video out</span>' },
    { html: '<span class="c-key">lazy</span> <span class="c-fn">capture</span> https://<span class="c-str">example.com</span> projects/acme' },
    { html: '<span class="c-key">lazy</span> <span class="c-fn">gen</span> image -p projects/cine --seed <span class="c-num">21</span> --style ridge' },
    { html: '<span class="c-key">lazy</span> <span class="c-fn">check</span> projects/acme <span class="c-com"># gates: snapshots + determinism</span>' },
    { html: '<span class="c-key">lazy</span> <span class="c-fn">render</span> projects/acme <span class="c-com"># byte-stable MP4</span>' },
  ];
  var li = 0;
  function nextLine() {
    if (li >= lines.length) {
      setTimeout(function () { block.innerHTML = ''; li = 0; nextLine(); }, 4000);
      return;
    }
    var div = document.createElement('div');
    div.style.opacity = '0';
    div.style.transition = 'opacity 0.3s';
    div.innerHTML = lines[li].html;
    block.appendChild(div);
    requestAnimationFrame(function () { div.style.opacity = '1'; });
    li++;
    setTimeout(nextLine, 600);
  }
  nextLine();
})();

// Determinism hash animation
(function () {
  var hash = document.querySelector('.determinism .hash');
  if (!hash) return;
  var realHash = 'ceacd01db63bae680aed47c469f573a5fed0a0760fa306a7288edbf1916ef1b9';
  var i = 0;
  function step() {
    if (i <= realHash.length) {
      hash.textContent = realHash.slice(0, i) + '▋';
      i++;
      setTimeout(step, 40);
    } else {
      hash.textContent = realHash;
    }
  }
  var obs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) { step(); obs.disconnect(); }
  }, { threshold: 0.5 });
  obs.observe(hash);
})();

// Copy install command
(function () {
  var btn = document.querySelector('.nav-install');
  if (!btn) return;
  btn.addEventListener('click', function () {
    navigator.clipboard.writeText('npm install && npm run build');
    var orig = btn.textContent;
    btn.textContent = 'copied';
    setTimeout(function () { btn.textContent = orig; }, 1500);
  });
})();