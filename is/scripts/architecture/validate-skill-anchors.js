/**
 * @skill is/skills/process-code-anchors
 * @description Validates that all @skill references in code point to existing skill files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_BASES = ["is/skills", "core/skills", "app/skills"];
const SCAN_DIRS = [
  path.join(ROOT, "core"),
  path.join(ROOT, "app"),
  path.join(ROOT, "is"),
  path.join(ROOT, "shared"),
];
const CURSOR_RULES = path.join(ROOT, ".cursor", "rules");
const EXCLUDE_FILES = [
  "is/scripts/architecture/validate-skill-anchors.js",
  "is/scripts/architecture/validate-skill-anchors.test.js",
  "is/scripts/architecture/validate-skills.test.js",
  "is/scripts/architecture/validate-affected-skills.test.js",
  "is/mcp/skills/server.js",
];
const PLACEHOLDER_PATHS = /^path\/to\//;
const SKILL_REGEX = /@skill\s+([^\s\n*]+)/g;
const JSON_MODE = process.argv.includes("--json");

function walkFiles(dir, exts, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkFiles(full, exts, result);
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      result.push(full);
    }
  }
  return result;
}

function resolveSkillPath(skillPath) {
  const normalized = skillPath.replace(/\\/g, "/").trim();
  const withMd = normalized.endsWith(".md") ? normalized : `${normalized}.md`;
  const fullPath = path.join(ROOT, withMd);
  if (fs.existsSync(fullPath)) return fullPath;
  const altPath = path.join(ROOT, normalized);
  if (fs.existsSync(altPath)) return altPath;
  if (!normalized.includes("/")) {
    for (const base of SKILL_BASES) {
      const candidate = path.join(ROOT, base, normalized.endsWith(".md") ? normalized : `${normalized}.md`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function main() {
  const errors = [];
  const files = [];

  for (const dir of SCAN_DIRS) {
    for (const f of walkFiles(dir, [".js", ".ts"])) {
      files.push(f);
    }
  }
  if (fs.existsSync(CURSOR_RULES)) {
    for (const f of walkFiles(CURSOR_RULES, [".mdc"])) {
      files.push(f);
    }
  }

  for (const filePath of files) {
    const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
    if (EXCLUDE_FILES.some((ex) => relPath === ex || relPath.endsWith(ex))) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const headerLines = lines.slice(0, 50).join("\n");

    let m;
    while ((m = SKILL_REGEX.exec(headerLines)) !== null) {
      const skillPath = m[1].trim();
      if (PLACEHOLDER_PATHS.test(skillPath)) continue;
      const resolved = resolveSkillPath(skillPath);
      if (!resolved) {
        errors.push({ file: relPath, skill: skillPath, reason: "File not found" });
      }
    }
  }

  if (JSON_MODE) {
    const result = { ok: errors.length === 0, errors };
    process.stdout.write(JSON.stringify(result, null, 2));
    process.exit(errors.length > 0 ? 1 : 0);
  }

  if (errors.length > 0) {
    console.error("[validate-skill-anchors] ERROR: @skill references point to non-existent files:");
    for (const e of errors) {
      console.error(`  ${e.file} — ${e.skill} (${e.reason})`);
    }
    process.exit(1);
  }

  console.log("[validate-skill-anchors] OK: All @skill references resolve to existing skill files.");
}

main();
