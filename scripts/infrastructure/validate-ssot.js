/**
 * Skill: architecture/arch-ssot-governance
 *
 * Единый валидатор политик SSOT (Single Source of Truth) для MMB:
 * - Проверяет, что все env-зависимости, запрашиваемые в paths.js, описаны в .env.example
 * - Проверяет, что файлы в docs/*.md не пытаются быть скилами (нет relations, decision_id)
 * - Проверяет, что в конфигурациях (.continue/config.ts) нет захардкоженных секретов
 * - Проверяет реестры path migration / naming exceptions в paths.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { paths } from "../../paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

let hasErrors = false;

function reportError(msg) {
  console.error(`[ssot-check] FAILED: ${msg}`);
  hasErrors = true;
}

function checkPathsEnvSync() {
  const pathsContent = fs.readFileSync(path.join(ROOT, "paths.js"), "utf8");
  const envExample = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");

  // Ignore process.env access; this check validates only keys read from local `env` loader.
  const regex = /(?<!process\.)env\.([A-Z0-9_]+)/g;
  let match;
  const usedEnvs = new Set();
  while ((match = regex.exec(pathsContent)) !== null) usedEnvs.add(match[1]);

  for (const envVar of usedEnvs) {
    const varPattern = new RegExp(`^#?\\s*${envVar}=`, "m");
    if (!varPattern.test(envExample)) {
      reportError(`paths.js uses 'env.${envVar}', but it is missing in .env.example`);
    }
  }
}

function checkDocsAreNotSkills() {
  const docsDir = path.join(ROOT, "docs");
  if (!fs.existsSync(docsDir)) return;

  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const fullPath = path.join(docsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");

    if (content.startsWith("---")) {
      const endIdx = content.indexOf("\n---", 3);
      if (endIdx !== -1) {
        const frontmatter = content.slice(0, endIdx);
        if (/^relations:/m.test(frontmatter) || /^decision_id:/m.test(frontmatter)) {
          reportError(`docs/${file} contains skill-specific metadata (relations/decision_id) in its frontmatter.`);
        }
      }
    }
  }
}

function checkConfigsForHardcodedSecrets() {
  const continueConfig = path.join(ROOT, ".continue", "config.ts");
  if (!fs.existsSync(continueConfig)) return;
  const content = fs.readFileSync(continueConfig, "utf8");
  if (/['"]sk-[a-zA-Z0-9]{20,}['"]/.test(content)) {
    reportError(".continue/config.ts contains hardcoded 'sk-...' token. Use process.env instead.");
  }
  if (/['"]t1\.[A-Z0-9a-z_-]+['"]/.test(content) || /['"]y0_[a-zA-Z0-9]+['"]/.test(content)) {
    reportError(".continue/config.ts contains hardcoded Yandex IAM/OAuth token. Use process.env instead.");
  }
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
      data[key] = inner ? inner.split(",").map((v) => v.trim()).map((v) => v.replace(/^['"]|['"]$/g, "")) : [];
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

function walkMarkdownFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  const EXCLUDED = new Set(["drafts", ".obsidian"]);
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

function checkExplicitSsotTargets() {
  const skillsDir = path.join(ROOT, "skills");
  if (!fs.existsSync(skillsDir)) return;
  const mdFiles = walkMarkdownFiles(skillsDir);

  for (const filePath of mdFiles) {
    const text = fs.readFileSync(filePath, "utf8");
    const fm = parseFrontmatter(text);
    if (!fm || !fm.ssot_target) continue;
    const targets = Array.isArray(fm.ssot_target) ? fm.ssot_target : [fm.ssot_target];
    for (const target of targets) {
      if (!target) continue;
      const targetPath = path.resolve(ROOT, target);
      if (!fs.existsSync(targetPath)) {
        const relSkill = path.relative(ROOT, filePath);
        reportError(`Skill '${relSkill}' declares ssot_target '${target}', but file does not exist.`);
      }
    }
  }
}

function checkPathMigrationRegistry() {
  const migrations = Array.isArray(paths.pathMigrations) ? paths.pathMigrations : [];
  const allowedStatuses = new Set(["active", "deprecated", "removed", "planned"]);
  const ids = new Set();

  for (const item of migrations) {
    const required = ["id", "legacy", "target", "status", "reason"];
    for (const key of required) {
      if (!item[key] || String(item[key]).trim() === "") reportError(`pathMigrations entry missing "${key}"`);
    }
    if (ids.has(item.id)) reportError(`pathMigrations duplicate id "${item.id}"`);
    ids.add(item.id);
    if (!allowedStatuses.has(item.status)) reportError(`pathMigrations "${item.id}" has invalid status "${item.status}"`);
    if (item.legacy === item.target) reportError(`pathMigrations "${item.id}" has same legacy and target path`);
    if (item.status === "active" && !fs.existsSync(item.target)) {
      reportError(`pathMigrations "${item.id}" target does not exist: ${item.target}`);
    }
  }
}

function checkPathNamingExceptions() {
  const exceptions = Array.isArray(paths.pathNamingExceptions) ? paths.pathNamingExceptions : [];
  for (const item of exceptions) {
    if (!item.path || !item.reason) reportError("pathNamingExceptions entry requires path + reason");
    if (item.reviewAfter && !/^\d{4}-\d{2}-\d{2}$/.test(item.reviewAfter)) {
      reportError(`pathNamingExceptions "${item.path}" has invalid reviewAfter date`);
    }
  }
}

function main() {
  console.log("[ssot-check] Validating SSOT contracts...");
  checkPathsEnvSync();
  checkDocsAreNotSkills();
  checkConfigsForHardcodedSecrets();
  checkExplicitSsotTargets();
  checkPathMigrationRegistry();
  checkPathNamingExceptions();

  if (hasErrors) process.exit(1);
  console.log("[ssot-check] OK: All SSOT contracts passed.");
}

main();
