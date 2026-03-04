/**
 * #JS-25iDr22X
 * @description Creates new skill file from template; npm run skills:create "Title" [--type=...].
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { SKILL_TYPE_TO_PREFIX } from "../../contracts/prefixes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const title = process.argv[2];
let type = "process";

const typeArg = process.argv.find(arg => arg.startsWith("--type="));
if (typeArg) {
    type = typeArg.split("=")[1];
}

if (!title) {
    console.error("Usage: npm run skills:create \"Skill Title\" [--type=...]");
    console.error("  Types: a|ai|ais|is|ssot|protocol|contract|yc|cf|gh|migrate|rollback|deploy|sec|test|ci|db|mcp|n8n|docker|runbook|plan|arch|process|core|app");
    process.exit(1);
}

const kebabTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

let folderPath;
let prefix = "";

const skillPrefix = SKILL_TYPE_TO_PREFIX[type];
if (skillPrefix) {
    folderPath = path.join(ROOT, "is", "skills");
    prefix = skillPrefix;
} else if (type === "core") {
    folderPath = path.join(ROOT, "core", "skills");
} else if (type === "app") {
    folderPath = path.join(ROOT, "app", "skills");
} else {
    console.error("Invalid type. Use a, ai, ais, is, arch, process, core, or app.");
    process.exit(1);
}

const filename = `${prefix}${kebabTitle}.md`;
const fullPath = path.join(folderPath, filename);
const relPath = path.relative(ROOT, fullPath).replace(/\.md$/, "").split(path.sep).join("/");
const skillId = "sk-" + crypto.createHash("sha256").update(relPath).digest("hex").slice(0, 6);

if (fs.existsSync(fullPath)) {
    console.error(`Skill already exists: ${fullPath}`);
    process.exit(1);
}

const template = `---
title: "${title}"
id: ${skillId}
reasoning_confidence: 0.0
reasoning_audited_at: "${new Date().toISOString().split('T')[0]}"
reasoning_checksum: "placeholder"

---

# ${title}

> **Context**: [Describe the context here]
> **Scope**: [Define the scope here]

## Reasoning

- **#for-example** [Provide local context for why this was chosen]

## Core Rules

[Describe the core rules here]

## Contracts

[Describe the specific contracts here]
`;

fs.writeFileSync(fullPath, template, "utf8");

console.log(`Successfully created new skill at: ${path.relative(ROOT, fullPath)}`);
console.log("Don't forget to run 'npm run preflight' after filling it out.");
