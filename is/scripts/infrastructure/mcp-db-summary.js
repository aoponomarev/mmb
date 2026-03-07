/**
 * #JS-CM3Rev8X
 * @description TODO: add description
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { PATHS } from '../../contracts/paths/paths.js';

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const dbPath = path.resolve(getArg('--db') ?? PATHS.mcpDb);

const stat = fs.statSync(dbPath);
const db = new Database(dbPath, { readonly: true, fileMustExist: true });

const pragmas = ['user_version', 'journal_mode', 'foreign_keys', 'page_size', 'page_count', 'freelist_count'];
const pragmaValues = Object.fromEntries(pragmas.map((k) => [k, db.pragma(k, { simple: true })]));

const objects = db
  .prepare(
    `SELECT name, type, sql
     FROM sqlite_master
     WHERE name NOT LIKE 'sqlite_%'
       AND type IN ('table','view','index','trigger')
     ORDER BY type, name`
  )
  .all();

const tables = objects.filter((o) => o.type === 'table').map((o) => o.name);

const rowCounts = {};
for (const name of tables) {
  const safe = name.replaceAll('"', '""');
  const q = `SELECT COUNT(1) AS n FROM "${safe}"`;
  rowCounts[name] = db.prepare(q).get().n;
}

const out = {
  path: dbPath,
  file: { bytes: stat.size, mtime: stat.mtime },
  pragmas: pragmaValues,
  tables,
  rowCounts,
  objects: objects.map(({ name, type, sql }) => ({ name, type, sql })),
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
