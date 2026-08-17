import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildStarterSpec, captureSite } from '../../capture/dist/index.js';
import { SpecSchema, emitProgress, type ProgressReporter } from '../../engine/dist/index.js';

export async function runCapture(url: string, projectDir: string | undefined, json: boolean, onProgress?: ProgressReporter): Promise<void> {
  const parsedUrl = new URL(url.includes('://') ? url : `https://${url}`);
  const host = parsedUrl.hostname.replace(/^www\./, '');
  const dir = projectDir ?? path.join('projects', host.replace(/[^a-z0-9.-]/g, '-'));
  mkdirSync(dir, { recursive: true });

  const result = await captureSite(parsedUrl.toString(), dir, { onProgress });
  const specPath = path.join(dir, 'spec.json');
  let createdSpec = false;
  if (!existsSync(specPath)) {
    emitProgress(onProgress, { command: 'capture', phase: 'spec', status: 'start', message: 'Building the centered starter composition' });
    const starter = buildStarterSpec(result.ledger, host);
    const valid = SpecSchema.safeParse(starter);
    if (!valid.success) {
      throw new Error(`internal: starter spec failed schema: ${valid.error.issues.map((i) => i.message).join('; ')}`);
    }
    writeFileSync(specPath, JSON.stringify(valid.data, null, 2));
    createdSpec = true;
    emitProgress(onProgress, { command: 'capture', phase: 'spec', status: 'complete', message: 'Starter composition written' });
  }

  const summary = {
    project: dir,
    site: result.ledger.finalUrl,
    title: result.ledger.meta.title,
    palette: result.ledger.palette.slice(0, 5).map((p) => p.hex),
    roles: result.roles,
    copyBlocks: result.ledger.copy.length,
    fonts: result.ledger.fonts,
    assets: result.ledger.assets.map((a) => a.file),
    specCreated: createdSpec,
  };
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`captured ${summary.site} -> ${dir}`);
    console.log(`palette: ${summary.palette.join(' ')} | roles bg=${result.roles.bg} fg=${result.roles.fg} accent=${result.roles.accent}`);
    console.log(`copy blocks: ${summary.copyBlocks} | fonts: ${summary.fonts.join(', ') || 'n/a'}`);
    for (const a of summary.assets) console.log(`asset ${a}`);
    console.log(createdSpec ? `starter spec written: ${specPath}` : `spec.json already present — left untouched`);
  }
}
