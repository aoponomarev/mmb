/**
 * @skill is/skills/process-code-anchors
 * @description Invariant gate: ensures that causality hashes are not removed from one file while left in others, without explicit acknowledgment.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../../mcp/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const LOCK_FILE = path.join(ROOT, "is", "contracts", ".causality-lock.json");
const EXCEPTIONS_FILE = path.join(ROOT, "docs", "audits", "causality-exceptions.jsonl");

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

function extractHashesFromLine(line) {
  if (!/@(?:causality|skill-anchor)/i.test(line)) return [];
  const match = line.match(/@causality\s*[:]?\s*(.+?)(?:\s*$)/i) || line.match(/@skill-anchor\s+(.+?)(?:\s*$)/i);
  const rest = match ? match[1] : "";
  return (rest.match(HASH_REGEX) || []).map((h) => h);
}

function loadLock() {
  if (!fs.existsSync(LOCK_FILE)) return { hashes: {} };
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  } catch {
    return { hashes: {} };
  }
}

function saveLock(state) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify(state, null, 2));
}

function loadExceptions() {
  const exceptions = [];
  if (!fs.existsSync(EXCEPTIONS_FILE)) return exceptions;
  const lines = fs.readFileSync(EXCEPTIONS_FILE, "utf8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      exceptions.push(JSON.parse(line));
    } catch {
      // ignore parse errors for now
    }
  }
  return exceptions;
}

function main() {
  const currentState = { hashes: {} };

  // 1. Build current state
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
          for (const h of hashes) {
            if (!currentState.hashes[h]) currentState.hashes[h] = [];
            if (!currentState.hashes[h].includes(relPath)) {
              currentState.hashes[h].push(relPath);
            }
          }
        }
      }
    }
  }

  // sort arrays for stable lockfile
  for (const h of Object.keys(currentState.hashes)) {
    currentState.hashes[h].sort();
  }

  // 2. Load lock and exceptions
  const lockedState = loadLock();
  const exceptions = loadExceptions();
  let failed = false;

  // 3. Compare locked vs current
  for (const [hash, lockedFiles] of Object.entries(lockedState.hashes)) {
    const currentFiles = currentState.hashes[hash] || [];
    
    // If hash completely removed everywhere, it's a clean wipe.
    if (currentFiles.length === 0) continue;

    // Check if any file was removed
    const removedFiles = lockedFiles.filter(f => !currentFiles.includes(f));
    
    if (removedFiles.length > 0) {
      for (const removedFile of removedFiles) {
        // Check if there is an exception
        const hasException = exceptions.some(ex => ex.hash === hash && ex.removed_from === removedFile);
        
        if (!hasException) {
          failed = true;
          console.error(`\n[FATAL] CAUSALITY INVALIDATION DETECTED`);
          console.error(`Hash: ${hash}`);
          console.error(`You removed this causality hash from: '${removedFile}'`);
          console.error(`But it is still active in: ${currentFiles.map(f => `'${f}'`).join(', ')}`);
          console.error(`\nACTION REQUIRED (choose one):`);
          console.error(`1. Remove/update the hash in the remaining files as well.`);
          console.error(`2. Add the following exact line to causality-exceptions.jsonl (docs/audits/causality-exceptions.jsonl):`);
          console.error(`   {"hash":"${hash}", "removed_from":"${removedFile}", "reason":"YOUR_REASON_HERE"}`);
        }
      }
    }
  }

  if (failed) {
    process.exit(1);
  }

  // 4. Update lockfile
  saveLock(currentState);
  console.log("[validate-causality-invariant] OK: Invariant check passed, lockfile updated.");

  // 5. Sync to SQLite
  try {
    const clearStmt = db.prepare('DELETE FROM dependency_graph');
    const insertStmt = db.prepare('INSERT INTO dependency_graph (source_hash, target_file, anchor_type) VALUES (?, ?, ?)');
    
    db.transaction(() => {
        clearStmt.run();
        for (const [hash, files] of Object.entries(currentState.hashes)) {
            for (const file of files) {
                insertStmt.run(hash, file, 'anchor');
            }
        }
    })();
    console.log("[validate-causality-invariant] OK: SQLite dependency_graph synced.");
  } catch (e) {
    console.warn("[validate-causality-invariant] WARN: Could not sync SQLite dependency_graph:", e.message);
  }
}

main();
