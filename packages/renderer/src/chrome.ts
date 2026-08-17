import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function envPath(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function findChrome(): string {
  const home = os.homedir();
  const programFiles = envPath('PROGRAMFILES') ?? 'C:\\Program Files';
  const programFilesX86 = envPath('PROGRAMFILES(X86)') ?? 'C:\\Program Files (x86)';
  const localAppData = envPath('LOCALAPPDATA') ?? path.join(home, 'AppData', 'Local');

  const candidates = [
    envPath('CHROME_PATH'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Google', 'Chrome Beta', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
  ].filter((c): c is string => typeof c === 'string' && c.length > 0);

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH to a Chromium executable.');
}
