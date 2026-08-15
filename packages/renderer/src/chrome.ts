import { existsSync } from 'node:fs';

export function findChrome(): string {
  const candidates = [
    process.env['CHROME_PATH'],
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter((c): c is string => typeof c === 'string' && c.length > 0);
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH to a Chromium executable.');
}
