/**
 * #JS-6U3KWB2e
 * @description Generates id→path registry for skills, AIS, and markdown docs.
 * @skill id:sk-0e193a
 * Used by MCP (ais://, skill resolution) and tooling for fast id lookup.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const SKILL_DIRS = [
    path.join(ROOT, "is", "skills"),
    path.join(ROOT, "core", "skills"),
    path.join(ROOT, "app", "skills"),
];
const AIS_DIR = path.join(ROOT, "docs", "ais");
const REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);

function parseFrontmatter(text) {
    const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const block = match[1];
    const out = {};
    for (const line of block.split(/\r?\n/)) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) {
            const val = m[2].trim().replace(/^["']|["']$/g, "");
            if (val) out[m[1]] = val;
        }
    }
    return out;
}

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

function buildRegistry() {
    const registry = { skills: {}, ais: {}, markdown: {} };

    for (const dir of SKILL_DIRS) {
        for (const file of walkMarkdown(dir)) {
            const content = fs.readFileSync(file, "utf8");
            const fm = parseFrontmatter(content);
            const id = fm.id;
            if (id) {
                const rel = path.relative(ROOT, file).split(path.sep).join("/");
                registry.skills[id] = rel;
                registry.markdown[id] = rel;
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
                registry.ais[id] = rel;
                registry.markdown[id] = rel;
            }
        }
    }

    // Global markdown contract: any project markdown with id frontmatter.
    for (const file of walkMarkdown(ROOT)) {
        const content = fs.readFileSync(file, "utf8");
        const fm = parseFrontmatter(content);
        const id = fm.id;
        if (!id) continue;
        const rel = path.relative(ROOT, file).split(path.sep).join("/");
        registry.markdown[id] = rel;
    }
    return registry;
}

function main() {
    const registry = buildRegistry();
    const dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
    const totalSkills = Object.keys(registry.skills).length;
    const totalAis = Object.keys(registry.ais).length;
    const totalMd = Object.keys(registry.markdown).length;
    console.log(
        `[generate-id-registry] OK: skills=${totalSkills}, ais=${totalAis}, markdown=${totalMd} written to ${path.relative(ROOT, REGISTRY_PATH)}`
    );

    const manifestPath = path.join(ROOT, "docs", "docs-id-manifest.json");
    const manifest = {
        ids: registry.markdown,
        index_files: ["docs/index-skills.md", "docs/index-ais.md"],
        generated_at: new Date().toISOString(),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`[generate-id-registry] docs-id-manifest.json written to ${path.relative(ROOT, manifestPath)}`);
}

main();
