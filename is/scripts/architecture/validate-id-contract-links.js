/**
 * #JS-ht4FZQe4
 * @description Validates all inline id:<doc-id> links in markdown against global id registry.
 * @skill id:sk-0e193a
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
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

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`[validate-id-contract-links] Missing registry: ${path.relative(ROOT, REGISTRY_PATH)}`);
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const registry = parsed.markdown && typeof parsed.markdown === "object" ? parsed.markdown : {};
  const errors = [];

  for (const file of walkMarkdown(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(ID_LINK_RE)) {
      const id = match[1];
      if (!registry[id]) {
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
