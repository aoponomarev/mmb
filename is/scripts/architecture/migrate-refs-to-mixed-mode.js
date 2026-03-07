#!/usr/bin/env node
/**
 * #JS-nD2YRyiP
 * @description Migrate path-only refs in comments to mixed mode: #JS-xxx (path). Scans all .js, .ts, .css in SCAN_DIRS.
 * @skill id:sk-f7e2a1
 * Usage: node is/scripts/architecture/migrate-refs-to-mixed-mode.js [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCAN_DIRS } from "../../contracts/file-header-contract.js";
import { getCodeMapWithBasenameCounts } from "../../contracts/docs/resolve-id.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXCLUDE = new Set(["node_modules", ".git", ".cursor", "docs"]);
const CODE_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "code-file-registry.json");

function expectedDisplay(relPath, basenameCounts) {
  const bn = path.basename(relPath);
  return (basenameCounts.get(bn) || 0) > 1 ? relPath : bn;
}

/** Path is already in mixed format: #HASH (path) */
function isAlreadyMixed(line, pathStr, pathStart) {
  const before = line.slice(0, pathStart);
  return /#(?:JS|TS|CSS|JSON)-[A-Za-z0-9]+\s*\(\s*$/.test(before);
}

/** Line is a comment line: starts with //, *, or we're inside block comment */
function isCommentLine(line, inBlock) {
  const t = line.trimStart();
  if (t.startsWith("//")) return true;
  if (t.startsWith("/*")) return true;
  if (t.startsWith("*/")) return true;
  if (t.startsWith("*") && (t.length === 1 || t[1] === " " || t[1] === "\t")) return true;
  return inBlock;
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

function processFile(filePath, pathToHash, dryRun) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let inBlock = false;
  let changed = false;
  const newLines = [];
  const seenHashes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes("/*")) inBlock = true;
    const commentLine = isCommentLine(line, inBlock);
    if (line.includes("*/")) inBlock = false;

    if (!commentLine) {
      newLines.push(line);
      continue;
    }

    for (const [pathStr, hash, displayPath] of pathToHash) {
      let idx = 0;
      while ((idx = line.indexOf(pathStr, idx)) !== -1) {
        if (isAlreadyMixed(line, pathStr, idx)) {
          if (pathStr !== displayPath) {
            const mixedPattern = `${hash} (${pathStr})`;
            const correctPattern = `${hash} (${displayPath})`;
            if (line.includes(mixedPattern)) {
              line = line.replace(mixedPattern, correctPattern);
              changed = true;
            }
          }
          idx += pathStr.length;
          continue;
        }
        const useFull = !seenHashes.has(hash);
        seenHashes.add(hash);
        const replacement = useFull ? `${hash} (${displayPath})` : hash;
        line = line.slice(0, idx) + replacement + line.slice(idx + pathStr.length);
        idx += replacement.length;
        changed = true;
      }
    }
    newLines.push(line);
  }

  if (changed && !dryRun) {
    fs.writeFileSync(filePath, newLines.join("\n"), "utf8");
  }
  return changed;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!fs.existsSync(CODE_REGISTRY_PATH)) {
    console.error(`[migrate-refs] Missing registry: ${CODE_REGISTRY_PATH}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(CODE_REGISTRY_PATH, "utf8"));
  const { basenameCounts } = getCodeMapWithBasenameCounts();
  const pathToHash = [];
  for (const [hash, p] of Object.entries(registry)) {
    if (p.endsWith(".json")) continue;
    const displayPath = expectedDisplay(p.replace(/\\/g, "/"), basenameCounts);
    pathToHash.push([p.replace(/\\/g, "/"), hash, displayPath]);
  }
  pathToHash.sort((a, b) => b[0].length - a[0].length);

  const files = [];
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const ext of [".js", ".ts", ".css"]) {
      for (const f of walk(dirPath, ext)) files.push(f);
    }
  }

  const updated = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    if (processFile(f, pathToHash, dryRun)) {
      updated.push(rel);
    }
  }

  if (updated.length > 0) {
    console.log(`[migrate-refs] ${dryRun ? "Would update" : "Updated"} ${updated.length} file(s):`);
    for (const u of updated.slice(0, 50)) console.log(`  ${u}`);
    if (updated.length > 50) console.log(`  ... and ${updated.length - 50} more`);
  } else {
    console.log("[migrate-refs] No path-only refs found to migrate.");
  }
}

main();
