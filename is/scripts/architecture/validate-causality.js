/**
 * #JS-69pjw66d
 * @description Validates that all @causality and @skill-anchor hashes in code exist in causality-registry.md
 * @skill id:sk-8991cd
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const REGISTRY_PATH = path.join(ROOT, "is", "skills", "causality-registry.md");
const CODE_DIRS = [
  path.join(ROOT, "is"),
  path.join(ROOT, "core"),
  path.join(ROOT, "app"),
];

const EXTRA_MD_DIRS = [
  path.join(ROOT, "docs"),
];

const EXCLUDE_FILES = [
  "is/mcp/skills/server.js",
  "is/scripts/architecture/validate-causality.js",
  "is/scripts/architecture/validate-causality-invariant.js",
  "is/scripts/architecture/validate-affected-skills.js",
];

const HASH_REGEX = /#(?:for|not)-[\w-]+/g;

function parseCausalityMarker(line) {
  // Only parse actual comment lines to avoid false positives from regex/string literals.
  const marker = line.match(/^\s*(?:\/\/+|\*+|\/\*+|<!--)\s*@(?:(causality)|(skill-anchor))\b([\s\S]*)$/i);
  if (!marker) return null;
  const kind = marker[1] ? "causality" : "skill-anchor";
  const rest = (marker[3] || "").trim();
  return { kind, rest };
}

function loadRegistryHashes() {
  const content = fs.readFileSync(REGISTRY_PATH, "utf8");
  const hashes = new Set();
  const regex = /\|\s*`(#(?:for|not)-[\w-]+)`\s*\|/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    hashes.add(m[1]);
  }
  return hashes;
}

function walkJsFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkJsFiles(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      result.push(full);
    }
  }
  return result;
}

function walkMarkdownFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkMarkdownFiles(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(full);
    }
  }
  return result;
}

function extractHashesFromLine(line) {
  const parsed = parseCausalityMarker(line);
  if (!parsed) return [];
  return (parsed.rest.match(HASH_REGEX) || []).map((h) => h);
}

function main() {
  const registryHashes = loadRegistryHashes();
  const usedHashes = new Set();
  const unknown = [];
  const questionCandidates = [];
  const invalidNoHash = [];

  for (const dir of CODE_DIRS) {
    const files = walkJsFiles(dir);
    for (const filePath of files) {
      const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
      if (EXCLUDE_FILES.some((ex) => relPath === ex || relPath.endsWith(ex))) continue;
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parsed = parseCausalityMarker(line);
        if (!parsed) continue;
        const hashes = (parsed.rest.match(HASH_REGEX) || []).map((h) => h);
        if (hashes.length === 0) {
          if (parsed.kind === "causality" && /^:?\s*QUESTION\s*:/i.test(parsed.rest)) {
            questionCandidates.push({ file: relPath, line: i + 1, text: line.trim().slice(0, 120) });
          } else {
            invalidNoHash.push({ file: relPath, line: i + 1, text: line.trim().slice(0, 120) });
          }
        } else {
          for (const h of hashes) {
            usedHashes.add(h);
            if (!registryHashes.has(h)) {
              unknown.push({ file: relPath, line: i + 1, hash: h });
            }
          }
        }
      }
    }
    
    const mdFiles = walkMarkdownFiles(dir);
    for (const filePath of mdFiles) {
      const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
      if (EXCLUDE_FILES.some((ex) => relPath === ex || relPath.endsWith(ex))) continue;
      // Skip causality-registry.md itself
      if (relPath.endsWith("causality-registry.md")) continue;
      
      const content = fs.readFileSync(filePath, "utf8");
      const hashes = content.match(HASH_REGEX) || [];
      for (const h of hashes) {
        usedHashes.add(h);
      }
    }
  }

  for (const dir of EXTRA_MD_DIRS) {
    const mdFiles = walkMarkdownFiles(dir);
    for (const filePath of mdFiles) {
      const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
      const content = fs.readFileSync(filePath, "utf8");
      const hashes = content.match(HASH_REGEX) || [];
      for (const h of hashes) {
        usedHashes.add(h);
      }
    }
  }

  let failed = false;

  if (unknown.length > 0) {
    console.error("[validate-causality] ERROR: Hashes used in code but not in causality-registry.md:");
    for (const u of unknown) {
      console.error(`  ${u.file}:${u.line} — ${u.hash}`);
    }
    failed = true;
  }

  const ghostHashes = [];
  for (const h of registryHashes) {
    if (!h.startsWith("#deprecated-") && !usedHashes.has(h)) {
      ghostHashes.push(h);
    }
  }

  if (ghostHashes.length > 0) {
    console.error("[validate-causality] ERROR: Ghost hashes found in registry (not used in any code or markdown file):");
    for (const gh of ghostHashes) {
      console.error(`  ${gh}`);
    }
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  if (questionCandidates.length > 0) {
    console.warn("[validate-causality] WARNING: Intentional causality candidates found (@causality QUESTION: ...):");
    for (const l of questionCandidates) {
      console.warn(`  ${l.file}:${l.line} — ${l.text}...`);
    }
  }

  if (invalidNoHash.length > 0) {
    console.warn("[validate-causality] WARNING: Unformalized causality markers (missing #for/#not and not QUESTION:):");
    for (const l of invalidNoHash) {
      console.warn(`  ${l.file}:${l.line} — ${l.text}...`);
    }
  }

  console.log("[validate-causality] OK: All causality hashes in code exist in registry, and no ghost hashes found.");
}

main();
