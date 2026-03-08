/**
 * Finds all JS files in app with syntax errors and restores them from app.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

const app_ROOT = 'd:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app';
const app_ROOT = 'D:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/app';

function* walkJs(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'scripts') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) yield* walkJs(full);
        else if (entry.isFile() && extname(entry.name) === '.js') yield full;
    }
}

function checkSyntax(filePath) {
    try {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        return true;
    } catch (e) {
        return false;
    }
}

let broken = 0, fixed = 0, noapp = 0, appAlsoBroken = 0;

for (const appFile of walkJs(app_ROOT)) {
    if (checkSyntax(appFile)) continue;

    broken++;
    const rel = relative(app_ROOT, appFile).replace(/\\/g, '/');
    const appFile = join(app_ROOT, rel);

    if (!existsSync(appFile)) {
        noapp++;
        console.log('NO app:', rel);
        continue;
    }

    if (!checkSyntax(appFile)) {
        appAlsoBroken++;
        console.log('app ALSO BROKEN:', rel);
        continue;
    }

    writeFileSync(appFile.replace(app_ROOT, app_ROOT), readFileSync(appFile, 'utf8'), 'utf8');
    fixed++;
    console.log('FIXED:', rel);
}

console.log(`\nBroken: ${broken} | Fixed: ${fixed} | No app: ${noapp} | app also broken: ${appAlsoBroken}`);
