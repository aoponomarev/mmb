/**
 * #JS-eG4BUXaS
 * @description Invariant gate: ensures causality hashes are not silently removed; syncs dependency_graph from all scan dirs.
 * @skill id:sk-8991cd
 */
import fs from "node:fs";
import path from "node:path";
import {
  CAUSALITY_SCAN_DIRS,
  CAUSALITY_CODE_ANCHOR_TYPES,
  HASH_REGEX,
  walkFiles,
  isExcludedFile,
} from "../../contracts/causality-scan-contracts.js";
import { ROOT } from "../../contracts/path-contracts.js";
import { db } from "../../mcp/db.js";

const LOCK_FILE = path.join(ROOT, "is", "contracts", ".causality-lock.json");
const EXCEPTIONS_FILE = path.join(
  ROOT,
  "docs",
  "audits",
  "causality-exceptions.jsonl",
);

function extractHashesFromLine(line) {
  if (!/@(?:causality|skill-anchor)/i.test(line)) return [];
  const match =
    line.match(/@causality\s*[:]?\s*(.+?)(?:\s*$)/i) ||
    line.match(/@skill-anchor\s+(.+?)(?:\s*$)/i);
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
      /* skip malformed lines */
    }
  }
  return exceptions;
}

function main() {
  const invariantState = { hashes: {} };
  const graphMap = new Map();

  for (const { dir, ext, anchorType } of CAUSALITY_SCAN_DIRS) {
    const isCode = CAUSALITY_CODE_ANCHOR_TYPES.has(anchorType);
    const files = walkFiles(dir, ext);

    for (const filePath of files) {
      const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
      if (isExcludedFile(relPath)) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      if (isCode) {
        for (let i = 0; i < lines.length; i++) {
          if (!/@(?:causality|skill-anchor)/i.test(lines[i])) continue;
          const hashes = extractHashesFromLine(lines[i]);
          for (const h of hashes) {
            if (!invariantState.hashes[h]) invariantState.hashes[h] = [];
            if (!invariantState.hashes[h].includes(relPath)) {
              invariantState.hashes[h].push(relPath);
            }
            const key = `${h}\0${relPath}`;
            if (!graphMap.has(key)) {
              graphMap.set(key, {
                hash: h,
                file: relPath,
                anchorType,
                lineNumber: i + 1,
              });
            }
          }
        }
      } else {
        const seenInFile = new Set();
        for (let i = 0; i < lines.length; i++) {
          const lineHashes = lines[i].match(HASH_REGEX) || [];
          for (const h of lineHashes) {
            const key = `${h}\0${relPath}`;
            if (!seenInFile.has(key)) {
              seenInFile.add(key);
              graphMap.set(key, {
                hash: h,
                file: relPath,
                anchorType,
                lineNumber: i + 1,
              });
            }
          }
        }
      }
    }
  }

  for (const h of Object.keys(invariantState.hashes)) {
    invariantState.hashes[h].sort();
  }

  // Compare with lockfile — only code anchors participate in deletion detection
  const lockedState = loadLock();
  const exceptions = loadExceptions();
  let failed = false;

  for (const [hash, lockedFiles] of Object.entries(lockedState.hashes)) {
    const currentFiles = invariantState.hashes[hash] || [];
    if (currentFiles.length === 0) continue;

    const removedFiles = lockedFiles.filter((f) => !currentFiles.includes(f));
    if (removedFiles.length > 0) {
      for (const removedFile of removedFiles) {
        const hasException = exceptions.some(
          (ex) => ex.hash === hash && ex.removed_from === removedFile,
        );
        if (!hasException) {
          failed = true;
          console.error(`\n[FATAL] CAUSALITY INVALIDATION DETECTED`);
          console.error(`Hash: ${hash}`);
          console.error(
            `You removed this causality hash from: '${removedFile}'`,
          );
          console.error(
            `But it is still active in: ${currentFiles.map((f) => `'${f}'`).join(", ")}`,
          );
          console.error(`\nACTION REQUIRED (in this order):`);
          console.error(
            `1. Audit the remaining files and check whether '${hash}' was superseded by a broader/renamed replacement hash. If yes, rebind those anchors first.`,
          );
          console.error(
            `2. If the old reason is obsolete everywhere, remove/update the hash in the remaining files as well.`,
          );
          console.error(
            `3. Only if the old reason is intentionally still valid elsewhere, add the following exact line to causality-exceptions.jsonl (docs/audits/causality-exceptions.jsonl):`,
          );
          console.error(
            `   {"hash":"${hash}", "removed_from":"${removedFile}", "reason":"YOUR_REASON_HERE"}`,
          );
        }
      }
    }
  }

  if (failed) {
    process.exit(1);
  }

  saveLock(invariantState);
  console.log(
    "[validate-causality-invariant] OK: Invariant check passed, lockfile updated.",
  );

  // Sync full graph (code + skills + AIS + rules) to SQLite
  try {
    const clearStmt = db.prepare("DELETE FROM dependency_graph");
    const insertStmt = db.prepare(
      "INSERT INTO dependency_graph (source_hash, target_file, anchor_type, line_number) VALUES (?, ?, ?, ?)",
    );

    db.transaction(() => {
      clearStmt.run();
      for (const entry of graphMap.values()) {
        insertStmt.run(
          entry.hash,
          entry.file,
          entry.anchorType,
          entry.lineNumber,
        );
      }
    })();
    console.log(
      `[validate-causality-invariant] OK: SQLite dependency_graph synced (${graphMap.size} entries).`,
    );
  } catch (e) {
    console.warn(
      "[validate-causality-invariant] WARN: Could not sync SQLite dependency_graph:",
      e.message,
    );
  }
}

main();
