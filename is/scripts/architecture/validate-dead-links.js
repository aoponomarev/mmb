/**
 * @skill is/skills/arch-skills-mcp
 * @description Finds dead links in skills and docs — references to non-existent files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SCAN_DIRS = [
  path.join(ROOT, "is", "skills"),
  path.join(ROOT, "core", "skills"),
  path.join(ROOT, "app", "skills"),
  path.join(ROOT, "docs"),
];

const JSON_MODE = process.argv.includes("--json");
const SKIP_PATTERNS = [
  /^https?:\/\//,
  /^mailto:/,
  /^#/,
  /^sk-[a-z0-9]+$/i,
  /^ais-[a-z0-9]+$/i,
  /^docs\/backlog\//,
  /^path\/to\//,
  /^\.(js|ts|md|mdc|json|yaml|yml)$/,  // extension-only like ".js"
];

const LINK_REGEX = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const BACKTICK_REGEX = /`([a-zA-Z0-9_/.-]+)`/g;

function shouldSkip(link) {
  const trimmed = link.trim();
  if (!trimmed) return true;
  if (SKIP_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (trimmed.includes(" ")) return true;
  return false;
}

function resolvePath(link, sourceFile) {
  const trimmed = link.trim().replace(/\\/g, "/");
  const sourceDir = path.dirname(sourceFile);
  const candidates = [
    path.join(ROOT, trimmed),
    path.join(sourceDir, trimmed),
    path.normalize(path.join(sourceDir, trimmed)),
  ];
  for (const c of candidates) {
    const normalized = path.normalize(c);
    if (fs.existsSync(normalized)) return normalized;
  }
  return path.join(ROOT, trimmed);
}

function walkMarkdown(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkMarkdown(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(full);
    }
  }
  return result;
}

function extractLinks(content, sourceFile) {
  const dead = [];
  const relSource = path.relative(ROOT, sourceFile).replace(/\\/g, "/");

  let m;
  const linkLooksLikePath = (l) =>
    l.includes("/") ||
    /^(is|core|app|docs|shared)\//i.test(l) ||
    /\.(md|js|ts|json|yaml|yml)$/i.test(l);
  LINK_REGEX.lastIndex = 0;
  while ((m = LINK_REGEX.exec(content)) !== null) {
    const link = m[2];
    if (shouldSkip(link)) continue;
    if (!linkLooksLikePath(link)) continue;
    const resolved = resolvePath(link, sourceFile);
    if (!fs.existsSync(resolved)) {
      dead.push({
        source_file: relSource,
        line: content.substring(0, m.index).split("\n").length,
        link,
        resolved: path.relative(ROOT, resolved).replace(/\\/g, "/"),
        exists: false,
      });
    }
  }

  BACKTICK_REGEX.lastIndex = 0;
  while ((m = BACKTICK_REGEX.exec(content)) !== null) {
    const link = m[1];
    if (shouldSkip(link)) continue;
    if (link.length < 5) continue;
    const looksLikePath =
      link.includes("/") ||
      /^[a-z-]+\/[a-z0-9_/.-]+\.(js|ts|md|json)$/i.test(link) ||
      /^(is|core|app|docs|shared)\/[a-z0-9_/.-]+/i.test(link);
    if (!looksLikePath) continue;
    const resolved = resolvePath(link, sourceFile);
    if (!fs.existsSync(resolved)) {
      dead.push({
        source_file: relSource,
        line: content.substring(0, m.index).split("\n").length,
        link,
        resolved: path.relative(ROOT, resolved).replace(/\\/g, "/"),
        exists: false,
      });
    }
  }

  return dead;
}

function main() {
  const deadLinks = [];

  for (const dir of SCAN_DIRS) {
    for (const filePath of walkMarkdown(dir)) {
      const content = fs.readFileSync(filePath, "utf8");
      const found = extractLinks(content, filePath);
      deadLinks.push(...found);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const d of deadLinks) {
    const key = `${d.source_file}:${d.line}:${d.link}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(d);
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ dead_links: unique }, null, 2));
    process.exit(0);
  }

  if (unique.length > 0) {
    console.log("\n[validate-dead-links] Dead links found:");
    for (const d of unique) {
      console.log(`  ${d.source_file}:${d.line} — ${d.link}`);
    }
  } else {
    console.log("[validate-dead-links] OK: No dead links found.");
  }

  process.exit(0);
}

main();
