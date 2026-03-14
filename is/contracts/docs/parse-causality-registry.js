/**
 * @description Parses causality-registry.md (id:sk-3b1519) into structured { hash → { enforcement, formulation } }.
 * @skill id:sk-8991cd
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../path-contracts.js";

const REGISTRY_PATH = path.join(ROOT, "is", "skills", "causality-registry.md");
const ROW_RE = /\|\s*`(#(?:for|not)-[\w-]+)`\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|/;

/**
 * @returns {Map<string, { enforcement: string, formulation: string }>}
 */
export function parseCausalityRegistry() {
  const map = new Map();
  if (!fs.existsSync(REGISTRY_PATH)) return map;
  const lines = fs.readFileSync(REGISTRY_PATH, "utf8").split("\n");
  for (const line of lines) {
    const m = ROW_RE.exec(line);
    if (m) {
      map.set(m[1], { enforcement: m[2], formulation: m[3].trim() });
    }
  }
  return map;
}
