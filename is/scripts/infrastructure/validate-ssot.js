/**
 * #JS-gs3VQRd3
 * @description SSOT policy validator: env in .env.example, no skill-graph in docs, no hardcoded secrets in config.
 * @skill id:sk-483943
 * @skill id:sk-918276
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

let hasErrors = false;

function reportError(msg) {
    console.error(`[ssot-check] FAILED: ${msg}`);
    hasErrors = true;
}

/**
 * Check that every env var referenced in paths.js is declared in .env.example
 */
function checkPathsEnvSync() {
    const pathsFile = path.join(ROOT, 'is', 'contracts', 'paths', 'paths.js');
    const envExample = path.join(ROOT, '.env.example');

    if (!fs.existsSync(pathsFile) || !fs.existsSync(envExample)) return;

    const pathsContent = fs.readFileSync(pathsFile, 'utf8');
    const exampleContent = fs.readFileSync(envExample, 'utf8');

    // Match process.env.KEY_NAME patterns
    const regex = /process\.env\.([A-Z0-9_]+)/g;
    let match;
    const usedEnvs = new Set();
    while ((match = regex.exec(pathsContent)) !== null) usedEnvs.add(match[1]);

    for (const envVar of usedEnvs) {
        const varPattern = new RegExp(`^#?\\s*${envVar}=`, 'm');
        if (!varPattern.test(exampleContent)) {
            reportError(`paths.js uses 'process.env.${envVar}', but it is missing in .env.example`);
        }
    }
}

/**
 * Check that docs/*.md files don't contain skill-specific YAML frontmatter
 * (relations, decision_id) — docs are for humans, skills are for agents.
 */
function checkDocsAreNotSkills() {
    const docsDir = path.join(ROOT, 'docs');
    if (!fs.existsSync(docsDir)) return;

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
        if (content.startsWith('---')) {
            const endIdx = content.indexOf('\n---', 3);
            if (endIdx !== -1) {
                const frontmatter = content.slice(0, endIdx);
                if (/^relations:/m.test(frontmatter) || /^decision_id:/m.test(frontmatter)) {
                    reportError(`docs/${file} contains skill metadata (relations/decision_id). Move to is/skills/ instead.`);
                }
            }
        }
    }
}

/**
 * Check for hardcoded secret patterns in config files
 */
function checkConfigsForHardcodedSecrets() {
    const configFiles = [
        path.join(ROOT, '.cursor', 'mcp.json'),
    ];

    for (const configPath of configFiles) {
        if (!fs.existsSync(configPath)) continue;
        const content = fs.readFileSync(configPath, 'utf8');
        if (/['"]sk-[a-zA-Z0-9]{20,}['"]/.test(content)) {
            reportError(`${configPath} contains hardcoded 'sk-...' token. Use environment variables instead.`);
        }
        if (/['"]t1\.[A-Z0-9a-z_-]+['"]/.test(content) || /['"]y0_[a-zA-Z0-9]+['"]/.test(content)) {
            reportError(`${configPath} contains hardcoded Yandex IAM/OAuth token.`);
        }
    }
}

/**
 * Verify that skill files in is/skills/ have required H1 headings
 * (lightweight check — full validation via npm run skills:check)
 */
function checkSkillsHaveHeadings() {
    const skillsDirs = [
        path.join(ROOT, 'is', 'skills'),
        path.join(ROOT, 'core', 'skills'),
        path.join(ROOT, 'app', 'skills'),
    ];

    for (const dir of skillsDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
        for (const file of files) {
            const content = fs.readFileSync(path.join(dir, file), 'utf8');
            const hasH1 = /^#\s+\S/m.test(content) || /^title:/m.test(content);
            if (!hasH1) {
                reportError(`Skill file '${path.relative(ROOT, path.join(dir, file))}' missing H1 heading or title frontmatter.`);
            }
        }
    }
}

function main() {
    console.log('[ssot-check] Validating SSOT contracts...');
    checkPathsEnvSync();
    checkDocsAreNotSkills();
    checkConfigsForHardcodedSecrets();
    checkSkillsHaveHeadings();

    if (hasErrors) process.exit(1);
    console.log('[ssot-check] OK: All SSOT contracts passed.');
}

main();
