/**
 * #JS-vp2qzyrz
 * @description Adds deterministic id frontmatter to markdown files missing id.
 * @skill id:sk-0e193a
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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

function choosePrefix(rel) {
  if (rel.startsWith("docs/ais/")) return "ais";
  if (rel.startsWith("is/skills/") || rel.startsWith("core/skills/") || rel.startsWith("app/skills/")) return "sk";
  if (rel.startsWith("docs/plans/")) return "plan";
  if (rel.startsWith("docs/runbooks/")) return "runbook";
  if (rel.startsWith("docs/cheatsheets/")) return "cheat";
  if (rel.startsWith("docs/backlog/skills/")) return "bskill";
  if (rel.startsWith("docs/backlog/")) return "backlog";
  if (rel.startsWith("docs/done/")) return "done";
  if (rel.startsWith("docs/index-")) return "docidx";
  if (rel === "docs/README.md") return "docs";
  if (rel.endsWith("/README.md")) return "readme";
  return "doc";
}

function makeId(rel) {
  const hash = crypto.createHash("md5").update(rel).digest("hex").slice(0, 6);
  return `${choosePrefix(rel)}-${hash}`;
}

function hasIdFrontmatter(content) {
  const fm = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return false;
  return /^id:\s+/m.test(fm[1]);
}

function addFrontmatter(content, id) {
  const today = new Date().toISOString().slice(0, 10);
  const header = `---\nid: ${id}\nstatus: active\nlast_updated: "${today}"\n---\n\n`;
  return header + content;
}

function main() {
  const files = walkMarkdown(ROOT);
  let changed = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    if (hasIdFrontmatter(content)) continue;
    const id = makeId(rel);
    const updated = addFrontmatter(content, id);
    fs.writeFileSync(file, updated, "utf8");
    changed++;
    console.log(`[assign-missing-md-ids] added ${id} -> ${rel}`);
  }
  console.log(`[assign-missing-md-ids] DONE: updated ${changed} files`);
}

main();
