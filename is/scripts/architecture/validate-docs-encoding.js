/**
 * @skill is/skills/process-language-policy
 * @description Global encoding gate: UTF-8 no BOM + mojibake detection in docs markdown.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const DOCS_DIR = path.join(ROOT, "docs");
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);
const MARKDOWN_EXT = ".md";

function hasUtf8Bom(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  );
}

function walkMarkdown(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkMarkdown(full, files);
    } else if (entry.isFile() && entry.name.endsWith(MARKDOWN_EXT)) {
      files.push(full);
    }
  }
  return files;
}

function containsMojibake(text) {
  if (text.includes("\uFFFD")) return true; // replacement character
  if (text.includes("п»ї")) return true; // BOM rendered as cp1251 text
  if (/�{2,}/.test(text)) return true; // repeated decoding placeholders
  return false;
}

function main() {
  const errors = [];

  for (const full of walkMarkdown(DOCS_DIR)) {
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    const buf = fs.readFileSync(full);
    const text = buf.toString("utf8");
    if (!hasUtf8Bom(buf)) {
      // expected mode: UTF-8 without BOM; nothing to report
    } else {
      errors.push(`[validate-docs-encoding] BOM is forbidden: ${rel}`);
    }
    if (containsMojibake(text)) {
      errors.push(`[validate-docs-encoding] Mojibake marker found: ${rel}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  console.log("[validate-docs-encoding] OK: docs markdown is UTF-8 without BOM and no mojibake markers.");
}

main();
