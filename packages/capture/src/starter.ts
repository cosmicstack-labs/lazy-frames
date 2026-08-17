import type { Spec } from '../../engine/dist/index.js';
import type { CaptureLedger } from './model.js';
import { paletteRoles } from './model.js';

export function buildStarterSpec(ledger: CaptureLedger, host: string): Spec {
  const roles = paletteRoles(ledger.palette);
  const palette = [roles.bg, roles.accent, roles.fg];
  const title = ledger.copy.find((c) => c.tag === 'h1')?.text ?? ledger.meta.title ?? host;
  const sub =
    ledger.meta.description ||
    ledger.copy.find((c) => c.tag === 'p')?.text ||
    `A video generated from ${host}`;
  const cta = ledger.copy.find((c) => c.tag === 'a' || c.tag === 'button')?.text ?? 'Learn more';
  const heroAsset = `assets/sites/${host}/hero.png`;
  const fullAsset = `assets/sites/${host}/full.png`;

  return {
    specVersion: 1,
    meta: {
      id: host.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'site-promo',
      width: 1920,
      height: 1080,
      fps: 24,
      qualityTier: 'high',
    },
    style: {
      tokens: {
        palette,
        fontDisplay: 'Space Grotesk',
        fontBody: 'Inter',
        stageBg: roles.bg,
      },
    },
    scenes: [
      {
        type: 'typography',
        id: 'title',
        startMs: 0,
        durationMs: 2800,
        transitionIn: { type: 'cut', ms: 0 },
        transitionOut: { type: 'dissolve', ms: 400 },
        params: {
          lines: [
            { text: title.slice(0, 40), size: 118, weight: 700, font: 'display', color: 'fg' },
            { text: sub.slice(0, 70), size: 40, weight: 400, font: 'body', color: 'accent', delayMs: 700 },
          ],
          align: 'center',
          reveal: 'letter-stagger',
          staggerMs: 200,
        },
      },
      {
        type: 'browser-frame',
        id: 'browser',
        startMs: 2400,
        durationMs: 3600,
        transitionIn: { type: 'fade', ms: 400 },
        transitionOut: { type: 'dissolve', ms: 400 },
        params: {
          src: heroAsset,
          url: host,
          zoom: 'slow-in',
          cursor: {
            moves: [
              { xPct: 34, yPct: 40, atMs: 900 },
              { xPct: 62, yPct: 58, atMs: 2100 },
            ],
            clickAtMs: 2800,
          },
          bg: { type: 'solid', color: roles.bg },
        },
      },
      {
        type: 'parallax',
        id: 'parallax',
        startMs: 5600,
        durationMs: 3400,
        transitionIn: { type: 'fade', ms: 400 },
        transitionOut: { type: 'dissolve', ms: 400 },
        params: {
          src: fullAsset,
          move: 'dolly-in',
          grade: 'none',
          overlay: 'vignette',
          bg: { type: 'solid', color: roles.bg },
        },
      },
      {
        type: 'ui-callout',
        id: 'callout',
        startMs: 8600,
        durationMs: 3200,
        transitionIn: { type: 'fade', ms: 400 },
        transitionOut: { type: 'dissolve', ms: 400 },
        params: {
          src: heroAsset,
          hotspot: { x: 33, y: 52, w: 34, h: 16 },
          label: cta.slice(0, 40),
          zoomStrength: 8,
          bg: { type: 'solid', color: roles.bg },
        },
      },
      {
        type: 'typography',
        id: 'lockup',
        startMs: 11400,
        durationMs: 2600,
        transitionIn: { type: 'fade', ms: 400 },
        transitionOut: { type: 'cut', ms: 0 },
        params: {
          lines: [{ text: host, size: 104, weight: 700, font: 'display', color: 'fg', tracking: -2 }],
          align: 'center',
          reveal: 'scale-in',
          revealMs: 800,
          bg: { type: 'gradient', from: roles.bg, to: roles.accent, angle: 135 },
        },
      },
    ],
    outputs: [{ format: 'mp4', path: 'out/site-promo.mp4', codec: 'h264' }],
  } as Spec;
}
