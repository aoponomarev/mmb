/**
 * #JS-5F24tc1R
 * @description Outputs affected skills and causality hashes from staged files (git diff --cached). Does not block preflight.
 * @skill id:sk-8991cd
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ROOT } from "../../contracts/path-contracts.js";

const JSON_MODE = process.argv.includes("--json");
const NO_GIT = process.argv.includes("--no-git");

const SKILL_BASES = ["is/skills", "core/skills", "app/skills"];
const SKILL_REGEX = /@skill\s+([^\s\n*]+)/g;
const HASH_REGEX = /#(?:for|not)-[\w-]+/g;

function extractHashesFromLine(line) {
  if (!/@(?:causality|skill-anchor)/i.test(line)) return [];
  const match =
    line.match(/@causality\s*[:]?\s*(.+?)(?:\s*$)/i) ||
    line.match(/@skill-anchor\s+(.+?)(?:\s*$)/i);
  const rest = match ? match[1] : "";
  return (rest.match(HASH_REGEX) || []).map((h) => h);
}

function resolveSkillPath(skillPath) {
  const normalized = skillPath.replace(/\\/g, "/").trim();
  const withMd = normalized.endsWith(".md") ? normalized : `${normalized}.md`;
  if (!normalized.includes("/")) {
    for (const base of SKILL_BASES) {
      const candidate = path.join(
        ROOT,
        base,
        normalized.endsWith(".md") ? normalized : `${normalized}.md`
      );
      if (fs.existsSync(candidate))
        return path.join(base, withMd).replace(/\.md$/, "").replace(/\\/g, "/");
    }
  }
  const fullPath = path.join(ROOT, withMd);
  if (fs.existsSync(fullPath))
    return path.relative(ROOT, fullPath).replace(/\.md$/, "").replace(/\\/g, "/");
  const altPath = path.join(ROOT, normalized);
  if (fs.existsSync(altPath))
    return path.relative(ROOT, altPath).replace(/\.md$/, "").replace(/\\/g, "/");
  return withMd.replace(/\.md$/, "").replace(/\\/g, "/");
}

const SKILL_HEADER_LINES = 50;

function parseFileContent(content, filePath) {
  const skills = new Map();
  const hashes = new Set();
  const lines = content.split("\n");
  const headerLines = lines.slice(0, SKILL_HEADER_LINES).join("\n");

  let m;
  SKILL_REGEX.lastIndex = 0;
  while ((m = SKILL_REGEX.exec(headerLines)) !== null) {
    const skillPath = m[1].trim();
    if (/^path\/to\//.test(skillPath)) continue;
    const resolved = path.join(ROOT, resolveSkillPath(skillPath) + ".md");
    const rel = path.relative(ROOT, resolved).replace(/\\/g, "/");
    skills.set(rel, filePath);
  }

  for (let i = 0; i < lines.length; i++) {
    const hashesInLine = extractHashesFromLine(lines[i]);
    for (const h of hashesInLine) {
      hashes.add(h);
    }
  }

  return { skills, hashes };
}

function getStagedFiles() {
  try {
    const out = execSync("git diff --cached --name-only", {
      encoding: "utf8",
      cwd: ROOT,
    });
    return out
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getFileContent(filePath) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (![".js", ".ts", ".mdc", ".md", ".json"].includes(ext)) return null;
  try {
    return fs.readFileSync(full, "utf8");
  } catch {
    return null;
  }
}

function getStagedContent(filePath) {
  try {
    const out = execSync(`git show ":${filePath}"`, {
      encoding: "utf8",
      cwd: ROOT,
      maxBuffer: 512 * 1024,
    });
    return out;
  } catch {
    return getFileContent(filePath);
  }
}

function main() {
  let fileList;
  if (NO_GIT) {
    const stdin = fs.readFileSync(0, "utf8");
    fileList = stdin
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } else {
    fileList = getStagedFiles();
  }

  const allSkills = new Map();
  const allHashes = new Set();

  for (const filePath of fileList) {
    const content = NO_GIT ? getFileContent(filePath) : getStagedContent(filePath);
    if (!content) continue;
    const { skills, hashes } = parseFileContent(content, filePath);
    for (const [skill, via] of skills) {
      allSkills.set(skill, via);
    }
    for (const h of hashes) {
      allHashes.add(h);
    }
  }

  const affectedSkills = [...allSkills.entries()].map(([skill, via]) => ({
    skill,
    via_file: via,
  }));
  const affectedHashes = [...allHashes].sort();

  if (JSON_MODE) {
    const result = {
      changed_files: fileList,
      affected_skills: affectedSkills,
      affected_hashes: affectedHashes,
    };
    process.stdout.write(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  if (affectedSkills.length > 0) {
    console.log("\n[affected-skills] Skills that may need review:");
    for (const { skill, via_file } of affectedSkills) {
      console.log(`  - ${skill} (via ${via_file})`);
    }
  }
  if (affectedHashes.length > 0) {
    console.log("\n[affected-hashes] Causality hashes that may need formulation review:");
    for (const h of affectedHashes) {
      console.log(`  - ${h}`);
    }
  }
  if (affectedSkills.length === 0 && affectedHashes.length === 0 && fileList.length > 0) {
    console.log("\n[affected-skills] No @skill, @causality, or @skill-anchor in staged files.");
  }

  process.exit(0);
}

main();
