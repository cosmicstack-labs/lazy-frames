import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareComposition } from '@lazy/renderer';

const PREVIEW_PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>lazy preview</title>
<style>
  html,body{margin:0;height:100%;background:#0a0a0f;color:#e6e6ef;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
  #frame{position:absolute;top:0;left:0;right:0;bottom:64px;display:flex;align-items:center;justify-content:center;background:#000}
  iframe{border:0;background:#000}
  #bar{position:absolute;bottom:0;left:0;right:0;height:64px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#14141c;border-top:1px solid #26263a}
  button{background:#22d3ee;color:#04222a;border:0;border-radius:6px;padding:8px 16px;font-weight:600;font-size:14px;cursor:pointer}
  input[type=range]{flex:1;accent-color:#22d3ee}
  #tc{font-variant-numeric:tabular-nums;font-size:13px;color:#9aa0b5;min-width:120px;text-align:right}
</style>
</head>
<body>
<div id="frame"><iframe id="comp" src="/composition"></iframe></div>
<div id="bar">
  <button id="play">Play</button>
  <input id="scrub" type="range" min="0" max="1000" step="1" value="0">
  <span id="tc">0.00 / 0.00 s</span>
</div>
<script>
  var wire = null, frameDur = 0, frameCount = 0, frameIdx = 0, playing = false, acc = 0, lastTs = 0;
  var comp = document.getElementById('comp');
  function fit() {
    if (!wire) return;
    var fw = window.innerWidth, fh = window.innerHeight - 64;
    var scale = Math.min(fw / wire.width, fh / wire.height, 1);
    comp.style.width = Math.round(wire.width * scale) + 'px';
    comp.style.height = Math.round(wire.height * scale) + 'px';
  }
  function seekFrame(i) {
    frameIdx = Math.max(0, Math.min(frameCount - 1, i));
    comp.contentWindow.postMessage({ t: frameIdx * frameDur }, '*');
    document.getElementById('scrub').value = Math.round((frameIdx / Math.max(1, frameCount - 1)) * 1000);
    document.getElementById('tc').textContent = (frameIdx * frameDur / 1000).toFixed(2) + ' / ' + (frameCount * frameDur / 1000).toFixed(2) + ' s';
  }
  fetch('/meta').then(function (r) { return r.json(); }).then(function (w) {
    wire = w; frameDur = 1000 / w.fps; frameCount = w.frameCount;
    fit(); window.addEventListener('resize', fit);
    comp.addEventListener('load', function () { seekFrame(0); });
  });
  document.getElementById('scrub').addEventListener('input', function (e) {
    playing = false; document.getElementById('play').textContent = 'Play';
    seekFrame(Math.round((parseInt(e.target.value, 10) / 1000) * (frameCount - 1)));
  });
  document.getElementById('play').addEventListener('click', function () {
    playing = !playing; document.getElementById('play').textContent = playing ? 'Pause' : 'Play';
    if (playing) { if (frameIdx >= frameCount - 1) frameIdx = 0; lastTs = performance.now(); acc = 0; requestAnimationFrame(tick); }
  });
  function tick(ts) {
    if (!playing) return;
    acc += ts - lastTs; lastTs = ts;
    while (acc >= frameDur) { acc -= frameDur; frameIdx++; }
    if (frameIdx >= frameCount) { frameIdx = frameCount - 1; playing = false; document.getElementById('play').textContent = 'Play'; seekFrame(frameIdx); return; }
    seekFrame(frameIdx);
    requestAnimationFrame(tick);
  }
</script>
</body>
</html>
`;

export async function runPreview(projectDir: string, port: number): Promise<void> {
  const { compositionPath, wire } = prepareComposition(projectDir);
  const lazyDir = path.dirname(compositionPath);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/' || url.pathname === '/preview.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PREVIEW_PAGE);
      } else if (url.pathname === '/meta') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(wire));
      } else if (url.pathname === '/composition') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(await readFile(compositionPath));
      } else if (url.pathname.startsWith('/fonts/')) {
        const file = path.join(lazyDir, 'fonts', path.basename(url.pathname));
        res.writeHead(200, { 'content-type': 'font/ttf' });
        res.end(await readFile(file));
      } else if (url.pathname.startsWith('/assets/')) {
        const file = path.join(lazyDir, 'assets', path.basename(url.pathname));
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(await readFile(file));
      } else {
        res.writeHead(404);
        res.end('not found');
      }
    } catch {
      res.writeHead(500);
      res.end('error');
    }
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`preview: http://localhost:${port}  (${wire.width}x${wire.height}, ${(wire.durationMs / 1000).toFixed(2)}s, ${wire.frameCount} frames)`);
}
