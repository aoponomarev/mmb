/**
 * #JS-y23qJxuC
 * @description Finds dead links in skills and docs — references to non-existent files.
 * @skill id:sk-7d810a
 * @see is/contracts/path-contracts.js — SSOT for exclusions and resolve logic.
 */
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  shouldSkipLink,
  isExcludedSource,
  resolvePath,
  EXCLUDE_SOURCE_FILES,
} from "../../contracts/path-contracts.js";

const SCAN_DIRS = [
  path.join(ROOT, "is", "skills"),
  path.join(ROOT, "core", "skills"),
  path.join(ROOT, "app", "skills"),
  path.join(ROOT, "docs"),
];

const JSON_MODE = process.argv.includes("--json");
const ALL_MODE = process.argv.includes("--all");

const LINK_REGEX = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const BACKTICK_REGEX = /`([a-zA-Z0-9_/.-]+)`/g;

/** In --all mode: only skip URLs, anchors, empty. No donor/API/placeholder filters. */
function shouldSkip(link) {
  const trimmed = link.trim();
  if (!trimmed) return true;
  if (ALL_MODE) {
    if (/^https?:\/\//.test(trimmed)) return true;
    if (/^mailto:/.test(trimmed)) return true;
    if (/^#/.test(trimmed)) return true;
    if (trimmed.includes(" ")) return true;
    return false;
  }
  return shouldSkipLink(link);
}

function walkMarkdown(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkMarkdown(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      if (EXCLUDE_SOURCE_FILES.has(rel)) continue;
      if (ALL_MODE || !isExcludedSource(full)) result.push(full);
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
    /^(is|core|app|docs|shared|a|architecture|archive|cache|cloud|process)\//i.test(l) ||
    /\.(md|js|ts|json|yaml|yml)$/i.test(l) ||
    (ALL_MODE && l.length >= 3);
  LINK_REGEX.lastIndex = 0;
  while ((m = LINK_REGEX.exec(content)) !== null) {
    const link = m[2];
    if (shouldSkip(link)) continue;
    if (!linkLooksLikePath(link)) continue;
    const resolved = resolvePath(link, { sourceFile });
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
      /^(is|core|app|docs|shared|a|architecture|archive|cache|cloud|process)\/[a-z0-9_/.-]+/i.test(link) ||
      (ALL_MODE && /[a-z0-9]+\/[a-z0-9_/.-]+/i.test(link));
    if (!looksLikePath) continue;
    const resolved = resolvePath(link, { sourceFile });
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
