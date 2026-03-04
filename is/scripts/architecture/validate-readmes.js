/**
 * @skill id:sk-c62fb6
 * Validates mandatory README files and structure sync (listed subdirs match filesystem).
 * Run: npm run readmes:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const REQUIRED_READMES = [
    'app/README.md',
    'app/skills/README.md',
    'core/README.md',
    'core/skills/README.md',
    'is/README.md',
    'docs/README.md',
    'is/scripts/README.md',
    'is/skills/README.md',
    'is/contracts/README.md',
    'data/README.md',
    'shared/README.md',
    'styles/README.md',
    'scripts/README.md',
    'mm/README.md'
];

/** Dirs to ignore when scanning filesystem (not part of documented structure) */
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'out']);

/**
 * READMEs that have a subdirectory list section. Section header -> regex to extract dir names.
 * Format: - `dirname/`: description  or  - dirname/: description
 */
const DIRS_WITH_SUBDIR_LIST = [
    { dir: 'app', section: 'Subdirectories' },
    { dir: 'core', section: 'Subdirectories' },
    { dir: 'is', section: 'Subdirectories' },
    { dir: 'is/scripts', section: 'Subfolders' },
    { dir: 'is/contracts', section: 'Subdirectories' },
    { dir: 'docs', section: 'Structure' },
    { dir: 'shared', section: 'Subdirectories' },
    { dir: 'styles', section: 'Subdirectories' },
    { dir: 'scripts', section: 'Subdirectories' }
];

/**
 * Extract subdirectory names from a markdown section.
 * Matches: - `xxx/`: ...  or  - xxx/: ...  (backtick = \x60, handles CRLF)
 */
function parseListedSubdirs(content, sectionHeader) {
    const lines = content.split(/\r?\n/);
    let inSection = false;
    const listed = [];
    const sectionRegex = new RegExp(`^##\\s+${sectionHeader}\\s*$`, 'i');
    // Supports both `xxx/`: and xxx/: formats
    const itemRegex = /^[-*]\s+(?:\x60)?([a-zA-Z0-9_-]+)\/(?:\x60)?\s*:\s*(.*)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (sectionRegex.test(trimmed)) {
            inSection = true;
            continue;
        }
        if (inSection) {
            if (trimmed.match(/^##\s+/)) break; // next section
            const m = trimmed.match(itemRegex);
            if (m) listed.push(m[1]);
        }
    }
    return listed;
}

/**
 * Get actual subdirectories from filesystem (excluding ignored).
 */
function getActualSubdirs(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
        .filter(e => e.isDirectory() && !IGNORE_DIRS.has(e.name))
        .map(e => e.name)
        .sort();
}

function checkExistence() {
    let hasErrors = false;
    const missing = [];

    const dataDir = path.join(ROOT, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    for (const relPath of REQUIRED_READMES) {
        const fullPath = path.join(ROOT, relPath);
        if (!fs.existsSync(fullPath)) {
            missing.push(relPath);
            hasErrors = true;
        } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.trim().length < 20) {
                missing.push(`${relPath} (exists but content is too short)`);
                hasErrors = true;
            }
        }
    }

    if (hasErrors) {
        console.error(`[readmes:check] FAILED: Missing or invalid required README files:`);
        missing.forEach(m => console.error(`  - ${m}`));
        return false;
    }
    return true;
}

function checkStructureSync() {
    let hasErrors = false;

    for (const { dir, section } of DIRS_WITH_SUBDIR_LIST) {
        const readmePath = path.join(ROOT, dir, 'README.md');
        const dirPath = path.join(ROOT, dir);
        if (!fs.existsSync(readmePath) || !fs.existsSync(dirPath)) continue;

        const content = fs.readFileSync(readmePath, 'utf8');
        const listed = parseListedSubdirs(content, section);
        const actual = getActualSubdirs(dirPath);

        const inReadmeNotFs = listed.filter(d => !actual.includes(d));
        const inFsNotReadme = actual.filter(d => !listed.includes(d));

        if (inReadmeNotFs.length > 0 || inFsNotReadme.length > 0) {
            hasErrors = true;
            console.error(`[readmes:check] Structure sync FAILED: ${dir}/README.md`);
            if (inReadmeNotFs.length > 0) {
                console.error(`  Listed in README but missing on disk: ${inReadmeNotFs.join(', ')}`);
            }
            if (inFsNotReadme.length > 0) {
                console.error(`  On disk but not in README: ${inFsNotReadme.join(', ')}`);
                console.error(`  Run: npm run readmes:sync`);
            }
        }
    }

    return !hasErrors;
}

function main() {
    if (!checkExistence()) {
        process.exit(1);
    }
    if (!checkStructureSync()) {
        process.exit(1);
    }
    console.log(`[readmes:check] OK: All ${REQUIRED_READMES.length} mandatory folder contracts (README.md) are present and in sync with structure.`);
}

main();
