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

/** Hash length for file id (must match assign-file-ids.js) */
export const HASH_LEN = 8;

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return h;
}

function toBase58(n, len) {
  let s = '';
  let x = Math.abs(n);
  for (let i = 0; i < len; i++) {
    s = BASE58[x % BASE58.length] + s;
    x = Math.floor(x / BASE58.length);
    if (x === 0) x = Math.abs(n) + (i + 1) * 37;
  }
  return s;
}

/**
 * Compute expected file id for a given relative path (same algorithm as assign-file-ids).
 * @param {string} relPath - Relative path with forward slashes
 * @returns {string} e.g. "#JS-1E2YRywQ"
 */
export function getExpectedFileId(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  const ext = normalized.split('.').pop()?.toUpperCase() || 'JS';
  const prefix = ext === 'JS' ? 'JS' : ext === 'TS' ? 'TS' : ext === 'CSS' ? 'CSS' : 'JS';
  const hash = toBase58(djb2(normalized), HASH_LEN);
  return `#${prefix}-${hash}`;
}

/**
 * Extract file id from header text (first match of FILE_ID_PATTERN).
 * @param {string} headerText - Concatenated header lines
 * @returns {string|null} e.g. "#JS-1E2YRywQ" or null
 */
export function getFileIdFromHeader(headerText) {
  const m = headerText.match(FILE_ID_PATTERN);
  return m ? m[0] : null;
}

/**
 * Full validation: file id must match path; when file id present, @description required.
 * @param {string} headerText - Concatenated header lines
 * @param {string} relPath - Relative path (forward slashes) for expected id computation
 * @returns {{ valid: boolean, error?: string, expectedId?: string, actualId?: string }}
 */
export function validateHeaderFull(headerText, relPath = '') {
  if (!headerText || !headerText.trim()) {
    return { valid: true };
  }
  const actualId = getFileIdFromHeader(headerText);
  const hasDesc = hasDescriptionTag(headerText);
  if (actualId && !hasDesc) {
    return {
      valid: false,
      error: relPath ? `${relPath}: header has file id but missing @description` : 'Header has file id but missing @description',
      actualId,
    };
  }
  if (actualId && relPath) {
    const expectedId = getExpectedFileId(relPath);
    if (actualId !== expectedId) {
      return {
        valid: false,
        error: `${relPath}: file id in header (${actualId}) does not match path (expected ${expectedId})`,
        expectedId,
        actualId,
      };
    }
  }
  return { valid: true };
}

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
