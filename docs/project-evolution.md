---
id: doc-f1a4d3
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Project Evolution Log

> **SSOT**: This file is the cumulative log of architectural decisions, migration milestones, and session work.
> **Governance**: See `is/skills/process-evolution-logging.md` for recording protocol.
> **Format**: One `### DD/MM/YY` block per day. Tier A (critical) → Tier B (structural) → Tier C (operational).

---

### 01/03/26

**[Tier A]** Backend core migration completed. Composition root `core/api/backend-market-runtime.js` 
assembles all services (CoinGecko, Binance, RequestRegistry, DataCacheManager). 
Layer separation enforced: Service → Transport → HTTP Handler → Node Server.
40 automated tests passing (`node:test`). Request-ID traceability end-to-end.

**[Tier A]** Control Plane v1 implemented: `preflight.js` + `health-check.js` + `single-writer guard` (`DATA_PLANE_ACTIVE_APP`).
GitHub Actions CI pipeline (`ci.yml`) activated: Lint → Health → Test.

**[Tier A]** MCP infrastructure set up: `is/mcp/skills/server.js` (skills search/read/audit), 
Memory MCP pointing to `is/memory/memory.jsonl`. Cursor `.cursor/mcp.json` configured.

**[Tier B]** All 16 migration plans finalized and moved to `docs/done/`. 
Causality extracted into 11 `arch-*.md` skill files in `is/skills/`.
Master plan (`plan-master-migration.md`) marked complete. 
Stages 4 (Frontend UI) and 5 (n8n) moved to backlog/excluded.

**[Tier B]** Directory contract policy implemented: `validate-readmes.js` enforces README presence 
in 8 boundary directories. All READMEs created. Integrated into `npm run health-check`.
`arch-layout-governance.md` skill formalizes the policy.

**[Tier B]** Skills health infrastructure: `validate-skills.js` (with `--json` mode + stale/orphan detection),
`generate-skills-index.js`, `skills-health-trend.js`, monitoring snapshot scripts.

**[Tier B]** Secret Resilience MVP: AES-256 backup/restore via `npm run secret:backup/restore/check`.
`process-secrets-hygiene.md` skill defines the zero-tolerance policy.

**[Tier B]** Old GitHub repository (aoponomarev/mmb) deleted. New repo initialized and pushed.
GitHub Pages deployment active at `https://aoponomarev.github.io/mmb`.

**[Tier C]** Language policy enforced: all `is/skills/*.md` files translated to English.
`core/skills/api-layer.md` and `app/skills/ui-architecture.md` translated.
