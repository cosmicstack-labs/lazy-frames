export interface ProgressEvent {
  command: 'capture' | 'check' | 'render' | 'gen' | 'preview';
  phase: string;
  status: 'start' | 'progress' | 'complete';
  message: string;
  current?: number;
  total?: number;
  unit?: 'steps' | 'items' | 'frames';
}

export type ProgressReporter = (event: ProgressEvent) => void;

export function emitProgress(reporter: ProgressReporter | undefined, event: ProgressEvent): void {
  if (!reporter) return;
  try {
    reporter(event);
  } catch {
    // Progress observers must never affect generated output.
  }
}
