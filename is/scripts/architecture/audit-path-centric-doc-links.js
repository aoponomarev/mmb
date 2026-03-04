/**
 * @skill is/skills/process-docs-lifecycle
 * @description Blocks path-centric docs markdown links in active docs.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const DOCS_DIR = path.join(ROOT, "docs");
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);
const LINK_RE = /`(docs\/[A-Za-z0-9_\-\/\.]+\.md(?:#[A-Za-z0-9_\-.]+)?)`/g;

function walkMarkdown(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkMarkdown(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function main() {
  const rows = [];
  for (const file of walkMarkdown(DOCS_DIR)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const text = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(text);
    if ((fm.status || "").toLowerCase() !== "active") continue;
    const found = new Set();
    for (const match of text.matchAll(LINK_RE)) {
      found.add(match[1]);
    }
    if (found.size > 0) rows.push({ rel, links: [...found].sort() });
  }

  if (rows.length === 0) {
    console.log("[audit-path-centric-doc-links] OK: no path-centric docs links in active docs.");
    return;
  }

  console.error(`[audit-path-centric-doc-links] FOUND: ${rows.length} active docs with path-centric links`);
  for (const row of rows) {
    console.error(` - ${row.rel}`);
    for (const link of row.links) console.error(`   * ${link}`);
  }
  process.exit(1);
}

main();
