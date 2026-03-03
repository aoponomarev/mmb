/**
 * @skill process-docs-lifecycle
 * @description Gate: validates that all ids in related_skills and related_ais exist.
 * Prevents broken links when files are renamed or deleted.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_DIRS = [
    path.join(ROOT, "is", "skills"),
    path.join(ROOT, "core", "skills"),
    path.join(ROOT, "app", "skills"),
];
const AIS_DIR = path.join(ROOT, "docs", "ais");

function parseFrontmatter(text) {
    const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const block = match[1];
    const out = {};
    let currentKey = null;
    let currentList = null;

    for (const line of block.split(/\r?\n/)) {
        const listItem = line.match(/^\s*-\s+(.+)$/);
        if (listItem && currentList !== null) {
            currentList.push(listItem[1].trim().replace(/^["']|["']$/g, ""));
            continue;
        }
        currentList = null;
        const kv = line.match(/^([\w-]+):\s*(.*)$/);
        if (kv) {
            currentKey = kv[1];
            const val = kv[2].trim();
            if (val === "" || val === "[]") {
                out[currentKey] = [];
                currentList = out[currentKey];
            } else if (val.startsWith("[") && val.endsWith("]")) {
                out[currentKey] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
                currentList = null;
            } else {
                out[currentKey] = val.replace(/^["']|["']$/g, "");
                currentList = null;
            }
        }
    }
    return out;
}

function walkMarkdown(dir, result = []) {
    if (!fs.existsSync(dir)) return result;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkMarkdown(full, result);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            result.push(full);
        }
    }
    return result;
}

function buildIdRegistry() {
    const registry = {};
    for (const dir of SKILL_DIRS) {
        for (const file of walkMarkdown(dir)) {
            const content = fs.readFileSync(file, "utf8");
            const fm = parseFrontmatter(content);
            const id = fm.id;
            if (id) {
                const rel = path.relative(ROOT, file).split(path.sep).join("/");
                registry[id] = rel;
            }
        }
    }
    if (fs.existsSync(AIS_DIR)) {
        for (const file of walkMarkdown(AIS_DIR)) {
            const content = fs.readFileSync(file, "utf8");
            const fm = parseFrontmatter(content);
            const id = fm.id;
            if (id) {
                const rel = path.relative(ROOT, file).split(path.sep).join("/");
                registry[id] = rel;
            }
        }
    }
    return registry;
}

function main() {
    const registry = buildIdRegistry();
    const errors = [];

    function checkRefs(sourcePath, refs, prefix) {
        if (!Array.isArray(refs)) return;
        for (const id of refs) {
            if (!id || typeof id !== "string") continue;
            const trimmed = id.trim();
            if (!trimmed) continue;
            if (!registry[trimmed]) {
                errors.push(`${sourcePath}: ${prefix} references unknown id "${trimmed}"`);
            }
        }
    }

    for (const dir of SKILL_DIRS) {
        for (const file of walkMarkdown(dir)) {
            const rel = path.relative(ROOT, file).split(path.sep).join("/");
            const content = fs.readFileSync(file, "utf8");
            const fm = parseFrontmatter(content);
            checkRefs(rel, fm.related_skills, "related_skills");
            checkRefs(rel, fm.related_ais, "related_ais");
        }
    }
    if (fs.existsSync(AIS_DIR)) {
        for (const file of walkMarkdown(AIS_DIR)) {
            const rel = path.relative(ROOT, file).split(path.sep).join("/");
            const content = fs.readFileSync(file, "utf8");
            const fm = parseFrontmatter(content);
            checkRefs(rel, fm.related_skills, "related_skills");
            checkRefs(rel, fm.related_ais, "related_ais");
        }
    }

    if (errors.length > 0) {
        console.error("[validate-docs-ids] FAILED: broken id references");
        for (const e of errors) console.error(` - ${e}`);
        process.exit(1);
    }
    console.log("[validate-docs-ids] OK: all related_skills and related_ais ids resolve");
}

main();
