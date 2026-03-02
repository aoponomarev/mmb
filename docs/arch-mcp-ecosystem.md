# The MCP Causality Ecosystem

## 1. Concept

The MMB project has evolved from static Markdown documentation (`is/skills/*`) into an active, telemetry-driven **LLMOps Ecosystem** using the Model Context Protocol (MCP).

Instead of relying solely on the AI agent reading files and typing raw CLI commands, we have introduced a local **Node.js MCP Server** (`is/mcp/index.js`) backed by a **SQLite Database** (`data/telemetry.sqlite`). 

This creates a feedback loop:
1. The AI Agent reads/writes code.
2. The MCP Server proxies and logs these actions (Telemetry).
3. The Database aggregates usage statistics (Anchor count, failures, harvest backlog).
4. The MCP Server dynamically injects these statistics back into the Agent's context.

## 2. Components

### A. The Database (`data/telemetry.sqlite`)
A local, non-version-controlled SQLite database containing:
- `events`: Logs every time a tool or resource is accessed.
- `fragility_stats`: Tracks which files fail preflight checks most often.
- `raw_causalities`: A backlog of unhashed `// @causality` comments waiting to be formalized.
- `dependency_graph`: A highly queried cache of every `#hash` and the files that depend on it.

### B. Smart Resources
Instead of reading raw markdown files, the Agent can request dynamic resources via the MCP server:
- `skill://[path]`: Reads the markdown skill but **prepends dynamic telemetry**. For example, it will tell the Agent: *"This skill has 42 active anchors in the codebase"*. This forces the Agent to treat highly-used skills with more caution.
- `causality_graph://[hash]`: Instantly returns a list of all files that depend on a specific causality hash (bypassing the need for slow `grep` searches).
- `causality_backlog://`: Returns a list of all pending, unformalized `// @causality` comments for the Agent to review.

### C. Native Tools
CLI commands have been abstracted into safe, typed MCP Tools:
- `run_preflight`: Runs the causality/invariant checks and logs failures.
- `create_skill`: Generates new skill templates reliably.
- `query_telemetry`: Allows the Agent to execute read-only `SELECT` SQL queries against its own telemetry data.
- `harvest_causalities`: Scans the codebase for raw comments and populates the backlog.
- `cf_d1_query` / `cf_kv_get`: Safe wrappers around Cloudflare Wrangler for database/KV interaction.

## 3. The Workflows

### The Harvesting Workflow (Skill Watcher)
1. A developer or agent encounters a weird edge case and leaves a raw comment: `// @causality Because the File API throws on X...`
2. Periodically, the agent runs the **`harvest_causalities`** tool.
3. The MCP server parses the code and inserts these comments into the `raw_causalities` table.
4. The agent reads the **`causality_backlog://`** resource.
5. If it sees the same issue 3+ times, it invents a hash (e.g. `#for-file-api-fallback`), creates a skill via **`create_skill`**, and updates the codebase to use the new hash.

### The Invariant Workflow
1. The agent modifies a file and accidentally deletes a `#for-xyz` hash.
2. The agent runs **`run_preflight`**.
3. The internal `validate-causality-invariant.js` script detects that the hash exists in other files but was removed here. It throws a fatal error.
4. If successful, the script dumps the newly validated graph into the SQLite `dependency_graph` table, keeping the `causality_graph://` resource instantly up to date.

## 4. How to Configure (For Developers)

To activate this ecosystem in Cursor:
1. Go to **Cursor Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. **Name**: MMB Causality
4. **Type**: `command`
5. **Command**: `node`
6. **Args**: `is/mcp/index.js`
7. Click Save. 

Cursor will now seamlessly route `skill://` reads and `run_preflight` tool calls through the local infrastructure.