/**
 * #JS-kb6Yp2Vw
 * @description Lint: forbid any SQLite files under app/data (runtime state must live in data/).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../../contracts/paths/paths.js';

function listSqliteFilesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) continue;
    const name = entry.name.toLowerCase();
    if (name.endsWith('.sqlite') || name.includes('.sqlite-') || name.endsWith('.sqlite-wal') || name.endsWith('.sqlite-shm')) {
      out.push(abs);
    }
  }
  return out;
}

test('Lint: forbid app/data/*.sqlite', () => {
  const forbiddenDir = path.join(PATHS.app, 'data');
  const found = listSqliteFilesIn(forbiddenDir);
  if (found.length === 0) return;

  const pretty = found
    .map((p) => path.relative(PATHS.root, p).split(path.sep).join('/'))
    .sort();

  assert.fail(
    [
      `Forbidden SQLite files under app/data (move runtime state to data/):`,
      ...pretty.map((p) => `- ${p}`),
    ].join('\n')
  );
});
