/**
 * #JS-Mt2rdqJ4
 * @description Validates skill files: prefix, structure, implementation status; --json output, stale check.
 */
import fs from "node:fs";
import path from "node:path";
import {
    isValidSkillPrefix,
    shouldValidateSkillPrefix,
    SKILL_ALLOWED,
} from "../../contracts/prefixes.js";
import { ROOT, resolvePath, EXCLUDE_PATH_PATTERNS } from "../../contracts/path-contracts.js";

const IMPL_STATUS_HEADERS = ["## Implementation Status in Target App", "## Implementation Status"];
const PATH_EXTENSIONS = /\.(js|ts|json|md|yaml|yml)$/;

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
            if (entry.name === "references") continue; // skip reference subfolder (not skills)
            walkMarkdownFiles(path.join(dir, entry.name), result);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            result.push(path.join(dir, entry.name));
        }
    }
    return result;
}

function validateSkillFormat(file, text, rel, errors) {
    const lines = text.split("\n");
    let inFrontmatter = false;
    let frontmatterEndsAt = -1;

    // 1. Check Frontmatter
    if (lines[0] && lines[0].trim() === "---") {
        inFrontmatter = true;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === "---") {
                inFrontmatter = false;
                frontmatterEndsAt = i;
                break;
            }
        }
    }

    // Ignore READMEs completely from this strict structure validation
    if (rel.endsWith("README.md") || rel.endsWith("causality-registry.md")) return;

    if (frontmatterEndsAt === -1) {
        errors.push(`${rel}: Missing or unclosed YAML frontmatter`);
        return; // Can't proceed safely
    }

    // Must have required fields
    const requiredFields = ["title", "reasoning_confidence", "reasoning_audited_at", "reasoning_checksum"];
    const frontmatterText = lines.slice(1, frontmatterEndsAt).join("\n");
    for (const field of requiredFields) {
        if (!new RegExp(`^${field}:`, "m").test(frontmatterText)) {
            errors.push(`${rel}: Missing required frontmatter field '${field}'`);
        }
    }

    // 2. Check H1 and Context
    let firstContentLine = frontmatterEndsAt + 1;
    while (firstContentLine < lines.length && lines[firstContentLine].trim() === "") {
        firstContentLine++;
    }

    if (firstContentLine >= lines.length || !lines[firstContentLine].startsWith("# ")) {
        errors.push(`${rel}: File must start with an H1 heading (# ...) immediately after frontmatter (ignoring empty lines)`);
    }

    let contextLine = firstContentLine + 1;
    while (contextLine < lines.length && lines[contextLine].trim() === "") {
        contextLine++;
    }

    if (contextLine < lines.length && !lines[contextLine].startsWith("> **Context**:")) {
        // Exempt the causality-registry.md from strict context rule as it's a special registry file
        if (!rel.endsWith("causality-registry.md")) {
            errors.push(`${rel}: H1 must be immediately followed by a '> **Context**:' blockquote`);
        }
    }

    // 3. Check H2 Headers
    const ALLOWED_H2_HEADERS = [
        "## Reasoning",
        "## Core Rules",
        "## Contracts",
        "## Risk Mitigation",
        "## Implementation Status in Target App",
        "## Implementation Status",
        "## Migration Strategy",
        "## Examples"
    ];

    let foundH2s = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("## ")) {
            const h2Text = line.trim();
            foundH2s.push(h2Text);
            if (!ALLOWED_H2_HEADERS.includes(h2Text) && !rel.endsWith("causality-registry.md")) {
                 errors.push(`${rel}: Disallowed H2 header found: '${h2Text}'. Allowed H2s are strictly defined.`);
            }
        }
    }

    if (foundH2s.length > 0 && foundH2s.includes("## Reasoning") && foundH2s[0] !== "## Reasoning" && !rel.endsWith("causality-registry.md")) {
        errors.push(`${rel}: '## Reasoning' must be the first H2 section if it exists`);
    }
}

function validateImplementationStatusPaths(file, text, rel, errors, warnings) {
    if (rel.endsWith("README.md") || rel.endsWith("causality-registry.md")) return;
    if (rel.includes("docs/backlog/skills/")) return;

    const lines = text.split("\n");
    let inSection = false;
    const paths = new Set();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (IMPL_STATUS_HEADERS.some((h) => line.trim().startsWith(h))) {
            inSection = true;
            continue;
        }
        if (inSection && line.startsWith("## ")) break;

        if (!inSection) continue;

        const bulletMatch = line.match(/^-\s*`?([a-zA-Z0-9_/.-]+\.(js|ts|json|md|yaml|yml))`?\s/);
        if (bulletMatch) {
            const p = bulletMatch[1].trim();
            if (!EXCLUDE_PATH_PATTERNS.some((re) => re.test(p))) paths.add(p);
        }

        const tableMatch = line.match(/^\|\s*`?([a-zA-Z0-9_/.-]+\.(js|ts|json|md|yaml|yml))`?\s*\|/);
        if (tableMatch) {
            const p = tableMatch[1].trim();
            if (!EXCLUDE_PATH_PATTERNS.some((re) => re.test(p))) paths.add(p);
        }

        const inlineMatch = line.match(/`([a-zA-Z0-9_/.-]+\.(js|ts|json|md|yaml|yml))`/g);
        if (inlineMatch && /Implemented|Simplified|Deferred/i.test(line) && !/\bNo\s+`|not\s+`|without\s+`/i.test(line)) {
            for (const m of inlineMatch) {
                const p = m.replace(/^`|`$/g, "");
                if (!EXCLUDE_PATH_PATTERNS.some((re) => re.test(p))) paths.add(p);
            }
        }
    }

    for (const p of paths) {
        const fullPath = resolvePath(p, {});
        if (!fs.existsSync(fullPath)) {
            const isDocOrSkill = /^(docs\/|is\/skills\/|core\/skills\/|app\/skills\/)/.test(p);
            if (isDocOrSkill) {
                warnings.push(`${rel}: Implementation Status path "${p}" does not exist (doc/skill)`);
            } else {
                errors.push(`${rel}: Implementation Status path "${p}" does not exist`);
            }
        }
    }
}

// 4. Check is/skills/ prefix gate (SSOT: is/contracts/prefixes.js)
function validateSkillPrefixGate(rel, errors) {
    if (!shouldValidateSkillPrefix(rel)) return;
    const base = path.basename(rel);
    if (!isValidSkillPrefix(base)) {
        errors.push(`${rel}: is/skills/ files must use prefix ${SKILL_ALLOWED.join(", ")} (SSOT: is/contracts/prefixes.js)`);
    }
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

            // Detailed format validation
            validateSkillFormat(file, text, rel, errors);
            validateSkillPrefixGate(rel, errors);
            validateImplementationStatusPaths(file, text, rel, errors, warnings);

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
