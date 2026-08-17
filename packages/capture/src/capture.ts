import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChrome } from '../../renderer/dist/index.js';
import { paletteRoles, type CaptureLedger } from './model.js';

const PALETTE_SCRIPT = () => {
  const counts = new Map<string, number>();
  const add = (c: string) => {
    if (!c) return;
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return;
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    if (Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && (r > 246 || r < 10)) return;
    const hex = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  };
  const els = document.querySelectorAll('body *');
  const cap = Math.min(els.length, 2000);
  for (let i = 0; i < cap; i++) {
    const cs = getComputedStyle(els[i]!);
    add(cs.color);
    add(cs.backgroundColor);
    add(cs.borderTopColor);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([hex, count]) => ({ hex, count }));
};

const COPY_SCRIPT = () => {
  const out: { tag: string; text: string; y: number; fontSize: number }[] = [];
  const els = Array.from(document.querySelectorAll('h1,h2,h3,p,a,button'));
  for (const el of els) {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 200) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({ tag: el.tagName.toLowerCase(), text: text.slice(0, 160), y: Math.round(r.top + window.scrollY), fontSize: Math.round(parseFloat(cs.fontSize) || 16) });
    if (out.length >= 14) break;
  }
  return out;
};

const FONTS_SCRIPT = () => {
  const s = new Set<string>();
  for (const sel of ['h1', 'h2', 'h3', 'p', 'body']) {
    const el = document.querySelector(sel);
    if (el) s.add((getComputedStyle(el).fontFamily || '').split(',')[0]!.replace(/["']/g, '').trim());
  }
  return [...s].filter(Boolean);
};

const ICON_SCRIPT = () => {
  const c: { url: string; priority: number }[] = [];
  const push = (u: string | null | undefined, p: number) => {
    if (u) c.push({ url: new URL(u, location.href).href, priority: p });
  };
  const ap = document.querySelector('link[rel="apple-touch-icon"]');
  if (ap) push(ap.getAttribute('href'), 0);
  const og = document.querySelector('meta[property="og:image"]');
  if (og) push(og.getAttribute('content'), 1);
  const ic = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (ic) push(ic.getAttribute('href'), 2);
  return c.sort((a, b) => a.priority - b.priority);
};

function sniffImage(buf: Buffer): string | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  const head = buf.subarray(0, 512).toString('utf8');
  if (head.includes('<svg')) return 'svg';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF') return 'webp';
  if (head.includes('<?xml') && head.includes('<svg')) return 'svg';
  return null;
}

const timeout = 45000;

export interface CaptureResult {
  ledger: CaptureLedger;
  heroPath: string;
  fullPath: string;
  roles: { bg: string; fg: string; accent: string };
}

export async function captureSite(rawUrl: string, projectDir: string): Promise<CaptureResult> {
  const url = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
  const host = url.hostname.replace(/^www\./, '');
  const outDir = path.join(projectDir, 'assets', 'sites', host);
  mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--hide-scrollbars', '--disable-gpu', '--force-color-profile=srgb', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 2 },
  });
  try {
    const page = await browser.newPage();
    await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout });
    await page.waitForFunction('document.fonts ? document.fonts.status === "loaded" : true', { timeout: 8000 }).catch(() => undefined);

    const pageHeight = await page.evaluate(() => Math.round(document.documentElement.scrollHeight));
    const heroShot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1280, height: Math.min(800, pageHeight) } });
    const heroPath = path.join(outDir, 'hero.png');
    writeFileSync(heroPath, heroShot);

    const fullShot = await page.screenshot({
      type: 'png',
      fullPage: pageHeight <= 8000,
      clip: pageHeight > 8000 ? { x: 0, y: 0, width: 1280, height: 8000 } : undefined,
    });
    const fullPath = path.join(outDir, 'full.png');
    writeFileSync(fullPath, fullShot);

    const palette = await page.evaluate(PALETTE_SCRIPT);
    const copy = await page.evaluate(COPY_SCRIPT);
    const fonts = await page.evaluate(FONTS_SCRIPT);
    const meta = await page.evaluate(() => ({
      title: document.title.trim().slice(0, 120),
      description: (document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '').trim().slice(0, 220),
    }));

    const assets: CaptureLedger['assets'] = [
      { id: `site:${host}:hero`, file: `assets/sites/${host}/hero.png`, kind: 'screenshot', meta: { viewport: '1280x800', dpr: 2 } },
      { id: `site:${host}:full`, file: `assets/sites/${host}/full.png`, kind: 'screenshot', meta: { mode: 'fullpage' } },
    ];

    const iconCandidates = await page.evaluate(ICON_SCRIPT);
    for (const cand of iconCandidates) {
      try {
        const res = await fetch(cand.url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = sniffImage(buf);
        if (!ext) continue;
        const logoPath = path.join(outDir, `logo.${ext}`);
        writeFileSync(logoPath, buf);
        assets.push({ id: `site:${host}:logo`, file: `assets/sites/${host}/logo.${ext}`, kind: 'logo', meta: { bytes: buf.length } });
        break;
      } catch {
        continue;
      }
    }

    const ledger: CaptureLedger = {
      site: url.toString(),
      finalUrl: page.url(),
      capturedAt: new Date().toISOString(),
      meta,
      palette,
      fonts,
      copy,
      assets,
    };
    writeFileSync(path.join(outDir, 'ledger.json'), JSON.stringify(ledger, null, 2));
    return { ledger, heroPath, fullPath, roles: paletteRoles(palette) };
  } finally {
    await browser.close();
  }
}
