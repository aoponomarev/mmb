/**
 * @skill is/skills/process-env-sync
 * @skill is/skills/process-secrets-hygiene
 *
 * Validates .env and .env.example are in sync (EIP — Every Item Present).
 * Fails if any key in .env is missing from .env.example, or vice versa.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const ENV_PATH = path.join(ROOT, '.env');
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

/**
 * Keys allowed to exist in .env.example but not required in .env
 * (optional infrastructure keys, set per-deployment)
 */
const OPTIONAL_ENV_KEYS = new Set([
    'DATASETS_ROOT',
    'SYS_SECRET_ARCHIVE_KEY',
]);

function parseEnvKeys(content) {
    return [...new Set(
        content
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#') && line.includes('='))
            .map(line => line.slice(0, line.indexOf('=')).trim())
            .filter(Boolean)
    )];
}

function main() {
    if (!fs.existsSync(ENV_PATH)) {
        console.error('[env-check] Missing .env (required locally). Copy from .env.example and fill values.');
        process.exit(1);
    }
    if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
        console.error('[env-check] Missing .env.example');
        process.exit(1);
    }

    const envKeys = parseEnvKeys(fs.readFileSync(ENV_PATH, 'utf8'));
    const exampleKeys = parseEnvKeys(fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8'));

    const missingInExample = envKeys.filter(key => !exampleKeys.includes(key));
    const extraInExample = exampleKeys.filter(key => !envKeys.includes(key) && !OPTIONAL_ENV_KEYS.has(key));

    if (missingInExample.length || extraInExample.length) {
        console.error('[env-check] .env.example is out of sync with .env');
        if (missingInExample.length) {
            console.error(`[env-check] Missing in .env.example (${missingInExample.length}):`);
            for (const key of missingInExample) console.error(`  - ${key}`);
            console.error('[env-check] Fix: add these keys to .env.example with placeholder values.');
        }
        if (extraInExample.length) {
            console.error(`[env-check] Extra in .env.example not in .env (${extraInExample.length}):`);
            for (const key of extraInExample) console.error(`  - ${key}`);
            console.error('[env-check] Fix: add to .env, or mark as OPTIONAL_ENV_KEYS if truly optional.');
        }
        process.exit(1);
    }

    console.log(`[env-check] OK: ${envKeys.length} keys synchronized between .env and .env.example.`);
}

main();
