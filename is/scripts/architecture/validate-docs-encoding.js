/**
 * #JS-BK2i557V
 * @description Global encoding gate: UTF-8 no BOM + LF + mojibake detection. Scope: all text files per encoding-contract.
 * @skill id:sk-8f3a2e
 * @causality #for-utf8-no-bom-lf
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";
import { TEXT_EXT, EXCLUDE_DIRS } from "../../contracts/encoding-contract.js";

function hasUtf8Bom(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  );
}

function hasCrlf(buffer) {
  return buffer.includes(0x0d) && buffer.includes(0x0a);
}

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

// BOM (EF BB BF) misinterpreted as cp1251 — build via charCode to avoid self-match
const BOM_AS_CP1251 = String.fromCharCode(0x043f, 0x00bb, 0x0457);
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

function containsMojibake(text) {
  if (text.includes(REPLACEMENT_CHAR)) return true; // replacement character
  if (text.includes(BOM_AS_CP1251)) return true; // BOM rendered as cp1251
  if (new RegExp(`${REPLACEMENT_CHAR}{2,}`).test(text)) return true; // repeated placeholders
  return false;
}

function main() {
  const errors = [];

  const SELF = "is/scripts/architecture/validate-docs-encoding.js";
  for (const full of walk(ROOT)) {
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    const buf = fs.readFileSync(full);
    const text = buf.toString("utf8");
    if (hasUtf8Bom(buf)) {
      errors.push(`[validate-docs-encoding] BOM is forbidden: ${rel}`);
    }
    if (hasCrlf(buf)) {
      errors.push(`[validate-docs-encoding] CRLF forbidden, use LF: ${rel}`);
    }
    if (rel !== SELF && containsMojibake(text)) {
      errors.push(`[validate-docs-encoding] Mojibake marker found: ${rel}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    console.error("[validate-docs-encoding] Run: npm run encoding:normalize");
    process.exit(1);
  }

  console.log("[validate-docs-encoding] OK: project text files UTF-8 without BOM, LF line endings, no mojibake.");
}

main();
