export { findChrome } from './chrome.js';
export { renderFrames } from './driver.js';
export { encodeFrames, probeVideo, assertProbe, sha256File, checkFfmpeg, checkFfprobe, hashImagePixels } from './ffmpeg.js';
export { prepareComposition, renderProject } from './render.js';
export { captureKeyframes, renderStill } from './keyframes.js';
export type { RenderOptions, RenderSummary, PreparedComposition } from './render.js';
export type { KeyframeShot } from './keyframes.js';
export { assembleAudio, buildMusic, buildNarration, buildSfx, projectAudioCacheDir, sidecarDoctor } from './audio.js';
export type { PreparedNarration, PreparedSfx, SidecarResult } from './audio.js';
