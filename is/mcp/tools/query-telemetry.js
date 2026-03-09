/**
 * #JS-ms2nrzi3
 * @description MCP tool: read-only SQL query against local SQLite telemetry/causality DB; SELECT-only.
 */
import { db } from '../db.js';

export const queryTelemetryToolDef = {
    name: "query_telemetry",
    description: "Execute a read-only SQL query against the local SQLite telemetry/causality database.",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The SQLite query (e.g. 'SELECT * FROM dependency_graph LIMIT 10')"
            }
        },
        required: ["query"]
    }
};

export async function queryTelemetryHandler(args) {
    const { query } = args;
    
    // @causality #for-mcp-readonly-queries local telemetry DB is query-only for MCP safety.
    if (!/^\s*SELECT/i.test(query)) {
        return {
            isError: true,
            content: [{ type: "text", text: "Only SELECT queries are allowed for security." }]
        };
    }

    try {
        const stmt = db.prepare(query);
        const rows = stmt.all();
        return {
            content: [{ type: "text", text: JSON.stringify(rows, null, 2) }]
        };
    } catch (e) {
        return {
            isError: true,
            content: [{ type: "text", text: `SQL Error: ${e.message}` }]
        };
    }
}
