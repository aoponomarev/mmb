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

## Contracts

- **Telemetry Completeness**: Any new architectural script or process must be exposed through the `is/mcp/index.js` server to maintain 100% observability of agent actions.