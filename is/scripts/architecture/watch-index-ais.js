/**
 * #JS-pDx4epAm
 * @description Watches docs/ais and auto-regenerates docs/index-ais.md on file changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { ROOT } from "../../contracts/path-contracts.js";
const AIS_DIR = path.join(ROOT, 'docs', 'ais');

let timer = null;
let running = false;

function runGenerateIndex() {
    if (running) return;
    running = true;
    const child = spawn(process.execPath, [path.join(ROOT, 'is', 'scripts', 'architecture', 'generate-index-ais.js')], {
        cwd: ROOT,
        stdio: 'inherit'
    });
    child.on('exit', () => {
        running = false;
    });
}

function scheduleGenerate() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        runGenerateIndex();
    }, 200);
}

function main() {
    if (!fs.existsSync(AIS_DIR)) {
        console.error(`[ais-index-watch] docs/ais not found: ${AIS_DIR}`);
        process.exit(1);
    }

    console.log('[ais-index-watch] Initial generation...');
    runGenerateIndex();
    console.log(`[ais-index-watch] Watching: ${AIS_DIR}`);

    fs.watch(AIS_DIR, { persistent: true }, (_eventType, filename) => {
        if (!filename) return;
        if (!filename.endsWith('.md')) return;
        scheduleGenerate();
    });
}

main();
