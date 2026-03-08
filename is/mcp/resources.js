/**
 * #JS-HU3hEyDe
 * @description MCP resources: skill://, causality graph, causality backlog; reads markdown and injects context.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../contracts/path-contracts.js';
import { db } from './db.js';

/**
 * Handle skill:// requests.
 * Reads the markdown skill, looks up its hashes in the DB, and injects context.
 */
export function handleSkillResource(uri) {
    // uri format: skill://app/skills/ui-architecture.md
    const relPath = uri.replace('skill://', '');
    const absPath = path.join(ROOT, relPath);

    if (!fs.existsSync(absPath)) {
        throw new Error(`Skill file not found: ${relPath}`);
    }

    const content = fs.readFileSync(absPath, 'utf8');

    // Extract hashes to look up stats
    const hashRegex = /#(?:for|not)-[\w-]+/g;
    const hashes = [...new Set(content.match(hashRegex) || [])];

    let telemetryBlock = `> [MCP Telemetry Injected]\n`;
    
    if (hashes.length > 0) {
        const placeholders = hashes.map(() => '?').join(',');
        const stmt = db.prepare(`SELECT source_hash, COUNT(*) as count FROM dependency_graph WHERE source_hash IN (${placeholders}) GROUP BY source_hash`);
        const stats = stmt.all(...hashes);

        telemetryBlock += `> Associated Hashes Anchors:\n`;
        for (const stat of stats) {
            telemetryBlock += `> - ${stat.source_hash}: ${stat.count} anchors in codebase\n`;
        }
    } else {
        telemetryBlock += `> No causality hashes found in this skill.\n`;
    }

    const finalContent = `${telemetryBlock}\n${content}`;

    return {
        contents: [{
            uri,
            mimeType: "text/markdown",
            text: finalContent
        }]
    };
}

/**
 * Handle causality_backlog:// requests
 */
export function handleCausalityBacklogResource(uri) {
    const stmt = db.prepare(`SELECT id, file_path, line_number, comment_text FROM raw_causalities WHERE status = 'pending'`);
    const rows = stmt.all();

    let text = `# Causality Harvesting Backlog\n\n`;
    if (rows.length === 0) {
        text += `The backlog is empty. Good job!\n`;
    } else {
        text += `Found ${rows.length} pending raw causalities:\n\n`;
        for (const row of rows) {
            text += `### ID: ${row.id}\n`;
            text += `- **File**: \`${row.file_path}\` (Line: ${row.line_number})\n`;
            text += `- **Raw Comment**: ${row.comment_text}\n\n`;
        }
    }

    return {
        contents: [{
            uri,
            mimeType: "text/markdown",
            text
        }]
    };
}
export function handleCausalityGraphResource(uri) {
    // uri format: causality_graph://#for-classes-add-remove
    const hash = uri.replace('causality_graph://', '');
    
    const stmt = db.prepare(`SELECT target_file FROM dependency_graph WHERE source_hash = ?`);
    const rows = stmt.all(hash);

    let text = `# Causality Graph for ${hash}\n\n`;
    if (rows.length === 0) {
        text += `No files are currently anchored to this hash.\n`;
    } else {
        text += `Found ${rows.length} files:\n`;
        for (const row of rows) {
            text += `- ${row.target_file}\n`;
        }
    }

    return {
        contents: [{
            uri,
            mimeType: "text/markdown",
            text
        }]
    };
}
