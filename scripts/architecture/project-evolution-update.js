/**
 * scripts/architecture/project-evolution-update.js
 *
 * Automated project evolution log updater.
 *
 * Usage:
 *   node scripts/architecture/project-evolution-update.js          — append today's commits
 *   node scripts/architecture/project-evolution-update.js --rebuild — rebuild full log from scratch
 *   node scripts/architecture/project-evolution-update.js --dry-run — print to stdout, no file write
 *
 * Output: docs/project-evolution.md
 *
 * How it works:
 *  1. Reads git log for the target date range
 *  2. Groups commits by date
 *  3. Extracts Context Tags ([Skill:], [MCP:], [SSOT:], [Rule:]) from commit bodies
 *  4. Classifies changes by Tier (A/B/C) based on file paths and commit types
 *  5. Generates a dense narrative block per date (one date = one block)
 *  6. Merges into existing docs/project-evolution.md without duplicating dates
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const EVOLUTION_FILE = resolve(ROOT, 'docs/project-evolution.md');

const DRY_RUN = process.argv.includes('--dry-run');
const REBUILD = process.argv.includes('--rebuild');

// ─────────────────────────────────────────────────────
// Tier classification rules
// Tier A = architecture/infra-critical
// Tier B = structure-important
// Tier C = operational/housekeeping
// ─────────────────────────────────────────────────────
const TIER_A_PATTERNS = [
  /^feat/, /^fix.*critical/, /BREAKING CHANGE/,
  /mcp\//, /docker/, /\.env/, /paths\.js/, /package\.json/,
  /INFRASTRUCTURE_CONFIG/, /SSOT/, /skills-mcp/, /memory-mcp/,
  /\.cursor\/rules/, /architecture\//,
];

const TIER_C_PATTERNS = [
  /^chore/, /^style/, /README/, /\.gitignore/, /eslint/, /lint/,
  /formatting/, /whitespace/, /typo/, /backup/,
];

function classifyTier(commitType, changedFiles, body) {
  const allText = `${commitType} ${changedFiles.join(' ')} ${body}`;
  if (TIER_A_PATTERNS.some(p => p.test(allText))) return 'A';
  if (TIER_C_PATTERNS.some(p => p.test(allText))) return 'C';
  return 'B';
}

// ─────────────────────────────────────────────────────
// Extract machine-readable context tags from commit body
// ─────────────────────────────────────────────────────
function extractTags(body) {
  const tags = {};
  const patterns = {
    Skill: /\[Skill:\s*([^\]]+)\]/gi,
    MCP: /\[MCP:\s*([^\]]+)\]/gi,
    SSOT: /\[SSOT:\s*([^\]]+)\]/gi,
    Rule: /\[Rule:\s*([^\]]+)\]/gi,
  };
  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = [...body.matchAll(pattern)].map(m => m[1].trim());
    if (matches.length) tags[key] = matches;
  }
  return tags;
}

// ─────────────────────────────────────────────────────
// Format tags as compact inline string
// ─────────────────────────────────────────────────────
function formatTags(tagsMap) {
  const parts = [];
  for (const [key, values] of Object.entries(tagsMap)) {
    parts.push(`[${key}: ${values.join(', ')}]`);
  }
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────
// Load git log for a date range
// ─────────────────────────────────────────────────────
function loadGitLog(since = null) {
  const sinceArg = since ? `--since="${since}"` : '';
  const raw = execSync(
    `git log ${sinceArg} --format="COMMIT_START%n%H%n%ad%n%s%n%b%nCOMMIT_END" --date=format:"%d/%m/%y" --diff-filter=ACMR --name-only`,
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );

  const commits = [];
  const blocks = raw.split('COMMIT_START\n').filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.split('\n');
    const hash = lines[0]?.trim();
    const date = lines[1]?.trim();
    const subject = lines[2]?.trim();
    const endIdx = lines.indexOf('COMMIT_END');
    const bodyLines = lines.slice(3, endIdx >= 0 ? endIdx : lines.length);

    const body = bodyLines.filter(l => !l.startsWith(' ') || l.trim()).join('\n').trim();
    const changedFiles = bodyLines.filter(l => l.trim() && !l.startsWith('[') && l.includes('/') || l.endsWith('.js') || l.endsWith('.json') || l.endsWith('.md') || l.endsWith('.mdc'));

    if (hash && date && subject) {
      commits.push({ hash, date, subject, body, changedFiles, tags: extractTags(body) });
    }
  }

  return commits;
}

// ─────────────────────────────────────────────────────
// Group commits by date and build narrative blocks
// ─────────────────────────────────────────────────────
function buildDateBlocks(commits) {
  const byDate = {};
  for (const commit of commits) {
    if (!byDate[commit.date]) byDate[commit.date] = [];
    byDate[commit.date].push(commit);
  }

  const blocks = [];
  for (const [date, dayCommits] of Object.entries(byDate)) {
    const tierA = [], tierB = [], tierC = [];
    const allTags = { Skill: [], MCP: [], SSOT: [], Rule: [] };

    for (const c of dayCommits) {
      const tier = classifyTier(c.subject, c.changedFiles, c.body);
      const entry = c.subject;
      if (tier === 'A') tierA.push(entry);
      else if (tier === 'B') tierB.push(entry);
      else tierC.push(entry);

      for (const [key, vals] of Object.entries(c.tags)) {
        if (allTags[key]) allTags[key].push(...vals);
      }
    }

    // Deduplicate tags
    for (const key of Object.keys(allTags)) {
      allTags[key] = [...new Set(allTags[key])];
      if (!allTags[key].length) delete allTags[key];
    }

    const parts = [];
    if (tierA.length) parts.push(...tierA);
    if (tierB.length) parts.push(...tierB);
    if (tierC.length) parts.push(`прочие улучшения: ${tierC.join('; ')}`);

    const tagsStr = formatTags(allTags);
    const narrative = parts.join('; ');
    const tagsLine = tagsStr ? `\n<!-- ${tagsStr} -->` : '';

    blocks.push({ date, text: `### ${date}\n${narrative}${tagsLine}` });
  }

  // Sort descending by date (newest first)
  blocks.sort((a, b) => {
    const parse = d => {
      const [dd, mm, yy] = d.split('/');
      return new Date(`20${yy}-${mm}-${dd}`);
    };
    return parse(b.date) - parse(a.date);
  });

  return blocks;
}

// ─────────────────────────────────────────────────────
// Read existing evolution file and parse date blocks
// ─────────────────────────────────────────────────────
function readExisting() {
  if (!existsSync(EVOLUTION_FILE)) return { header: '', blocks: {} };

  const content = readFileSync(EVOLUTION_FILE, 'utf8');
  const lines = content.split('\n');

  let headerLines = [];
  let inHeader = true;
  const blocks = {};
  let currentDate = null;
  let currentLines = [];

  for (const line of lines) {
    if (inHeader && line.startsWith('### ')) inHeader = false;
    if (inHeader) { headerLines.push(line); continue; }

    if (line.startsWith('### ')) {
      if (currentDate) blocks[currentDate] = currentLines.join('\n').trimEnd();
      currentDate = line.replace('### ', '').trim();
      currentLines = [line];
    } else {
      if (currentDate) currentLines.push(line);
    }
  }
  if (currentDate) blocks[currentDate] = currentLines.join('\n').trimEnd();

  return { header: headerLines.join('\n'), blocks };
}

// ─────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────
const HEADER = `# Project Evolution Log — MMB

> Machine-assisted log generated from git history.
> One date = one block. Tier A (architecture-critical) → Tier B (structural) → Tier C (operational).
> Context tags \`[Skill:] [MCP:] [SSOT:] [Rule:]\` link entries to knowledge graph.
>
> To update manually: add entries under the correct \`### DD/MM/YY\` heading.
> To regenerate: \`node scripts/architecture/project-evolution-update.js\`

---

`;

function main() {
  console.log(`[project-evolution] Mode: ${REBUILD ? 'REBUILD' : 'UPDATE'} ${DRY_RUN ? '(dry-run)' : ''}`);

  const since = REBUILD ? null : new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
  const commits = loadGitLog(since);

  if (!commits.length) {
    console.log('[project-evolution] No new commits found. Nothing to update.');
    return;
  }

  console.log(`[project-evolution] Loaded ${commits.length} commits.`);

  const newBlocks = buildDateBlocks(commits);
  const existing = REBUILD ? { header: HEADER, blocks: {} } : readExisting();

  // Merge: new blocks override existing blocks for the same date
  const merged = { ...existing.blocks };
  for (const block of newBlocks) {
    merged[block.date] = block.text;
  }

  // Sort all dates descending
  const sortedDates = Object.keys(merged).sort((a, b) => {
    const parse = d => {
      const [dd, mm, yy] = d.split('/');
      return new Date(`20${yy}-${mm}-${dd}`);
    };
    return parse(b) - parse(a);
  });

  const header = REBUILD ? HEADER : (existing.header || HEADER);
  const body = sortedDates.map(d => merged[d]).join('\n\n---\n\n');
  const output = header + body + '\n';

  if (DRY_RUN) {
    console.log('\n' + output);
    return;
  }

  writeFileSync(EVOLUTION_FILE, output, 'utf8');
  console.log(`[project-evolution] Updated: ${EVOLUTION_FILE}`);
  console.log(`[project-evolution] ${sortedDates.length} date blocks total.`);
}

main();
