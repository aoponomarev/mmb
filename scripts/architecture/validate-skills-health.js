/**
 * Skill: meta/skills-linking-governance
 * Skill: process/process-env-sync-governance
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const SKILLS_ROOT = path.join(ROOT, "skills");

const EXCLUDED_DIRS = new Set(["drafts", ".obsidian"]);
const EXCLUDED_FILES = new Set(["README.md", "MIGRATION.md", "index.md"]);

const BASE_REQUIRED = ["id", "title", "scope", "tags", "priority", "updated_at"];
const ARCH_REQUIRED = ["decision_id", "supersedes", "status", "confidence", "review_after", "decision_scope"];
const ALLOWED_SCOPE = new Set(["meta", "process", "architecture", "security", "integrations", "troubleshooting", "libs"]);
const ALLOWED_STATUS = new Set(["active", "draft", "deprecated"]);
const ALLOWED_CONFIDENCE = new Set(["high", "medium", "low"]);
const ALLOWED_DECISION_SCOPE = new Set(["architecture", "process", "integration"]);

function walkMarkdownFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walkMarkdownFiles(full, result);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;
    result.push(full);
  }
  return result;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
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

function isArchSkill(relPath) {
  return relPath.startsWith("skills/architecture/arch-");
}

function isTemplateSkill(relPath, id) {
  return relPath.endsWith("/arch-template-adr.md") || id === "arch-template-adr";
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function daysUntil(dateStr) {
  const now = new Date();
  const dt = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  const ms = dt.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function main() {
  const files = walkMarkdownFiles(SKILLS_ROOT);
  const records = [];
  const errors = [];
  const warnings = [];

  for (const filePath of files) {
    const rel = toPosix(path.relative(ROOT, filePath));
    const raw = fs.readFileSync(filePath, "utf8");
    const fm = parseFrontmatter(raw);
    if (!fm) {
      errors.push(`[frontmatter] ${rel}: missing YAML frontmatter`);
      continue;
    }
    if (!fm.id) {
      errors.push(`[id] ${rel}: missing id`);
      continue;
    }
    records.push({ rel, id: fm.id, fm });
  }

  const byId = new Map();
  for (const r of records) {
    if (byId.has(r.id)) {
      errors.push(`[id] duplicate id "${r.id}" in ${r.rel} and ${byId.get(r.id).rel}`);
    } else {
      byId.set(r.id, r);
    }
  }

  let staleCount = 0;
  let nearReviewCount = 0;
  let orphanCount = 0;

  const inboundCount = new Map(records.map((r) => [r.id, 0]));
  for (const r of records) {
    const rels = Array.isArray(r.fm.relations) ? r.fm.relations : [];
    for (const dep of rels) {
      if (inboundCount.has(dep)) inboundCount.set(dep, inboundCount.get(dep) + 1);
    }
  }

  for (const r of records) {
    const { rel, id, fm } = r;
    const relations = Array.isArray(fm.relations) ? fm.relations : [];

    for (const key of BASE_REQUIRED) {
      if (!fm[key] || (Array.isArray(fm[key]) && fm[key].length === 0)) {
        errors.push(`[required] ${rel}: missing "${key}"`);
      }
    }

    if (fm.scope && !ALLOWED_SCOPE.has(String(fm.scope))) {
      errors.push(`[scope] ${rel}: invalid scope "${fm.scope}"`);
    }

    if (fm.updated_at && !isIsoDate(fm.updated_at)) {
      errors.push(`[updated_at] ${rel}: must be YYYY-MM-DD`);
    }

    if (Array.isArray(fm.tags)) {
      for (const tag of fm.tags) {
        if (!String(tag).startsWith("#")) {
          warnings.push(`[tags] ${rel}: tag "${tag}" should start with #`);
        }
      }
    }

    for (const dep of relations) {
      if (!byId.has(dep)) {
        errors.push(`[relations] ${rel}: unknown relation id "${dep}"`);
      }
    }

    const inCount = inboundCount.get(id) || 0;
    if (inCount === 0 && relations.length === 0 && !id.includes("template")) {
      orphanCount++;
      warnings.push(`[orphan] ${rel}: no inbound and no outbound relations`);
    }

    if (!isArchSkill(rel) || isTemplateSkill(rel, id)) continue;

    for (const key of ARCH_REQUIRED) {
      if (!fm[key] || String(fm[key]).trim() === "") {
        errors.push(`[arch-required] ${rel}: missing "${key}"`);
      }
    }
    if (fm.status && !ALLOWED_STATUS.has(String(fm.status))) {
      errors.push(`[status] ${rel}: invalid status "${fm.status}"`);
    }
    if (fm.confidence && !ALLOWED_CONFIDENCE.has(String(fm.confidence))) {
      errors.push(`[confidence] ${rel}: invalid confidence "${fm.confidence}"`);
    }
    if (fm.decision_scope && !ALLOWED_DECISION_SCOPE.has(String(fm.decision_scope))) {
      errors.push(`[decision_scope] ${rel}: invalid decision_scope "${fm.decision_scope}"`);
    }
    if (fm.review_after && !isIsoDate(fm.review_after)) {
      errors.push(`[review_after] ${rel}: must be YYYY-MM-DD`);
    }

    if (fm.review_after) {
      const d = daysUntil(String(fm.review_after));
      if (d !== null && d < 0) {
        staleCount++;
        warnings.push(`[stale] ${rel}: review_after expired ${Math.abs(d)} day(s) ago`);
      } else if (d !== null && d <= 14) {
        nearReviewCount++;
        warnings.push(`[review-soon] ${rel}: review_after in ${d} day(s)`);
      }
    }
  }

  const total = records.length;
  const score = Math.max(0, 100 - errors.length * 5 - staleCount * 3 - orphanCount - nearReviewCount);

  console.log(`[skills-health] total_skills=${total}`);
  console.log(`[skills-health] errors=${errors.length} warnings=${warnings.length} score=${score}/100`);
  console.log(`[skills-health] stale=${staleCount} review_soon=${nearReviewCount} orphan=${orphanCount}`);

  if (errors.length) {
    console.error("[skills-health] FAILED:");
    for (const e of errors) console.error(` - ${e}`);
  }

  if (warnings.length) {
    console.warn("[skills-health] WARNINGS:");
    for (const w of warnings) console.warn(` - ${w}`);
  }

  if (errors.length) process.exit(1);
  console.log("[skills-health] OK");
}

main();
