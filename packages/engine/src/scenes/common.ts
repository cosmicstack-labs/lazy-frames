import type { Channel } from '../channels.js';
import type { Bg, Spec } from '../spec.js';

export type Tokens = Spec['style']['tokens'];

export interface SceneCtx {
  tokens: Tokens;
  index: number;
  durationMs: number;
  width: number;
  height: number;
  asset: (src: string) => string;
}

export interface SceneBuild {
  html: string;
  css: string;
  channels: Channel[];
  program?: string;
}

export function fgColor(tokens: Tokens): string {
  return tokens.palette[2] ?? tokens.palette[0]!;
}
export function accentColor(tokens: Tokens): string {
  return tokens.palette[1] ?? tokens.palette[0]!;
}
export function stageBg(tokens: Tokens): string {
  return tokens.stageBg ?? tokens.palette[0]!;
}
export function fontFor(role: 'display' | 'body', tokens: Tokens): string {
  return role === 'display' ? tokens.fontDisplay : tokens.fontBody;
}
export function bgCss(bg: Bg | undefined): string {
  if (!bg) return 'transparent';
  if (bg.type === 'solid') return bg.color;
  return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`;
}
export function hexA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
