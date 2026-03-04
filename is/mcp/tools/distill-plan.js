/**
 * #JS-Tm1x5Thp
 * @description MCP tool distill_plan: reads plan from docs/done/, returns instructions to create AIS and Skills.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

export const distillPlanToolDef = {
    name: "distill_plan",
    description: "Start the distillation process for a completed plan in docs/done/. It reads the plan and returns instructions for the agent to create AIS and Skills.",
    inputSchema: {
        type: "object",
        properties: {
            planFilename: {
                type: "string",
                description: "The filename of the plan in docs/done/ (e.g. 'plan-domain-models.md')"
            }
        },
        required: ["planFilename"]
    }
};

export async function distillPlanHandler(args) {
    const { planFilename } = args;
    const planPath = path.join(ROOT, 'docs', 'done', planFilename);

    if (!fs.existsSync(planPath)) {
        return {
            isError: true,
            content: [{ type: "text", text: `[FAILED] Plan not found at ${planPath}` }]
        };
    }

    const content = fs.readFileSync(planPath, 'utf8');

    const prompt = `
[SYSTEM PROMPT - DISTILLATION PROTOCOL]
You have successfully loaded the completed plan: ${planFilename}.
Your task as an AI agent is to distill this information according to the #for-distillation rule.

1. Analyze the text below.
2. Separate the "Macro-Architecture" (Concepts, infrastructure, local policies) from the "Micro-Rules" (strict code invariants).
3. Do NOT execute the tool automatically yet. Instead, respond to the user with a proposed structure:
   - What AIS document(s) you will create/update in docs/ais/ (in Russian).
   - What Skills you will create/update in is/skills/ (in English).
4. Once the user approves, use the 'create_skill' tool and the 'Write' file tool to implement the distillation.

--- PLAN CONTENT ---
${content}
`;

    return {
        content: [{ type: "text", text: prompt }]
    };
}
