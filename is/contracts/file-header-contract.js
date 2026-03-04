/**
 * #JS-Am2QGp6w
 * @description SSOT for file header structure: file id pattern, required fields, allowed tags.
 * @skill id:sk-f7e2a1
 * @contract file-header-contract. AIS: id:ais-f7e2a1. Plan: docs/plans/file-header-rollout.md.
 */

/** File id pattern: #<EXT>-<hash> where EXT is JS|TS|CSS|HTML, hash is alphanumeric 6–12 chars (matches anywhere in header) */
export const FILE_ID_PATTERN = /#(JS|TS|CSS|HTML|JSON)-[a-zA-Z0-9]{6,12}\b/;

/** Required header fields for validation (when file has a file id in header) */
export const REQUIRED_HEADER_FIELDS = Object.freeze(['fileId', 'description']);

/** Allowed JSDoc-style tags in file header (order recommended in template) */
export const ALLOWED_HEADER_TAGS = Object.freeze([
  'description',
  'skill',
  'skill-anchor',
  'causality',
  'ssot',
  'gate',
  'contract',
  'see',
]);

/** Scan directories for file-header validation (same as validate-code-comments-english) */
export const SCAN_DIRS = Object.freeze(['core', 'app', 'is', 'shared', 'mm']);

/** Extensions to scan */
export const SCAN_EXTENSIONS = Object.freeze(['.js', '.ts']);

/**
 * Extract first block comment or leading // lines from content.
 * @param {string} content - Full file content
 * @returns {{ lines: string[], isBlock: boolean } | null}
 */
export function extractHeaderComment(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let i = 0;

  // Skip shebang and empty lines
  while (i < lines.length && (lines[i].trim() === '' || lines[i].trimStart().startsWith('#!'))) {
    i++;
  }
  if (i >= lines.length) return null;

  const first = lines[i].trim();
  if (first.startsWith('/*')) {
    let inBlock = true;
    result.push(lines[i]);
    i++;
    while (i < lines.length && inBlock) {
      result.push(lines[i]);
      if (lines[i].trim().endsWith('*/')) inBlock = false;
      i++;
    }
    return { lines: result, isBlock: true };
  }
  if (first.startsWith('//')) {
    while (i < lines.length && lines[i].trimStart().startsWith('//')) {
      result.push(lines[i]);
      i++;
    }
    return { lines: result, isBlock: false };
  }
  return null;
}

/**
 * Check if header text contains a file id (#JS-xxx or #TS-xxx etc).
 * @param {string} headerText - Concatenated header lines
 * @returns {boolean}
 */
export function hasFileId(headerText) {
  return FILE_ID_PATTERN.test(headerText);
}

/**
 * Check if header text contains @description (JSDoc tag).
 * @param {string} headerText - Concatenated header lines
 * @returns {boolean}
 */
export function hasDescriptionTag(headerText) {
  return /\@description\s+/m.test(headerText) || /\*\s+@description\s+/m.test(headerText);
}

/**
 * Validate header: if it has a file id, it must have @description.
 * @param {string} headerText - Concatenated header lines
 * @param {string} [relPath] - Relative path for error message
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHeader(headerText, relPath = '') {
  if (!headerText || !headerText.trim()) {
    return { valid: true };
  }
  const hasId = hasFileId(headerText);
  const hasDesc = hasDescriptionTag(headerText);
  if (hasId && !hasDesc) {
    return {
      valid: false,
      error: relPath
        ? `${relPath}: header contains file id but missing @description`
        : 'Header contains file id but missing @description',
    };
  }
  return { valid: true };
}
