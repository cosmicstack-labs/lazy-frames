import type { Spec } from './spec.js';

export interface KeyframeTime {
  t: number;
  scene: string;
  kind: 'midpoint' | 'transition-in' | 'transition-out';
}

export function keyframeTimes(spec: Spec): KeyframeTime[] {
  const out: KeyframeTime[] = [];
  for (const sc of spec.scenes) {
    const end = sc.startMs + sc.durationMs;
    out.push({ t: Math.round(sc.startMs + sc.durationMs / 2), scene: sc.id, kind: 'midpoint' });
    if (sc.transitionIn.type !== 'cut' && sc.transitionIn.ms > 0) {
      out.push({ t: Math.round(sc.startMs + sc.transitionIn.ms / 2), scene: sc.id, kind: 'transition-in' });
    }
    if (sc.transitionOut.type !== 'cut' && sc.transitionOut.ms > 0) {
      out.push({ t: Math.round(end - sc.transitionOut.ms / 2), scene: sc.id, kind: 'transition-out' });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
