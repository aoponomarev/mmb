/**
 * @description SSOT: Paths, file types, and anchor types for causality scanning across the codebase.
 * @skill id:sk-8991cd
 */
import path from "node:path";
import fs from "node:fs";
import { ROOT } from "./path-contracts.js";

export { ROOT };

/**
 * Each entry feeds the dependency_graph with the specified anchor_type.
 * Code entries (anchorType "anchor") are also used by the invariant lockfile gate.
 */
export const CAUSALITY_SCAN_DIRS = [
  { dir: "is",            ext: ".js",  anchorType: "anchor" },
  { dir: "core",          ext: ".js",  anchorType: "anchor" },
  { dir: "app",           ext: ".js",  anchorType: "anchor" },
  { dir: "shared",        ext: ".js",  anchorType: "anchor" },
  { dir: "is/skills",     ext: ".md",  anchorType: "skill"  },
  { dir: "core/skills",   ext: ".md",  anchorType: "skill"  },
  { dir: "app/skills",    ext: ".md",  anchorType: "skill"  },
  { dir: "docs/ais",      ext: ".md",  anchorType: "ais"    },
  { dir: ".cursor/rules", ext: ".mdc", anchorType: "rule"   },
];

export const CAUSALITY_CODE_ANCHOR_TYPES = new Set(["anchor"]);

export const CAUSALITY_SCAN_EXCLUDE = new Set([
  "is/mcp/skills/server.js",
  "is/scripts/architecture/validate-causality.js",
  "is/scripts/architecture/validate-causality-invariant.js",
  "is/scripts/architecture/validate-affected-skills.js",
  "shared/templates/file-header-template.js",
  "docs/plans/",
  "docs/backlog/",
  "docs/done/",
]);

export const CAUSALITY_EXCLUDE_FILES = new Set(
  [...CAUSALITY_SCAN_EXCLUDE].filter((entry) => !entry.endsWith("/")),
);

export const CAUSALITY_EXCLUDE_BASENAMES = new Set(["TEMPLATE.md"]);

export const HASH_REGEX = /#(?:for|not)-[\w-]+/g;

export function walkFiles(dirRelOrAbs, ext, result = []) {
  const absDir = path.isAbsolute(dirRelOrAbs)
    ? dirRelOrAbs
    : path.join(ROOT, dirRelOrAbs);
  if (!fs.existsSync(absDir)) return result;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkFiles(full, ext, result);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      if (CAUSALITY_EXCLUDE_BASENAMES.has(entry.name)) continue;
      result.push(full);
    }
  }
  return result;
}

export function isExcludedFile(relPath) {
  if (CAUSALITY_EXCLUDE_FILES.has(relPath)) return true;
  for (const entry of CAUSALITY_SCAN_EXCLUDE) {
    if (entry.endsWith("/") && relPath.startsWith(entry)) return true;
  }
  if (relPath.endsWith("causality-registry.md")) return true;
  return false;
}
