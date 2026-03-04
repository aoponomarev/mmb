/**
 * #JS-4x4Fzd18
 * @description Finds stale exceptions in causality-exceptions.jsonl — hashes fully removed from code.
 * @skill id:sk-3b1519
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const EXCEPTIONS_FILE = path.join(ROOT, "docs", "audits", "causality-exceptions.jsonl");
const JSON_MODE = process.argv.includes("--json");
const HASH_REGEX = /#(?:for|not)-[\w-]+/g;
const CODE_DIRS = [
  path.join(ROOT, "is"),
  path.join(ROOT, "core"),
  path.join(ROOT, "app"),
];

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

function collectUsedHashes() {
  const used = new Set();
  for (const dir of CODE_DIRS) {
    for (const filePath of walkJsFiles(dir)) {
      const content = fs.readFileSync(filePath, "utf8");
      const hashes = content.match(HASH_REGEX) || [];
      hashes.forEach((h) => used.add(h));
    }
    for (const filePath of walkMarkdownFiles(dir)) {
      const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
      if (rel.endsWith("causality-registry.md")) continue;
      const content = fs.readFileSync(filePath, "utf8");
      const hashes = content.match(HASH_REGEX) || [];
      hashes.forEach((h) => used.add(h));
    }
  }
  return used;
}

function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_FILE)) return [];
  const lines = fs.readFileSync(EXCEPTIONS_FILE, "utf8").split("\n");
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      result.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return result;
}

function main() {
  const usedHashes = collectUsedHashes();
  const exceptions = loadExceptions();
  const stale = [];

  for (const ex of exceptions) {
    const hash = ex.hash || ex.h;
    if (!hash) continue;
    if (!usedHashes.has(hash)) {
      stale.push({
        hash,
        removed_from: ex.removed_from || ex.removedFrom || "?",
        reason: ex.reason || "",
      });
    }
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ stale_exceptions: stale }, null, 2));
    process.exit(0);
  }

  if (stale.length > 0) {
    console.log("\n[validate-causality-exceptions-stale] Stale exceptions (hash fully removed from code):");
    for (const s of stale) {
      console.log(`  ${s.hash} (was: ${s.removed_from}) — ${s.reason || "remove this line"}`);
    }
  } else {
    console.log("[validate-causality-exceptions-stale] OK: No stale exceptions.");
  }

  process.exit(0);
}

main();
