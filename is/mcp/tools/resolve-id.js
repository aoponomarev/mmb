/**
 * #JS-v1JRkux7
 * @description MCP tool resolve_id: resolve id:xxx or #JS-xxx to repo path and existence.
 */
import { resolveId } from "../../contracts/docs/resolve-id.js";

export const resolveIdToolDef = {
  name: "resolve_id",
  description: "Resolve id:xxx (doc) or #JS-xxx/#TS-xxx/#CSS-xxx/#JSON-xxx (code) to repo-relative path and file existence.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Token: id:sk-xxx, id:ais-xxx, #JS-xxx, #TS-xxx, #CSS-xxx, #JSON-xxx"
      }
    },
    required: ["id"]
  }
};

export async function resolveIdHandler(args) {
  const { id } = args;
  if (!id || typeof id !== "string") {
    return {
      isError: true,
      content: [{ type: "text", text: "Missing or invalid id parameter." }]
    };
  }
  const result = resolveId(id.trim());
  const out = result ? { path: result.path, exists: result.exists } : null;
  return {
    content: [{ type: "text", text: JSON.stringify(out, null, 2) }]
  };
}
