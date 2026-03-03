# n8n Infrastructure (Deferred)

> **Status**: DEFERRED — n8n not yet deployed in Target App. Move to `is/skills/` when n8n stack exists.
> **Source**: Extracted from arch-mcp-ecosystem.

## n8n Workflow Hygiene

- **Data pruning**: Max age 168h, max 1000 executions; save failed executions only for high-frequency workflows.
- **Performance**: WAL mode; use "Split in Batches" for large datasets; limit "Wait" nodes in high-frequency flows.
- **Error handling**: Global Error Trigger → notification; Retry on Failure (3×, 5s) for HTTP nodes.
- **Parallelism**: Limit parallel branches to 3–5 to avoid CPU saturation.
- **MCP synergy**: Prefer `mode: "webhook"` or `/execute` for sync responses; pass `agent_id` and `session_id` for traceability.

## MCP-to-n8n Interaction Protocol

**Trigger modes**: Manual Sync `/execute` (default); Manual Async `/run` (long-running); Webhook `/webhook/...`.

**Input**: `{ action, payload, metadata: { agent, timestamp } }`. **Output**: `{ success, result, error }`.

**Troubleshooting**: 404 → check workflow Active; 401 → verify `N8N_API_KEY`; Timeout → use async mode and poll.

## n8n Local Setup

**Prerequisites**: Docker Desktop; `.env` with `N8N_ENCRYPTION_KEY`. Steps: `docker volume create n8n_data`; `docker compose up -d n8n`; verify `http://localhost:5678`. Key vars: `N8N_ENCRYPTION_KEY`, `N8N_API_KEY`, `N8N_RUNNERS_ENABLED=false` (required for Code Nodes).

## n8n Docker Internals

**SSOT**: `/home/node/.n8n/` (container path). Data: `database.sqlite`, `config`, `binaryData/`. Rule: use Named Volumes (`n8n_data`), not bind mounts on Windows. SQLite access: stop container; `docker cp n8n:/home/node/.n8n/database.sqlite ./backup.sqlite` (replace `n8n` with actual service name from docker-compose); start. Constraints: reset ownership to `node:node` (UID 1000); when restoring, delete `-shm` and `-wal`. *Anti-calque: no mbb/mmb in container names (arch-foundation).*

## n8n Browser Cache (404 After DB Reset)

Browser `localStorage` caches workflow IDs that no longer exist. Fix: F12 → Application → Storage → Clear Site Data → Reload. Prevention: use Incognito when testing DB migrations.

## n8n Workflow Import Pitfalls

`n8n import:workflow --overwrite` may create duplicates. Verify after import; deactivate old, activate new; `docker-compose restart n8n` required. In Code nodes, `this.helpers.httpRequest` with `json: true` throws on non-2xx; use raw `https.request`.

## n8n Code Nodes & Docker

**Problem**: n8n in Docker blocks native modules (`fs`, `child_process`) and Execute Command nodes by default.

**Configuration**: `NODE_FUNCTION_ALLOW_BUILTIN=child_process,fs,path,http,https,crypto,os,url,util`; `N8N_RUNNERS_ENABLED=false` (critical); `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false`.

**Usage**: Use Code Node instead of Execute Command; use mapped container paths; `docker compose up -d --force-recreate` after env changes.

## n8n & MCP Integration (Orchestration)

**MCP Tools (Fast/Read)**: `list_skills`, `read_skill`, `propose_skill`; write ONLY to `events/SKILL_CANDIDATES.json`.

**n8n Workflows (Slow/Write)**: Lifecycle automation (drafting, archiving); creates files in `drafts/tasks/`.

**Flow**: Agent calls `propose_skill` → entry in SKILL_CANDIDATES; n8n detects `pending`; n8n drafts via LLM; human review required.

## n8n API & Security

**JWT secret**: n8n derives from `N8N_ENCRYPTION_KEY`; algorithm: every second character then SHA256 hash.

**API key management**: Stored in `user_api_keys` (database.sqlite); if `N8N_ENCRYPTION_KEY` changes, regenerate all API keys.

**Docker permissions**: When copying SQLite to volume, use Alpine helper for `chmod 666` and `chown 1000:1000`. Use PowerShell for `docker exec` to avoid Git Bash path issues.

## n8n Code Node Patterns (v2)

**API changes**: Use `$input.all()` instead of `items`; `$input.first()` instead of `items[0]`; `$node["Name"].json` for node data.

**Gotchas**: Toggle "Async" if using `await`/`fetch`; `console.log` not visible in Docker — return debug object.

## n8n OAuth & Webhook Security

**OAuth**: Use ONLY `https://` for token/auth URLs; never `http://` in production.

**Webhook conflicts**: n8n excludes "waiting" webhooks from conflict analysis.

## SQLite Runtime Compatibility (n8n)

**Trigger**: New sqlite3 release; errors around bindings; infrastructure changes affecting SQLite.

**Gate checklist**: (1) sqlite3 baseline in n8n image or `n8n/package.json` if custom build; (2) when control-plane exists: `GET /api/infra/dependency-health`; otherwise: `node scripts/sqlite-health-snapshot.js` if available; (3) run workflow with SQLite access; (4) check n8n logs.
