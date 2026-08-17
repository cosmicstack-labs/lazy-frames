import type { ProgressEvent, ProgressReporter } from '../../engine/dist/index.js';

export function createCliProgressReporter(): ProgressReporter {
  const lastPercent = new Map<string, number>();
  return (event: ProgressEvent) => {
    if (event.status === 'progress' && event.current !== undefined && event.total) {
      const percent = Math.min(100, Math.floor((event.current / event.total) * 100));
      const previous = lastPercent.get(event.phase) ?? -5;
      if (percent < 100 && percent - previous < 5) return;
      lastPercent.set(event.phase, percent);
      process.stderr.write(`[${event.command}] ${event.message} ${percent}% (${event.current}/${event.total} ${event.unit ?? 'items'})\n`);
      return;
    }
    const marker = event.status === 'complete' ? 'done' : 'start';
    process.stderr.write(`[${event.command}] ${marker}: ${event.message}\n`);
  };
}
