#!/usr/bin/env node
/**
 * #JS-1E2YRywQ
 * @description Build code-file-registry: map file id (#JS-xxx, #TS-xxx) to path from canonical scan.
 * @skill id:sk-f7e2a1
 * Plan: docs/plans/file-header-rollout.md. Does not modify file contents; use for registry only. Usage: node is/scripts/architecture/assign-file-ids.js [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCAN_DIRS } from "../../contracts/file-header-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXCLUDE = new Set(["node_modules", ".git", ".cursor", "docs"]);
const HASH_LEN = 8;

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return h;
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function toBase58(n, len) {
  let s = "";
  let x = Math.abs(n);
  for (let i = 0; i < len; i++) {
    s = BASE58[x % BASE58.length] + s;
    x = Math.floor(x / BASE58.length);
    if (x === 0) x = Math.abs(n) + (i + 1) * 37;
  }
  return s;
}

function fileIdFromPath(relPath) {
  const ext = path.extname(relPath).slice(1).toUpperCase();
  const prefix = ext === "JS" ? "JS" : ext === "TS" ? "TS" : ext === "CSS" ? "CSS" : "JS";
  const hash = toBase58(djb2(relPath.replace(/\\/g, "/")), HASH_LEN);
  return `#${prefix}-${hash}`;
}

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
    for (const ext of [".js", ".ts"]) {
      for (const file of walk(dirPath, ext)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        const id = fileIdFromPath(rel);
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
