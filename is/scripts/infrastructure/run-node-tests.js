/**
 * #JS-9a8cW3mQ
 * @description Cross-platform Node test runner: executes only “*.test.js” files (avoids legacy “test-*.js” scripts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PATHS } from '../../contracts/paths/paths.js';

const ROOTS = [PATHS.is, PATHS.core];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (entry.name.endsWith('.test.js')) out.push(abs);
  }
}

const testFiles = [];
for (const root of ROOTS) walk(root, testFiles);
testFiles.sort((a, b) => a.localeCompare(b));

if (testFiles.length === 0) {
  process.stdout.write('No *.test.js files found.\n');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: PATHS.root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

