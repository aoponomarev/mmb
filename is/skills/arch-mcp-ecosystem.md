---
title: "MCP Ecosystem (LLMOps)"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "2caa86cd"
id: sk-3225b2

---

# MCP Ecosystem Architecture

> **Context**: The integration of Model Context Protocol (MCP), SQLite telemetry, and AI agent Tooling.
> **Scope**: `is/mcp/*`, `data/telemetry.sqlite`, `.cursorrules`

## Reasoning

- **#for-mcp-telemetry** A static codebase cannot measure the "usefulness" of its own documentation. By proxying all tool executions and file reads through a local MCP server, we can write telemetry to SQLite and definitively know which skills are relied upon and which are dead weight.
- **#for-ai-tooling-abstraction** Forcing agents to remember and perfectly type CLI commands (like `node scripts/xyz.js` or `wrangler d1 execute`) is error-prone. Exposing these as strict JSON-schema MCP Tools guarantees safer, more predictable execution.
- **#for-context-injection** Dynamically injecting telemetry data (e.g., "This skill has 42 anchors") into the top of Markdown files *as they are being read by the agent* dynamically influences agent behavior without mutating the actual markdown file on disk.

## Core Rules

1.  **SQLite Isolation:**
    The telemetry database (`data/telemetry.sqlite`) must remain completely outside the `is/` codebase and MUST NOT be synced to git. It is local, disposable state.

2.  **Tool Priority:**
    If an MCP Tool exists for an operation (e.g., `run_preflight`, `create_skill`), AI agents MUST use the tool rather than falling back to raw shell execution. Tools ensure telemetry is logged.

3.  **Invariant Graph Sync:**
    The `validate-causality-invariant.js` script acts as the bridge between static code and the MCP server. Upon successful validation, it dumps the entire anchor dependency graph into the SQLite `dependency_graph` table. This powers the `causality_graph://` resource.

### Agent Synergy Chain

When multiple MCP servers exist (skills, agents, control-plane, etc.), complex tasks should follow an ordered chain: **Context** (gather state) → **Rules** (verify against skills) → **Action** (execute side-effects). Use `@terminal` context provider for errors instead of manual copy-paste.

### Unified MCP (Single Source)

All logic for external APIs (knowledge base, task management, Git) must live in MCP servers under `is/mcp/`. **Dual integration**: Cursor connects via settings; n8n (when used) connects via MCP Client node. Same tools, same contracts — no duplicate HTTP Request nodes.

### n8n Workflow Hygiene (When n8n Is Used)

- **Data pruning**: Max age 168h, max 1000 executions; save failed executions only for high-frequency workflows.
- **Performance**: WAL mode; use "Split in Batches" for large datasets; limit "Wait" nodes in high-frequency flows.
- **Error handling**: Global Error Trigger → notification; Retry on Failure (3×, 5s) for HTTP nodes; defaults for optional data.
- **Parallelism**: Limit parallel branches to 3–5 to avoid CPU saturation.
- **MCP synergy**: Prefer `mode: "webhook"` or `/execute` for sync responses; pass `agent_id` and `session_id` for traceability.

### Cursor Settings Sync

**Context**: Managing IDE settings and extensions across environments. SSOT: `INFRASTRUCTURE_CONFIG.yaml` for profile-specific paths.

**Scope**: `settings.json` (keybindings, UI preferences); extensions list. **Sync strategy**: Use `powershell .\scripts\sync-cursor-settings.ps1 [backup|restore]`; master copies in defined path; local paths via environment variables.

**Hard constraint**: No secrets in `settings.json`; use `.env` for sensitive API keys.

### GitHub Agentic Collaboration

**Goal**: Leverage GitHub cloud intelligence while maintaining local self-sufficiency and minimizing token costs.

**Beacon strategy**: `.github/copilot-instructions.md` as SSOT for cloud agent context; updated automatically by index generator.

**Token-saving workflow (L3 tasks)**: Create Issue → add label `L3-Discovery` → open in Copilot Workspace → request plan only ("Provide step-by-step plan, do not generate code yet") → execute locally via ВЗП protocol.

**Quality control**: GitHub Actions run `env:check`, index-gen, syntax checks on MCP servers. **Hard constraints**: No direct cloud commits; cloud agents propose via PR/Plans; verify locally before merge; zero-cost (free tier only).

### MCP-to-n8n Interaction Protocol

**Goal**: Standardize communication between AI Agents (via MCP) and n8n Workflows.

**Trigger modes**: Manual Sync `/execute` (default, waits for result); Manual Async `/run` (long-running, returns execution ID); Webhook `/webhook/...` (high-performance).

**Input structure**: `{ action, payload, metadata: { agent, timestamp } }`. **Output**: `{ success, result, error }`.

**Troubleshooting**: 404 → check workflow Active; 401 → verify `N8N_API_KEY`; Timeout → use async mode and poll.

### Node MCP Development Protocol

**Goal**: Standardize development of Node-based MCP services for safe operations.

**Architecture**: Official MCP SDK, stdio transport; validate inputs with zod; null-safe handlers (`params || {}`).

**Safety**: Side-effecting tools support dry-run and confirmation gates; logger failures never crash execution; expose health-check; classify tools as `read-only`, `mutating`, or `external`; mutating requires approval path and traceable error code.

**Connectivity**: Timeout + abort for external requests; normalize/validate URLs; consistent error surfacing.

**Solo validation**: `node --check control-plane/server.js` → `node control-plane/scripts/self-test.js` → `curl http://127.0.0.1:3002/health`.

## Contracts

- **Telemetry Completeness**: Any new architectural script or process must be exposed through the `is/mcp/index.js` server to maintain 100% observability of agent actions.