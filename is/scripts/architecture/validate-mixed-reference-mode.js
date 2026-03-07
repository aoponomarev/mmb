/**
 * #JS-ww2hRLt7
 * @description Validates mixed reference mode for doc ids and code hashes across docs, rules, and code comments.
 * @skill id:sk-0e193a
 * @skill id:sk-f7e2a1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const ID_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
const CODE_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "code-file-registry.json");
const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);
const TARGET_EXTS = new Set([".md", ".mdc", ".js", ".ts"]);

const DOC_PAIR_RE = /\b(id:[a-z0-9][a-z0-9-]*)\s*\(([^)\n]+?\.md(?:#[^)]+)?)\)/g;
const CODE_PAIR_RE = /(#(?:JS|TS|CSS|JSON)-[A-Za-z0-9]+)\s*\(([^)\n]+?\.(?:js|ts|css|jsonc?|md)(?:#[^)]+)?)\)/g;

function normalize(p) {
  return p.replace(/\\/g, "/");
}

function stripAnchor(p) {
  return p.split("#")[0];
}

function getAnchorSuffix(p) {
  const idx = p.indexOf("#");
  return idx === -1 ? "" : p.slice(idx);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(full, out);
      continue;
    }
    if (entry.isFile() && TARGET_EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function loadRegistries() {
  const rawIds = JSON.parse(fs.readFileSync(ID_REGISTRY_PATH, "utf8"));
  const markdown = rawIds.markdown && typeof rawIds.markdown === "object" ? rawIds.markdown : {};
  const docMap = new Map();
  for (const [id, rel] of Object.entries(markdown)) docMap.set(`id:${id}`, normalize(rel));

  const rawCode = JSON.parse(fs.readFileSync(CODE_REGISTRY_PATH, "utf8"));
  const codeMap = new Map();
  const basenameCounts = new Map();
  for (const [hash, rel] of Object.entries(rawCode)) {
    const normalized = normalize(rel);
    codeMap.set(hash, normalized);
    const basename = path.basename(normalized);
    basenameCounts.set(basename, (basenameCounts.get(basename) || 0) + 1);
  }
  return { docMap, codeMap, basenameCounts };
}

function expectedCodeDisplay(relPath, basenameCounts) {
  const basename = path.basename(relPath);
  return (basenameCounts.get(basename) || 0) > 1 ? relPath : basename;
}

function main() {
  if (!fs.existsSync(ID_REGISTRY_PATH) || !fs.existsSync(CODE_REGISTRY_PATH)) {
    console.error("[validate-mixed-reference-mode] FAILED: missing id/code registry");
    process.exit(1);
  }

  const { docMap, codeMap, basenameCounts } = loadRegistries();
  const errors = [];

  for (const file of walk(ROOT)) {
    const relFile = normalize(path.relative(ROOT, file));
    const content = fs.readFileSync(file, "utf8");

    const seenDocPairs = new Set();
    const seenCodePairs = new Set();

    DOC_PAIR_RE.lastIndex = 0;
    let match;
    while ((match = DOC_PAIR_RE.exec(content)) !== null) {
      const idToken = match[1];
      const rawPath = match[2];
      const canonical = docMap.get(idToken);
      if (!canonical) continue;

      const expected = `${canonical}${getAnchorSuffix(rawPath)}`;
      if (normalize(rawPath) !== expected) {
        errors.push(`${relFile}: ${idToken} should use (${expected}), found (${rawPath})`);
      }
      if (seenDocPairs.has(idToken)) {
        errors.push(`${relFile}: repeated ${idToken} should collapse to bare id after the first contextual mention`);
      }
      seenDocPairs.add(idToken);
    }

    CODE_PAIR_RE.lastIndex = 0;
    while ((match = CODE_PAIR_RE.exec(content)) !== null) {
      const hash = match[1];
      const rawPath = match[2];
      const canonical = codeMap.get(hash);
      if (!canonical) continue;

      const expectedBase = expectedCodeDisplay(canonical, basenameCounts);
      const expected = `${expectedBase}${getAnchorSuffix(rawPath)}`;
      if (normalize(rawPath) !== expected) {
        errors.push(`${relFile}: ${hash} should use (${expected}), found (${rawPath})`);
      }
      if (seenCodePairs.has(hash)) {
        errors.push(`${relFile}: repeated ${hash} should collapse to bare hash after the first contextual mention`);
      }
      seenCodePairs.add(hash);
    }
  }

  if (errors.length > 0) {
    console.error("[validate-mixed-reference-mode] FAILED");
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log("[validate-mixed-reference-mode] OK: mixed reference mode is consistent.");
}

main();
