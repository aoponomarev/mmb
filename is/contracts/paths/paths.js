/**
 * @skill arch-foundation
 * @description SSOT for absolute vs relative path policy, mapping to project structure.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { relativePathSchema } from '../naming/naming-rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// is/contracts/paths -> is/contracts -> is -> root
export const PROJECT_ROOT = path.resolve(__dirname, '../../../');

/**
 * Validates a relative path according to naming rules and returns an absolute path.
 * Throws an error if the path violates naming rules (e.g. contains forbidden legacy terms).
 */
export function getAbsolutePath(relativePath) {
    // Validate path name contract
    const result = relativePathSchema.safeParse(relativePath);
    if (!result.success) {
        throw new Error(`Path validation failed for "${relativePath}": ${result.error.issues[0].message}`);
    }

    return path.join(PROJECT_ROOT, relativePath);
}

export const PATHS = {
    root: PROJECT_ROOT,
    is: getAbsolutePath('is'),
    app: getAbsolutePath('app'),
    core: getAbsolutePath('core'),
    docs: getAbsolutePath('docs'),
    docsPlans: getAbsolutePath('docs/plans'),
    skills: getAbsolutePath('is/skills'),
    coreSkills: getAbsolutePath('core/skills'),
    coreContracts: getAbsolutePath('core/contracts'),
    logs: getAbsolutePath('is/logs'),
    drafts: getAbsolutePath('docs/drafts'),
    memory: getAbsolutePath('is/memory'),
    skills: getAbsolutePath('is/skills'),
    coreSkills: getAbsolutePath('core/skills'),
    logs: getAbsolutePath('is/logs'),
    drafts: getAbsolutePath('docs/drafts'),
    memory: getAbsolutePath('is/memory'),
    // Exception example (cloud paths are allowed to have legacy terms if needed by infrastructure)
    cloudflareApi: getAbsolutePath('is/cloudflare/edge-api')
};
