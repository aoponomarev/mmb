import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const CODE_DIRS = [
    path.join(ROOT, 'app'),
    path.join(ROOT, 'core'),
    path.join(ROOT, 'shared'),
    path.join(ROOT, 'is', 'mcp')
];

export const harvestCausalitiesToolDef = {
    name: "harvest_causalities",
    description: "Scans the codebase for raw // @causality comments (without hashes) and adds them to the backlog for review.",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    }
};

function walkJsFiles(dir, result = []) {
    if (!fs.existsSync(dir)) return result;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name === ".git") continue;
            walkJsFiles(full, result);
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            result.push(full);
        }
    }
    return result;
}

export async function harvestCausalitiesHandler() {
    try {
        const files = CODE_DIRS.flatMap(dir => walkJsFiles(dir));
        let addedCount = 0;

        const checkStmt = db.prepare(`SELECT count(*) as count FROM raw_causalities WHERE file_path = ? AND line_number = ?`);
        const insertStmt = db.prepare(`INSERT INTO raw_causalities (file_path, line_number, comment_text) VALUES (?, ?, ?)`);

        db.transaction(() => {
            for (const file of files) {
                const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Match // @causality but not if it contains a hash #for- or #not-
                    if (/@causality/i.test(line) && !/#(?:for|not)-[\w-]+/g.test(line)) {
                        const commentText = line.trim();
                        
                        // Check if already in DB
                        const { count } = checkStmt.get(relPath, i + 1);
                        if (count === 0) {
                            insertStmt.run(relPath, i + 1, commentText);
                            addedCount++;
                        }
                    }
                }
            }
        })();

        return {
            content: [{ type: "text", text: `[SUCCESS] Harvester complete. Added ${addedCount} new raw causalities to the backlog.` }]
        };
    } catch (e) {
        return {
            isError: true,
            content: [{ type: "text", text: `[FAILED] Harvester error: ${e.message}` }]
        };
    }
}
