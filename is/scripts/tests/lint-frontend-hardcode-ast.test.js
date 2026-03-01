import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const FORBIDDEN_PROPERTIES = new Set([
  'innerText',
  'textContent',
  'title',
  'ariaLabel',
  'innerHTML',
  'text'
]);

// Allow dictionary/config files
const SAFE_PATHS = new Set([
  'core/config/tooltips-config.js',
  'core/config/modals-config.js',
  'core/config/messages-config.js'
]);

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

function isStringNode(node) {
  if (!node) return false;
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  if (node.type === 'Literal' && typeof node.value === 'number') return false;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return true;
  return false;
}

function nodeText(node, lines) {
  return node && node.loc
    ? `${node.loc.start.line} "${lines[node.loc.start.line - 1]?.trim() || ''}"`
    : 'unknown';
}

function collectViolations(filePath, code) {
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      loc: true,
    });
  } catch (err) {
    // some IIFE or non-module files might need script sourceType
    try {
        ast = parse(code, { ecmaVersion: 2022, sourceType: 'script', loc: true });
    } catch (e2) {
        return { file: filePath, violations: [`Parse error: ${e2.message}`] };
    }
  }
  
  const lines = code.split('\n');
  const relative = path.relative(ROOT, filePath).split(path.sep).join('/');
  const violations = [];

  function walk(node, parent = null) {
    if (!node || typeof node !== 'object') return;
    
    if (node.type === 'AssignmentExpression' && node.left?.type === 'MemberExpression') {
      const prop = node.left.property?.name || node.left.property?.value;
      if (FORBIDDEN_PROPERTIES.has(String(prop))) {
        if (isStringNode(node.right) && node.right.value !== '') {
          violations.push(`hardcoded assignment to ${String(prop)} in ${nodeText(node, lines)}`);
        }
      }
    }
    
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      (node.callee.property?.name === 'setAttribute' || node.callee.property?.name === 'setAttributeNS')
    ) {
      const keyArg = node.arguments[1];
      const isAllowedAttr =
        node.arguments.length > 1 &&
        node.callee.property?.name === 'setAttribute' &&
        isStringNode(node.arguments[0]) &&
        String(node.arguments[0].value || node.arguments[0].quasis?.[0]?.value?.raw || '').toLowerCase() === 'aria-hidden' &&
        isStringNode(keyArg) &&
        (keyArg.value === 'true' || keyArg.value === 'false');
        
      const isThemeAttr = 
        node.arguments.length > 1 &&
        node.callee.property?.name === 'setAttribute' &&
        isStringNode(node.arguments[0]) &&
        String(node.arguments[0].value || '').toLowerCase() === 'data-bs-theme';
        
      if (node.arguments.length > 1 && isStringNode(keyArg) && !isAllowedAttr && !isThemeAttr) {
        violations.push(`hardcoded ${node.callee.property.name} value in ${nodeText(node, lines)}`);
      }
    }
    
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item, node);
      } else if (child && typeof child === 'object' && 'type' in child) {
        walk(child, node);
      }
    }
  }

  walk(ast);
  return { file: relative, violations };
}

test('AST Linter: Ban Hardcoded UI Strings', () => {
  const dirsToScan = [
    path.join(ROOT, 'app'),
    path.join(ROOT, 'core/api'),
    path.join(ROOT, 'shared/components')
  ];
  
  const allFiles = dirsToScan.flatMap(d => walkDir(d));
  const allViolations = [];
  
  allFiles.forEach(filePath => {
    const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
    if (SAFE_PATHS.has(rel)) return;
    
    // Skip templates files since Vue templates might contain textual IDs, though ideally they shouldn't have hardcoded natural text either.
    if (rel.includes('templates/')) return;
    
    const code = fs.readFileSync(filePath, 'utf8');
    const { violations } = collectViolations(filePath, code);
    
    violations.forEach(v => allViolations.push(`${rel}: ${v}`));
  });
  
  if (allViolations.length > 0) {
    console.error(allViolations.join('\n'));
  }
  
  assert.ok(allViolations.length === 0, `Found ${allViolations.length} hardcoded strings violations.`);
});
