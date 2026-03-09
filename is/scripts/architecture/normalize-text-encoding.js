/**
 * #JS-ZqVGzZnJ
 * @description Normalizes project text files to UTF-8 without BOM and LF.
 * @skill id:sk-8f3a2e
 * @causality #for-utf8-no-bom-lf
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";
import { TEXT_EXT, EXCLUDE_DIRS } from "../../contracts/encoding-contract.js";

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(full, files);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_EXT.has(ext)) files.push(full);
  }
  return files;
}

function stripUtf8Bom(text) {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

function normalizeLf(text) {
  return text.replace(/\r\n/g, "\n");
}

function main() {
  let changed = 0;
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const original = fs.readFileSync(file, "utf8");
    const normalized = normalizeLf(stripUtf8Bom(original));
    if (normalized !== original) {
      fs.writeFileSync(file, normalized, "utf8");
      changed++;
      console.log(`[normalize-text-encoding] normalized ${rel}`);
    }
  }
  console.log(`[normalize-text-encoding] DONE: changed ${changed} files`);
}

main();
