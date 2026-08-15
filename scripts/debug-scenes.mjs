import puppeteer from 'puppeteer-core';
import { findChrome } from '../packages/renderer/dist/chrome.js';

const url = `file://${process.cwd()}/examples/demo/.lazy/composition.html`;
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--hide-scrollbars', '--disable-gpu', '--force-color-profile=srgb'],
  defaultViewport: { width: 1920, height: 1080 },
});
const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction('window.__lazyReady === true');

for (const t of [1166, 3500, 7000]) {
  await page.evaluate((ms) => window.__lazySeek?.(ms), t);
  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.scene').forEach((el) => {
      const id = el.getAttribute('data-scene-id');
      const cs = getComputedStyle(el);
      let textInfo = 'no-text-els';
      const tel = el.querySelector('.line, .stat-value > span, .kicker');
      if (tel) {
        const tcs = getComputedStyle(tel);
        textInfo = `${tel.tagName}.${tel.className} disp=${tcs.display} op=${tcs.opacity} transform=${tcs.transform.slice(0, 40)} text="${(tel.textContent ?? '').slice(0, 18)}"`;
      }
      out.push(`${id}: display=${cs.display} opacity=${cs.opacity} | ${textInfo}`);
    });
    return out;
  });
  console.log(`--- t=${t}ms ---`);
  info.forEach((l) => console.log('   ', l));
}
await browser.close();
