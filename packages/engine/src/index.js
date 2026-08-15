import { readFileSync } from 'node:fs';
import { compileSpec, SpecError } from './compile.js';
import { SpecSchema } from './spec.js';
export * from './constants.js';
export * from './channels.js';
export * from './spec.js';
export * from './fonts.js';
export { compileSpec, SpecError };
export { compileTypography } from './scenes/typography.js';
export { compileStatHit } from './scenes/statHit.js';
export function loadSpec(path) {
    let raw;
    try {
        raw = readFileSync(path, 'utf8');
    }
    catch {
        throw new SpecError([{ code: 'spec_unreadable', message: `cannot read spec file: ${path}` }]);
    }
    let json;
    try {
        json = JSON.parse(raw);
    }
    catch (err) {
        throw new SpecError([{ code: 'spec_invalid_json', message: `spec is not valid JSON: ${err.message}` }]);
    }
    const parsed = SpecSchema.safeParse(json);
    if (!parsed.success) {
        const errors = parsed.error.issues.map((issue) => ({
            code: 'schema',
            message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        }));
        throw new SpecError(errors);
    }
    return parsed.data;
}
