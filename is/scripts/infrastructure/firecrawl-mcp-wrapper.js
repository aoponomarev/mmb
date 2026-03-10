/**
 * @description Wrapper for firecrawl-mcp: loads .env from project root so FIRECRAWL_API_KEY is available.
 * Used by .cursor/mcp.json. Cursor MCP spawns this; child inherits env.
 * #for-env-sync-ssot
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../../');

function parseDotEnv(filePath) {
    if (!existsSync(filePath)) return {};
    const content = readFileSync(filePath, 'utf8');
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

const localEnv = parseDotEnv(join(ROOT, '.env'));
const env = { ...process.env, ...localEnv };

const child = spawn('npx', ['-y', 'firecrawl-mcp'], {
    stdio: 'inherit',
    env,
    shell: true,
    cwd: ROOT,
});

child.on('error', (err) => {
    console.error('[firecrawl-mcp-wrapper]', err.message);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code ?? 1);
});
