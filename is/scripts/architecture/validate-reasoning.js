/**
 * @skill is/skills/process-reasoning-audit
 * @description Gate: validates that all skills have Reasoning and confidence scores per process-reasoning-audit.md
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

const JSON_MODE = process.argv.includes("--json");
const SKIP_GATE = process.argv.includes("--skip-gate");
const STALE_AUDIT_DAYS = 180;
const MIN_CONFIDENCE = 0.5;

const EXEMPT_PATTERNS = [
    /README\.md$/i,
    /^index\.md$/i,
    /causality-registry\.md$/i,
];

function walkMarkdownFiles(dir, result = []) {
    if (!fs.existsSync(dir)) return result;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (entry.name === "references") continue; // skip reference subfolder (not skills)
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

function parseFrontmatter(text) {
    const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const block = match[1];
    const out = {};
    for (const line of block.split(/\r?\n/)) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) {
            const val = m[2].replace(/^["']|["']$/g, "").trim();
            if (val) out[m[1]] = val;
        }
    }
    return out;
}

function hasReasoning(text) {
    return (
        /##\s+Architectural Reasoning\s*\(Why this way\)/i.test(text) ||
        /##\s+Alternatives Considered/i.test(text) ||
        /\*\*Reasoning\*\*:\s*\S/.test(text) ||
        /##\s+Reasoning\b/i.test(text)
    );
}

function calculateReasoningChecksum(text) {
    const hashes = (text.match(/#(?:for|not)-[\w-]+/g) || []).sort();
    return crypto.createHash("md5").update(hashes.join(",")).digest("hex").slice(0, 8);
}

function main() {
    const errors = [];
    const warnings = [];
    let checked = 0;
    let passed = 0;

    const now = Date.now();

    for (const dir of SKILL_DIRS) {
        const files = walkMarkdownFiles(dir);
        for (const file of files) {
            if (isExempt(file)) continue;

            checked++;
            const rel = path.relative(ROOT, file);
            const text = fs.readFileSync(file, "utf8");
            const fm = parseFrontmatter(text);

            if (!hasReasoning(text)) {
                errors.push(`${rel}: missing Reasoning (Architectural Reasoning, Alternatives Considered, or **Reasoning**:)`);
                continue;
            }

            const conf = fm.reasoning_confidence;
            if (conf === undefined || conf === "") {
                errors.push(`${rel}: missing reasoning_confidence in frontmatter`);
                continue;
            }

            const confNum = parseFloat(conf);
            if (Number.isNaN(confNum) || confNum < 0 || confNum > 1) {
                errors.push(`${rel}: reasoning_confidence must be 0-1, got "${conf}"`);
                continue;
            }

            if (confNum < MIN_CONFIDENCE) {
                errors.push(`${rel}: reasoning_confidence ${confNum} below threshold ${MIN_CONFIDENCE}`);
                continue;
            }

            const auditedAt = fm.reasoning_audited_at;
            if (!auditedAt) {
                warnings.push(`${rel}: missing reasoning_audited_at in frontmatter`);
            } else {
                const auditedMs = new Date(auditedAt).getTime();
                if (Number.isNaN(auditedMs)) {
                    warnings.push(`${rel}: invalid reasoning_audited_at format "${auditedAt}"`);
                } else {
                    const ageDays = (now - auditedMs) / (1000 * 60 * 60 * 24);
                    if (ageDays > STALE_AUDIT_DAYS) {
                        warnings.push(`${rel}: reasoning audit stale (${Math.round(ageDays)} days since reasoning_audited_at)`);
                    }
                }
            }

            const expectedChecksum = calculateReasoningChecksum(text);
            const actualChecksum = fm.reasoning_checksum;
            if (!actualChecksum) {
                errors.push(`${rel}: missing reasoning_checksum in frontmatter. Expected: "${expectedChecksum}"`);
            } else if (actualChecksum !== expectedChecksum) {
                errors.push(`${rel}: reasoning_checksum mismatch. The Reasoning section has changed, but the confidence score was not re-audited. Expected: "${expectedChecksum}", Actual: "${actualChecksum}"`);
            }

            passed++;
        }
    }

    if (JSON_MODE) {
        const result = {
            checked,
            passed,
            errors: errors.length,
            warnings: warnings.length,
            mode: SKIP_GATE ? "advisory" : "gate",
        };
        process.stdout.write(JSON.stringify(result));
        process.exit(SKIP_GATE ? 0 : errors.length > 0 ? 1 : 0);
    }

    if (errors.length) {
        console.error(`[reasoning-check] FAILED: ${errors.length} error(s), ${warnings.length} warning(s)`);
        for (const e of errors) console.error(` - ${e}`);
        for (const w of warnings) console.warn(` - ${w}`);
        process.exit(SKIP_GATE ? 0 : 1);
    }

    if (warnings.length) {
        for (const w of warnings) console.warn(` - ${w}`);
    }
    console.log(`[reasoning-check] OK: ${passed}/${checked} skills pass Reasoning gate`);
}

main();
