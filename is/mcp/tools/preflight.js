/**
 * #JS-PE4184KQ
 * @description MCP tool run_preflight: runs full preflight (causality, skills); run after modifying skills or code.
 */
import { exec } from 'node:child_process';
import util from 'node:util';
import path from 'node:path';
import { ROOT } from '../../contracts/path-contracts.js';

const execPromise = util.promisify(exec);

export const preflightToolDef = {
    name: "run_preflight",
    description: "Run the full preflight causality and skill checks. ALWAYS run this after modifying skills or code.",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    }
};

export async function runPreflightHandler() {
    try {
        const { stdout, stderr } = await execPromise('npm run preflight', { cwd: ROOT });
        return {
            content: [{ type: "text", text: `[SUCCESS] Preflight checks passed.\n\nSTDOUT:\n${stdout}` }]
        };
    } catch (error) {
        // Ideally, we could parse the error to find exact files to mark in fragility_stats.
        // For now, we return the error log.
        return {
            isError: true,
            content: [{ type: "text", text: `[FAILED] Preflight checks failed.\n\nSTDOUT:\n${error.stdout}\n\nSTDERR:\n${error.stderr}` }]
        };
    }
}
