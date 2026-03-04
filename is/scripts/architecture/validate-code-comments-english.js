#!/usr/bin/env node
/**
 * @skill id:sk-883639
 * @description Gate: code comments MUST be in English. Fails on Cyrillic in .js/.ts comments.
 * SSOT: process-language-policy. Excludes string literals (i18n), only checks comment blocks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

const CYRILLIC = /[а-яА-ЯёЁ]/;
const SCAN_DIRS = ["core", "app", "is", "shared", "mm"];
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

function extractCommentLines(content) {
  const lines = content.split(/\r?\n/);
  const commentLines = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (inBlock) {
      commentLines.push({ i: i + 1, text: line });
      if (trimmed.endsWith("*/")) inBlock = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      inBlock = !trimmed.endsWith("*/");
      commentLines.push({ i: i + 1, text: line });
      continue;
    }
    if (trimmed.startsWith("//")) {
      commentLines.push({ i: i + 1, text: line });
    }
  }
  return commentLines;
}

function main() {
  const errors = [];
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT, dir);
    for (const file of [...walk(dirPath, ".js"), ...walk(dirPath, ".ts")]) {
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      for (const { i, text } of extractCommentLines(content)) {
        if (CYRILLIC.test(text)) {
          const excerpt = text.trim().slice(0, 60).replace(/\s+/g, " ");
          errors.push(`${rel}:${i} ${excerpt}${excerpt.length >= 60 ? "…" : ""}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error("[validate-code-comments-english] FAIL: Cyrillic in code comments (SSOT: process-language-policy):");
    for (const e of errors) console.error("  " + e);
    process.exit(1);
  }
  console.log("[validate-code-comments-english] OK: all code comments in English.");
}

main();
