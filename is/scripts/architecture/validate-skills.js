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

const JSON_MODE = process.argv.includes("--json");
const STALE_DAYS = 90;

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
    const warnings = [];
    let count = 0;
    let staleCount = 0;
    let orphanCount = 0;

    const now = Date.now();

    for (const dir of SKILL_DIRS) {
        const files = walkMarkdownFiles(dir);
        for (const file of files) {
            count++;
            const rel = path.relative(ROOT, file);
            const text = fs.readFileSync(file, "utf8");
            const stat = fs.statSync(file);

            const hasTitle = /^title:\s*['"]?([^'"]+)['"]?/m.test(text) || /^#\s+(.+)$/m.test(text);
            if (!hasTitle) {
                errors.push(`${rel}: missing H1 heading or 'title:' frontmatter`);
            }

            const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageDays > STALE_DAYS) {
                staleCount++;
                warnings.push(`${rel}: stale (${Math.round(ageDays)} days since last modification)`);
            }

            if (text.trim().length < 50) {
                orphanCount++;
                warnings.push(`${rel}: possibly orphaned (content < 50 chars)`);
            }
        }
    }

    const score = count === 0 ? 100 : Math.max(0, Math.round(100 - (errors.length * 20) - (warnings.length * 2)));

    if (JSON_MODE) {
        const result = {
            total_skills: count,
            errors: errors.length,
            warnings: warnings.length,
            score,
            stale_count: staleCount,
            orphan_count: orphanCount,
            review_soon_count: 0,
            mode: "full"
        };
        process.stdout.write(JSON.stringify(result));
        process.exit(errors.length > 0 ? 1 : 0);
    }

    if (errors.length) {
        console.error(`[skills-check] FAILED: ${errors.length} error(s), ${warnings.length} warning(s)`);
        for (const e of errors) console.error(` - ${e}`);
        for (const w of warnings) console.warn(` - ${w}`);
        process.exit(1);
    }

    if (warnings.length) {
        for (const w of warnings) console.warn(` - ${w}`);
    }
    console.log(`[skills-check] OK: ${count} skills, score=${score}, warnings=${warnings.length}`);
}

main();
