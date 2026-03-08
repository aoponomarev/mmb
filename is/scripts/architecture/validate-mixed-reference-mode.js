/**
 * #JS-ww2hRLt7
 * @description Validates mixed reference mode for doc ids and code hashes across docs, rules, and code comments.
 * @skill id:sk-0e193a
 * @skill id:sk-f7e2a1
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";
import { getDocMap, getCodeMapWithBasenameCounts } from "../../contracts/docs/resolve-id.js";

const ID_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
const CODE_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "code-file-registry.json");
const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);
const TARGET_EXTS = new Set([".md", ".mdc", ".js", ".ts"]);

const DOC_PAIR_RE = /\b(id:[a-z0-9][a-z0-9-]*)\s*\(([^)\n]+?\.md(?:#[^)]+)?)\)/g;
const CODE_PAIR_RE = /(#(?:JS|TS|CSS|JSON)-[A-Za-z0-9]+)\s*\(([^)\n]+?\.(?:js|ts|css|jsonc?|md)(?:#[^)]+)?)\)/g;

function normalize(p) {
  return p.replace(/\\/g, "/");
}

function stripAnchor(p) {
  return p.split("#")[0];
}

function getAnchorSuffix(p) {
  const idx = p.indexOf("#");
  return idx === -1 ? "" : p.slice(idx);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(full, out);
      continue;
    }
    if (entry.isFile() && TARGET_EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function expectedCodeDisplay(relPath, basenameCounts) {
  const basename = path.basename(relPath);
  return (basenameCounts.get(basename) || 0) > 1 ? relPath : basename;
}

function isCommentLine(line, inBlock) {
  const t = line.trimStart();
  if (t.startsWith("//")) return true;
  if (t.startsWith("/*")) return true;
  if (t.startsWith("*/")) return true;
  if (t.startsWith("*") && (t.length === 1 || t[1] === " " || t[1] === "\t")) return true;
  return inBlock;
}

function isPathInMixedFormat(line, pathStr, pathStart) {
  const before = line.slice(0, pathStart);
  return /#(?:JS|TS|CSS|JSON)-[A-Za-z0-9]+\s*\(\s*$/.test(before);
}

function findPathOnlyInComments(content, codeMap, relFile) {
  const warns = [];
  const lines = content.split(/\r?\n/);
  let inBlock = false;
  const paths = [...codeMap.entries()].filter(([, p]) => !p.endsWith(".json")).sort((a, b) => b[1].length - a[1].length);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("/*")) inBlock = true;
    if (!isCommentLine(line, inBlock)) {
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (line.includes("*/")) inBlock = false;
    for (const [hash, pathStr] of paths) {
      if (relFile === pathStr) continue;
      let idx = 0;
      while ((idx = line.indexOf(pathStr, idx)) !== -1) {
        if (relFile === pathStr) { idx += pathStr.length; continue; }
        const before = line.slice(0, idx);
        if (/node\s+$/.test(before)) { idx += pathStr.length; continue; }
        if (!isPathInMixedFormat(line, pathStr, idx)) {
          warns.push(`${relFile}:${i + 1} bare path "${pathStr}" -> use ${hash} (path)`);
        }
        idx += pathStr.length;
      }
    }
  }
  return warns;
}

function main() {
  if (!fs.existsSync(ID_REGISTRY_PATH) || !fs.existsSync(CODE_REGISTRY_PATH)) {
    console.error("[validate-mixed-reference-mode] FAILED: missing id/code registry");
    process.exit(1);
  }

  const docMap = getDocMap();
  const { codeMap, basenameCounts } = getCodeMapWithBasenameCounts();
  const errors = [];
  const pathOnlyViolations = [];

  for (const [idToken, relPath] of docMap) {
    const abs = path.join(ROOT, relPath.replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) {
      errors.push(`stale-path: ${idToken} -> ${relPath} (file missing)`);
    }
  }
  for (const [hash, relPath] of codeMap) {
    const abs = path.join(ROOT, relPath.replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) {
      errors.push(`stale-path: ${hash} -> ${relPath} (file missing)`);
    }
  }

  for (const file of walk(ROOT)) {
    const relFile = normalize(path.relative(ROOT, file));
    const content = fs.readFileSync(file, "utf8");

    const seenDocPairs = new Set();
    const seenCodePairs = new Set();

    DOC_PAIR_RE.lastIndex = 0;
    let match;
    while ((match = DOC_PAIR_RE.exec(content)) !== null) {
      const idToken = match[1];
      const rawPath = match[2];
      const canonical = docMap.get(idToken);
      if (!canonical) continue;

      const expected = `${canonical}${getAnchorSuffix(rawPath)}`;
      if (normalize(rawPath) !== expected) {
        errors.push(`${relFile}: ${idToken} should use (${expected}), found (${rawPath})`);
      }
      if (seenDocPairs.has(idToken)) {
        errors.push(`${relFile}: repeated ${idToken} should collapse to bare id after the first contextual mention`);
      }
      seenDocPairs.add(idToken);
    }

    CODE_PAIR_RE.lastIndex = 0;
    while ((match = CODE_PAIR_RE.exec(content)) !== null) {
      const hash = match[1];
      const rawPath = match[2];
      const canonical = codeMap.get(hash);
      if (!canonical) continue;

      const expectedBase = expectedCodeDisplay(canonical, basenameCounts);
      const expected = `${expectedBase}${getAnchorSuffix(rawPath)}`;
      if (normalize(rawPath) !== expected) {
        errors.push(`${relFile}: ${hash} should use (${expected}), found (${rawPath})`);
      }
      if (seenCodePairs.has(hash)) {
        errors.push(`${relFile}: repeated ${hash} should collapse to bare hash after the first contextual mention`);
      }
      seenCodePairs.add(hash);
    }

    if (!path.extname(file).match(/\.(md|mdc)$/)) {
      const pathOnlyWarns = findPathOnlyInComments(content, codeMap, relFile);
      for (const w of pathOnlyWarns) pathOnlyViolations.push(w);
    }
  }

  if (pathOnlyViolations.length > 0) {
    const strict = process.argv.includes("--strict-path-only");
    for (const v of pathOnlyViolations) {
      if (strict) errors.push(`path-only: ${v}`);
      else console.warn(`[validate-mixed-reference-mode] path-only (use #HASH (path)): ${v}`);
    }
    if (strict) {
      console.error("[validate-mixed-reference-mode] FAILED: path-only refs in comments (run migrate-refs or fix manually)");
    }
  }

  if (errors.length > 0) {
    console.error("[validate-mixed-reference-mode] FAILED");
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log("[validate-mixed-reference-mode] OK: mixed reference mode is consistent.");
}

main();
