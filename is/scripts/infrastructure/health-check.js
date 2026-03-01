#!/usr/bin/env node
/**
 * Target App Health Check - Control Plane
 *
 * Checks all active service planes for the Target Architecture:
 *  - Knowledge plane: skills directories and key files
 *  - Contract plane: .env contracts (SSOT)
 *  - Runtime plane: Preflight execution and core files
 *
 * Skill: is/skills/arch-foundation.md
 * Causality: Control Plane initialization from Donor migration
 *
 * Usage:
 *   node is/scripts/infrastructure/health-check.js
 *   node is/scripts/infrastructure/health-check.js --json
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..', '..');

const JSON_OUTPUT = process.argv.includes('--json');

const results = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    planes: {}
};

function pass(plane, name, detail = '') {
    results.planes[plane] ??= { status: 'healthy', checks: [] };
    results.planes[plane].checks.push({ name, status: 'ok', detail });
}

function fail(plane, name, detail = '', critical = false) {
    results.planes[plane] ??= { status: 'healthy', checks: [] };
    results.planes[plane].checks.push({ name, status: critical ? 'fail' : 'warn', detail });
    if (critical) {
        results.planes[plane].status = 'unhealthy';
        results.overall = 'unhealthy';
    } else {
        if (results.planes[plane].status === 'healthy') {
            results.planes[plane].status = 'degraded';
        }
    }
}

// --- Knowledge plane: Skills ---
function checkKnowledge() {
    const archSkill = join(REPO_ROOT, 'is', 'skills', 'arch-foundation.md');
    if (existsSync(archSkill)) {
        pass('knowledge', 'arch-foundation skill', 'present');
    } else {
        fail('knowledge', 'arch-foundation skill', 'missing — SSOT for architecture is undefined', true);
    }

    const appSkillsDir = join(REPO_ROOT, 'app', 'skills');
    if (existsSync(appSkillsDir)) {
        pass('knowledge', 'app skills directory', 'present');
    } else {
        fail('knowledge', 'app skills directory', 'app/skills/ not found', false);
    }

    // Integral health-gate for skills database
    const validateSkills = join(REPO_ROOT, 'is', 'scripts', 'architecture', 'validate-skills.js');
    if (existsSync(validateSkills)) {
        try {
            execSync(`node "${validateSkills}"`, { stdio: 'ignore' });
            pass('knowledge', 'skills validation', 'passed');
        } catch {
            fail('knowledge', 'skills validation', 'failed (run npm run skills:check for details)', true);
        }
    } else {
        fail('knowledge', 'skills validation', 'validate-skills.js missing', false);
    }

    // Directory Contracts (READMEs)
    const validateReadmes = join(REPO_ROOT, 'is', 'scripts', 'architecture', 'validate-readmes.js');
    if (existsSync(validateReadmes)) {
        try {
            execSync(`node "${validateReadmes}"`, { stdio: 'ignore' });
            pass('knowledge', 'directory contracts (READMEs)', 'passed');
        } catch {
            fail('knowledge', 'directory contracts (READMEs)', 'failed (run npm run readmes:check for details)', true);
        }
    } else {
        fail('knowledge', 'directory contracts (READMEs)', 'validate-readmes.js missing', false);
    }
}

// --- Contract plane: .env & Paths ---
function checkContracts() {
    const envExample = join(REPO_ROOT, '.env.example');
    const envLocal = join(REPO_ROOT, '.env');

    if (existsSync(envExample)) {
        pass('contracts', '.env.example', 'present');
    } else {
        fail('contracts', '.env.example', 'missing — SSOT contract undefined', true);
    }

    if (existsSync(envLocal)) {
        pass('contracts', '.env', 'present (local)');
        
        // Check DATA_PLANE_ACTIVE_APP anti-race invariant directly from file (avoiding import circularities)
        const envContent = readFileSync(envLocal, 'utf8');
        const match = envContent.match(/^DATA_PLANE_ACTIVE_APP\s*=\s*(.+)$/m);
        if (match) {
            const val = match[1].trim();
            if (['TARGET', 'LEGACY', 'MMB', 'MBB'].includes(val)) {
                pass('contracts', 'DATA_PLANE_ACTIVE_APP anti-race', `value: ${val}`);
            } else {
                fail('contracts', 'DATA_PLANE_ACTIVE_APP anti-race', `unexpected value: ${val}`, false);
            }
        } else {
            fail('contracts', 'DATA_PLANE_ACTIVE_APP anti-race', 'key not found in .env', false);
        }
    } else {
        fail('contracts', '.env', 'missing — copy from .env.example and fill secrets', true);
    }
    
    const pathsJs = join(REPO_ROOT, 'is', 'contracts', 'paths', 'paths.js');
    if (existsSync(pathsJs)) {
        pass('contracts', 'paths.js contract', 'present');
    } else {
        fail('contracts', 'paths.js contract', 'missing', true);
    }
}

// --- Runtime plane: App integrity ---
function checkRuntime() {
    // Check if preflight script exists
    const preflight = join(REPO_ROOT, 'is', 'scripts', 'preflight.js');
    if (existsSync(preflight)) {
        pass('runtime', 'preflight script', 'present');
        try {
            // Run preflight synchronously
            execSync(`node "${preflight}"`, { stdio: 'ignore' });
            pass('runtime', 'preflight execution', 'successful');
        } catch {
            fail('runtime', 'preflight execution', 'failed', true);
        }
    } else {
        fail('runtime', 'preflight script', 'missing', true);
    }

    // Check UI entry point
    const indexHtml = join(REPO_ROOT, 'index.html');
    if (existsSync(indexHtml)) {
        pass('runtime', 'UI entry point (index.html)', 'present');
    } else {
        fail('runtime', 'UI entry point (index.html)', 'missing', true);
    }
}

// --- Run all checks ---
checkRuntime();
checkKnowledge();
checkContracts();

// --- Output ---
if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
} else {
    const icon = results.overall === 'healthy' ? '[OK]' : '[FAIL]';
    console.log(`\n${icon} Overall: ${results.overall.toUpperCase()}`);
    console.log(`   Timestamp: ${results.timestamp}\n`);

    for (const [plane, data] of Object.entries(results.planes)) {
        const planeIcon = data.status === 'healthy' ? '[OK]' : data.status === 'degraded' ? '[WARN]' : '[FAIL]';
        console.log(`${planeIcon} Plane: ${plane}`);
        for (const check of data.checks) {
            const ci = check.status === 'ok' ? '  OK  ' : check.status === 'warn' ? ' WARN ' : ' FAIL ';
            console.log(`  [${ci}] ${check.name}${check.detail ? ': ' + check.detail : ''}`);
        }
        console.log('');
    }
}

process.exit(results.overall === 'healthy' ? 0 : 1);
