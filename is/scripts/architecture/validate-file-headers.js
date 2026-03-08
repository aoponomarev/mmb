#!/usr/bin/env node
/**
 * #JS-zh26RZvs
 * @description Gate: full header check — file id must match path, @description required when id present; --fix corrects id mismatch.
 * @skill id:sk-f7e2a1
 * @causality #for-file-header-standard
 * @ssot process-file-header-standard, file-header-contract.js. Plan: docs/plans/file-header-rollout.md.
 */
import fs from "node:fs";
import path from "node:path";
import {
  SCAN_DIRS,
  extractHeaderComment,
  validateHeaderFull,
} from "../../contracts/file-header-contract.js";

import { ROOT } from "../../contracts/path-contracts.js";
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
  const fix = process.argv.includes("--fix");
  const errors = [];
  const fixable = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const ext of [".js", ".ts"]) {
      for (const file of walk(dirPath, ext)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        let content = fs.readFileSync(file, "utf8");
        const header = extractHeaderComment(content);
        if (!header) continue;
        const headerText = header.lines.join("\n");
        const result = validateHeaderFull(headerText, rel);
        if (!result.valid) {
          if (fix && result.expectedId && result.actualId && result.actualId !== result.expectedId) {
            fixable.push({ file, rel, expectedId: result.expectedId, actualId: result.actualId });
            content = content.replace(result.actualId, result.expectedId);
            fs.writeFileSync(file, content, "utf8");
          } else {
            errors.push(result.error);
          }
        }
      }
    }
  }

  if (fix && fixable.length > 0) {
    console.log("[validate-file-headers] Fixed file id in header:");
    for (const { rel, actualId, expectedId } of fixable) {
      console.log(`  ${rel}: ${actualId} -> ${expectedId}`);
    }
  }

  if (errors.length > 0) {
    console.error("[validate-file-headers] FAIL: (run with --fix to correct file id mismatch)");
    for (const e of errors) console.error("  " + e);
    process.exit(1);
  }
  console.log("[validate-file-headers] OK: all headers with file id have @description and id matches path.");
}

main();
