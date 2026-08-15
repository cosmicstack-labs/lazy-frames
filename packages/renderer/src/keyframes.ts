import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChrome } from './chrome.js';
import { hashImagePixels } from './ffmpeg.js';

export interface KeyframeShot {
  t: number;
  scene?: string;
  kind?: string;
  pngPath: string;
  hash: string;
}

export async function renderStill(opts: {
  html: string;
  width: number;
  height: number;
  outPng: string;
}): Promise<void> {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--hide-scrollbars', '--use-angle=swiftshader', '--allow-file-access-from-files', '--jitless', '--disable-lcd-text', '--force-color-profile=srgb', '--font-render-hinting=none'],
    defaultViewport: { width: opts.width, height: opts.height, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    await page.setContent(opts.html, { waitUntil: 'load' });
    await page.waitForFunction('window.__lazyReady === true', { timeout: 15000 });
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(opts.outPng, buf);
  } finally {
    await browser.close();
  }
}

export async function captureKeyframes(opts: {
  compositionPath: string;
  width: number;
  height: number;
  times: { t: number; scene?: string; kind?: string }[];
  outDir: string;
}): Promise<KeyframeShot[]> {
  mkdirSync(opts.outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--hide-scrollbars', '--use-angle=swiftshader', '--allow-file-access-from-files', '--jitless', '--disable-lcd-text', '--force-color-profile=srgb', '--font-render-hinting=none'],
    defaultViewport: { width: opts.width, height: opts.height, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${path.resolve(opts.compositionPath)}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__lazyReady === true', { timeout: 30000 });
    const shots: KeyframeShot[] = [];
    for (let i = 0; i < opts.times.length; i++) {
      const kf = opts.times[i]!;
      await page.evaluate((t) => window.__lazySeek?.(t), kf.t);
      const pngPath = path.join(opts.outDir, `k${String(i).padStart(3, '0')}.png`);
      const buf = await page.screenshot({ type: 'png' });
      writeFileSync(pngPath, buf);
      shots.push({ t: kf.t, scene: kf.scene, kind: kf.kind, pngPath, hash: hashImagePixels(pngPath) });
    }
    return shots;
  } finally {
    await browser.close();
  }
}
