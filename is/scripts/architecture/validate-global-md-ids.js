/**
 * #JS-V63juXRG
 * @description Validates all project markdown files have unique id in frontmatter.
 * @skill id:sk-0e193a
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);

function walkMarkdown(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkMarkdown(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(full);
    }
  }
  return result;
}

function parseFrontmatter(content) {
  const fm = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return {};
  const out = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function main() {
  const files = walkMarkdown(ROOT);
  const missing = [];
  const seen = new Map();
  const dup = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(content);
    const id = fm.id;
    if (!id) {
      missing.push(rel);
      continue;
    }
    if (seen.has(id)) {
      dup.push([id, seen.get(id), rel]);
    } else {
      seen.set(id, rel);
    }
  }

  if (missing.length || dup.length) {
    console.error("[validate-global-md-ids] FAILED");
    for (const m of missing) console.error(` - missing id: ${m}`);
    for (const [id, a, b] of dup) console.error(` - duplicate id ${id}: ${a} <-> ${b}`);
    process.exit(1);
  }

  console.log(`[validate-global-md-ids] OK: ${seen.size} markdown ids validated`);
}

main();
