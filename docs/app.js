// Realistic film strip frames — each looks like an actual scene preview
(function () {
  var strip = document.querySelector('.filmstrip-inner');
  if (!strip) return;

  var bg = '#0D0E12';
  var card = '#1A1B22';
  var border = '#26272F';
  var accent = '#C49A5C';
  var text = '#E2E0DC';
  var dim = '#8A887F';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }

  var frames = [
    // typography — big title with letter-stagger feel
    function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">' +
        '<div style="font-size:13px;font-weight:700;color:' + text + ';letter-spacing:-0.04em;">Lazy Frames</div>' +
        '<div style="font-size:8px;color:' + accent + ';letter-spacing:0.08em;">FULLY LOCAL</div>' +
      '</div>'; },

    // parallax — layered mountain ridge with depth gradient
    function () { return '' +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,' + bg + ' 0%,#1E1610 100%);">' +
        '<div style="position:absolute;bottom:0;left:0;right:0;height:60%;background:' + accent + '15;clip-path:polygon(0 100%,15% 45%,30% 65%,45% 35%,60% 60%,75% 40%,90% 55%,100% 45%,100% 100%);"></div>' +
        '<div style="position:absolute;bottom:0;left:0;right:0;height:35%;background:' + accent + '30;clip-path:polygon(0 100%,20% 55%,40% 70%,55% 50%,70% 65%,85% 45%,100% 60%,100% 100%);"></div>' +
        '<div style="position:absolute;top:20%;left:60%;width:14px;height:14px;border-radius:50%;background:' + accent + '60;filter:blur(3px);"></div>' +
      '</div>'; },

    // browser-frame — mac chrome with URL bar + screenshot mock
    function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;flex-direction:column;">' +
        '<div style="display:flex;align-items:center;gap:3px;padding:4px 6px;background:' + card + ';border-bottom:1px solid ' + border + ';">' +
          '<div style="width:5px;height:5px;border-radius:50%;background:#FF5F57;"></div>' +
          '<div style="width:5px;height:5px;border-radius:50%;background:#FEBC2E;"></div>' +
          '<div style="width:5px;height:5px;border-radius:50%;background:#28C840;"></div>' +
          '<div style="margin-left:6px;flex:1;height:8px;background:' + bg + ';border-radius:4px;font-size:6px;color:' + dim + ';line-height:8px;padding-left:4px;">example.com</div>' +
        '</div>' +
        '<div style="flex:1;background:linear-gradient(135deg,#2A2D38,#3A3D48);position:relative;">' +
          '<div style="position:absolute;top:25%;left:50%;transform:translate(-50%,0);width:40%;height:6px;background:' + text + '40;border-radius:2px;"></div>' +
          '<div style="position:absolute;top:45%;left:50%;transform:translate(-50%,0);width:60%;height:3px;background:' + text + '20;border-radius:1px;"></div>' +
          '<div style="position:absolute;top:55%;left:50%;transform:translate(-50%,0);width:50%;height:3px;background:' + text + '15;border-radius:1px;"></div>' +
          '<div style="position:absolute;top:70%;left:50%;transform:translate(-50%,0);width:20%;height:8px;background:' + accent + '80;border-radius:3px;"></div>' +
          '<div style="position:absolute;top:60%;left:65%;width:6px;height:9px;background:' + text + ';clip-path:polygon(0 0,100% 30%,0 60%);filter:drop-shadow(0 0 2px ' + accent + ');"></div>' +
        '</div>' +
      '</div>'; },

    // stat-hit — count-up infographic with bars
    function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">' +
        '<div style="font-size:7px;color:' + accent + ';letter-spacing:0.12em;text-transform:uppercase;">Deterministic</div>' +
        '<div style="font-size:22px;font-weight:700;color:' + text + ';font-family:monospace;line-height:1;">100<span style="color:' + accent + ';font-size:14px;">%</span></div>' +
        '<div style="font-size:7px;color:' + dim + ';margin-top:1px;">byte-stable renders</div>' +
        '<div style="display:flex;gap:3px;margin-top:5px;align-items:flex-end;height:14px;">' +
          '<div style="width:6px;height:10px;background:' + accent + '60;border-radius:1px;"></div>' +
          '<div style="width:6px;height:14px;background:' + accent + '90;border-radius:1px;"></div>' +
          '<div style="width:6px;height:7px;background:' + accent + '40;border-radius:1px;"></div>' +
          '<div style="width:6px;height:11px;background:' + accent + '70;border-radius:1px;"></div>' +
        '</div>' +
      '</div>'; },

    // atmosphere — drifting gradient blobs
    function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';overflow:hidden;">' +
        '<div style="position:absolute;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,' + accent + '40,transparent 65%);top:15%;left:20%;filter:blur(6px);"></div>' +
        '<div style="position:absolute;width:35px;height:35px;border-radius:50%;background:radial-gradient(circle,' + text + '15,transparent 65%);top:50%;left:55%;filter:blur(5px);"></div>' +
        '<div style="position:absolute;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,' + accent + '25,transparent 65%);top:60%;left:25%;filter:blur(4px);"></div>' +
      '</div>'; },

    // ui-callout — dimmed screenshot with hotspot
    function () { return '' +
      '<div style="position:absolute;inset:0;background:linear-gradient(135deg,#2A2D38,#1E2028);">' +
        '<div style="position:absolute;inset:0;background:rgba(5,8,15,0.55);"></div>' +
        '<div style="position:absolute;top:35%;left:25%;width:50%;height:30%;border:1.5px solid ' + accent + ';border-radius:3px;box-shadow:0 0 0 100px rgba(5,8,15,0.35);"></div>' +
        '<div style="position:absolute;top:38%;left:78%;background:rgba(8,12,20,0.9);border:1px solid ' + accent + '60;border-radius:3px;padding:2px 5px;font-size:6px;color:' + text + ';white-space:nowrap;">CTA</div>' +
      '</div>'; },

    // three-scene — wireframe cube
    function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;align-items:center;justify-content:center;">' +
        '<svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="' + accent + '" stroke-width="1.2" stroke-linejoin="round">' +
          '<path d="M11 15 L21 11 L31 15 L21 19 Z"/>' +
          '<path d="M11 15 L11 28 L21 32 L21 19"/>' +
          '<path d="M31 15 L31 28 L21 32 L21 19"/>' +
          '<path d="M11 15 L21 19 L31 15" stroke="' + accent + '40"/>' +
          '<path d="M21 19 L21 32" stroke="' + accent + '40"/>' +
        '</svg>' +
      '</div>'; },

    // video-layer — film footage with play icon + timecode
    function () { return '' +
      '<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1A1B22,#2A2418);">' +
        '<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.4) 100%);"></div>' +
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;border-left:8px solid ' + text + '80;border-top:5px solid transparent;border-bottom:5px solid transparent;"></div>' +
        '<div style="position:absolute;bottom:4px;right:5px;font-family:monospace;font-size:7px;color:' + accent + ';">00:14</div>' +
        '<div style="position:absolute;bottom:4px;left:5px;font-family:monospace;font-size:7px;color:' + dim + ';">REC ●</div>' +
      '</div>'; },
  ];

  var labels = ['typography','parallax','browser-frame','stat-hit','atmosphere','ui-callout','three-scene','video-layer'];

  function makeFrame(renderFn, label, index) {
    var f = document.createElement('div');
    f.className = 'filmstrip-frame';
    f.style.flex = '0 0 200px';
    f.style.height = '112px';
    f.innerHTML = renderFn() +
      '<div class="frame-label" style="position:absolute;bottom:3px;left:5px;font-family:monospace;font-size:8px;color:' + dim + ';z-index:5;letter-spacing:0.02em;">' + label + '</div>' +
      '<div style="position:absolute;top:3px;right:5px;font-family:monospace;font-size:7px;color:' + accent + '50;z-index:5;">' + String(index + 1).padStart(2, '0') + '</div>';
    return f;
  }

  for (var dup = 0; dup < 2; dup++) {
    frames.forEach(function (fn, i) { strip.appendChild(makeFrame(fn, labels[i], i)); });
  }
})();

// Scene showcase tiles — also more realistic
(function () {
  var grid = document.querySelector('.showcase');
  if (!grid) return;

  var bg = '#0D0E12', card = '#1A1B22', accent = '#C49A5C', text = '#E2E0DC', dim = '#8A887F';

  var scenes = [
    { name: 'typography', meta: '4 reveals', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">' +
        '<div style="font-size:14px;font-weight:700;color:' + text + ';">Title</div>' +
        '<div style="font-size:8px;color:' + accent + ';">subtitle</div></div>'; } },

    { name: 'stat-hit', meta: 'count-up', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;">' +
        '<div style="font-size:22px;font-weight:700;color:' + accent + ';font-family:monospace;">87%</div>' +
        '<div style="display:flex;gap:3px;align-items:flex-end;height:10px;">' +
          '<div style="width:5px;height:7px;background:' + accent + '60;border-radius:1px;"></div>' +
          '<div style="width:5px;height:10px;background:' + accent + ';border-radius:1px;"></div>' +
          '<div style="width:5px;height:5px;background:' + accent + '40;border-radius:1px;"></div></div></div>'; } },

    { name: 'browser-frame', meta: 'cursor', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;flex-direction:column;">' +
        '<div style="display:flex;gap:3px;padding:3px 5px;background:' + card + ';border-bottom:1px solid #26272F;">' +
          '<div style="width:4px;height:4px;border-radius:50%;background:#FF5F57;"></div>' +
          '<div style="width:4px;height:4px;border-radius:50%;background:#FEBC2E;"></div>' +
          '<div style="width:4px;height:4px;border-radius:50%;background:#28C840;"></div></div>' +
        '<div style="flex:1;background:#2A2D38;position:relative;">' +
          '<div style="position:absolute;top:30%;left:50%;transform:translate(-50%,0);width:40%;height:5px;background:' + text + '40;border-radius:2px;"></div>' +
          '<div style="position:absolute;top:55%;left:50%;transform:translate(-50%,0);width:25%;height:7px;background:' + accent + '80;border-radius:3px;"></div></div></div>'; } },

    { name: 'ui-callout', meta: 'spotlight', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:linear-gradient(135deg,#2A2D38,#1E2028);">' +
        '<div style="position:absolute;inset:0;background:rgba(5,8,15,0.5);"></div>' +
        '<div style="position:absolute;top:35%;left:25%;width:50%;height:30%;border:1.5px solid ' + accent + ';border-radius:4px;box-shadow:0 0 0 100px rgba(5,8,15,0.3);"></div></div>'; } },

    { name: 'parallax', meta: '2.5D depth', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,' + bg + ',#1E1610);">' +
        '<div style="position:absolute;bottom:0;left:0;right:0;height:55%;background:' + accent + '15;clip-path:polygon(0 100%,15% 40%,30% 60%,50% 30%,70% 55%,85% 35%,100% 50%,100% 100%);"></div>' +
        '<div style="position:absolute;bottom:0;left:0;right:0;height:30%;background:' + accent + '30;clip-path:polygon(0 100%,25% 50%,50% 65%,75% 45%,100% 55%,100% 100%);"></div></div>'; } },

    { name: 'atmosphere', meta: 'blobs', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';overflow:hidden;">' +
        '<div style="position:absolute;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,' + accent + '40,transparent 65%);top:20%;left:25%;filter:blur(8px);"></div>' +
        '<div style="position:absolute;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle,' + text + '12,transparent 65%);top:50%;left:55%;filter:blur(6px);"></div></div>'; } },

    { name: 'video-layer', meta: 'footage', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1A1B22,#2A2418);">' +
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;border-left:8px solid ' + text + '80;border-top:5px solid transparent;border-bottom:5px solid transparent;"></div>' +
        '<div style="position:absolute;bottom:5px;right:6px;font-family:monospace;font-size:8px;color:' + accent + ';">00:14</div></div>'; } },

    { name: 'three-scene', meta: '3D wire', render: function () { return '' +
      '<div style="position:absolute;inset:0;background:' + bg + ';display:flex;align-items:center;justify-content:center;">' +
        '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="' + accent + '" stroke-width="1.2" stroke-linejoin="round">' +
          '<path d="M9 13 L18 9 L27 13 L18 17 Z"/><path d="M9 13 L9 24 L18 28 L18 17"/><path d="M27 13 L27 24 L18 28 L18 17"/></svg></div>'; } },
  ];

  scenes.forEach(function (s) {
    var tile = document.createElement('div');
    tile.className = 'showcase-tile';
    tile.innerHTML = s.render() +
      '<div class="st-meta">' + s.meta + '</div>' +
      '<div class="st-label">' + s.name + '</div>';
    grid.appendChild(tile);
  });
})();

// Typing animation for the code block
(function () {
  var block = document.querySelector('.code-typing');
  if (!block) return;
  var lines = [
    { html: '<span class="c-com"># install</span>' },
    { html: '<span class="c-key">npm</span> install <span class="c-str">lazy-frames</span>' },
    { html: '<span class="c-com"># capture a website → starter spec + assets</span>' },
    { html: '<span class="c-key">npx</span> <span class="c-fn">lazy</span> capture https://<span class="c-str">example.com</span> projects/acme' },
    { html: '<span class="c-key">npx</span> <span class="c-fn">lazy</span> check projects/acme <span class="c-com"># gates pass</span>' },
    { html: '<span class="c-key">npx</span> <span class="c-fn">lazy</span> render projects/acme <span class="c-com"># byte-stable MP4</span>' },
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
      hash.textContent = realHash.slice(0, i) + '\u258b';
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
    navigator.clipboard.writeText('npm install lazy-frames');
    if (window.plausible) window.plausible('Install Copy', { props: { location: 'nav' } });
    var orig = btn.textContent;
    btn.textContent = 'copied';
    setTimeout(function () { btn.textContent = orig; }, 1500);
  });
})();

// Privacy-safe custom analytics. Only explicit data-track properties are sent.
(function () {
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-track]');
    if (!target || !window.plausible) return;
    var props = {};
    Array.prototype.forEach.call(target.attributes, function (attr) {
      var prefix = 'data-track-prop-';
      if (attr.name.indexOf(prefix) === 0) props[attr.name.slice(prefix.length).replace(/-/g, '_')] = attr.value;
    });
    window.plausible(target.getAttribute('data-track'), { props: props });
  });
})();
