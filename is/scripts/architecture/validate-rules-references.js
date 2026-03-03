/**
 * Validates that paths referenced in .cursor/rules/*.mdc exist.
 * Prevents broken references when files are moved or renamed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const RULES_DIR = path.join(ROOT, ".cursor", "rules");

const REF_PATTERN = /`([a-zA-Z0-9/_.-]+\.md)`/g;

function extractRefs(content) {
    const refs = [];
    let m;
    while ((m = REF_PATTERN.exec(content)) !== null) {
        refs.push(m[1]);
    }
    return refs;
}

function main() {
    if (!fs.existsSync(RULES_DIR)) {
        console.log("[validate-rules-references] No .cursor/rules, skip.");
        return;
    }
    const errors = [];
    const files = [];
    for (const entry of fs.readdirSync(RULES_DIR, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            for (const f of fs.readdirSync(path.join(RULES_DIR, entry.name))) {
                if (f.endsWith(".mdc")) files.push(path.join(RULES_DIR, entry.name, f));
            }
        } else if (entry.name.endsWith(".mdc")) {
            files.push(path.join(RULES_DIR, entry.name));
        }
    }
    for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        const refs = extractRefs(content);
        for (const ref of refs) {
            const absPath = path.join(ROOT, ref);
            if (!fs.existsSync(absPath)) {
                errors.push(`${path.relative(ROOT, file)}: referenced path "${ref}" does not exist`);
            }
        }
    }
    if (errors.length > 0) {
        console.error("[validate-rules-references] FAILED: broken references");
        for (const e of errors) console.error(` - ${e}`);
        process.exit(1);
    }
    console.log("[validate-rules-references] OK: all rule references resolve");
}

main();
