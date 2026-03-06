/**
 * #JS-PqyKcPnn
 * @description Auto-updates Subdirectories/Subfolders/Structure sections in READMEs to match filesystem. Run: npm run readmes:sync
 * @skill id:sk-c62fb6
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'out']);

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

function parseListedSubdirs(content, sectionHeader) {
    const lines = content.split(/\r?\n/);
    let inSection = false;
    const listed = [];
    const sectionRegex = new RegExp(`^##\\s+${sectionHeader}\\s*$`, 'i');
    const itemRegex = /^[-*]\s+(?:\x60)?([a-zA-Z0-9_-]+)\/(?:\x60)?\s*:\s*(.*)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (sectionRegex.test(trimmed)) {
            inSection = true;
            continue;
        }
        if (inSection) {
            if (trimmed.match(/^##\s+/)) break;
            const m = trimmed.match(itemRegex);
            if (m) listed.push({ name: m[1], desc: m[2].trim() });
        }
    }
    return listed;
}

function getActualSubdirs(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
        .filter(e => e.isDirectory() && !IGNORE_DIRS.has(e.name))
        .map(e => e.name)
        .sort();
}

function replaceSection(content, sectionHeader, newItems) {
    const lines = content.split(/\r?\n/);
    const sectionRegex = new RegExp(`^##\\s+${sectionHeader}\\s*$`, 'i');
    const itemRegex = /^[-*]\s+(?:\x60)?([a-zA-Z0-9_-]+)\/(?:\x60)?\s*:\s*(.*)/;

    let result = [];
    let inSection = false;
    let sectionReplaced = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (sectionRegex.test(trimmed)) {
            inSection = true;
            sectionReplaced = true;
            result.push(line);
            for (const { name, desc } of newItems) {
                result.push(`- \`${name}/\`: ${desc}`);
            }
            continue;
        }

        if (inSection) {
            if (trimmed.match(/^##\s+/)) {
                inSection = false;
                result.push(line);
            }
            // skip old list items (we already replaced with new ones)
            else if (!itemRegex.test(trimmed)) {
                result.push(line);
            }
            continue;
        }

        result.push(line);
    }

    return result.join('\n');
}

function main() {
    let updated = 0;

    for (const { dir, section } of DIRS_WITH_SUBDIR_LIST) {
        const readmePath = path.join(ROOT, dir, 'README.md');
        const dirPath = path.join(ROOT, dir);
        if (!fs.existsSync(readmePath) || !fs.existsSync(dirPath)) continue;

        const content = fs.readFileSync(readmePath, 'utf8');
        const listed = parseListedSubdirs(content, section);
        const actual = getActualSubdirs(dirPath);

        const listedMap = new Map(listed.map(l => [l.name, l.desc]));
        const newItems = [];

        for (const name of actual) {
            const desc = listedMap.get(name) ?? 'TODO: add description';
            newItems.push({ name, desc });
        }

        const stale = listed.filter(l => !actual.includes(l.name));
        if (stale.length > 0 || newItems.length !== listed.length) {
            const newContent = replaceSection(content, section, newItems);
            fs.writeFileSync(readmePath, newContent, 'utf8');
            console.log(`[readmes:sync] Updated ${dir}/README.md`);
            if (stale.length > 0) {
                console.log(`  Removed stale: ${stale.map(s => s.name).join(', ')}`);
            }
            const added = newItems.filter(n => !listedMap.has(n.name));
            if (added.length > 0) {
                console.log(`  Added: ${added.map(a => a.name).join(', ')}`);
            }
            updated++;
        }
    }

    if (updated === 0) {
        console.log('[readmes:sync] All READMEs are already in sync. No changes made.');
    } else {
        console.log(`[readmes:sync] Updated ${updated} README(s). Run npm run readmes:check to verify.`);
    }
}

main();
