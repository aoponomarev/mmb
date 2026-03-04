#!/usr/bin/env node
/**
 * @skill id:sk-f7e2a1
 * @causality #for-file-header-standard
 * @description Gate: files with file id (#JS-xxx, #TS-xxx) in header must have @description.
 * SSOT: process-file-header-standard, file-header-contract.js. Plan: docs/plans/file-header-rollout.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SCAN_DIRS,
  extractHeaderComment,
  validateHeader,
} from "../../contracts/file-header-contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXCLUDE = new Set(["node_modules", ".git", ".cursor", "docs"]);

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
  const errors = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const ext of [".js", ".ts"]) {
      for (const file of walk(dirPath, ext)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        const content = fs.readFileSync(file, "utf8");
        const header = extractHeaderComment(content);
        if (!header) continue;
        const headerText = header.lines.join("\n");
        const result = validateHeader(headerText, rel);
        if (!result.valid) {
          errors.push(result.error);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error("[validate-file-headers] FAIL: files with file id must have @description (SSOT: process-file-header-standard):");
    for (const e of errors) console.error("  " + e);
    process.exit(1);
  }
  console.log("[validate-file-headers] OK: all headers with file id have @description.");
}

main();
