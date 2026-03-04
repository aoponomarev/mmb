/**
 * #JS-KurwaKrf
 * @description Secret resilience: archive/restore .env keys, validate against env schema.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PATHS } from '../../contracts/paths/paths.js';
import { envSchema } from '../../contracts/env/env-rules.js';

const ENV_PATH = path.join(PATHS.root, '.env');
const ENV_EXAMPLE_PATH = path.join(PATHS.root, '.env.example');
const ARCHIVE_DIR = path.join(PATHS.root, 'is', 'secrets', 'archives');

// Extract all keys defined in our schema to know what to archive
const SCHEMA_KEYS = Object.keys(envSchema.shape);
const ARCHIVE_KEYS = SCHEMA_KEYS.filter(k => k !== 'SYS_SECRET_ARCHIVE_KEY');

function parseEnv(content) {
    const map = new Map();
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        map.set(k, v);
    }
    return map;
}

function readEnvMap(filePath) {
    if (!fs.existsSync(filePath)) return new Map();
    return parseEnv(fs.readFileSync(filePath, 'utf8'));
}

function requireEnvFile() {
    if (!fs.existsSync(ENV_PATH)) {
        throw new Error(`Missing .env file at ${ENV_PATH}`);
    }
    return readEnvMap(ENV_PATH);
}

function getArchivePassphrase(envMap) {
    const fromProcess = (process.env.SYS_SECRET_ARCHIVE_KEY || '').trim();
    if (fromProcess) return fromProcess;
    return (envMap.get('SYS_SECRET_ARCHIVE_KEY') || '').trim();
}

function deriveKey(passphrase) {
    return crypto.createHash('sha256').update(passphrase, 'utf8').digest();
}

function encryptPayload(payloadObj, passphrase) {
    const key = deriveKey(passphrase);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(payloadObj), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return {
        algo: 'aes-256-gcm',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
    };
}

function decryptPayload(encrypted, passphrase) {
    const key = deriveKey(passphrase);
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(plaintext);
}

function ensureArchiveDir() {
    if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
}

function formatTs(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function listArchives() {
    if (!fs.existsSync(ARCHIVE_DIR)) return [];
    return fs.readdirSync(ARCHIVE_DIR, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.endsWith('.enc.json'))
        .map((d) => path.join(ARCHIVE_DIR, d.name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function buildArchivePayload(envMap) {
    const payload = {};
    for (const key of ARCHIVE_KEYS) {
        const val = envMap.get(key);
        if (typeof val === 'string' && val.length > 0) {
            payload[key] = val;
        }
    }
    return payload;
}

export function backup() {
    const envMap = requireEnvFile();
    const passphrase = getArchivePassphrase(envMap);
    
    if (!passphrase || passphrase.length < 32) {
        throw new Error('SYS_SECRET_ARCHIVE_KEY is missing or too short (needs 32+ chars) in .env');
    }

    const data = buildArchivePayload(envMap);
    if (Object.keys(data).length === 0) {
        throw new Error('No sensitive keys found in .env to archive');
    }

    ensureArchiveDir();
    const encrypted = encryptPayload(data, passphrase);
    
    const out = {
        version: 1,
        createdAt: new Date().toISOString(),
        keyCount: Object.keys(data).length,
        keyNames: Object.keys(data).sort(),
        ...encrypted,
    };
    
    const outPath = path.join(ARCHIVE_DIR, `secret-archive-${formatTs()}.enc.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    
    console.log(`[secret-resilience] backup created: ${outPath}`);
    console.log(`[secret-resilience] archived keys: ${Object.keys(data).sort().join(', ')}`);
}

function mergeEnvKeepExisting(currentEnvMap, recoveredMap) {
    const merged = new Map(currentEnvMap);
    let restoredCount = 0;
    
    for (const [k, v] of Object.entries(recoveredMap)) {
        const cur = (merged.get(k) || '').trim();
        if (!cur && String(v).trim()) {
            merged.set(k, String(v));
            restoredCount++;
        }
    }
    return { merged, restoredCount };
}

function writeEnvMapPreservingComments(originalContent, mergedMap) {
    const lines = originalContent.split(/\r?\n/);
    const used = new Set();
    
    const out = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return line;
        
        const idx = line.indexOf('=');
        if (idx === -1) return line;
        
        const key = line.slice(0, idx).trim();
        if (!mergedMap.has(key)) return line;
        
        used.add(key);
        return `${key}=${mergedMap.get(key)}`;
    });

    // Append keys that were absent in source file.
    for (const [k, v] of mergedMap.entries()) {
        if (!used.has(k)) out.push(`${k}=${v}`);
    }
    
    return out.join('\n');
}

export function restoreLatest() {
    const envMap = requireEnvFile();
    const passphrase = getArchivePassphrase(envMap);
    
    if (!passphrase) {
        throw new Error('Missing SYS_SECRET_ARCHIVE_KEY in .env. Cannot restore.');
    }

    const archives = listArchives();
    if (archives.length === 0) {
        throw new Error(`No archives found in ${ARCHIVE_DIR}`);
    }
    
    const latestPath = archives[0];
    const enc = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    const recovered = decryptPayload(enc, passphrase);

    const originalEnvContent = fs.readFileSync(ENV_PATH, 'utf8');
    const { merged, restoredCount } = mergeEnvKeepExisting(envMap, recovered);
    
    const nextContent = writeEnvMapPreservingComments(originalEnvContent, merged);
    fs.writeFileSync(ENV_PATH, nextContent, 'utf8');
    
    console.log(`[secret-resilience] restored missing keys from: ${latestPath}`);
    console.log(`[secret-resilience] keys restored: ${restoredCount}`);
}

export function check() {
    const envMap = requireEnvFile();
    const passphrase = getArchivePassphrase(envMap);
    const errors = [];

    if (!passphrase || passphrase.length < 32) {
        errors.push('SYS_SECRET_ARCHIVE_KEY is missing or too short in .env');
    }

    const archives = listArchives();
    if (archives.length === 0) {
        errors.push(`No encrypted local secret archives found in: ${ARCHIVE_DIR}`);
    } else if (passphrase && passphrase.length >= 32) {
        try {
            const latest = JSON.parse(fs.readFileSync(archives[0], 'utf8'));
            const payload = decryptPayload(latest, passphrase);
            if (Object.keys(payload).length === 0) {
                errors.push('Latest encrypted archive decrypts but payload is empty');
            }
        } catch (e) {
            errors.push(`Failed to decrypt latest encrypted archive: ${e.message}`);
        }
    }

    if (errors.length > 0) {
        console.error('[secret-resilience] FAILED');
        for (const e of errors) console.error(`  - ${e}`);
        process.exit(1);
    }

    console.log('[secret-resilience] OK: integrity and restore contracts are valid');
}

// CLI Execution
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    const args = new Set(process.argv.slice(2));
    if (args.has('--backup')) backup();
    else if (args.has('--restore-latest')) restoreLatest();
    else check();
}