---
id: sk-3225b2
title: "MCP Ecosystem (LLMOps)"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-07
reasoning_checksum: 2caa86cd
last_change: ""

---

# MCP Ecosystem Architecture

> **Context**: The integration of Model Context Protocol (MCP), SQLite telemetry, and AI agent Tooling.
> **Scope**: `is/mcp/*`, `data/mcp.sqlite`, `.cursorrules`

## Reasoning

- **#for-mcp-telemetry** A static codebase cannot measure the "usefulness" of its own documentation. By proxying all tool executions and file reads through a local MCP server, we can write telemetry to SQLite and definitively know which skills are relied upon and which are dead weight.
- **#for-ai-tooling-abstraction** Forcing agents to remember and perfectly type CLI commands (like `node is/scripts/infrastructure/health-check.js` or `wrangler d1 execute`) is error-prone. Exposing these as strict JSON-schema MCP Tools guarantees safer, more predictable execution.
- **#for-context-injection** Dynamically injecting telemetry data (e.g., "This skill has 42 anchors") into the top of Markdown files *as they are being read by the agent* dynamically influences agent behavior without mutating the actual markdown file on disk.

## Core Rules

*n8n and Continue CLI (Docker) content moved to id:bskill-2cab14 (docs/backlog/skills/n8n-infrastructure.md) and id:bskill-11683c (docs/backlog/skills/docker-infrastructure.md) — not yet deployed in Target App.*

1.  **SQLite Isolation:**
    The MCP database (`data/mcp.sqlite`) must remain completely outside the `is/` codebase and MUST NOT be synced to git. It is local, disposable state.

2.  **Tool Priority:**
    If an MCP Tool exists for an operation (e.g., `run_preflight`, `create_skill`), AI agents MUST use the tool rather than falling back to raw shell execution. Tools ensure telemetry is logged.

3.  **Invariant Graph Sync:**
    The `validate-causality-invariant.js` script acts as the bridge between static code and the MCP server. Upon successful validation, it dumps the entire anchor dependency graph into the SQLite `dependency_graph` table. This powers the `causality_graph://` resource.

### Agent Synergy Chain

When multiple MCP servers exist (skills, agents, control-plane, etc.), complex tasks should follow an ordered chain: **Context** (gather state) → **Rules** (verify against skills) → **Action** (execute side-effects). Use `@terminal` context provider for errors instead of manual copy-paste.

### Unified MCP (Single Source)

All logic for external APIs (knowledge base, task management, Git) must live in MCP servers under `is/mcp/`. Cursor connects via settings. *(When n8n is deployed: dual integration via MCP Client node.)*

### Cursor Settings Sync

**Context**: Managing IDE settings and extensions across environments. SSOT: `INFRASTRUCTURE_CONFIG.yaml` for profile-specific paths *(when file exists; see config-contracts)*.

**Scope**: `settings.json` (keybindings, UI preferences); extensions list. **Sync strategy**: Use `powershell .\scripts\sync-cursor-settings.ps1 [backup|restore]`; master copies in defined path; local paths via environment variables.

**Hard constraint**: No secrets in `settings.json`; use `.env` for sensitive API keys.

### GitHub Agentic Collaboration

**Goal**: Leverage GitHub cloud intelligence while maintaining local self-sufficiency and minimizing token costs.

**Beacon strategy**: `.github/copilot-instructions.md` moved to historical scope; skip in path-contracts.js.

**Token-saving workflow (L3 tasks)**: Create Issue → add label `L3-Discovery` → open in Copilot Workspace → request plan only ("Provide step-by-step plan, do not generate code yet") → execute locally via ВЗП protocol.

**Quality control**: GitHub Actions run `env:check`, index-gen, syntax checks on MCP servers. **Hard constraints**: No direct cloud commits; cloud agents propose via PR/Plans; verify locally before merge; zero-cost (free tier only).

### Node MCP Development Protocol

**Goal**: Standardize development of Node-based MCP services for safe operations.

**Architecture**: Official MCP SDK, stdio transport; validate inputs with zod; null-safe handlers (`params || {}`).

**Safety**: Side-effecting tools support dry-run and confirmation gates; logger failures never crash execution; expose health-check; classify tools as `read-only`, `mutating`, or `external`; mutating requires approval path and traceable error code.

**Connectivity**: Timeout + abort for external requests; normalize/validate URLs; consistent error surfacing.

**Solo validation**: `node --check is/mcp/index.js` → `curl http://127.0.0.1:PORT/health` (when MCP HTTP server exists).

### MCP SDK Security Rollout

**Context**: MCP SDK security consistent across all active MCP servers. SSOT: package manifests in `is/mcp/*`.

**When to apply**: After MCP SDK release detection; before recruiting new MCP-driven agents; during infra hardening.

**Required actions**: Keep `@modelcontextprotocol/sdk` on hardened baseline (>=1.26.0) across all servers; run `node scripts/mcp-sdk-drift-check.js` (Zod baseline, cross-package consistency); verify health-check endpoints when available.

**What matters**: Server-side isolation; consistent schema/runtime across MCP servers; no partial upgrade drift.

### MCP Server YAML Parsing

**Context**: Processing YAML configuration for MCP servers. Structure parsing, validation of mandatory parameters, extraction of key configs.

**Load YAML**: Use js-yaml; handle env var substitution `${VAR}`; fallback to line-by-line parser for components where official parsers fail (empty arrays, specific flags).

**Extract**: `apiBase`, `apiKey`, `model`; validate API hostnames and paths; ensure sensitive data via env vars, not hardcoded.

**Validation**: Structural (required sections); type (ports, timeouts, IDs); semantic (valid provider names).

### Continue AI Subagents & Agent Skills

**Context**: Continue v1.2.15 introduces subagents (delegate to specialized agents) and Agent Skills (reusable capabilities).

**Subagents**: Primary delegates subtask → subagent executes → returns result. MCP servers can be leveraged by subagents.

**Agent Skills**: Native Continue skills complement MCP approach; evaluate migration of some MCP skills for better integration.

**Config filtering**: Continue filters out `.md` files when loading agent configs; only `.yaml`, `.yml`, `.json` loaded. Ensure no agent configs use `.md`.

### MCP-UI Interaction Architecture

**Context**: Interaction protocol between frontend and backend MCP services. Reactive, state-aware interface for AI-driven tasks (commit scanning, skill curation).

**Scan flow**: UI triggers webhook/check-updates → backend orchestrates scan → returns summary → UI updates sources/task list.

**Approve/curation flow**: User action triggers confirm → API updates status; drafting part of initial pass.

**Log sync**: UI fetches the logs API endpoint for real-time events; route is an HTTP contract (`api/logs`); skip in path-contracts.js.

**Guidelines**: Use `data-hash` attributes to map UI to backend; visual feedback (spinners, alerts) for long-running LLM tasks; optimistic UI — fade out rejected items while waiting for server.

## Contracts

- **Telemetry Completeness**: Any new architectural script or process must be exposed through the #JS-3M2cDJyX (is/mcp/index.js) server to maintain 100% observability of agent actions.