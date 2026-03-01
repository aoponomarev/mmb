/**
 * is/scripts/architecture/project-evolution-update.js
 *
 * Automated project evolution log updater.
 *
 * Usage:
 *   node is/scripts/architecture/project-evolution-update.js          — append today's commits
 *   node is/scripts/architecture/project-evolution-update.js --rebuild — rebuild full log from scratch
 *   node is/scripts/architecture/project-evolution-update.js --dry-run — print to stdout, no file write
 *
 * Output: docs/project-evolution.md
 *
 * Tier classification:
 *   A = architecture-critical (MCP, docker, paths.js, package.json, skills, .cursor/rules)
 *   B = structural (new scripts, integrations, refactors, tests)
 *   C = operational (chore, formatting, README, gitignore)
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const EVOLUTION_FILE = resolve(ROOT, 'docs/project-evolution.md');
const WRITER_SWITCH_LOG = resolve(ROOT, 'is/logs/active-writer-switch.jsonl');

const DRY_RUN = process.argv.includes('--dry-run');
const REBUILD = process.argv.includes('--rebuild');

const TIER_A_PATTERNS = [
    /^feat/, /^fix.*critical/, /BREAKING CHANGE/,
    /is\/mcp\//, /is\/contracts\//, /\.env/, /paths\.js/, /package\.json/,
    /is\/skills\//, /\.cursor\/rules/, /arch-foundation/,
];

const TIER_C_PATTERNS = [
    /^chore/, /^style/, /README/, /\.gitignore/, /eslint/, /lint/,
    /formatting/, /whitespace/, /typo/, /backup/,
];

function classifyTier(subject, changedFiles, body) {
    const allText = `${subject} ${changedFiles.join(' ')} ${body}`;
    if (TIER_A_PATTERNS.some(p => p.test(allText))) return 'A';
    if (TIER_C_PATTERNS.some(p => p.test(allText))) return 'C';
    return 'B';
}

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

function loadGitLog(since = null) {
    const sinceArg = since ? `--since="${since}"` : '';
    let raw;
    try {
        raw = execSync(
            `git log ${sinceArg} --format="COMMIT_START%n%H%n%ad%n%s%n%b%nCOMMIT_END" --date=format:"%d/%m/%y" --name-only`,
            { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
        );
    } catch {
        return [];
    }

    const commits = [];
    const blocks = raw.split('COMMIT_START\n').filter(b => b.trim());

    for (const block of blocks) {
        const lines = block.split('\n');
        const hash = lines[0]?.trim();
        const date = lines[1]?.trim();
        const subject = lines[2]?.trim();
        const endIdx = lines.indexOf('COMMIT_END');
        const bodyLines = lines.slice(3, endIdx >= 0 ? endIdx : lines.length);
        const body = bodyLines.filter(l => !l.match(/^[a-z].*\.\w+$/)).join('\n').trim();
        const changedFiles = bodyLines.filter(l => l.trim() && (l.includes('/') || /\.\w+$/.test(l.trim())));

        if (hash && date && subject) {
            commits.push({ hash, date, subject, body, changedFiles, tags: extractTags(body) });
        }
    }
    return commits;
}

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
            if (tier === 'A') tierA.push(c.subject);
            else if (tier === 'B') tierB.push(c.subject);
            else tierC.push(c.subject);

            for (const [key, vals] of Object.entries(c.tags)) {
                if (allTags[key]) allTags[key].push(...vals);
            }
        }

        for (const key of Object.keys(allTags)) {
            allTags[key] = [...new Set(allTags[key])];
            if (!allTags[key].length) delete allTags[key];
        }

        const parts = [];
        if (tierA.length) parts.push(...tierA.map(s => `**[A]** ${s}`));
        if (tierB.length) parts.push(...tierB.map(s => `**[B]** ${s}`));
        if (tierC.length) parts.push(`**[C]** ${tierC.join('; ')}`);

        const tagsStr = Object.entries(allTags).map(([k, v]) => `[${k}: ${v.join(', ')}]`).join(' ');
        const narrative = parts.join('\n');
        const tagsLine = tagsStr ? `\n<!-- ${tagsStr} -->` : '';

        blocks.push({ date, narrative, tagsLine, text: `### ${date}\n\n${narrative}${tagsLine}` });
    }

    blocks.sort((a, b) => {
        const parse = d => { const [dd, mm, yy] = d.split('/'); return new Date(`20${yy}-${mm}-${dd}`); };
        return parse(b.date) - parse(a.date);
    });

    return blocks;
}

function readExisting() {
    if (!existsSync(EVOLUTION_FILE)) return { header: '', blocks: {} };
    const content = readFileSync(EVOLUTION_FILE, 'utf8');
    const lines = content.split('\n');
    let headerLines = [], inHeader = true, currentDate = null, currentLines = [];
    const blocks = {};

    for (const line of lines) {
        if (inHeader && line.startsWith('### ')) inHeader = false;
        if (inHeader) { headerLines.push(line); continue; }
        if (line.startsWith('### ')) {
            if (currentDate) blocks[currentDate] = currentLines.join('\n').trimEnd();
            currentDate = line.replace('### ', '').trim();
            currentLines = [line];
        } else if (currentDate) {
            currentLines.push(line);
        }
    }
    if (currentDate) blocks[currentDate] = currentLines.join('\n').trimEnd();
    return { header: headerLines.join('\n'), blocks };
}

const HEADER = `# Project Evolution Log

> Auto-assisted log generated from git history + manual entries.
> One date = one block. **[A]** architecture-critical → **[B]** structural → **[C]** operational.
> Context tags \`[Skill:] [MCP:] [SSOT:] [Rule:]\` link entries to the knowledge graph.
>
> To update: \`npm run evolution:update\`
> To rebuild: \`npm run evolution:rebuild\`

---

`;

function main() {
    console.log(`[project-evolution] Mode: ${REBUILD ? 'REBUILD' : 'UPDATE'}${DRY_RUN ? ' (dry-run)' : ''}`);

    const existing = REBUILD ? { header: HEADER, blocks: {} } : readExisting();

    let since = null;
    if (!REBUILD) {
        const dates = Object.keys(existing.blocks);
        if (dates.length > 0) {
            const parse = d => { const [dd, mm, yy] = d.split('/'); return new Date(`20${yy}-${mm}-${dd}`); };
            const [dd, mm, yy] = dates.sort((a, b) => parse(b) - parse(a))[0].split('/');
            const latestDate = new Date(`20${yy}-${mm}-${dd}`);
            since = new Date(latestDate.getTime() - 86400000).toISOString().split('T')[0];
        } else {
            since = new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0];
        }
    }

    const commits = loadGitLog(since);
    if (!commits.length) {
        console.log('[project-evolution] No new commits found. Nothing to update.');
        return;
    }

    console.log(`[project-evolution] Loaded ${commits.length} commits since ${since || 'beginning'}.`);
    const newBlocks = buildDateBlocks(commits);
    const merged = { ...existing.blocks };

    for (const block of newBlocks) {
        if (merged[block.date]) {
            if (!merged[block.date].includes(block.narrative.split('\n')[0])) {
                merged[block.date] += `\n\n${block.narrative}${block.tagsLine}`;
            }
        } else {
            merged[block.date] = block.text;
        }
    }

    // Merge writer-switch log entries
    if (existsSync(WRITER_SWITCH_LOG)) {
        const entries = readFileSync(WRITER_SWITCH_LOG, 'utf8')
            .split(/\r?\n/).filter(Boolean)
            .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        for (const entry of entries) {
            const d = new Date(entry.ts);
            const dateKey = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
            const line = `**[A]** writer-switch: ${entry.from||'unset'}→${entry.to} by ${entry.by} (${entry.reason})`;
            if (merged[dateKey]) { if (!merged[dateKey].includes(line)) merged[dateKey] += `\n${line}`; }
            else merged[dateKey] = `### ${dateKey}\n\n${line}`;
        }
    }

    const sortedDates = Object.keys(merged).sort((a, b) => {
        const parse = d => { const [dd, mm, yy] = d.split('/'); return new Date(`20${yy}-${mm}-${dd}`); };
        return parse(b) - parse(a);
    });

    const header = REBUILD ? HEADER : (existing.header || HEADER);
    const output = header + sortedDates.map(d => merged[d]).join('\n\n---\n\n') + '\n';

    if (DRY_RUN) { console.log('\n' + output); return; }

    writeFileSync(EVOLUTION_FILE, output, 'utf8');
    console.log(`[project-evolution] Updated: docs/project-evolution.md (${sortedDates.length} date blocks)`);
}

main();
