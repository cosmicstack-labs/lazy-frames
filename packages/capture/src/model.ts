export interface PaletteEntry {
  hex: string;
  count: number;
}

export interface CopyEntry {
  tag: string;
  text: string;
  y: number;
  fontSize: number;
}

export interface CaptureLedger {
  site: string;
  finalUrl: string;
  capturedAt: string;
  meta: { title: string; description: string };
  palette: PaletteEntry[];
  fonts: string[];
  copy: CopyEntry[];
  assets: { id: string; file: string; kind: string; meta: Record<string, unknown> }[];
}

export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function saturation(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export function paletteRoles(palette: PaletteEntry[]): { bg: string; fg: string; accent: string } {
  const candidates = palette.length > 0 ? palette : [{ hex: '#0B0F19', count: 1 }];
  let bg = candidates[0]!.hex;
  let fg = '#F8FAFC';
  let accent = '#22D3EE';
  let bestBgL = 2;
  let bestFgL = -1;
  let bestSat = -1;
  for (const c of candidates) {
    const l = luminance(c.hex);
    const s = saturation(c.hex);
    if (l < bestBgL) {
      bestBgL = l;
      bg = c.hex;
    }
    if (l > bestFgL && l > 0.55) {
      bestFgL = l;
      fg = c.hex;
    }
    if (s > bestSat && l > 0.2 && l < 0.9) {
      bestSat = s;
      accent = c.hex;
    }
  }
  if (bestFgL < 0) fg = '#F8FAFC';
  if (bestSat < 0 || accent === bg) accent = '#22D3EE';
  if (luminance(bg) > 0.5) bg = '#0B0F19';
  if (fg === bg) fg = '#F8FAFC';
  return { bg, fg, accent };
}
