/**
 * @skill id:sk-d763e7
 * @description SSOT for path validation config used by validate-skills and validate-dead-links.
 * Single place to change exclusions, skip patterns, and resolve logic — avoids tech debt drift.
 *
 * @see id:backlog-2c4b0b
 * @see id:ais-9f4e2d
 */
import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "./paths/paths.js";

/** Project root (from paths SSOT) */
export const ROOT = PROJECT_ROOT;

/** Source files under these rel-paths are excluded from dead-links scan */
export const EXCLUDE_SOURCE_REL = [
  "docs/plans/",
  "docs/backlog/",
  "docs/done/",
];

/** Exact source files excluded (e.g. deletion-log: historical record; TEMPLATE: placeholders) */
export const EXCLUDE_SOURCE_FILES = new Set([
  "docs/deletion-log.md",
  "docs/ais/TEMPLATE.md",
]);

/** Link patterns to skip in dead-links check (not file paths) */
export const SKIP_LINK_PATTERNS = [
  /^https?:\/\//,
  /^mailto:/,
  /^#/,
  /^sk-[a-z0-9]+$/i,
  /^ais-[a-z0-9]+$/i,
  /^docs\/backlog\//,
  /^docs\/done\//,
  /^path\/to\//,
  /^\.(js|ts|md|mdc|json|yaml|yml)$/,
  /^\/api\//,
  /^api\//,
  /^\/health/,
  /^\/auth\//,
  /^a\//,
  /^architecture\//,
  /^archive\//,
  /^cache\//,
  /^cloud\//,
  /^process\//,
  /^troubleshooting\//,
  /^index\//,
  /^libs\//,
  /^ux\//,
  /^security\//,
  /^protocols\//,
  /^integrations\//,
  /^src\//,
  /^\.dev\.vars$/,
  /^wrangler\.toml$/,
  /^\/coins\//,
  /^\/simple\//,
  /^\/edit$/,
  /^try\/catch$/,
  /^provide\/inject$/,
  /^zod\//,
  /^plans\//,
  /^backlog\//,
  /^runbooks\//,
  /^cheatsheets\//,
  /^misc\//,
  /^temp\//,
  /^done\//,
  /^audits\//,
  /^docs\/misc\//,
  /^docs\/temp\//,
  /^docs\/archive\//,
  /^docs\/policies\//,
  /^docs\/drafts\//,
  /^docs\/drafts$/,
  /^drafts\//,
  /^control-plane\//,
  /^logs\//,
  /^dist\//,
  /^infrastructure\//,
  /^secrets\//,
  /^tests\//,
  /^\.github\/copilot-instructions\.md$/,
  /^docs\/A_CLOUDFLARE\.md$/,
  /^skills\/MIGRATION\.md$/,
  /^AI\/PRO\/mmb$/,
  /^shared\/component$/,
  /^shared\/utility$/,
  /^core\/is\/skills\/?$/,
  /^app\/is\/skills\/?$/,
  /^core\/skills\/everything\.md$/,
  /^core\/config\/integration-config\.js$/,
  /^core\/api\/integration-manager\.js$/,
  /^core\/lib-loader\.js$/,
  /^scripts\/sqlite-health-snapshot\.js$/,
  /^core\/contracts\/\.\.\.$/,
  /^core\/api\/\.\.\.$/,
  /^related_skills\/related_ais$/,
  /^legacy\/path$/,
  /^docs\/\.\.\.$/,
];

/** Dirs to search when resolving short paths (e.g. "validate-skills.js") */
export const SEARCH_DIRS = [
  "is/scripts/architecture",
  "is/scripts",
  "is/skills",
  "core/skills",
  "app/skills",
  ".github/workflows",
  "core",
  "app",
  "is",
  "shared",
  "docs",
];

/** Path patterns to exclude from Implementation Status parsing */
export const EXCLUDE_PATH_PATTERNS = [
  /node_modules/,
  /\bwrangler\b/,
  /\bnpm\b/,
  /\*|\.\.\./,
];

/**
 * @param {string} link - Raw link/path
 * @returns {boolean} - True if link should be skipped (not a checkable file path)
 */
export function shouldSkipLink(link) {
  const trimmed = link.trim();
  if (!trimmed) return true;
  if (SKIP_LINK_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (trimmed.includes(" ")) return true;
  return false;
}

/**
 * @param {string} absPath - Absolute path
 * @returns {boolean} - True if source file should be excluded from dead-links scan
 */
export function isExcludedSource(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  if (EXCLUDE_SOURCE_FILES.has(rel)) return true;
  return EXCLUDE_SOURCE_REL.some((p) => rel.startsWith(p));
}

/**
 * Resolve path for existence check. Used by both validate-skills and validate-dead-links.
 * @param {string} p - Relative path or short filename
 * @param {{ sourceFile?: string }} [opts] - sourceFile for relative resolution
 * @returns {string} - Absolute path (may not exist)
 */
export function resolvePath(p, opts = {}) {
  const trimmed = p.trim().replace(/\\/g, "/");
  if (path.isAbsolute(p)) return p;

  const atRoot = path.join(ROOT, trimmed);
  if (fs.existsSync(atRoot)) return atRoot;

  if (opts.sourceFile) {
    const sourceDir = path.dirname(opts.sourceFile);
    const fromSource = path.join(sourceDir, trimmed);
    if (fs.existsSync(fromSource)) return fromSource;
  }

  if (!trimmed.includes("/")) {
    for (const d of SEARCH_DIRS) {
      const candidate = path.join(ROOT, d, trimmed);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return atRoot;
}
