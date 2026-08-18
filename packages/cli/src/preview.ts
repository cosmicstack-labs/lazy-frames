import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { emitProgress, type ProgressReporter } from '../../engine/dist/index.js';
import { prepareComposition, preparePreviewAudio } from '../../renderer/dist/index.js';

function previewPage(hasAudio: boolean): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>lazy preview</title>
<style>
  html,body{margin:0;height:100%;background:#0a0a0f;color:#e6e6ef;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
  #frame{position:absolute;top:0;left:0;right:0;bottom:64px;display:flex;align-items:center;justify-content:center;background:#000}
  #viewport{position:relative;overflow:hidden;flex:none}
  iframe{position:absolute;left:0;top:0;border:0;background:#000;transform-origin:top left}
  #bar{position:absolute;bottom:0;left:0;right:0;height:64px;display:flex;align-items:center;gap:14px;padding:0 18px;background:#14141c;border-top:1px solid #26263a}
  button{background:#22d3ee;color:#04222a;border:0;border-radius:6px;padding:8px 16px;font-weight:600;font-size:14px;cursor:pointer}
  input[type=range]{flex:1;accent-color:#22d3ee}
  #tc{font-variant-numeric:tabular-nums;font-size:13px;color:#9aa0b5;min-width:120px;text-align:right}
  #status{position:absolute;padding:8px 12px;border-radius:6px;background:#14141c;color:#9aa0b5;font-size:13px;box-shadow:0 8px 30px #0008}
</style>
</head>
<body>
<div id="frame"><div id="status">Loading composition...</div><div id="viewport"><iframe id="comp" src="/composition"></iframe></div></div>
<div id="bar">
  <button id="play">Play</button>
  <input id="scrub" type="range" min="0" max="1000" step="1" value="0">
  <span id="tc">0.00 / 0.00 s</span>
</div>
<script>
  var HAS_AUDIO = ${hasAudio ? 'true' : 'false'};
  var wire = null, compositionLoaded = false, frameDur = 0, frameCount = 0, frameIdx = 0, playing = false, acc = 0, lastTs = 0;
  var comp = document.getElementById('comp');
  var viewport = document.getElementById('viewport');
  var audio = HAS_AUDIO ? new Audio('/audio') : null;
  if (audio) audio.preload = 'auto';
  function fit() {
    if (!wire) return;
    var fw = window.innerWidth, fh = window.innerHeight - 64;
    var scale = Math.min(fw / wire.width, fh / wire.height, 1);
    viewport.style.width = Math.round(wire.width * scale) + 'px';
    viewport.style.height = Math.round(wire.height * scale) + 'px';
    comp.style.width = wire.width + 'px';
    comp.style.height = wire.height + 'px';
    comp.style.transform = 'scale(' + scale + ')';
  }
  function audioTime() { return frameIdx * frameDur / 1000; }
  function syncAudio(shouldPlay) {
    if (!audio) return;
    var t = audioTime();
    if (Math.abs(audio.currentTime - t) > 0.08) audio.currentTime = t;
    if (shouldPlay) audio.play().catch(function () {});
    else audio.pause();
  }
  function seekFrame(i) {
    frameIdx = Math.max(0, Math.min(frameCount - 1, i));
    comp.contentWindow.postMessage({ t: frameIdx * frameDur }, '*');
    document.getElementById('scrub').value = Math.round((frameIdx / Math.max(1, frameCount - 1)) * 1000);
    document.getElementById('tc').textContent = (frameIdx * frameDur / 1000).toFixed(2) + ' / ' + (frameCount * frameDur / 1000).toFixed(2) + ' s';
    if (!playing) syncAudio(false);
  }
  comp.addEventListener('load', function () {
    compositionLoaded = true;
    if (wire) seekFrame(0);
    document.getElementById('status').style.display = 'none';
  });
  fetch('/meta').then(function (r) { return r.json(); }).then(function (w) {
    wire = w; frameDur = 1000 / w.fps; frameCount = w.frameCount;
    fit(); window.addEventListener('resize', fit);
    if (compositionLoaded) seekFrame(0);
  });
  document.getElementById('scrub').addEventListener('input', function (e) {
    playing = false; document.getElementById('play').textContent = 'Play';
    seekFrame(Math.round((parseInt(e.target.value, 10) / 1000) * (frameCount - 1)));
  });
  document.getElementById('play').addEventListener('click', function () {
    playing = !playing; document.getElementById('play').textContent = playing ? 'Pause' : 'Play';
    if (playing) { if (frameIdx >= frameCount - 1) frameIdx = 0; lastTs = performance.now(); acc = 0; syncAudio(true); requestAnimationFrame(tick); }
    else syncAudio(false);
  });
  function tick(ts) {
    if (!playing) return;
    acc += ts - lastTs; lastTs = ts;
    while (acc >= frameDur) { acc -= frameDur; frameIdx++; }
    if (frameIdx >= frameCount) { frameIdx = frameCount - 1; playing = false; document.getElementById('play').textContent = 'Play'; seekFrame(frameIdx); syncAudio(false); return; }
    seekFrame(frameIdx);
    requestAnimationFrame(tick);
  }
</script>
</body>
</html>
`;
}

export async function runPreview(projectDir: string, port: number, onProgress?: ProgressReporter): Promise<void> {
  emitProgress(onProgress, { command: 'preview', phase: 'prepare', status: 'start', message: 'Preparing the centered preview composition' });
  const { compositionPath, wire } = prepareComposition(projectDir);
  emitProgress(onProgress, { command: 'preview', phase: 'prepare', status: 'complete', message: 'Preview composition prepared' });
  const lazyDir = path.dirname(compositionPath);

  let audioPath: string | undefined;
  emitProgress(onProgress, { command: 'preview', phase: 'audio', status: 'start', message: 'Mixing preview audio' });
  try {
    audioPath = preparePreviewAudio(projectDir, wire.frameCount / wire.fps);
    emitProgress(onProgress, {
      command: 'preview',
      phase: 'audio',
      status: 'complete',
      message: audioPath ? 'Preview audio is ready' : 'No audio in spec',
    });
  } catch (err) {
    emitProgress(onProgress, { command: 'preview', phase: 'audio', status: 'complete', message: 'Preview audio skipped' });
    console.error(`preview audio skipped: ${(err as Error).message}`);
  }

  const page = previewPage(Boolean(audioPath));

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/' || url.pathname === '/preview.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(page);
      } else if (url.pathname === '/meta') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(wire));
      } else if (url.pathname === '/audio' && audioPath) {
        const buf = await readFile(audioPath);
        res.writeHead(200, { 'content-type': 'audio/wav', 'content-length': buf.length, 'cache-control': 'no-store' });
        res.end(buf);
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

  emitProgress(onProgress, { command: 'preview', phase: 'server', status: 'start', message: `Starting the preview server on port ${port}` });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  emitProgress(onProgress, { command: 'preview', phase: 'server', status: 'complete', message: 'Preview server is ready' });
  const audioNote = audioPath ? ', audio' : '';
  console.log(`preview: http://localhost:${port}  (${wire.width}x${wire.height}, ${(wire.durationMs / 1000).toFixed(2)}s, ${wire.frameCount} frames${audioNote})`);
}
