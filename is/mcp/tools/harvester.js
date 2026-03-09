/**
 * #JS-2w2TdTy7
 * @description MCP tool: harvest_causalities — scans codebase for intentional @causality QUESTION markers, adds to backlog, marks formalized as harvested.
 * @causality #for-causality-harvesting
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../contracts/path-contracts.js';
import { db } from '../db.js';

const CODE_DIRS = [
    path.join(ROOT, 'is'),
    path.join(ROOT, 'core'),
    path.join(ROOT, 'app'),
    path.join(ROOT, 'shared'),
    path.join(ROOT, '.cursor', 'rules'),
];

const HARVEST_EXTS = ['.js', '.ts', '.mdc'];
const HASH_REGEX = /#(?:for|not)-[\w-]+/;

export const harvestCausalitiesToolDef = {
    name: "harvest_causalities",
    description: "Scans the codebase for @causality QUESTION markers and adds them to the backlog for review/formalization.",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    }
};

function walkCodeFiles(dir, result = []) {
    if (!fs.existsSync(dir)) return result;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name === ".git") continue;
            walkCodeFiles(full, result);
        } else if (entry.isFile() && HARVEST_EXTS.some(ext => entry.name.endsWith(ext))) {
            result.push(full);
        }
    }
    return result;
}

/** Only intentional causality candidates: comment line + @causality QUESTION: + no hash. */
function isQuestionCausality(line) {
    const trimmed = line.trim();
    const isComment = /^\s*(\/\/|\*|\/\*|<!--)/.test(line) || trimmed.startsWith('*');
    return isComment && /@causality/i.test(line) && /^.*@causality\s*:?\s*QUESTION\s*:/i.test(line) && !HASH_REGEX.test(line);
}

export async function harvestCausalitiesHandler() {
    try {
        const files = CODE_DIRS.flatMap(dir => walkCodeFiles(dir));
        let addedCount = 0;
        let harvestedCount = 0;

        const checkStmt = db.prepare(`SELECT count(*) as count FROM raw_causalities WHERE file_path = ? AND line_number = ?`);
        const insertStmt = db.prepare(`INSERT INTO raw_causalities (file_path, line_number, comment_text) VALUES (?, ?, ?)`);
        const pendingStmt = db.prepare(`SELECT id, file_path, line_number FROM raw_causalities WHERE status = 'pending'`);
        const updateHarvestedStmt = db.prepare(`UPDATE raw_causalities SET status = 'harvested' WHERE id = ?`);

        db.transaction(() => {
            // 1. Mark formalized: pending rows where line now has #for-X/#not-X
            const pending = pendingStmt.all();
            for (const row of pending) {
                const absPath = path.join(ROOT, row.file_path);
                if (!fs.existsSync(absPath)) continue;
                const lines = fs.readFileSync(absPath, 'utf8').split('\n');
                const lineIdx = (row.line_number || 1) - 1;
                if (lineIdx >= 0 && lineIdx < lines.length && HASH_REGEX.test(lines[lineIdx])) {
                    updateHarvestedStmt.run(row.id);
                    harvestedCount++;
                }
            }

            // 2. Add new raw causalities
            for (const file of files) {
                const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (isQuestionCausality(line)) {
                        const commentText = line.trim();
                        const { count } = checkStmt.get(relPath, i + 1);
                        if (count === 0) {
                            insertStmt.run(relPath, i + 1, commentText);
                            addedCount++;
                        }
                    }
                }
            }
        })();

        const msg = harvestedCount > 0
            ? `[SUCCESS] Harvester complete. Added ${addedCount} new, marked ${harvestedCount} as harvested.`
            : `[SUCCESS] Harvester complete. Added ${addedCount} new raw causalities to the backlog.`;
        return { content: [{ type: "text", text: msg }] };
    } catch (e) {
        return {
            isError: true,
            content: [{ type: "text", text: `[FAILED] Harvester error: ${e.message}` }]
        };
    }
}
