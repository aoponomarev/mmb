/**
 * Skill: meta/skills-linking-governance
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SKILLS_ROOT = path.join(ROOT, "skills");

const EXCLUDED = new Set(["drafts", ".obsidian"]);

function walkMarkdownFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED.has(entry.name)) continue;
      walkMarkdownFiles(full, result);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) result.push(full);
  }
  return result;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const raw = text.slice(4, end).trim();
  const data = {};
  const lines = raw.split(/\r?\n/);
  let currentListKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (currentListKey && trimmed.startsWith("- ")) {
      data[currentListKey].push(trimmed.slice(2).trim().replace(/^['"]|['"]$/g, ""));
      continue;
    }

    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] = inner
        ? inner.split(",").map((v) => v.trim()).map((v) => v.replace(/^['"]|['"]$/g, ""))
        : [];
      currentListKey = null;
    } else if (value === "") {
      data[key] = [];
      currentListKey = key;
    } else {
      data[key] = value;
      currentListKey = null;
    }
  }
  return data;
}

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

function isArchSkill(relPath) {
  return relPath.startsWith("skills/architecture/arch-");
}

function isTemplateSkill(relPath, id) {
  return relPath.endsWith("/arch-template-adr.md") || id === "arch-template-adr";
}

function main() {
  const mdFiles = walkMarkdownFiles(SKILLS_ROOT);
  const records = [];
  const errors = [];

  for (const filePath of mdFiles) {
    const rel = toPosix(path.relative(ROOT, filePath));
    const text = fs.readFileSync(filePath, "utf8");
    const fm = parseFrontmatter(text);
    if (!fm || !fm.id) continue;
    records.push({ rel, id: fm.id, fm });
  }

  const idMap = new Map(records.map((r) => [r.id, r]));
  const decisionIds = new Map();

  for (const r of records) {
    const { rel, id, fm } = r;
    const relations = Array.isArray(fm.relations) ? fm.relations : [];

    // Validate relations resolve to existing skill IDs
    for (const dep of relations) {
      if (!idMap.has(dep)) {
        errors.push(`[relations] ${rel}: unknown relation id "${dep}"`);
      }
    }

    if (!isArchSkill(rel) || isTemplateSkill(rel, id)) continue;

    const required = ["decision_id", "supersedes"];
    for (const key of required) {
      if (!fm[key] || String(fm[key]).trim() === "") {
        errors.push(`[arch-required] ${rel}: missing "${key}"`);
      }
    }

    if (relations.length < 2) {
      errors.push(`[arch-relations] ${rel}: requires at least 2 relations, found ${relations.length}`);
    }

    const decisionId = fm.decision_id;
    if (decisionId) {
      if (decisionIds.has(decisionId)) {
        errors.push(
          `[decision-id] ${rel}: duplicate decision_id "${decisionId}" also used in ${decisionIds.get(decisionId)}`
        );
      } else {
        decisionIds.set(decisionId, rel);
      }
    }

    const supersedes = fm.supersedes;
    if (supersedes && supersedes !== "none") {
      if (supersedes === decisionId) {
        errors.push(`[supersedes] ${rel}: supersedes cannot reference itself (${supersedes})`);
      }
      if (!decisionIds.has(supersedes) && !records.some((x) => x.fm.decision_id === supersedes)) {
        errors.push(`[supersedes] ${rel}: unknown supersedes decision_id "${supersedes}"`);
      }
    }
  }

  if (errors.length) {
    console.error(`[skills-graph-check] FAILED: ${errors.length} issue(s)`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  console.log(`[skills-graph-check] OK: ${records.length} skills checked`);
}

main();
