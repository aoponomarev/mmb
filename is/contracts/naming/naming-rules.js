/**
 * @skill arch-foundation
 * @description Gatekeeper for file and module naming contracts (kebab-case, anti-calque).
 */
import { z } from 'zod';

const FORBIDDEN_TERMS = ['mbb', 'mmb'];
const CLOUD_EXCEPTIONS = ['cloudflare', 'yandex'];

/**
 * Validates that string does not contain forbidden terms, unless it's explicitly part of a cloud integration context.
 */
const noForbiddenTerms = (val) => {
    const lower = val.toLowerCase();
    
    // Exception for cloud paths
    const isCloudContext = CLOUD_EXCEPTIONS.some(cloud => lower.includes(cloud));
    if (isCloudContext) {
        return true;
    }

    return !FORBIDDEN_TERMS.some(term => lower.includes(term));
};

/**
 * Allowed prefixes for the new architecture.
 */
export const ALLOWED_PREFIXES = ['app-', 'sys-', 'is-', 'core-', 'cmp-'];

const hasAllowedPrefix = (val) => {
    return ALLOWED_PREFIXES.some(prefix => val.startsWith(prefix));
};

// Base string with kebab-case validation (allows optional leading dot for system files/folders like .github)
const kebabCaseRegex = /^\.?[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * General filename schema.
 * - must be kebab-case
 * - no forbidden terms (mbb/mmb)
 */
export const fileNameSchema = z.string()
    .min(1)
    .regex(kebabCaseRegex, 'File name must be in kebab-case')
    .refine(noForbiddenTerms, { message: 'Use of legacy terms (MBB/MMB) is forbidden' });

/**
 * Domain-specific module name schema.
 * - must have an allowed prefix
 * - must be kebab-case
 * - no forbidden terms
 */
export const moduleNameSchema = z.string()
    .min(1)
    .regex(kebabCaseRegex, 'Module name must be in kebab-case')
    .refine(hasAllowedPrefix, { message: `Module name must start with one of: ${ALLOWED_PREFIXES.join(', ')}` })
    .refine(noForbiddenTerms, { message: 'Use of legacy terms (MBB/MMB) is forbidden' });

/**
 * Validates file path relative to project root.
 * - does not allow mbb/mmb in path
 */
export const relativePathSchema = z.string()
    .min(1)
    .refine(noForbiddenTerms, { message: 'Use of legacy terms (MBB/MMB) in paths is forbidden' });
