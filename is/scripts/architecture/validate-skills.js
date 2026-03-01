import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_DIRS = [
    path.join(ROOT, "is", "skills"),
    path.join(ROOT, "core", "skills"),
    path.join(ROOT, "app", "skills")
];

function walkMarkdownFiles(dir, result = []) {
    if (!fs.existsSync(dir)) return result;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            walkMarkdownFiles(path.join(dir, entry.name), result);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            result.push(path.join(dir, entry.name));
        }
    }
    return result;
}

function main() {
    const errors = [];
    let count = 0;

    for (const dir of SKILL_DIRS) {
        const files = walkMarkdownFiles(dir);
        for (const file of files) {
            count++;
            const rel = path.relative(ROOT, file);
            const text = fs.readFileSync(file, "utf8");
            
            // Check for title or H1
            const hasTitle = /^title:\s*['"]?([^'"]+)['"]?/m.test(text) || /^#\s+(.+)$/m.test(text);
            if (!hasTitle) {
                errors.push(`[skills-format] ${rel}: missing H1 heading or 'title:' frontmatter`);
            }
        }
    }

    if (errors.length) {
        console.error(`[skills-check] FAILED: ${errors.length} issue(s)`);
        for (const e of errors) console.error(` - ${e}`);
        process.exit(1);
    }

    console.log(`[skills-check] OK: ${count} skills valid`);
}

main();
