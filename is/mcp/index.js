/**
 * #JS-3M2cDJyX
 * @description MCP server: MM B Causality — tools (preflight, create-skill, query-telemetry, harvester, cloudflare, distill-plan), resources.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
    CallToolRequestSchema, 
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { logEvent } from "./telemetry.js";
import { preflightToolDef, runPreflightHandler } from "./tools/preflight.js";
import { createSkillToolDef, createSkillHandler } from "./tools/create-skill.js";
import { queryTelemetryToolDef, queryTelemetryHandler } from "./tools/query-telemetry.js";
import { harvestCausalitiesToolDef, harvestCausalitiesHandler } from "./tools/harvester.js";
import { cfD1QueryToolDef, cfD1QueryHandler, cfKvGetToolDef, cfKvGetHandler } from "./tools/cloudflare.js";
import { distillPlanToolDef, distillPlanHandler } from "./tools/distill-plan.js";
import { resolveIdToolDef, resolveIdHandler } from "./tools/resolve-id.js";
import { handleSkillResource, handleCausalityGraphResource, handleCausalityBacklogResource } from "./resources.js";

const server = new Server({
    name: "MMB Causality MCP",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {},
        resources: {}
    }
});

// We will register tools and resources here later

// -----------------------------------------
// Tools
// -----------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            preflightToolDef,
            createSkillToolDef,
            queryTelemetryToolDef,
            harvestCausalitiesToolDef,
            cfD1QueryToolDef,
            cfKvGetToolDef,
            distillPlanToolDef,
            resolveIdToolDef,
            {
                name: "ping",
                description: "Test the MCP server connection",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    // Log tool usage
    logEvent('tool_call', name, 'cursor', { args });

    if (name === "ping") {
        return {
            content: [{ type: "text", text: "pong" }]
        };
    }
    
    if (name === "run_preflight") {
        return await runPreflightHandler(args);
    }
    
    if (name === "create_skill") {
        return await createSkillHandler(args);
    }

    if (name === "query_telemetry") {
        return await queryTelemetryHandler(args);
    }

    if (name === "harvest_causalities") {
        return await harvestCausalitiesHandler(args);
    }

    if (name === "cf_d1_query") {
        return await cfD1QueryHandler(args);
    }

    if (name === "cf_kv_get") {
        return await cfKvGetHandler(args);
    }

    if (name === "distill_plan") {
        return await distillPlanHandler(args);
    }

    if (name === "resolve_id") {
        return await resolveIdHandler(args);
    }

    throw new Error(`Tool not found: ${name}`);
});

// -----------------------------------------
// Resources
// -----------------------------------------
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // In a real scenario, we might want to list all available skills here dynamically
    // For now we just return a static list of example templates to hint the agent
    return {
        resources: [
            {
                uri: "causality_graph://#for-classes-add-remove",
                name: "Example Causality Graph",
                description: "Shows files dependent on this hash",
                mimeType: "text/markdown"
            }
        ]
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // Log resource read
    logEvent('resource_read', uri, 'cursor');

    if (uri.startsWith('skill://')) {
        return handleSkillResource(uri);
    }
    
    if (uri.startsWith('causality_graph://')) {
        return handleCausalityGraphResource(uri);
    }

    if (uri === 'causality_backlog://') {
        return handleCausalityBacklogResource(uri);
    }

    throw new Error(`Resource not found: ${uri}`);
});

// -----------------------------------------
// Startup
// -----------------------------------------
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // @causality #for-mcp-stdio-protocol stdout stays protocol-only, diagnostics go to stderr.
    console.error("MMB Causality MCP Server running on stdio"); 
}

main().catch((error) => {
    console.error("Fatal error starting MCP server:", error);
    process.exit(1);
});
