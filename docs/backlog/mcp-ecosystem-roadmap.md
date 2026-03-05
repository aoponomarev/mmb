---
id: backlog-69de5d
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# MCP & Causality Ecosystem Roadmap (LLMOps)

**Status:** Planned
**Target:** Transform the static Markdown causality registry and scripts into an active, telemetry-driven Model Context Protocol (MCP) ecosystem.

---

## Phase 1: Foundation (Data Layer)
*Objective: Prepare the SQLite database to store telemetry, graphs, and audit history.*
- [ ] Verify `data/` directory exists and is git-ignored (Checked: `.gitignore` ignores `data/*.sqlite`).
- [ ] Initialize `data/mcp.sqlite` database using Node.js (`better-sqlite3` or built-in `node:sqlite`).
- [ ] Create Database Migrations/Schemas:
  - `events`: (id, timestamp, event_type, target_id, agent_id, context).
  - `fragility_stats`: (file_path, failures_count, last_failure_at).
  - `raw_causalities`: (id, file_path, line_number, comment_text, hash_proposal, status).
  - `dependency_graph`: (source_hash, target_file, anchor_type).
  - `confidence_audits`: (skill_id, old_confidence, new_confidence, audit_date).

## Phase 2: MCP Server Core
*Objective: Build the Node.js MCP server application.*
- [ ] Scaffold MCP project in `is/mcp/`.
- [ ] Install official `@modelcontextprotocol/sdk`.
- [ ] Implement Server Initialization (stdio transport).
- [ ] Implement Telemetry Middleware: Intercept every Tool/Resource call and log it to the `events` table in SQLite.
- [ ] Configure Cursor to use the local MCP server (`"command": "node", "args": ["is/mcp/index.js"]`).

## Phase 3: The Six Pillars (Features)
*Objective: Implement the core business value features requested for the AI Agent.*

### Pillar 1: CLI Scripts -> Native AI Tools
- [ ] **Tool `run_preflight`**: Wrapper around `npm run preflight`. Captures errors and updates `fragility_stats` in the DB.
- [ ] **Tool `create_skill`**: Native interface for generating new skill files (replaces `node is/scripts/architecture/create-skill.js`).

### Pillar 2: Dynamic Causality Graph (Smart Resources)
- [ ] **Resource `causality_graph://...`**: Dynamic JSON/Markdown resource returning all files connected to a specific hash, read directly from the `dependency_graph` table (which is faster than grep).
- [ ] **Tool `query_telemetry`**: SQL interface allowing the agent to query the SQLite DB (e.g., "Which skills are used least?").

### Pillar 3: Context Injection
- [ ] **Resource `skill://[skill-name]`**: When an agent requests a skill through MCP, the server reads the markdown file, prepends a "Telemetry Block" (e.g., *[Telemetry: Used 42 times, 5 anchors]*), and returns it.

### Pillar 4: Secure Cloudflare Bridge
- [ ] **Tool `cf_d1_query`**: Wraps `wrangler d1 execute` for safe database queries without manual CLI typing.
- [ ] **Tool `cf_kv_get` / `cf_kv_put`**: Wraps `wrangler kv:key get/put`.

### Pillar 5: Automatic Skill Watcher (Harvester)
- [ ] **Tool `harvest_causalities`**: Scans the codebase for raw `// @causality` comments and inserts them into the `raw_causalities` table.
- [ ] **Resource `causality_backlog://`**: Allows the agent to review pending, unhashed causalities.

### Pillar 6: Invariant Guard (Hallucination Protection)
- [ ] Integrate invariant checking directly into the MCP `update_skill` or `refactor_code` loop (if implemented as tools), or enhance `run_preflight` to return strictly formatted invariant violations.
- [ ] Sync the `validate-causality-invariant.js` output to update the `dependency_graph` table upon success.

## Phase 4: System Integration & Skilling
*Objective: Teach the system how to use itself.*
- [ ] Add `is/skills/arch-mcp-ecosystem.md` explaining the Server, SQLite, and Tools.
- [ ] Update `is/skills/process-causality-harvesting.md` to reference the new SQLite backlog approach.
- [ ] Enhance `.cursorrules` to instruct the agent to use MCP tools instead of CLI for these specific tasks.

## Phase 5: Final Documentation
*Objective: Provide a comprehensive human-readable guide.*
- [ ] Create arch-mcp-ecosystem doc in docs/: The grand manual combining MCP, Skills, Causality, SQLite, Invariant Checks, and Agent Rules into one narrative.
