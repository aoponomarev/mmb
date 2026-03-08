#!/usr/bin/env node
/**
 * #JS-1E2YRywQ
 * @description Build code-file-registry: map file id (#JS-xxx, #TS-xxx, #CSS-xxx, #JSON-xxx) to path from canonical scan.
 * @skill id:sk-f7e2a1
 * Plan: docs/plans/file-header-rollout.md. Usage: node #JS-1E2YRywQ (assign-file-ids.js) [--dry-run] [--write]
 */
import fs from "node:fs";
import path from "node:path";
import {
  SCAN_DIRS,
  SCAN_EXTENSIONS,
  getExpectedFileId,
  extractHeaderComment,
  getFileIdFromHeader,
  hasFileId,
  hasDescriptionTag,
} from "../../contracts/file-header-contract.js";
import { ROOT } from "../../contracts/path-contracts.js";
const EXCLUDE = new Set(["node_modules", ".git", ".cursor", "docs"]);
/** Extensions that support block comments; --write skips .json */
const WRITE_EXTENSIONS = new Set([".js", ".ts", ".css"]);

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

/** Insert or fix file id in file content. Returns new content or null if no change. */
function applyFileId(content, rel, expectedId, dryRun) {
  const header = extractHeaderComment(content);
  if (!header) {
    if (dryRun) return { changed: true, rel, action: "insert-block" };
    const lines = content.split(/\r?\n/);
    let insertAt = 0;
    while (insertAt < lines.length && (lines[insertAt].trim() === "" || lines[insertAt].trimStart().startsWith("#!"))) {
      insertAt++;
    }
    const block = `/**
 * ${expectedId}
 * @description TODO: add description
 */
`;
    const before = lines.slice(0, insertAt).join("\n");
    const after = lines.slice(insertAt).join("\n");
    return { changed: true, content: (before ? before + "\n" : "") + block + (after ? "\n" + after : "") };
  }
  const headerText = header.lines.join("\n");
  if (hasFileId(headerText)) {
    const actualId = getFileIdFromHeader(headerText);
    if (actualId === expectedId) return { changed: false };
    if (dryRun) return { changed: true, rel, action: "fix-id", actualId, expectedId };
    return { changed: true, content: content.replace(actualId, expectedId) };
  }
  if (dryRun) return { changed: true, rel, action: "insert-id" };
  const firstLine = header.lines[0];
  const insertLine = ` * ${expectedId}\n`;
  const idx = content.indexOf(firstLine) + firstLine.length;
  return { changed: true, content: content.slice(0, idx) + "\n" + insertLine + content.slice(idx) };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const write = process.argv.includes("--write");
  const registry = {};
  const written = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const ext of SCAN_EXTENSIONS) {
      for (const file of walk(dirPath, ext)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        const id = getExpectedFileId(rel);
        registry[id] = rel;
        if (write && [".js", ".ts", ".css"].includes(ext)) {
          const content = fs.readFileSync(file, "utf8");
          const result = applyFileId(content, rel, id, dryRun);
          if (result.changed && result.content) {
            fs.writeFileSync(file, result.content, "utf8");
            written.push(rel);
          } else if (result.changed && dryRun) {
            written.push(rel + (result.action ? ` (${result.action})` : ""));
          }
        }
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
  if (write && written.length > 0) {
    console.log(`[assign-file-ids] ${dryRun ? "Would update" : "Updated"} ${written.length} file(s):`);
    for (const w of written.slice(0, 20)) console.log(`  ${w}`);
    if (written.length > 20) console.log(`  ... and ${written.length - 20} more`);
  }
}

main();
