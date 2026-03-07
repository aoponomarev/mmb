#!/usr/bin/env node
/**
 * #JS-y42szHuE
 * @description Audit: ids in registry never referenced in docs/code. Reports orphan doc ids and code hashes.
 * @skill id:sk-0e193a
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocMap, getCodeMapWithBasenameCounts } from "../../contracts/docs/resolve-id.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);
const EXCLUDE_FILES = new Set([
  "is/contracts/docs/id-registry.json",
  "is/contracts/docs/code-file-registry.json",
]);
const DOC_ID_RE = /\bid:([a-z0-9][a-z0-9-]*)\b/g;
const CODE_HASH_RE = /#(?:JS|TS|CSS|JSON)-[A-Za-z0-9]{6,12}\b/g;

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(full, exts, out);
      continue;
    }
    if (entry.isFile() && exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function main() {
  const strict = process.argv.includes("--strict");
  const docMap = getDocMap();
  const { codeMap } = getCodeMapWithBasenameCounts();

  const referencedDocIds = new Set();
  const referencedCodeHashes = new Set();

  const exts = new Set([".md", ".mdc", ".js", ".ts", ".css"]);
  const files = walk(ROOT, exts);
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (EXCLUDE_FILES.has(rel)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(DOC_ID_RE)) referencedDocIds.add(m[1]);
    for (const m of text.matchAll(CODE_HASH_RE)) referencedCodeHashes.add(m[0]);
  }

  const docIds = new Set();
  for (const k of docMap.keys()) docIds.add(k.replace(/^id:/, ""));
  const orphanDocs = [...docIds].filter((id) => !referencedDocIds.has(id)).sort();

  const codeHashes = new Set(codeMap.keys());
  const orphanCode = [...codeHashes].filter((h) => !referencedCodeHashes.has(h)).sort();

  if (orphanDocs.length > 0 || orphanCode.length > 0) {
    console.log("[audit-orphan-ids] Orphan ids (in registry, never referenced):");
    if (orphanDocs.length > 0) {
      console.log(`  Doc ids (${orphanDocs.length}):`);
      for (const id of orphanDocs.slice(0, 15)) console.log(`    id:${id}`);
      if (orphanDocs.length > 15) console.log(`    ... and ${orphanDocs.length - 15} more`);
    }
    if (orphanCode.length > 0) {
      console.log(`  Code hashes (${orphanCode.length}):`);
      for (const h of orphanCode.slice(0, 15)) console.log(`    ${h} -> ${codeMap.get(h)}`);
      if (orphanCode.length > 15) console.log(`    ... and ${orphanCode.length - 15} more`);
    }
    if (strict) process.exit(1);
  } else {
    console.log("[audit-orphan-ids] OK: no orphan ids found.");
  }
}

main();
