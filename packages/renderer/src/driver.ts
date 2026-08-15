import { writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChrome } from './chrome.js';

export interface FrameJob {
  index: number;
  tMs: number;
}

const LAUNCH_ARGS = [
  '--hide-scrollbars',
  '--use-angle=swiftshader',
  '--allow-file-access-from-files',
  '--jitless',
  '--disable-lcd-text',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
];

declare global {
  interface Window {
    __lazySeek?: (t: number) => void;
    __lazyReady?: boolean;
  }
}

export async function renderFrames(opts: {
  compositionPath: string;
  width: number;
  height: number;
  frames: FrameJob[];
  framesDir: string;
  parallel: number;
  onFrame?: (done: number, total: number) => void;
}): Promise<void> {
  const url = `file://${path.resolve(opts.compositionPath)}`;
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: LAUNCH_ARGS,
    defaultViewport: { width: opts.width, height: opts.height, deviceScaleFactor: 1 },
  });
  try {
    const pageCount = Math.max(1, Math.min(opts.parallel, opts.frames.length));
    const pages = [];
    for (let i = 0; i < pageCount; i++) {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction('window.__lazyReady === true', { timeout: 30000 });
      pages.push(page);
    }
    let done = 0;
    await Promise.all(
      pages.map(async (page, p) => {
        for (let i = p; i < opts.frames.length; i += pageCount) {
          const f = opts.frames[i]!;
          await page.evaluate((t) => window.__lazySeek?.(t), f.tMs);          const buf = await page.screenshot({ type: 'png' });
          writeFileSync(`${opts.framesDir}/f${String(f.index).padStart(6, '0')}.png`, buf);
          done++;
          opts.onFrame?.(done, opts.frames.length);
        }
      }),
    );
  } finally {
    await browser.close();
  }
}
