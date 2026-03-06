/**
 * #JS-NrBeANnz
 * @description Preflight health-check. Runs synchronously before app start or CI.
 * @skill id:sk-483943
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PATHS } from '../contracts/paths/paths.js';
import { validateEnv } from '../contracts/env/env-rules.js';

function parseDotEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const map = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        map[k] = v;
    }
    return map;
}

function runPreflight() {
    console.log('[preflight] Starting infrastructure health-check...');

    // 1. Check Root Paths from Contract
    console.log('[preflight] Validating path tree...');
    const criticalDirs = [PATHS.is, PATHS.core, PATHS.app, PATHS.logs];
    for (const dir of criticalDirs) {
        if (!fs.existsSync(dir)) {
            console.warn(`[preflight] WARNING: Expected directory does not exist: ${dir}`);
        }
    }

    // 2. Validate Environment Contracts
    console.log('[preflight] Validating .env contracts...');
    const envPath = path.join(PATHS.root, '.env');
    if (!fs.existsSync(envPath)) {
        console.error(`[preflight] ERROR: Missing .env file at ${envPath}`);
        console.error(`[preflight] -> Action: Copy .env.example to .env and fill in values.`);
        process.exit(1);
    }

    const localEnv = parseDotEnv(envPath);
    try {
        // We merge process.env and local .env so that CI can override values if needed
        validateEnv({ ...process.env, ...localEnv });
    } catch (e) {
        console.error(`[preflight] ERROR: Environment validation failed.`);
        console.error(e.message);
        process.exit(1);
    }

    // 3. Validate Skills (Format, Reasoning Gate, Index Generation)
    console.log('[preflight] Validating skills...');
    try {
        execSync('node is/scripts/architecture/validate-skills.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-global-md-ids.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-id-contract-links.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-skill-anchors.js', { stdio: 'inherit', cwd: PATHS.root });
        if (!process.env.PREFLIGHT_SKIP_REASONING) {
            execSync('node is/scripts/architecture/validate-reasoning.js', { stdio: 'inherit', cwd: PATHS.root });
        } else {
            console.log('[preflight] Skipping Reasoning gate (PREFLIGHT_SKIP_REASONING=1)');
        }
        if (!process.env.PREFLIGHT_SKIP_CAUSALITY) {
            execSync('node is/scripts/architecture/validate-causality.js', { stdio: 'inherit', cwd: PATHS.root });
            execSync('node is/scripts/architecture/validate-causality-invariant.js', { stdio: 'inherit', cwd: PATHS.root });
        } else {
            console.log('[preflight] Skipping Causality gate (PREFLIGHT_SKIP_CAUSALITY=1)');
        }
        execSync('node is/scripts/architecture/generate-skills-index.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/generate-index-ais.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/generate-id-registry.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-docs-encoding.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-docs-ids.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-deletion-log.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/audit-path-centric-doc-links.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/audit-path-centric-skill-links.js', { stdio: 'inherit', cwd: PATHS.root });
        execSync('node is/scripts/architecture/validate-rules-references.js', { stdio: 'inherit', cwd: PATHS.root });
    } catch (e) {
        console.error(`[preflight] ERROR: Skills validation, Reasoning gate, index generation, docs-ids, or rules-references validation failed.`);
        process.exit(1);
    }

    // 4. Code comments English gate (SSOT: id:sk-883639 process-language-policy)
    console.log('[preflight] Validating code comments (English only)...');
    try {
        execSync('node is/scripts/architecture/validate-code-comments-english.js', { stdio: 'inherit', cwd: PATHS.root });
    } catch (e) {
        console.error(`[preflight] ERROR: Code comments must be English only (no Cyrillic). Run npm run lang:comments:check for details.`);
        process.exit(1);
    }

    // 5. File header gate (SSOT: id:sk-f7e2a1 process-file-header-standard)
    console.log('[preflight] Validating file headers (file id + @description)...');
    try {
        execSync('node is/scripts/architecture/validate-file-headers.js', { stdio: 'inherit', cwd: PATHS.root });
    } catch (e) {
        console.error(`[preflight] ERROR: Files with file id in header must have @description. Run npm run file-headers:check for details.`);
        process.exit(1);
    }

    // 6. Frontend RRG gate (Reactive Reliability Gate; id:ais-c4e9b2)
    console.log('[preflight] Validating frontend RRG (no window mutation / no innerHTML in components)...');
    try {
        execSync('npm run frontend:reactivity:check', { stdio: 'inherit', cwd: PATHS.root });
    } catch (e) {
        console.error('[preflight] ERROR: RRG gate failed. Run npm run frontend:reactivity:check for details.');
        process.exit(1);
    }

    // 7. Validate Cache Integrity
    console.log('[preflight] Validating cache integrity...');
    try {
        execSync('node is/scripts/infrastructure/validate-cache-integrity-delta.js', { stdio: 'inherit', cwd: PATHS.root });
    } catch (e) {
        console.error(`[preflight] ERROR: Cache integrity check failed.`);
        process.exit(1);
    }

    console.log('[preflight] ALL SYSTEMS GO. Architecture contracts validated.\n');
}

runPreflight();