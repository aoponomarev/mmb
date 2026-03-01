#!/usr/bin/env node
/**
 * @skill is/skills/arch-testing-ci
 *
 * Testing matrix runner — executes named gate profiles.
 *
 * Usage:
 *   npm run testing:premerge   — fast safety gates before PR merge
 *   npm run testing:release    — full integrity checks before pushing to main
 *   npm run testing:ci         — premerge + release (full CI aggregate)
 */
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='));
const mode = modeArg
    ? modeArg.split('=')[1]
    : args.find((a, i) => args[i - 1] === '--mode') || args[0];

function fail(message) {
    console.error(`[testing:matrix] FAILED: ${message}`);
    process.exit(1);
}

function runCommand(name, command) {
    console.log(`[testing:matrix] RUN ${name}`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch {
        fail(`${name} failed`);
    }
}

/**
 * premerge — fast gates: run before any PR merge.
 * Should complete in < 60 seconds.
 */
const PREMERGE = [
    ['env sync', 'npm run env:check'],
    ['ssot contracts', 'npm run ssot:check'],
    ['skills check', 'npm run skills:check'],
    ['readmes check', 'npm run readmes:check'],
    ['cache delta', 'npm run cache:integrity:delta'],
    ['preflight', 'npm run preflight'],
    ['tests', 'npm run test'],
];

/**
 * release — full integrity: run before pushing to main/master.
 */
const RELEASE = [
    ['secret integrity', 'npm run secret:check'],
    ['cache full', 'npm run cache:integrity:check'],
    ['single-writer', 'npm run validate:single-writer'],
    ['monitoring baseline', 'npm run monitoring:baseline'],
    ['health-check full', 'npm run health-check'],
];

const matrixProfiles = {
    premerge: PREMERGE,
    release: RELEASE,
    ci: [...PREMERGE, ...RELEASE],
};

if (!mode || mode === '--help' || mode === '-h') {
    console.log([
        'Usage:',
        '  npm run testing:premerge',
        '  npm run testing:release',
        '  npm run testing:ci',
    ].join('\n'));
    process.exit(0);
}

if (!matrixProfiles[mode]) {
    fail(`Unknown mode "${mode}". Expected: premerge | release | ci`);
}

console.log(`[testing:matrix] mode=${mode} (${matrixProfiles[mode].length} gates)`);
for (const [name, command] of matrixProfiles[mode]) {
    runCommand(name, command);
}
console.log(`[testing:matrix] OK: ${mode} — all gates passed.`);
