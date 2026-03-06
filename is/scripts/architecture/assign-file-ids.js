#!/usr/bin/env node
/**
 * #JS-1E2YRywQ
 * @description Build code-file-registry: map file id (#JS-xxx, #TS-xxx, #CSS-xxx, #JSON-xxx) to path from canonical scan.
 * @skill id:sk-f7e2a1
 * Plan: docs/plans/file-header-rollout.md. Does not modify file contents; use for registry only. Usage: node is/scripts/architecture/assign-file-ids.js [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCAN_DIRS, SCAN_EXTENSIONS, getExpectedFileId } from "../../contracts/file-header-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXCLUDE = new Set(["node_modules", ".git", ".cursor", "docs"]);

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE.has(e.name)) continue;
      walk(full, ext, out);
    } else if (e.name.endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const registry = {};

  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const ext of SCAN_EXTENSIONS) {
      for (const file of walk(dirPath, ext)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        const id = getExpectedFileId(rel);
        registry[id] = rel;
      }
    }
  }

  const regPath = path.join(ROOT, "is", "contracts", "docs", "code-file-registry.json");
  const out = Object.keys(registry).sort().reduce((o, k) => ({ ...o, [k]: registry[k] }), {});
  if (!dryRun) {
    fs.writeFileSync(regPath, JSON.stringify(out, null, 2), "utf8");
    console.log(`[assign-file-ids] Registry written: ${Object.keys(out).length} entries -> ${regPath}`);
  } else {
    console.log(`[assign-file-ids] Dry-run: would write ${Object.keys(out).length} entries.`);
  }
}

main();
