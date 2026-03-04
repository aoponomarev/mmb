/**
 * #JS-DJ3saX9U
 * @description MCP tools: cf_d1_query (read-only), cf_kv_get; SELECT-only for D1.
 */
import { exec } from 'node:child_process';
import util from 'node:util';

const execPromise = util.promisify(exec);

export const cfD1QueryToolDef = {
    name: "cf_d1_query",
    description: "Run a read-only SQL query against the Cloudflare D1 database (using local or remote wrangler).",
    inputSchema: {
        type: "object",
        properties: {
            dbName: {
                type: "string",
                description: "Name of the D1 database"
            },
            query: {
                type: "string",
                description: "The SQL query string"
            },
            remote: {
                type: "boolean",
                description: "If true, queries the production database instead of local."
            }
        },
        required: ["dbName", "query"]
    }
};

export async function cfD1QueryHandler(args) {
    const { dbName, query, remote } = args;
    
    // @causality We enforce SELECT-only at the MCP layer because D1 schema migrations must go through strict PR reviews and wrangler migrations, never ad-hoc AI mutations.
    if (!/^\s*SELECT/i.test(query)) {
        return {
            isError: true,
            content: [{ type: "text", text: "Security Error: cf_d1_query only supports SELECT queries. For mutations, use explicit migration tools." }]
        };
    }

    try {
        const remoteFlag = remote ? "--remote" : "";
        const safeQuery = query.replace(/"/g, '\\"');
        const cmd = `npx wrangler d1 execute ${dbName} ${remoteFlag} --command="${safeQuery}" --json`;
        
        const { stdout } = await execPromise(cmd);
        return {
            content: [{ type: "text", text: stdout }]
        };
    } catch (e) {
        return {
            isError: true,
            content: [{ type: "text", text: `D1 Error: ${e.message}\nSTDOUT: ${e.stdout}\nSTDERR: ${e.stderr}` }]
        };
    }
}

export const cfKvGetToolDef = {
    name: "cf_kv_get",
    description: "Get a value from a Cloudflare KV namespace.",
    inputSchema: {
        type: "object",
        properties: {
            namespace: { type: "string" },
            key: { type: "string" },
            remote: { type: "boolean", description: "Use remote namespace" }
        },
        required: ["namespace", "key"]
    }
};

export async function cfKvGetHandler(args) {
    const { namespace, key, remote } = args;
    try {
        const remoteFlag = remote ? "--remote" : "";
        const { stdout } = await execPromise(`npx wrangler kv:key get --binding=${namespace} "${key}" ${remoteFlag}`);
        return { content: [{ type: "text", text: stdout }] };
    } catch (e) {
        return { isError: true, content: [{ type: "text", text: `KV Error: ${e.message}` }] };
    }
}
