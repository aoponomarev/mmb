/**
 * Full mojibake recovery script.
 * Finds all files in app with broken Cyrillic (mojibake) and replaces them
 * with clean versions from the app archive.
 *
 * Strategy: for files that exist in both app and app, if app has mojibake
 * but app does not, copy app version to app.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';

const app_ROOT = 'd:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app';
const app_ROOT = 'D:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app';

const TEXT_EXTS = new Set(['.js', '.html', '.json', '.css', '.md', '.txt', '.yml', '.yaml']);

// Detect mojibake: UTF-8 Cyrillic decoded as Windows-1252/1251.
// Uses chars that appear in mojibake but NOT in normal Russian text:
// - Cyrillic Extended block U+0452-U+045F (ђ,ѓ,є,ѕ,і,ї,ј,љ,њ,ћ,ќ,ў,џ)
// - Latin supplement chars paired with Р/С (µ,»,«,¦,¬,±,·)
// - Smart quotes/dashes from U+2018-U+203F paired with Р/С
const MOJIBAKE_RE = /[\u0420\u0421][\u0452-\u045F\u00A0-\u00BF\u2018-\u203F]|[\u0452-\u045F]{2,}|[\u0420\u0421][\u00B5\u00BB\u00AB\u00A6\u00AC\u00B1\u00B7]/;

function hasMojibake(content) {
    return MOJIBAKE_RE.test(content);
}

function* walkFiles(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walkFiles(fullPath);
        } else if (entry.isFile() && TEXT_EXTS.has(extname(entry.name).toLowerCase())) {
            yield fullPath;
        }
    }
}

const results = {
    scanned: 0,
    broken: 0,
    fixed: 0,
    missing_in_app: [],
    app_also_broken: [],
    fixed_files: [],
    skipped_scripts: []
};

for (const appPath of walkFiles(app_ROOT)) {
    const rel = relative(app_ROOT, appPath).replace(/\\/g, '/');

    // Skip the scripts folder itself to avoid overwriting recovery scripts
    if (rel.startsWith('scripts/')) {
        continue;
    }

    results.scanned++;

    let appContent;
    try {
        appContent = readFileSync(appPath, 'utf8');
    } catch (e) {
        continue;
    }

    if (!hasMojibake(appContent)) continue;

    results.broken++;

    const appPath = join(app_ROOT, rel);
    if (!existsSync(appPath)) {
        results.missing_in_app.push(rel);
        continue;
    }

    let appContent;
    try {
        appContent = readFileSync(appPath, 'utf8');
    } catch (e) {
        results.missing_in_app.push(rel);
        continue;
    }

    if (hasMojibake(appContent)) {
        results.app_also_broken.push(rel);
        continue;
    }

    // app version is clean - copy it to app
    writeFileSync(appPath, appContent, 'utf8');
    results.fixed++;
    results.fixed_files.push(rel);
}

console.log('\n=== MOJIBAKE FULL RECOVERY REPORT ===');
console.log(`Scanned: ${results.scanned} files`);
console.log(`Broken (mojibake): ${results.broken} files`);
console.log(`Fixed from app: ${results.fixed} files`);
console.log(`Missing in app: ${results.missing_in_app.length} files`);
console.log(`app also broken: ${results.app_also_broken.length} files`);

if (results.fixed_files.length > 0) {
    console.log('\nFixed files:');
    results.fixed_files.forEach(f => console.log('  ✓ ' + f));
}

if (results.missing_in_app.length > 0) {
    console.log('\nMissing in app (cannot fix):');
    results.missing_in_app.forEach(f => console.log('  ✗ ' + f));
}

if (results.app_also_broken.length > 0) {
    console.log('\napp also has mojibake (need manual fix):');
    results.app_also_broken.forEach(f => console.log('  ! ' + f));
}
