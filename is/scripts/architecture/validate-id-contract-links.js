/**
 * #JS-ht4FZQe4
 * @description Validates all inline id:<doc-id> links in markdown against global id registry.
 * @skill id:sk-0e193a
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";
import { resolveId } from "../../contracts/docs/resolve-id.js";

const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);
const ID_LINK_RE = /\bid:([a-z0-9][a-z0-9-]*)\b/g;

function walkMarkdown(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkMarkdown(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(full);
    }
  }
  return result;
}

/** Extract positions of id:xxx that are NOT inside backticks or fenced code blocks. */
function findValidIdMentions(text) {
  const mentions = [];
  const lines = text.split(/\r?\n/);
  let inFenced = false;
  let fenceChar = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fencedMatch = line.match(/^(`{3,}|~{3,})(\w*)/);
    if (fencedMatch) {
      if (!inFenced) {
        inFenced = true;
        fenceChar = fencedMatch[1];
      } else if (line.startsWith(fenceChar)) {
        inFenced = false;
        fenceChar = null;
      }
      continue;
    }
    if (inFenced) continue;

    let pos = 0;
    while (pos < line.length) {
      const idx = line.indexOf("id:", pos);
      if (idx === -1) break;
      const before = line.slice(Math.max(0, idx - 1), idx);
      const backtickBefore = before.endsWith("`");
      const match = line.slice(idx).match(/^id:([a-z0-9][a-z0-9-]*)\b/);
      if (match) {
        const after = line.slice(idx + match[0].length, idx + match[0].length + 1);
        const backtickAfter = after === "`";
        if (!backtickBefore && !backtickAfter) {
          mentions.push({ id: match[1], fileLine: i + 1 });
        }
        pos = idx + match[0].length;
      } else {
        pos = idx + 1;
      }
    }
  }
  return mentions;
}

function main() {
  const errors = [];

  for (const file of walkMarkdown(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const text = fs.readFileSync(file, "utf8");
    const mentions = findValidIdMentions(text);
    for (const { id } of mentions) {
      const resolved = resolveId(`id:${id}`);
      if (!resolved) {
        errors.push(`${rel}: unknown id contract "id:${id}"`);
      }
    }
  }

  if (errors.length) {
    console.error("[validate-id-contract-links] FAILED");
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }

  console.log("[validate-id-contract-links] OK: all id:<...> markdown references resolve");
}

main();
