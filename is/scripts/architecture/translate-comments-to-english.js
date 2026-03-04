#!/usr/bin/env node
/**
 * #JS-Tb2x2tPm
 * @description Translate Russian comments to English per process-language-policy. Scans app/, core/, is/, shared/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');

const MAP = [
    ['Client for', 'Client for'],
    ['Interact with', 'Interact with'],
    ['for managing', 'for managing'],
    ['coin sets', 'coin sets'],
    ['sets', 'sets'],
    ['User not authenticated', 'User not authenticated'],
    ['OAuth handling', 'OAuth handling'],
    ['for auth via', 'for auth via'],
    ['OAuth flow handling on server', 'OAuth flow handling on server'],
    ['code-to-token exchange', 'code-to-token exchange'],
    ['user persistence', 'user persistence'],
    ['JWT issuance', 'JWT issuance'],
    ['redirect to', 'redirect to'],
    ['not used', 'not used'],
    ['done on client', 'done on client'],
    ['get current user', 'get current user'],
    ['by JWT token', 'by JWT token'],
    ['logout', 'logout'],
    ['can be done on client', 'can be done on client'],
    ['USAGE', 'USAGE'],
    ['Handle OAuth callback from Google', 'Handle OAuth callback from Google'],
    ['Supports GET', 'Supports GET'],
    ['redirect from Google', 'redirect from Google'],
    ['call from client', 'call from client'],
    ['HTTP request', 'HTTP request'],
    ['Environment variables', 'Environment variables'],
    ['JSON response', 'JSON response'],
    ['HTML with redirect', 'HTML with redirect'],
    ['not set', 'not set'],
    ['not configured', 'not configured'],
    ['Use:', 'Use:'],
    ['Default for local development', 'Default for local development'],
    ['Support GET', 'Support GET'],
    ['Extract client_url from state', 'Extract client_url from state'],
    ['if provided', 'if provided'],
    ['Use provided URL directly', 'Use provided URL directly'],
    ['can be', 'can be'],
    ['extracted client_url from state', 'extracted client_url from state'],
    ['state parse error', 'state parse error'],
    ['default URL', 'default URL'],
    ['For GET return', 'For GET return'],
    ['HTML page', 'HTML page'],
    ['that will handle token', 'that will handle token'],
    ['Filter params', 'Filter params'],
    ['Sets array', 'Sets array'],
    ['Get set by ID', 'Get set by ID'],
    ['Create new set', 'Create new set'],
    ['Update set', 'Update set'],
    ['Delete set', 'Delete set'],
    ['Archive/unarchive', 'Archive/unarchive'],
    ['Action', 'Action'],
    ['Path', 'Path'],
    ['Request params', 'Request params'],
    ['optional', 'optional'],
].sort((a, b) => b[0].length - a[0].length);

function walk(dir, ext, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (['node_modules', '.git', '.cursor', 'docs'].includes(e.name)) continue;
            walk(full, ext, out);
        } else if (e.name.endsWith(ext)) {
            out.push(full);
        }
    }
    return out;
}

let n = 0;
for (const file of [...walk(ROOT, '.js'), ...walk(ROOT, '.html')]) {
    let s = fs.readFileSync(file, 'utf8');
    if (!/[а-яА-ЯёЁ]/.test(s)) continue;
    let changed = false;
    for (const [ru, en] of MAP) {
        if (s.includes(ru)) {
            s = s.split(ru).join(en);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(file, s, 'utf8');
        n++;
        console.log(path.relative(ROOT, file));
    }
}
console.log(`\nTranslated: ${n} files. Run again until no more.`);
