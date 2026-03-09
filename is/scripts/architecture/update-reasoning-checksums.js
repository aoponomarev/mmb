/**
 * #JS-FG2LDRBS
 * @description Utility to auto-update reasoning_checksum and reasoning_audited_at in all skills.
 * @skill id:sk-d7bf67
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
    parseFrontmatterBlock,
    buildFrontmatterBlock,
    SKILL_FRONTMATTER_ORDER,
} from "../../contracts/skill-frontmatter-order.js";

import { ROOT } from "../../contracts/path-contracts.js";

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
    if (!match) return false;

    const block = match[1];
    const checksum = calculateReasoningChecksum(text);
    const today = new Date().toISOString().split("T")[0];

    const fm = parseFrontmatterBlock(block);
    const oldChecksum = fm.reasoning_checksum;
    if ((oldChecksum || "") === checksum) return false; // skip write when nothing changed

    fm.reasoning_checksum = checksum;
    fm.reasoning_audited_at = today;
    if (fm.last_change === undefined) fm.last_change = "";

    const newBlock = buildFrontmatterBlock(fm, SKILL_FRONTMATTER_ORDER);
    const newText = text.replace(match[0], `---\n${newBlock}---`);
    fs.writeFileSync(filePath, newText, "utf8");
    const rel = path.relative(ROOT, filePath);
    console.log(`Updated: ${rel} (checksum: ${checksum})\n  Reminder: set last_change to the newly added hash (see id:sk-d7bf67).`);
    return true;
}

function main() {
    let processed = 0;
    let updated = 0;
    for (const dir of SKILL_DIRS) {
        const files = walkMarkdownFiles(dir);
        for (const file of files) {
            if (isExempt(file)) continue;
            processed++;
            if (updateFile(file)) updated++;
        }
    }
    console.log(`\nProcessed ${processed} skills, updated ${updated} with new checksums and audit dates.`);
}

main();
