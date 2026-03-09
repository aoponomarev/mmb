/**
 * #JS-CA4Gi28L
 * @description Logs events into SQLite telemetry DB; recordFragility for failed checks.
 */
import { db } from './db.js';

/**
 * Logs an event into the SQLite telemetry database.
 */
export function logEvent(eventType, targetId, agentId = 'cursor', context = {}) {
    try {
        const stmt = db.prepare(`
            INSERT INTO events (event_type, target_id, agent_id, context) 
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(eventType, targetId, agentId, JSON.stringify(context));
    } catch (e) {
        // @causality #for-telemetry-nonblocking telemetry failures must not take down core MCP flows.
        console.error('Failed to log telemetry event:', e);
    }
}

/**
 * Updates fragility stats when a file fails checks.
 */
export function recordFragility(filePath) {
    try {
        const stmt = db.prepare(`
            INSERT INTO fragility_stats (file_path, failures_count, last_failure_at)
            VALUES (?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(file_path) DO UPDATE SET 
                failures_count = failures_count + 1,
                last_failure_at = CURRENT_TIMESTAMP
        `);
        stmt.run(filePath);
    } catch (e) {
        console.error('Failed to update fragility stats:', e);
    }
}
