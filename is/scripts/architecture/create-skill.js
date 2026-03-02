import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    console.error("Usage: npm run skill:create \"Skill Title\" [--type=arch|process|core|app]");
    process.exit(1);
}

const kebabTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

let folderPath;
let prefix = "";

switch (type) {
    case "arch":
        folderPath = path.join(ROOT, "is", "skills");
        prefix = "arch-";
        break;
    case "process":
        folderPath = path.join(ROOT, "is", "skills");
        prefix = "process-";
        break;
    case "core":
        folderPath = path.join(ROOT, "core", "skills");
        break;
    case "app":
        folderPath = path.join(ROOT, "app", "skills");
        break;
    default:
        console.error("Invalid type. Use arch, process, core, or app.");
        process.exit(1);
}

const filename = `${prefix}${kebabTitle}.md`;
const fullPath = path.join(folderPath, filename);

if (fs.existsSync(fullPath)) {
    console.error(`Skill already exists: ${fullPath}`);
    process.exit(1);
}

const template = `---
title: "${title}"
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
