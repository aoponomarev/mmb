/**
 * @skill is/skills/process-code-anchors
 * @description Validates that all @causality and @skill-anchor hashes in code exist in causality-registry.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const REGISTRY_PATH = path.join(ROOT, "is", "skills", "causality-registry.md");
const CODE_DIRS = [
  path.join(ROOT, "is"),
  path.join(ROOT, "core"),
  path.join(ROOT, "app"),
];

const EXCLUDE_FILES = [
  "is/mcp/skills/server.js",
  "is/scripts/architecture/validate-causality.js",
  "is/scripts/architecture/validate-causality-invariant.js",
];

const HASH_REGEX = /#(?:for|not)-[\w-]+/g;

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
  if (!/@(?:causality|skill-anchor)/i.test(line)) return [];
  const match = line.match(/@causality\s*[:]?\s*(.+?)(?:\s*$)/i) || line.match(/@skill-anchor\s+(.+?)(?:\s*$)/i);
  const rest = match ? match[1] : "";
  return (rest.match(HASH_REGEX) || []).map((h) => h);
}

function main() {
  const registryHashes = loadRegistryHashes();
  const usedHashes = new Set();
  const unknown = [];
  const legacyNoHash = [];

  for (const dir of CODE_DIRS) {
    const files = walkJsFiles(dir);
    for (const filePath of files) {
      const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
      if (EXCLUDE_FILES.some((ex) => relPath === ex || relPath.endsWith(ex))) continue;
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/@causality/i.test(line) || /@skill-anchor/i.test(line)) {
          const hashes = extractHashesFromLine(line);
          if (hashes.length === 0) {
            legacyNoHash.push({ file: relPath, line: i + 1, text: line.trim().slice(0, 80) });
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

  if (legacyNoHash.length > 0) {
    console.warn("[validate-causality] WARNING: @causality/@skill-anchor without hashes (legacy format):");
    for (const l of legacyNoHash) {
      console.warn(`  ${l.file}:${l.line} — ${l.text}...`);
    }
  }

  console.log("[validate-causality] OK: All causality hashes in code exist in registry, and no ghost hashes found.");
}

main();
