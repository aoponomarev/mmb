import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

function walkDir(directory, out = []) {
  if (!fs.existsSync(directory)) return out;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkDir(absolute, out);
      continue;
    }
    if (!/\.(js|mjs)$/.test(entry.name)) continue;
    out.push(absolute);
  }
  return out;
}

test('Frontend RRG (Reactive Reliability Gate) Contracts', () => {
  const componentsDir = path.join(ROOT, 'app', 'components');
  const files = walkDir(componentsDir);
  
  const violations = [];
  
  files.forEach(filePath => {
    const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
    const code = fs.readFileSync(filePath, 'utf8');
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      // RRG Rule 1: No direct mutation of global window state inside components
      // Components should use Vue reactivity or appStore
      // Exclude module exports (e.g., window.aiApiSettings = {)
      if (line.match(/window\.[a-zA-Z_$][\w$]*\s*=\s*\{/)) return;
      if (line.match(/window\.[a-zA-Z_$][\w$]*\s*=\s*function/)) return;
      
      if (line.match(/window\.[a-zA-Z_$][\w$]*\s*=[^=]/)) {
        if (!line.includes('window.consoleInterceptor') && !line.includes('window.location')) {
            violations.push(`${rel}:${index + 1} - Direct window mutation breaks RRG: ${line.trim()}`);
        }
      }
      
      // RRG Rule 2: Warn about manual DOM manipulation in Vue components (except for specific cases)
      if (line.match(/\.innerHTML\s*=/)) {
        violations.push(`${rel}:${index + 1} - innerHTML assignment is unsafe in Vue RRG: ${line.trim()}`);
      }
    });
  });
  
  if (violations.length > 0) {
    console.error('RRG Violations Found:\n' + violations.join('\n'));
  }
  
  // We can choose to just warn or assert. For a strict gate, we assert.
  // There might be some existing violations, let's see.
  assert.ok(violations.length === 0, `Found ${violations.length} RRG violations.`);
});
