import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'engine', 'assets', 'luts');
mkdirSync(dir, { recursive: true });

const N = 17;

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function tealOrange(r, g, b) {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const sat = Math.sqrt((r - 0.5) ** 2 + (g - 0.5) ** 2);
  const t = clamp01(l);
  const oR = clamp01(r * 0.96 + l * 0.08);
  const oG = clamp01(g * 0.88 - l * 0.04);
  const oB = clamp01(b * 1.08 - l * 0.12);
  const shT = 0.48;
  const hiO = 0.52;
  const tealTint = l < shT ? (shT - l) / shT : 0;
  const orangeTint = l > hiO ? (l - hiO) / (1 - hiO) : 0;
  return [
    clamp01(oR + orangeTint * 0.10 - tealTint * 0.06),
    clamp01(oG - orangeTint * 0.03 - tealTint * 0.02),
    clamp01(oB + tealTint * 0.12 - orangeTint * 0.14),
  ];
}

function noirFilm(r, g, b) {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const lift = 0.02;
  const contrast = 1.22;
  let out = clamp01((l - 0.5) * contrast + 0.5 + lift);
  out = clamp01(out * 0.96 + 0.02);
  return [out, out, out];
}

function fadedVintage(r, g, b) {
  const lift = 0.06;
  const oR = clamp01(lerp(r, r * 0.92 + 0.08, 0.7) + lift);
  const oG = clamp01(lerp(g, g * 0.88 + 0.06, 0.7) + lift);
  const oB = clamp01(lerp(b, b * 0.82 + 0.04, 0.7) + lift);
  return [oR, oG, oB];
}

function writeCube(name, fn) {
  const lines = [`TITLE "${name}"`, `LUT_3D_SIZE ${N}`, `DOMAIN_MIN 0 0 0`, `DOMAIN_MAX 1 1 1`, ''];
  for (let b = 0; b < N; b++) {
    for (let g = 0; g < N; g++) {
      for (let r = 0; r < N; r++) {
        const ri = r / (N - 1), gi = g / (N - 1), bi = b / (N - 1);
        const [oR, oG, oB] = fn(ri, gi, bi);
        lines.push(`${oR.toFixed(6)} ${oG.toFixed(6)} ${oB.toFixed(6)}`);
      }
    }
  }
  writeFileSync(path.join(dir, `${name}.cube`), lines.join('\n') + '\n');
  console.log(`wrote ${name}.cube (${lines.length} lines)`);
}

writeCube('teal-orange', tealOrange);
writeCube('noir-film', noirFilm);
writeCube('faded-vintage', fadedVintage);