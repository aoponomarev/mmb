/**
 * @skill is/skills/process-language-policy
 * @description Guards docs encoding/mixed mojibake in AIS markdown.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const AIS_DIR = path.join(ROOT, "docs", "ais");
const TARGET_FILE = path.join(AIS_DIR, "ais-docs-governance.md");

function hasUtf8Bom(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  );
}

function containsMojibake(text) {
  return text.includes("�");
}

function main() {
  const errors = [];
  if (!fs.existsSync(TARGET_FILE)) {
    errors.push(`[validate-docs-encoding] Missing file: ${path.relative(ROOT, TARGET_FILE)}`);
  } else {
    const buf = fs.readFileSync(TARGET_FILE);
    const text = buf.toString("utf8");
    if (!hasUtf8Bom(buf)) {
      errors.push("[validate-docs-encoding] ais-docs-governance.md must be UTF-8 BOM.");
    }
    if (containsMojibake(text)) {
      errors.push("[validate-docs-encoding] Mojibake marker found in ais-docs-governance.md.");
    }
  }

  for (const file of fs.readdirSync(AIS_DIR)) {
    if (!file.endsWith(".md")) continue;
    const full = path.join(AIS_DIR, file);
    const text = fs.readFileSync(full, "utf8");
    if (containsMojibake(text)) {
      errors.push(`[validate-docs-encoding] Mojibake marker found: docs/ais/${file}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  console.log("[validate-docs-encoding] OK: AIS encoding looks valid.");
}

main();
