import { exec } from 'node:child_process';
import util from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

export const createSkillToolDef = {
    name: "create_skill",
    description: "Create a new standardized causality skill file.",
    inputSchema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "The title of the skill (e.g., 'API Error Handling')"
            },
            type: {
                type: "string",
                enum: ["arch", "process", "app", "core", "shared"],
                description: "The directory type: arch/process go to is/skills/, app -> app/skills/, core -> core/skills/, shared -> shared/skills/"
            }
        },
        required: ["title", "type"]
    }
};

export async function createSkillHandler(args) {
    const { title, type } = args;
    try {
        // Need to escape quotes properly for shell
        const safeTitle = title.replace(/"/g, '\\"');
        const { stdout } = await execPromise(`node is/scripts/architecture/create-skill.js "${safeTitle}" --type=${type}`, { cwd: ROOT });
        return {
            content: [{ type: "text", text: `[SUCCESS] Skill created.\n\n${stdout}` }]
        };
    } catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `[FAILED] Could not create skill.\n\nSTDOUT:\n${error.stdout}\n\nSTDERR:\n${error.stderr}` }]
        };
    }
}
