import { spawnSync } from 'node:child_process';

export interface PythonCommand {
  bin: string;
  prefix: string[];
}

function probe(bin: string, prefix: string[] = []): boolean {
  const res = spawnSync(bin, [...prefix, '-c', 'import sys; print(sys.version_info[0])'], {
    encoding: 'utf8',
    timeout: 8000,
    windowsHide: true,
  });
  return res.status === 0 && (res.stdout ?? '').trim().startsWith('3');
}

export function findPython(): PythonCommand {
  const env = process.env['LAZY_PYTHON'];
  if (typeof env === 'string' && env.length > 0 && probe(env)) return { bin: env, prefix: [] };

  const candidates: PythonCommand[] =
    process.platform === 'win32'
      ? [
          { bin: 'python', prefix: [] },
          { bin: 'py', prefix: ['-3'] },
          { bin: 'python3', prefix: [] },
        ]
      : [
          { bin: 'python3', prefix: [] },
          { bin: 'python', prefix: [] },
        ];

  for (const candidate of candidates) {
    if (probe(candidate.bin, candidate.prefix)) return candidate;
  }
  throw new Error('Python 3 not found. Install Python 3 or set LAZY_PYTHON to a Python 3 executable.');
}
