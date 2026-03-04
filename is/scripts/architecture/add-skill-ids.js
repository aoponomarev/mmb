/**
 * #JS-6f2t1U2q
 * @description One-time migration: add id (short hash) to each skill's frontmatter. Id deterministic from path.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_DIRS = ["is/skills", "core/skills", "app/skills"];

function hash(s) {
    return crypto.createHash("sha256").update(s).digest("hex").slice(0, 6);
}

function ensureIdInFrontmatter(filePath, relPath) {
    const content = fs.readFileSync(filePath, "utf8");
    const id = "sk-" + hash(relPath);

    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch && /^id:\s+/m.test(fmMatch[1])) {
        return false;
    }

    if (!fmMatch) {
        const newContent = `---
id: ${id}

---

${content}`;
        fs.writeFileSync(filePath, newContent, "utf8");
        return true;
    }

    const fm = fmMatch[1];
    const newFm = fm.trimEnd() + `\nid: ${id}\n\n`;
    const newContent = content.replace(/^---\s*\n[\s\S]*?\n---/, `---\n${newFm}---`);
    fs.writeFileSync(filePath, newContent, "utf8");
    return true;
}

function main() {
    let updated = 0;
    for (const d of SKILL_DIRS) {
        const full = path.join(ROOT, d);
        if (!fs.existsSync(full)) continue;
        const files = fs.readdirSync(full).filter((f) => f.endsWith(".md"));
        for (const f of files) {
            const relPath = `${d}/${f.replace(".md", "")}`;
            const absPath = path.join(ROOT, d, f);
            if (ensureIdInFrontmatter(absPath, relPath)) {
                updated++;
                console.log(`[add-skill-ids] Added id to ${relPath}`);
            }
        }
    }
    console.log(`[add-skill-ids] Done. Updated ${updated} files.`);
}

main();
