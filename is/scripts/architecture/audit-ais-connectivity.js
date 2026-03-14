/**
 * @description One-off audit: AIS connectivity graph from related_ais frontmatter.
 * Outputs orphans (no incoming) and body refs not in related_ais.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const AIS_DIR = path.join(ROOT, "docs", "ais");
const ID_RE = /\bid:(ais-[a-z0-9-]+)\b/g;

function parseFrontmatter(text) {
  const m = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  let currentList = null;
  for (const line of m[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && currentList !== null) {
      currentList.push(listItem[1].trim());
      continue;
    }
    currentList = null;
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) {
      if (kv[2] === "" || kv[2] === "[]") {
        out[kv[1]] = [];
        currentList = out[kv[1]];
      } else if (kv[2].startsWith("[") && kv[2].endsWith("]")) {
        out[kv[1]] = kv[2].slice(1, -1).split(",").map((s) => s.trim());
      } else {
        out[kv[1]] = kv[2].trim();
      }
    }
  }
  return out;
}

function extractBodyIdRefs(text) {
  const body = text.replace(/^---\s*\r?\n[\s\S]*?\r?\n---/, "").replace(/```[\s\S]*?```/g, "");
  const refs = new Set();
  for (const m of body.matchAll(ID_RE)) refs.add(m[1]);
  return refs;
}

function main() {
  const files = fs.readdirSync(AIS_DIR).filter((f) => f.endsWith(".md")).map((f) => path.join(AIS_DIR, f));
  const byId = {};
  const incoming = {};
  const bodyRefsGaps = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const text = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(text);
    const id = fm.id || path.basename(file, ".md");
    if (!id.startsWith("ais-")) continue;

    byId[id] = { file: rel, related_ais: fm.related_ais || [] };
    for (const target of byId[id].related_ais) {
      incoming[target] = (incoming[target] || []).concat([id]);
    }

    const bodyRefs = extractBodyIdRefs(text);
    for (const ref of bodyRefs) {
      if (!ref.startsWith("ais-")) continue;
      if (ref === id) continue;
      if (!(byId[id].related_ais || []).includes(ref)) {
        bodyRefsGaps.push({ from: id, to: ref, file: rel });
      }
    }
  }

  const orphans = Object.keys(byId).filter((id) => !incoming[id] || incoming[id].length === 0);
  const templ = orphans.indexOf("ais-1c4d92");
  if (templ >= 0) orphans.splice(templ, 1);

  console.log("=== AIS Connectivity Audit ===\n");
  console.log("Orphans (no incoming related_ais, excl. TEMPLATE):");
  for (const o of orphans.sort()) {
    console.log(`  - ${o} (${byId[o]?.file || "?"})`);
  }
  console.log("\nBody id:ais-xxx refs NOT in related_ais (candidates to add):");
  const seen = new Set();
  for (const g of bodyRefsGaps) {
    const key = `${g.from} -> ${g.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  - ${g.from} -> ${g.to} (in ${g.file})`);
  }
  if (bodyRefsGaps.length === 0 && orphans.length === 0) {
    console.log("  (none)");
  }
}

main();
