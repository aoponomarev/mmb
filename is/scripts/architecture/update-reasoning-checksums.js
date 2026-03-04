/**
 * #JS-FG2LDRBS
 * @description Utility to auto-update reasoning_checksum and reasoning_audited_at in all skills.
 * @skill id:sk-d7bf67
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SKILL_DIRS = [
    path.join(ROOT, "is", "skills"),
    path.join(ROOT, "core", "skills"),
    path.join(ROOT, "app", "skills"),
];

const EXEMPT_PATTERNS = [
    /README\.md$/i,
    /^index\.md$/i,
    /causality-registry\.md$/i,
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

function isExempt(filePath) {
    const base = path.basename(filePath);
    return EXEMPT_PATTERNS.some((re) => re.test(base));
}

function calculateReasoningChecksum(text) {
    const hashes = (text.match(/#(?:for|not)-[\w-]+/g) || []).sort();
    return crypto.createHash("md5").update(hashes.join(",")).digest("hex").slice(0, 8);
}

function updateFile(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return;

    const block = match[1];
    const checksum = calculateReasoningChecksum(text);
    const today = new Date().toISOString().split("T")[0];

    let newBlock = block;
    
    // Update or add reasoning_audited_at
    if (/^reasoning_audited_at:/m.test(newBlock)) {
        newBlock = newBlock.replace(/^reasoning_audited_at:.*$/m, `reasoning_audited_at: "${today}"`);
    } else {
        newBlock += `\nreasoning_audited_at: "${today}"`;
    }

    // Update or add reasoning_checksum
    if (/^reasoning_checksum:/m.test(newBlock)) {
        newBlock = newBlock.replace(/^reasoning_checksum:.*$/m, `reasoning_checksum: "${checksum}"`);
    } else {
        newBlock += `\nreasoning_checksum: "${checksum}"`;
    }

    const newText = text.replace(match[0], `---\n${newBlock}\n---`);
    fs.writeFileSync(filePath, newText, "utf8");
    console.log(`Updated: ${path.relative(ROOT, filePath)} (checksum: ${checksum})`);
}

function main() {
    let count = 0;
    for (const dir of SKILL_DIRS) {
        const files = walkMarkdownFiles(dir);
        for (const file of files) {
            if (isExempt(file)) continue;
            updateFile(file);
            count++;
        }
    }
    console.log(`\nSuccessfully updated ${count} skills with new checksums and audit dates.`);
}

main();
