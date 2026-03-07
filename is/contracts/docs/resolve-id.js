/**
 * #JS-op2rXujz
 * @description SSOT resolver for id: and #hash tokens. Accepts id:xxx (doc) or #JS-xxx/#TS-xxx/#CSS-xxx/#JSON-xxx (code); returns { path, exists }.
 * @skill id:sk-0e193a
 * @skill id:sk-f7e2a1
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../path-contracts.js";

const ID_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
const CODE_REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "code-file-registry.json");

let _docMap = null;
let _codeMap = null;

function loadDocRegistry() {
  if (_docMap) return _docMap;
  if (!fs.existsSync(ID_REGISTRY_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(ID_REGISTRY_PATH, "utf8"));
  const markdown = raw.markdown && typeof raw.markdown === "object" ? raw.markdown : {};
  _docMap = new Map(Object.entries(markdown));
  return _docMap;
}

function loadCodeRegistry() {
  if (_codeMap) return _codeMap;
  if (!fs.existsSync(CODE_REGISTRY_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(CODE_REGISTRY_PATH, "utf8"));
  _codeMap = new Map(Object.entries(raw));
  return _codeMap;
}

/**
 * Resolve id:xxx or #JS-xxx (etc.) to repo-relative path.
 * @param {string} token - id:sk-xxx, id:ais-xxx, #JS-xxx, #TS-xxx, #CSS-xxx, #JSON-xxx
 * @returns {{ path: string, exists: boolean } | null} - path is repo-relative; null if unresolved
 */
export function resolveId(token) {
  const t = String(token).trim();
  if (!t) return null;

  if (/^id:[a-z0-9][a-z0-9-]*$/i.test(t)) {
    const id = t.replace(/^id:/i, "");
    const docMap = loadDocRegistry();
    const rel = docMap.get(id);
    if (!rel) return null;
    const abs = path.join(ROOT, rel.replace(/\//g, path.sep));
    return { path: rel, exists: fs.existsSync(abs) };
  }

  if (/^#(?:JS|TS|CSS|JSON)-[A-Za-z0-9]+$/.test(t)) {
    const codeMap = loadCodeRegistry();
    const rel = codeMap.get(t);
    if (!rel) return null;
    const abs = path.join(ROOT, rel.replace(/\//g, path.sep));
    return { path: rel, exists: fs.existsSync(abs) };
  }

  return null;
}

/**
 * Get full doc registry (id -> path). For validators that need all entries.
 */
export function getDocMap() {
  const m = loadDocRegistry();
  const out = new Map();
  for (const [id, rel] of m) out.set(`id:${id}`, rel.replace(/\\/g, "/"));
  return out;
}

/**
 * Get full code registry (hash -> path) and basename counts for mixed-mode validation.
 */
export function getCodeMapWithBasenameCounts() {
  const m = loadCodeRegistry();
  const codeMap = new Map();
  const basenameCounts = new Map();
  for (const [hash, rel] of m) {
    const norm = rel.replace(/\\/g, "/");
    codeMap.set(hash, norm);
    const bn = path.basename(norm);
    basenameCounts.set(bn, (basenameCounts.get(bn) || 0) + 1);
  }
  return { codeMap, basenameCounts };
}

/**
 * Reset cached registries (for tests or after regeneration).
 */
export function resetCache() {
  _docMap = null;
  _codeMap = null;
}
