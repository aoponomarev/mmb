/**
 * @skill id:sk-0e193a
 * @description Validates docs/deletion-log.md: table format, deleted files must not exist.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const DELETION_LOG = path.join(ROOT, "docs", "deletion-log.md");
const HEADER_RE = /^\|\s*Doc\s*\|\s*Commit\s*\|\s*Rationale\s*\|/;
const SEPARATOR_RE = /^\|\s*[-:]+\s*\|\s*[-:]+\s*\|\s*[-:]+\s*\|/;
const ROW_RE = /^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/;

function main() {
  if (!fs.existsSync(DELETION_LOG)) {
    console.error("[validate-deletion-log] ERROR: docs/deletion-log.md not found.");
    process.exit(1);
  }

  const text = fs.readFileSync(DELETION_LOG, "utf8");
  const lines = text.split(/\r?\n/);
  const errors = [];

  let inTable = false;
  let hasHeader = false;
  let hasSeparator = false;
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (HEADER_RE.test(line)) {
      hasHeader = true;
      inTable = true;
      continue;
    }
    if (SEPARATOR_RE.test(line)) {
      hasSeparator = true;
      continue;
    }
    if (inTable && ROW_RE.test(line)) {
      const m = line.match(ROW_RE);
      if (m) rows.push({ doc: m[1].trim(), commit: m[2].trim(), rationale: m[3].trim() });
      continue;
    }
    if (inTable && line.trim().startsWith("|") && !ROW_RE.test(line)) {
      errors.push(`[validate-deletion-log] Invalid row format at line ${i + 1}: ${line.slice(0, 60)}...`);
    }
  }

  if (!hasHeader || !hasSeparator) {
    errors.push("[validate-deletion-log] Table must have header | Doc | Commit | Rationale | and separator row.");
  }

  for (const row of rows) {
    if (!row.rationale || row.rationale === "—") {
      errors.push(`[validate-deletion-log] Empty rationale for ${row.doc}`);
    }
    const absPath = path.join(ROOT, row.doc.replace(/\\/g, "/"));
    if (fs.existsSync(absPath)) {
      errors.push(`[validate-deletion-log] Doc in log must not exist: ${row.doc}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }

  console.log(`[validate-deletion-log] OK: ${rows.length} entries validated.`);
}

main();
