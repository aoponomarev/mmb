/**
 * #JS-i83e3EeJ
 * @description Switches DATA_PLANE_ACTIVE_APP (TARGET/LEGACY) in .env; single-writer guard and audit log.
 * @skill id:sk-73dcca
 * @skill id:sk-483943
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const ENV_PATH = path.join(ROOT, '.env');
const SWITCH_LOG_PATH = path.join(ROOT, 'is', 'logs', 'active-writer-switch.jsonl');

function run(cmd, args) {
    return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', shell: false });
}

function parseTarget() {
    const idx = process.argv.indexOf('--to');
    if (idx === -1 || !process.argv[idx + 1]) {
        throw new Error('Missing --to argument. Allowed: TARGET | LEGACY');
    }
    const target = process.argv[idx + 1].trim().toUpperCase();
    if (target !== 'TARGET' && target !== 'LEGACY') {
        throw new Error(`Invalid --to value: "${target}". Allowed: TARGET | LEGACY`);
    }
    return target;
}

function parseMeta() {
    const reasonIdx = process.argv.indexOf('--reason');
    const byIdx = process.argv.indexOf('--by');
    return {
        reason: reasonIdx !== -1 && process.argv[reasonIdx + 1] ? process.argv[reasonIdx + 1].trim() : 'manual-switch',
        by: byIdx !== -1 && process.argv[byIdx + 1] ? process.argv[byIdx + 1].trim() : (process.env.USERNAME || process.env.USER || 'unknown'),
    };
}

function updateEnv(activeWriter) {
    if (!fs.existsSync(ENV_PATH)) throw new Error('.env not found');
    const raw = fs.readFileSync(ENV_PATH, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const hasKey = /^\s*DATA_PLANE_ACTIVE_APP\s*=.*$/m.test(raw);
    const currentMatch = raw.match(/^\s*DATA_PLANE_ACTIVE_APP\s*=\s*(.+)\s*$/m);
    const previous = currentMatch ? currentMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
    const updated = hasKey
        ? raw.replace(/^\s*DATA_PLANE_ACTIVE_APP\s*=.*$/m, `DATA_PLANE_ACTIVE_APP=${activeWriter}`)
        : `${raw.trimEnd()}\nDATA_PLANE_ACTIVE_APP=${activeWriter}\n`;
    fs.writeFileSync(ENV_PATH, updated, 'utf8');
    return { previous: previous || null };
}

function restoreEnv(previous) {
    if (!previous || !fs.existsSync(ENV_PATH)) return;
    const raw = fs.readFileSync(ENV_PATH, 'utf8');
    fs.writeFileSync(ENV_PATH, raw.replace(/^\s*DATA_PLANE_ACTIVE_APP\s*=.*$/m, `DATA_PLANE_ACTIVE_APP=${previous}`), 'utf8');
}

function validatePostSwitch() {
    const singleWriterScript = path.join(ROOT, 'is', 'scripts', 'infrastructure', 'validate-single-writer.js');
    const result = run(process.execPath, [singleWriterScript]);
    if (result.status !== 0) {
        throw new Error(`validate-single-writer failed:\n${result.stderr || result.stdout}`);
    }
}

function appendSwitchAudit({ from, to, by, reason }) {
    fs.mkdirSync(path.dirname(SWITCH_LOG_PATH), { recursive: true });
    fs.appendFileSync(SWITCH_LOG_PATH, `${JSON.stringify({ ts: new Date().toISOString(), from, to, by, reason })}\n`, 'utf8');
}

function main() {
    const target = parseTarget();
    const meta = parseMeta();
    const { previous } = updateEnv(target);

    try {
        validatePostSwitch();
    } catch (error) {
        restoreEnv(previous);
        throw new Error(`${error.message}\n[single-writer] env restored to previous: ${previous || 'unset'}`, { cause: error });
    }

    appendSwitchAudit({ from: previous, to: target, by: meta.by, reason: meta.reason });
    console.log(`[single-writer] switched DATA_PLANE_ACTIVE_APP: ${previous || 'unset'} → ${target}`);
}

try {
    main();
} catch (error) {
    console.error(`[single-writer] FAILED: ${error.message}`);
    process.exit(1);
}
